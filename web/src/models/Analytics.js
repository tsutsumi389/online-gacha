import database from '../config/database.js';
import cacheManager from '../utils/cacheManager.js';
import realtimeUpdates from '../utils/realtimeUpdates.js';

class Analytics {
  static CACHE_TTL = {
    STATS: 5 * 60, // 5分
    DASHBOARD: 10 * 60, // 10分
    DEMOGRAPHICS: 15 * 60, // 15分
    HOURLY: 30 * 60, // 30分
  };

  /**
   * キャッシュから値を取得
   */
  static async getFromCache(key) {
    return await cacheManager.get(key);
  }

  /**
   * キャッシュに値を設定
   */
  static async setCache(key, value, ttl = this.CACHE_TTL.STATS) {
    return await cacheManager.set(key, value, ttl);
  }

  /**
   * キャッシュをクリア
   */
  static async clearCache(pattern = null) {
    if (pattern) {
      return await cacheManager.delete(`*${pattern}*`);
    } else {
      return await cacheManager.flush();
    }
  }

  /**
   * キャッシュ統計を取得
   */
  static async getCacheStats() {
    return await cacheManager.getStats();
  }
  /**
   * ガチャの統計データを取得・計算（最適化版）
   * @param {number} gachaId - ガチャID
   * @param {string} dateRange - 日付範囲 ('7days', '30days', 'all')
   * @returns {Object} 統計データ
   */
  static async getGachaStatistics(gachaId, dateRange = 'all') {
    const cacheKey = `gacha_stats_${gachaId}_${dateRange}`;
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      let dateCondition = '';
      let intervalParam = null;
      
      if (dateRange === '7days') {
        dateCondition = "AND gr.executed_at >= CURRENT_DATE - INTERVAL '7 days'";
        intervalParam = '7 days';
      } else if (dateRange === '30days') {
        dateCondition = "AND gr.executed_at >= CURRENT_DATE - INTERVAL '30 days'";
        intervalParam = '30 days';
      }

      // 最適化された統合クエリ（複数のクエリを統合してラウンドトリップを削減）
      const optimizedQuery = `
        WITH gacha_data AS (
          SELECT 
            gr.*,
            g.price,
            v.gender,
            v.age_group,
            gi.id as item_id,
            gi.name as item_name
          FROM gacha_results gr
          JOIN gachas g ON gr.gacha_id = g.id
          LEFT JOIN v_users_with_demographics v ON gr.user_id = v.id
          LEFT JOIN gacha_items gi ON gr.gacha_item_id = gi.id
          WHERE gr.gacha_id = $1 ${dateCondition}
        ),
        basic_stats AS (
          SELECT 
            COUNT(*) as total_draws,
            COUNT(DISTINCT user_id) as unique_users,
            SUM(price) as total_revenue,
            CASE 
              WHEN COUNT(DISTINCT user_id) > 0 
              THEN ROUND(COUNT(*)::numeric / COUNT(DISTINCT user_id), 2)
              ELSE 0 
            END as avg_draws_per_user,
            MAX(executed_at) as last_draw_at
          FROM gacha_data
        ),
        popular_item AS (
          SELECT 
            item_id as id, 
            item_name as name, 
            COUNT(*) as draw_count,
            ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as rn
          FROM gacha_data
          WHERE item_id IS NOT NULL
          GROUP BY item_id, item_name
        ),
        demographics AS (
          SELECT 
            gender,
            age_group,
            COUNT(*) as draws_count,
            COUNT(DISTINCT user_id) as unique_users,
            SUM(price) as revenue
          FROM gacha_data
          WHERE gender IS NOT NULL OR age_group IS NOT NULL
          GROUP BY gender, age_group
          ORDER BY draws_count DESC
        )
        SELECT 
          'basic' as data_type,
          json_build_object(
            'total_draws', bs.total_draws,
            'unique_users', bs.unique_users,
            'total_revenue', bs.total_revenue,
            'avg_draws_per_user', bs.avg_draws_per_user,
            'last_draw_at', bs.last_draw_at
          ) as data
        FROM basic_stats bs
        
        UNION ALL
        
        SELECT 
          'popular_item' as data_type,
          json_build_object(
            'id', pi.id,
            'name', pi.name,
            'draw_count', pi.draw_count
          ) as data
        FROM popular_item pi 
        WHERE pi.rn = 1
        
        UNION ALL
        
        SELECT 
          'demographics' as data_type,
          json_agg(
            json_build_object(
              'gender', d.gender,
              'age_group', d.age_group,
              'draws_count', d.draws_count,
              'unique_users', d.unique_users,
              'revenue', d.revenue
            )
          ) as data
        FROM demographics d
      `;

      const result = await database.query(optimizedQuery, [gachaId]);
      
      // 結果を整形
      const response = {
        basic: null,
        most_popular_item: null,
        demographics: []
      };

      result.rows.forEach(row => {
        switch(row.data_type) {
          case 'basic':
            response.basic = row.data;
            break;
          case 'popular_item':
            response.most_popular_item = row.data;
            break;
          case 'demographics':
            response.demographics = row.data || [];
            break;
        }
      });

      // キャッシュに保存（統計データは5分間キャッシュ）
      await this.setCache(cacheKey, response, this.CACHE_TTL.STATS);
      
      return response;
    } catch (error) {
      console.error('Error getting gacha statistics:', error);
      throw error;
    }
  }

  /**
   * 時間別統計を更新（1時間毎のcron実行）- 最適化版
   */
  static async updateHourlyStats() {
    try {
      const currentHour = new Date();
      currentHour.setMinutes(0, 0, 0); // 時間を00:00:00に設定
      const previousHour = new Date(currentHour.getTime() - 60 * 60 * 1000);

      // 並列処理可能なバッチサイズで分割処理
      const BATCH_SIZE = 1000;
      let totalUpdated = 0;

      // まず処理対象のデータ量を取得
      const countQuery = `
        SELECT COUNT(*) as count
        FROM gacha_results gr
        WHERE gr.executed_at >= $1 AND gr.executed_at < $2
      `;
      const countResult = await database.query(countQuery, [previousHour, currentHour]);
      const totalCount = parseInt(countResult.rows[0].count);

      if (totalCount === 0) {
        console.log('No data to process for hourly stats');
        return 0;
      }

      // バッチ処理でデータを分割して処理
      for (let offset = 0; offset < totalCount; offset += BATCH_SIZE) {
        const query = `
          INSERT INTO gacha_hourly_stats (gacha_id, hour_bucket, draws_count, unique_users, revenue)
          SELECT 
            gr.gacha_id,
            DATE_TRUNC('hour', gr.executed_at) as hour_bucket,
            COUNT(*) as draws_count,
            COUNT(DISTINCT gr.user_id) as unique_users,
            SUM(g.price) as revenue
          FROM (
            SELECT * FROM gacha_results
            WHERE executed_at >= $1 AND executed_at < $2
            ORDER BY id
            LIMIT $3 OFFSET $4
          ) gr
          JOIN gachas g ON gr.gacha_id = g.id
          GROUP BY gr.gacha_id, DATE_TRUNC('hour', gr.executed_at)
          ON CONFLICT (gacha_id, hour_bucket) DO UPDATE SET
            draws_count = gacha_hourly_stats.draws_count + EXCLUDED.draws_count,
            unique_users = GREATEST(gacha_hourly_stats.unique_users, EXCLUDED.unique_users),
            revenue = gacha_hourly_stats.revenue + EXCLUDED.revenue
        `;

        const result = await database.query(query, [previousHour, currentHour, BATCH_SIZE, offset]);
        totalUpdated += result.rowCount;
      }

      // キャッシュクリア（時間別統計に関連するキャッシュを削除）
      await this.clearCache('hourly');
      
      console.log(`Updated hourly stats: ${totalUpdated} records (processed ${totalCount} draws)`);
      return totalUpdated;
    } catch (error) {
      console.error('Error updating hourly stats:', error);
      throw error;
    }
  }

  /**
   * デモグラフィック統計を更新（1時間毎のバッチ処理）
   */
  static async updateDemographicStats() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // gacha_statisticsのデモグラフィック項目を更新
      const updateStatsQuery = `
        WITH demographic_stats AS (
          SELECT 
            gr.gacha_id,
            COUNT(*) as total_draws,
            COUNT(DISTINCT gr.user_id) as unique_users,
            COUNT(*) * g.price as total_revenue,
            ROUND(COUNT(*)::numeric / COUNT(DISTINCT gr.user_id), 2) as avg_draws_per_user,
            -- 性別統計
            COUNT(*) FILTER (WHERE v.gender = 'male') as male_users,
            COUNT(*) FILTER (WHERE v.gender = 'female') as female_users,
            COUNT(*) FILTER (WHERE v.gender = 'other') as other_gender_users,
            COUNT(*) FILTER (WHERE v.gender IS NULL) as unknown_gender_users,
            -- 年齢統計
            AVG(v.current_age) as avg_user_age,
            COUNT(*) FILTER (WHERE v.age_group = '10s') as age_10s_users,
            COUNT(*) FILTER (WHERE v.age_group = '20s') as age_20s_users,
            COUNT(*) FILTER (WHERE v.age_group = '30s') as age_30s_users,
            COUNT(*) FILTER (WHERE v.age_group = '40s') as age_40s_users,
            COUNT(*) FILTER (WHERE v.age_group = '50s') as age_50s_users,
            COUNT(*) FILTER (WHERE v.age_group = '60plus') as age_60plus_users,
            COUNT(*) FILTER (WHERE v.age_group = 'unknown') as unknown_age_users
          FROM gacha_results gr
          JOIN v_users_with_demographics v ON gr.user_id = v.id
          JOIN gachas g ON gr.gacha_id = g.id
          GROUP BY gr.gacha_id, g.price
        )
        INSERT INTO gacha_statistics (
          gacha_id, total_draws, unique_users, total_revenue, avg_draws_per_user,
          male_users, female_users, other_gender_users, unknown_gender_users,
          avg_user_age, age_10s_users, age_20s_users, age_30s_users, age_40s_users,
          age_50s_users, age_60plus_users, unknown_age_users, last_calculated
        )
        SELECT 
          gacha_id, total_draws, unique_users, total_revenue, avg_draws_per_user,
          male_users, female_users, other_gender_users, unknown_gender_users,
          avg_user_age, age_10s_users, age_20s_users, age_30s_users, age_40s_users,
          age_50s_users, age_60plus_users, unknown_age_users, NOW()
        FROM demographic_stats
        ON CONFLICT (gacha_id) DO UPDATE SET
          total_draws = EXCLUDED.total_draws,
          unique_users = EXCLUDED.unique_users,
          total_revenue = EXCLUDED.total_revenue,
          avg_draws_per_user = EXCLUDED.avg_draws_per_user,
          male_users = EXCLUDED.male_users,
          female_users = EXCLUDED.female_users,
          other_gender_users = EXCLUDED.other_gender_users,
          unknown_gender_users = EXCLUDED.unknown_gender_users,
          avg_user_age = EXCLUDED.avg_user_age,
          age_10s_users = EXCLUDED.age_10s_users,
          age_20s_users = EXCLUDED.age_20s_users,
          age_30s_users = EXCLUDED.age_30s_users,
          age_40s_users = EXCLUDED.age_40s_users,
          age_50s_users = EXCLUDED.age_50s_users,
          age_60plus_users = EXCLUDED.age_60plus_users,
          unknown_age_users = EXCLUDED.unknown_age_users,
          last_calculated = NOW(),
          updated_at = NOW()
      `;

      const result1 = await database.query(updateStatsQuery);

      // gacha_demographic_statsテーブルを更新
      const updateDemographicQuery = `
        INSERT INTO gacha_demographic_stats (gacha_id, date_bucket, gender, age_group, draws_count, unique_users, revenue)
        SELECT 
          gr.gacha_id,
          CURRENT_DATE as date_bucket,
          COALESCE(v.gender, 'unknown') as gender,
          v.age_group,
          COUNT(*) as draws_count,
          COUNT(DISTINCT gr.user_id) as unique_users,
          COUNT(*) * g.price as revenue
        FROM gacha_results gr
        JOIN v_users_with_demographics v ON gr.user_id = v.id
        JOIN gachas g ON gr.gacha_id = g.id
        WHERE DATE(gr.executed_at) = CURRENT_DATE
        GROUP BY gr.gacha_id, COALESCE(v.gender, 'unknown'), v.age_group, g.price
        ON CONFLICT (gacha_id, date_bucket, gender, age_group) DO UPDATE SET
          draws_count = EXCLUDED.draws_count,
          unique_users = EXCLUDED.unique_users,
          revenue = EXCLUDED.revenue
      `;

      const result2 = await database.query(updateDemographicQuery);
      console.log(`Updated demographic stats: ${result1.rowCount} gacha_statistics, ${result2.rowCount} demographic_stats`);
      return { statistics: result1.rowCount, demographics: result2.rowCount };
    } catch (error) {
      console.error('Error updating demographic stats:', error);
      throw error;
    }
  }

  /**
   * 男女比・年齢別分布データを取得
   * @param {number} gachaId - ガチャID
   * @param {Object} dateRange - 日付範囲オブジェクト
   * @returns {Object} 分布データ
   */
  static async getGenderAgeBreakdown(gachaId, dateRange = {}) {
    try {
      let dateCondition = '';
      const params = [gachaId];

      if (dateRange.startDate && dateRange.endDate) {
        dateCondition = 'AND gds.date_bucket BETWEEN $2 AND $3';
        params.push(dateRange.startDate, dateRange.endDate);
      } else if (dateRange.days) {
        dateCondition = 'AND gds.date_bucket >= CURRENT_DATE - INTERVAL $2';
        params.push(`${dateRange.days} days`);
      }

      const query = `
        SELECT 
          gds.gender,
          gds.age_group,
          SUM(gds.draws_count) as total_draws,
          SUM(gds.unique_users) as total_users,
          SUM(gds.revenue) as total_revenue,
          ROUND(AVG(gds.draws_count), 2) as avg_daily_draws
        FROM gacha_demographic_stats gds
        WHERE gds.gacha_id = $1 ${dateCondition}
        GROUP BY gds.gender, gds.age_group
        ORDER BY total_draws DESC
      `;

      const result = await database.query(query, params);

      // データを整形して返す
      const breakdown = {
        gender_breakdown: {},
        age_breakdown: {},
        combined_breakdown: result.rows
      };

      // 性別集計
      result.rows.forEach(row => {
        if (!breakdown.gender_breakdown[row.gender]) {
          breakdown.gender_breakdown[row.gender] = {
            draws: 0,
            users: 0,
            revenue: 0
          };
        }
        breakdown.gender_breakdown[row.gender].draws += parseInt(row.total_draws);
        breakdown.gender_breakdown[row.gender].users += parseInt(row.total_users);
        breakdown.gender_breakdown[row.gender].revenue += parseInt(row.total_revenue);
      });

      // 年齢別集計
      result.rows.forEach(row => {
        if (!breakdown.age_breakdown[row.age_group]) {
          breakdown.age_breakdown[row.age_group] = {
            draws: 0,
            users: 0,
            revenue: 0
          };
        }
        breakdown.age_breakdown[row.age_group].draws += parseInt(row.total_draws);
        breakdown.age_breakdown[row.age_group].users += parseInt(row.total_users);
        breakdown.age_breakdown[row.age_group].revenue += parseInt(row.total_revenue);
      });

      return breakdown;
    } catch (error) {
      console.error('Error getting gender age breakdown:', error);
      throw error;
    }
  }

  /**
   * リアルタイム統計更新（ガチャ抽選時）- 最適化版
   * @param {number} gachaId - ガチャID
   * @param {number} userId - ユーザーID
   * @param {number} itemId - 抽選されたアイテムID
   */
  static async updateBasicStatsRealtime(gachaId, userId, itemId) {
    try {
      const client = await database.getClient();
      
      try {
        await client.query('BEGIN');

        // 複数の更新を並列実行可能な単一クエリで処理
        const parallelUpdateQuery = `
          WITH updates AS (
            -- ユーザーの総抽選回数を更新
            UPDATE users SET 
              total_draws = total_draws + 1,
              last_login_at = NOW()
            WHERE id = $2
            RETURNING 1 as user_updated
          ),
          gacha_info AS (
            SELECT id, price FROM gachas WHERE id = $1
          ),
          current_stats AS (
            SELECT 
              COUNT(*) as current_draws,
              COUNT(DISTINCT user_id) as current_unique_users,
              gacha_item_id,
              COUNT(*) as item_count,
              ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as item_rank
            FROM gacha_results 
            WHERE gacha_id = $1
            GROUP BY gacha_item_id
          ),
          most_popular AS (
            SELECT gacha_item_id as most_popular_item_id
            FROM current_stats
            WHERE item_rank = 1
            LIMIT 1
          )
          INSERT INTO gacha_statistics (
            gacha_id, total_draws, unique_users, total_revenue, 
            most_popular_item_id, last_calculated
          )
          SELECT 
            $1,
            cs.current_draws,
            cs.current_unique_users,
            cs.current_draws * gi.price,
            mp.most_popular_item_id,
            NOW()
          FROM (
            SELECT 
              COUNT(*) as current_draws,
              COUNT(DISTINCT user_id) as current_unique_users
            FROM gacha_results WHERE gacha_id = $1
          ) cs
          CROSS JOIN gacha_info gi
          LEFT JOIN most_popular mp ON true
          ON CONFLICT (gacha_id) DO UPDATE SET
            total_draws = EXCLUDED.total_draws,
            unique_users = EXCLUDED.unique_users,
            total_revenue = EXCLUDED.total_revenue,
            most_popular_item_id = EXCLUDED.most_popular_item_id,
            last_calculated = NOW(),
            updated_at = NOW()
        `;

        await client.query(parallelUpdateQuery, [gachaId, userId]);

        // 関連キャッシュを非同期で削除（トランザクション外で実行）
        setImmediate(async () => {
          await this.clearCache(`gacha_stats_${gachaId}`);
          await this.clearCache('dashboard');
          
          // リアルタイム更新を送信
          try {
            await realtimeUpdates.sendGachaUpdate(gachaId, 'draw', {
              user_id: userId,
              item_id: itemId,
              message: 'ガチャが実行されました'
            });
          } catch (error) {
            console.warn('Failed to send realtime update:', error.message);
          }
        });

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error updating realtime stats:', error);
      throw error;
    }
  }

  /**
   * ダッシュボード用の全体統計を取得（最適化版）
   * @returns {Object} 全体統計データ
   */
  static async getDashboardStats() {
    const cacheKey = 'dashboard_stats';
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // 統合クエリで一度に全ての必要なデータを取得
      const optimizedQuery = `
        WITH date_ranges AS (
          SELECT 
            CURRENT_DATE as today,
            CURRENT_DATE - INTERVAL '7 days' as week_ago,
            CURRENT_DATE - INTERVAL '30 days' as month_ago
        ),
        summary_stats AS (
          SELECT 
            COUNT(DISTINCT g.id) as total_gachas,
            COUNT(DISTINCT gr.id) as total_draws,
            COUNT(DISTINCT gr.user_id) as total_users,
            COALESCE(SUM(g.price) FILTER (WHERE gr.executed_at >= (SELECT today FROM date_ranges)), 0) as revenue_today,
            COALESCE(SUM(g.price) FILTER (WHERE gr.executed_at >= (SELECT week_ago FROM date_ranges)), 0) as revenue_week,
            COALESCE(SUM(g.price) FILTER (WHERE gr.executed_at >= (SELECT month_ago FROM date_ranges)), 0) as revenue_month
          FROM gachas g
          LEFT JOIN gacha_results gr ON g.id = gr.gacha_id
        ),
        popular_gachas AS (
          SELECT 
            g.id,
            g.name,
            COUNT(gr.id) as total_draws,
            COUNT(DISTINCT gr.user_id) as unique_users,
            SUM(g.price) as revenue,
            RANK() OVER (ORDER BY COUNT(gr.id) DESC) as ranking
          FROM gachas g
          JOIN gacha_results gr ON g.id = gr.gacha_id
          WHERE gr.executed_at >= (SELECT month_ago FROM date_ranges)
          GROUP BY g.id, g.name
          ORDER BY total_draws DESC
          LIMIT 5
        )
        SELECT 
          'summary' as data_type,
          json_build_object(
            'total_gachas', ss.total_gachas,
            'total_draws', ss.total_draws,
            'total_users', ss.total_users,
            'revenue_today', ss.revenue_today,
            'revenue_week', ss.revenue_week,
            'revenue_month', ss.revenue_month
          ) as data
        FROM summary_stats ss
        
        UNION ALL
        
        SELECT 
          'popular_gachas' as data_type,
          json_agg(
            json_build_object(
              'id', pg.id,
              'name', pg.name,
              'total_draws', pg.total_draws,
              'unique_users', pg.unique_users,
              'revenue', pg.revenue,
              'ranking', pg.ranking
            )
            ORDER BY pg.ranking
          ) as data
        FROM popular_gachas pg
      `;

      const result = await database.query(optimizedQuery);
      
      // 結果を整形
      const response = {
        summary: null,
        popular_gachas: []
      };

      result.rows.forEach(row => {
        switch(row.data_type) {
          case 'summary':
            response.summary = row.data;
            break;
          case 'popular_gachas':
            response.popular_gachas = row.data || [];
            break;
        }
      });

      // ダッシュボードデータは10分間キャッシュ
      await this.setCache(cacheKey, response, this.CACHE_TTL.DASHBOARD);
      
      return response;
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      throw error;
    }
  }
}

export default Analytics;