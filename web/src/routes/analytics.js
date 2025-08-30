// 分析APIルート（管理者向け）
import Analytics from '../models/Analytics.js';
import RecommendationEngine from '../models/RecommendationEngine.js';
import database from '../config/database.js';

export default async function analyticsRoutes(fastify, options) {
  
  // 管理者権限チェック（暫定的に全ユーザーに許可）
  const checkAdminAccess = async (request, reply) => {
    // 現在はすべてのユーザーが管理者扱い
    // 将来的にroleベースの認証を追加する場合はここで実装
  };

  // ガチャ別詳細分析データを取得
  fastify.get('/gacha-analytics/:id', {
    preHandler: [fastify.authenticate, checkAdminAccess],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'integer' }
        },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          dateRange: { 
            type: 'string', 
            enum: ['7days', '30days', 'all'],
            default: 'all'
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const gachaId = request.params.id;
      const dateRange = request.query.dateRange || 'all';

      // ガチャの存在確認
      const gachaCheck = await database.query(
        'SELECT id FROM gachas WHERE id = $1',
        [gachaId]
      );

      if (gachaCheck.rows.length === 0) {
        return reply.code(404).send({
          error: 'ガチャが見つかりません'
        });
      }

      // 統計データを取得
      const statistics = await Analytics.getGachaStatistics(gachaId, dateRange);
      
      // デモグラフィック分布を取得
      const demographics = await Analytics.getGenderAgeBreakdown(gachaId, { days: 30 });

      // 時間別統計を取得（過去24時間）
      const hourlyStatsQuery = `
        SELECT 
          hour_bucket,
          draws_count,
          unique_users,
          revenue
        FROM gacha_hourly_stats
        WHERE gacha_id = $1 
          AND hour_bucket >= NOW() - INTERVAL '24 hours'
        ORDER BY hour_bucket
      `;
      const hourlyStats = await database.query(hourlyStatsQuery, [gachaId]);

      reply.send({
        data: {
          gacha_id: gachaId,
          statistics: statistics.basic,
          most_popular_item: statistics.most_popular_item,
          demographics: {
            gender_breakdown: demographics.gender_breakdown,
            age_breakdown: demographics.age_breakdown,
            gender_revenue: Object.fromEntries(
              Object.entries(demographics.gender_breakdown).map(([k, v]) => [k, v.revenue])
            ),
            age_revenue: Object.fromEntries(
              Object.entries(demographics.age_breakdown).map(([k, v]) => [k, v.revenue])
            )
          },
          hourly_stats: hourlyStats.rows,
          user_demographics: {
            total_users: statistics.basic.unique_users,
            new_users: statistics.demographics.filter(d => d.draws_count <= 3).length,
            returning_users: statistics.demographics.filter(d => d.draws_count > 3).length
          }
        }
      });

    } catch (error) {
      console.error('Analytics API error:', error);
      reply.code(500).send({
        error: '分析データの取得に失敗しました',
        details: error.message
      });
    }
  });

  // 全体ダッシュボード用統計データ
  fastify.get('/dashboard', {
    preHandler: [fastify.authenticate, checkAdminAccess]
  }, async (request, reply) => {
    try {
      const dashboardStats = await Analytics.getDashboardStats();

      reply.send({
        data: {
          total_gachas: dashboardStats.summary.total_gachas,
          total_draws: dashboardStats.summary.total_draws,
          total_users: dashboardStats.summary.total_users,
          revenue_summary: {
            today: dashboardStats.summary.revenue_today || 0,
            this_week: dashboardStats.summary.revenue_week || 0,
            this_month: dashboardStats.summary.revenue_month || 0
          },
          popular_gachas: dashboardStats.popular_gachas.map(gacha => ({
            id: gacha.id,
            name: gacha.name,
            total_draws: parseInt(gacha.total_draws),
            unique_users: parseInt(gacha.unique_users),
            ranking: parseInt(gacha.ranking)
          }))
        }
      });

    } catch (error) {
      console.error('Dashboard API error:', error);
      reply.code(500).send({
        error: 'ダッシュボードデータの取得に失敗しました',
        details: error.message
      });
    }
  });

  // カテゴリ別統計
  fastify.get('/category-stats', {
    preHandler: [fastify.authenticate, checkAdminAccess]
  }, async (request, reply) => {
    try {
      const query = `
        SELECT 
          gc.id,
          gc.name,
          COUNT(DISTINCT g.id) as total_gachas,
          COUNT(gr.id) as total_draws,
          COUNT(DISTINCT gr.user_id) as unique_users,
          SUM(g.price) as total_revenue,
          AVG(ugr.rating) as avg_rating
        FROM gacha_categories gc
        LEFT JOIN gacha_category_mappings gcm ON gc.id = gcm.category_id
        LEFT JOIN gachas g ON gcm.gacha_id = g.id
        LEFT JOIN gacha_results gr ON g.id = gr.gacha_id
        LEFT JOIN user_gacha_ratings ugr ON g.id = ugr.gacha_id
        GROUP BY gc.id, gc.name
        ORDER BY total_draws DESC
      `;

      const result = await database.query(query);

      reply.send({
        data: result.rows.map(row => ({
          category_id: row.id,
          category_name: row.name,
          total_gachas: parseInt(row.total_gachas || 0),
          total_draws: parseInt(row.total_draws || 0),
          unique_users: parseInt(row.unique_users || 0),
          total_revenue: parseInt(row.total_revenue || 0),
          avg_rating: row.avg_rating ? parseFloat(row.avg_rating) : null
        }))
      });

    } catch (error) {
      console.error('Category stats API error:', error);
      reply.code(500).send({
        error: 'カテゴリ別統計の取得に失敗しました',
        details: error.message
      });
    }
  });

  // ユーザー行動分析
  fastify.get('/user-behavior', {
    preHandler: [fastify.authenticate, checkAdminAccess],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'integer', minimum: 1, maximum: 365, default: 7 },
          action_type: { 
            type: 'string', 
            enum: ['view_gacha', 'draw_gacha', 'favorite_gacha', 'share_gacha'] 
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const days = request.query.days || 7;
      const actionType = request.query.action_type;

      let actionCondition = '';
      const params = [days];

      if (actionType) {
        actionCondition = 'AND action_type = $2';
        params.push(actionType);
      }

      const query = `
        SELECT 
          DATE(created_at) as activity_date,
          action_type,
          COUNT(*) as activity_count,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT gacha_id) as unique_gachas
        FROM user_activity_logs
        WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
          ${actionCondition}
        GROUP BY DATE(created_at), action_type
        ORDER BY activity_date DESC, action_type
      `;

      const result = await database.query(query, params);

      // デバイス・ブラウザ分析
      const deviceQuery = `
        SELECT 
          CASE 
            WHEN user_agent ILIKE '%Mobile%' OR user_agent ILIKE '%Android%' OR user_agent ILIKE '%iPhone%' THEN 'mobile'
            WHEN user_agent ILIKE '%Tablet%' OR user_agent ILIKE '%iPad%' THEN 'tablet'
            ELSE 'desktop'
          END as device_type,
          CASE 
            WHEN user_agent ILIKE '%Chrome%' THEN 'Chrome'
            WHEN user_agent ILIKE '%Firefox%' THEN 'Firefox'
            WHEN user_agent ILIKE '%Safari%' AND user_agent NOT ILIKE '%Chrome%' THEN 'Safari'
            WHEN user_agent ILIKE '%Edge%' THEN 'Edge'
            ELSE 'Other'
          END as browser_type,
          COUNT(*) as activity_count,
          COUNT(DISTINCT user_id) as unique_users
        FROM user_activity_logs
        WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY device_type, browser_type
        ORDER BY activity_count DESC
      `;

      const deviceStats = await database.query(deviceQuery);

      reply.send({
        data: {
          daily_activity: result.rows.map(row => ({
            date: row.activity_date,
            action_type: row.action_type,
            activity_count: parseInt(row.activity_count),
            unique_users: parseInt(row.unique_users),
            unique_gachas: parseInt(row.unique_gachas)
          })),
          device_breakdown: deviceStats.rows.map(row => ({
            device_type: row.device_type,
            browser_type: row.browser_type,
            activity_count: parseInt(row.activity_count),
            unique_users: parseInt(row.unique_users)
          }))
        }
      });

    } catch (error) {
      console.error('User behavior API error:', error);
      reply.code(500).send({
        error: 'ユーザー行動分析の取得に失敗しました',
        details: error.message
      });
    }
  });

  // パーソナライゼーション分析（特定ユーザー向け）
  fastify.get('/personalization/:userId', {
    preHandler: [fastify.authenticate, checkAdminAccess],
    schema: {
      params: {
        type: 'object',
        properties: {
          userId: { type: 'integer' }
        },
        required: ['userId']
      }
    }
  }, async (request, reply) => {
    try {
      const userId = request.params.userId;

      // ユーザーの推薦ガチャを取得
      const personalizedGachas = await RecommendationEngine.getPersonalizedGachas(userId, { 
        limit: 5,
        excludeUserOwned: true 
      });

      // 協調フィルタリングによる推薦
      const collaborativeRecs = await RecommendationEngine.getCollaborativeRecommendations(userId, { 
        limit: 5 
      });

      // 類似ユーザーを取得
      const similarUsers = await RecommendationEngine.findSimilarUsers(userId, 5);

      // ユーザーの興味プロファイル
      const interestQuery = `
        SELECT 
          gc.name as category_name,
          uic.interest_level,
          uic.created_at as last_updated
        FROM user_interest_categories uic
        JOIN gacha_categories gc ON uic.category_id = gc.id
        WHERE uic.user_id = $1
        ORDER BY uic.interest_level DESC, gc.name
      `;

      const interests = await database.query(interestQuery, [userId]);

      reply.send({
        data: {
          user_id: userId,
          personalized_recommendations: personalizedGachas,
          collaborative_recommendations: collaborativeRecs,
          similar_users: similarUsers,
          interest_profile: interests.rows.map(row => ({
            category: row.category_name,
            interest_level: row.interest_level,
            last_updated: row.last_updated
          }))
        }
      });

    } catch (error) {
      console.error('Personalization API error:', error);
      reply.code(500).send({
        error: 'パーソナライゼーション分析の取得に失敗しました',
        details: error.message
      });
    }
  });

  // 統計更新の手動実行（開発・デバッグ用）
  fastify.post('/update-stats', {
    preHandler: [fastify.authenticate, checkAdminAccess]
  }, async (request, reply) => {
    try {
      // 時間別統計更新
      const hourlyResult = await Analytics.updateHourlyStats();
      
      // デモグラフィック統計更新
      const demographicResult = await Analytics.updateDemographicStats();

      reply.send({
        data: {
          message: '統計更新が完了しました',
          results: {
            hourly_stats_updated: hourlyResult,
            demographic_stats_updated: demographicResult
          }
        }
      });

    } catch (error) {
      console.error('Stats update API error:', error);
      reply.code(500).send({
        error: '統計更新に失敗しました',
        details: error.message
      });
    }
  });
}