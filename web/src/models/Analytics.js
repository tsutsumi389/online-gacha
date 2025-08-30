import database from '../config/database.js';

class Analytics {
  /**
   * ガチャの統計データを取得・計算
   * @param {number} gachaId - ガチャID
   * @param {string} dateRange - 日付範囲 ('7days', '30days', 'all')
   * @returns {Object} 統計データ
   */
  static async getGachaStatistics(gachaId, dateRange = 'all') {
    try {
      let dateCondition = '';
      if (dateRange === '7days') {
        dateCondition = "AND gr.executed_at >= CURRENT_DATE - INTERVAL '7 days'";
      } else if (dateRange === '30days') {
        dateCondition = "AND gr.executed_at >= CURRENT_DATE - INTERVAL '30 days'";
      }

      // 基本統計を計算
      const basicStatsQuery = `
        SELECT 
          COUNT(*) as total_draws,
          COUNT(DISTINCT gr.user_id) as unique_users,
          COUNT(*) * g.price as total_revenue,
          ROUND(COUNT(*)::numeric / COUNT(DISTINCT gr.user_id), 2) as avg_draws_per_user,
          MAX(gr.executed_at) as last_draw_at
        FROM gacha_results gr
        JOIN gachas g ON gr.gacha_id = g.id
        WHERE gr.gacha_id = $1 ${dateCondition}
      `;

      const basicStats = await database.query(basicStatsQuery, [gachaId]);

      // 最も人気のアイテムを取得
      const popularItemQuery = `
        SELECT gi.id, gi.name, COUNT(*) as draw_count
        FROM gacha_results gr
        JOIN gacha_items gi ON gr.gacha_item_id = gi.id
        WHERE gr.gacha_id = $1 ${dateCondition}
        GROUP BY gi.id, gi.name
        ORDER BY draw_count DESC
        LIMIT 1
      `;

      const popularItem = await database.query(popularItemQuery, [gachaId]);

      // デモグラフィック統計を取得
      const demographicsQuery = `
        SELECT 
          v.gender,
          v.age_group,
          COUNT(*) as draws_count,
          COUNT(DISTINCT v.id) as unique_users,
          COUNT(*) * g.price as revenue
        FROM gacha_results gr
        JOIN v_users_with_demographics v ON gr.user_id = v.id
        JOIN gachas g ON gr.gacha_id = g.id
        WHERE gr.gacha_id = $1 ${dateCondition}
        GROUP BY v.gender, v.age_group, g.price
        ORDER BY draws_count DESC
      `;

      const demographics = await database.query(demographicsQuery, [gachaId]);

      return {
        basic: basicStats.rows[0],
        most_popular_item: popularItem.rows[0] || null,
        demographics: demographics.rows
      };
    } catch (error) {
      console.error('Error getting gacha statistics:', error);
      throw error;
    }
  }

  /**
   * 時間別統計を更新（1時間毎のcron実行）
   */
  static async updateHourlyStats() {
    try {
      const currentHour = new Date();
      currentHour.setMinutes(0, 0, 0); // 時間を00:00:00に設定
      const previousHour = new Date(currentHour.getTime() - 60 * 60 * 1000);

      const query = `
        INSERT INTO gacha_hourly_stats (gacha_id, hour_bucket, draws_count, unique_users, revenue)
        SELECT 
          gr.gacha_id,
          DATE_TRUNC('hour', gr.executed_at) as hour_bucket,
          COUNT(*) as draws_count,
          COUNT(DISTINCT gr.user_id) as unique_users,
          COUNT(*) * g.price as revenue
        FROM gacha_results gr
        JOIN gachas g ON gr.gacha_id = g.id
        WHERE gr.executed_at >= $1 AND gr.executed_at < $2
        GROUP BY gr.gacha_id, DATE_TRUNC('hour', gr.executed_at), g.price
        ON CONFLICT (gacha_id, hour_bucket) DO UPDATE SET
          draws_count = EXCLUDED.draws_count,
          unique_users = EXCLUDED.unique_users,
          revenue = EXCLUDED.revenue
      `;

      const result = await database.query(query, [previousHour, currentHour]);
      console.log(`Updated hourly stats: ${result.rowCount} records`);
      return result.rowCount;
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
   * リアルタイム統計更新（ガチャ抽選時）
   * @param {number} gachaId - ガチャID
   * @param {number} userId - ユーザーID
   */
  static async updateBasicStatsRealtime(gachaId, userId) {
    try {
      const client = await database.getClient();
      
      try {
        await client.query('BEGIN');

        // ユーザーの総抽選回数を更新
        await client.query(
          'UPDATE users SET total_draws = total_draws + 1 WHERE id = $1',
          [userId]
        );

        // gacha_statisticsの基本統計を更新
        const updateStatsQuery = `
          INSERT INTO gacha_statistics (
            gacha_id, total_draws, unique_users, total_revenue, most_popular_item_id, last_calculated
          )
          SELECT 
            $1 as gacha_id,
            COUNT(*) as total_draws,
            COUNT(DISTINCT gr.user_id) as unique_users,
            COUNT(*) * g.price as total_revenue,
            (SELECT gacha_item_id FROM gacha_results WHERE gacha_id = $1 GROUP BY gacha_item_id ORDER BY COUNT(*) DESC LIMIT 1) as most_popular_item_id,
            NOW() as last_calculated
          FROM gacha_results gr
          JOIN gachas g ON gr.gacha_id = g.id
          WHERE gr.gacha_id = $1
          ON CONFLICT (gacha_id) DO UPDATE SET
            total_draws = EXCLUDED.total_draws,
            unique_users = EXCLUDED.unique_users,
            total_revenue = EXCLUDED.total_revenue,
            most_popular_item_id = EXCLUDED.most_popular_item_id,
            last_calculated = NOW(),
            updated_at = NOW()
        `;

        await client.query(updateStatsQuery, [gachaId]);

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
   * ダッシュボード用の全体統計を取得
   * @returns {Object} 全体統計データ
   */
  static async getDashboardStats() {
    try {
      const query = `
        SELECT 
          COUNT(DISTINCT g.id) as total_gachas,
          COUNT(DISTINCT gr.id) as total_draws,
          COUNT(DISTINCT u.id) as total_users,
          SUM(g.price) FILTER (WHERE gr.executed_at >= CURRENT_DATE) as revenue_today,
          SUM(g.price) FILTER (WHERE gr.executed_at >= CURRENT_DATE - INTERVAL '7 days') as revenue_week,
          SUM(g.price) FILTER (WHERE gr.executed_at >= CURRENT_DATE - INTERVAL '30 days') as revenue_month
        FROM gachas g
        LEFT JOIN gacha_results gr ON g.id = gr.gacha_id
        LEFT JOIN users u ON gr.user_id = u.id
      `;

      const result = await database.query(query);

      // 人気ガチャトップ5を取得
      const popularGachasQuery = `
        SELECT 
          g.id,
          g.name,
          COUNT(gr.id) as total_draws,
          COUNT(DISTINCT gr.user_id) as unique_users,
          RANK() OVER (ORDER BY COUNT(gr.id) DESC) as ranking
        FROM gachas g
        JOIN gacha_results gr ON g.id = gr.gacha_id
        WHERE gr.executed_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY g.id, g.name
        ORDER BY total_draws DESC
        LIMIT 5
      `;

      const popularGachas = await database.query(popularGachasQuery);

      return {
        summary: result.rows[0],
        popular_gachas: popularGachas.rows
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      throw error;
    }
  }
}

export default Analytics;