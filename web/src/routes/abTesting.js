import abTestFramework from '../utils/abTestFramework.js';

// JSON Schemaバリデーション（Fastify用）
const testCreationSchema = {
  type: 'object',
  required: ['name', 'variants'],
  properties: {
    name: { type: 'string', minLength: 3, maxLength: 100 },
    description: { type: 'string', maxLength: 500 },
    variants: {
      type: 'array',
      minItems: 2,
      items: {
        type: 'object',
        required: ['name', 'weight'],
        properties: {
          name: { type: 'string' },
          weight: { type: 'number', minimum: 0, maximum: 100 }
        }
      }
    },
    traffic_allocation: { type: 'number', minimum: 1, maximum: 100, default: 100 },
    target_criteria: { type: 'object' },
    config: { type: 'object' },
    start_date: { type: 'string', format: 'date-time' },
    end_date: { type: 'string', format: 'date-time' }
  }
};

const conversionTrackingSchema = {
  type: 'object',
  required: ['test_name', 'goal_name'],
  properties: {
    test_name: { type: 'string' },
    goal_name: { type: 'string' },
    value: { type: 'number', minimum: 0, default: 1 }
  }
};

export default async function abTestingRoutes(fastify, options) {

  /**
   * ユーザーをA/Bテストに割り当て
   */
  fastify.get('/ab-test/assign/:testName', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { testName } = request.params;
      const userId = request.user.id;
      
      // ユーザーコンテキストの構築
      const userContext = {
        age_group: request.user.age_group,
        gender: request.user.gender,
        total_draws: request.user.total_draws || 0,
        signup_date: request.user.created_at,
        last_login: request.user.last_login_at
      };

      const variant = await abTestFramework.assignUserToTest(userId, testName, userContext);
      
      return {
        data: {
          test_name: testName,
          variant: variant,
          user_id: userId,
          assigned: variant !== null
        }
      };
    } catch (error) {
      console.error('A/B test assignment error:', error);
      return reply.status(500).send({
        error: 'A/Bテストの割り当てに失敗しました',
        details: error.message
      });
    }
  });

  /**
   * コンバージョンを記録
   */
  fastify.post('/ab-test/conversion', {
    preHandler: [fastify.authenticate],
    schema: {
      body: conversionTrackingSchema
    }
  }, async (request, reply) => {
    try {
      const { test_name, goal_name, value } = request.body;
      const userId = request.user.id;

      await abTestFramework.trackConversion(userId, test_name, goal_name, value);
      
      return {
        success: true,
        message: 'コンバージョンを記録しました'
      };
    } catch (error) {
      console.error('Conversion tracking error:', error);
      return reply.status(500).send({
        error: 'コンバージョンの記録に失敗しました',
        details: error.message
      });
    }
  });

  /**
   * A/Bテストを作成（管理者用）
   */
  fastify.post('/ab-test/create', {
    preHandler: [fastify.authenticate], // TODO: 管理者権限チェックを追加
    schema: {
      body: testCreationSchema
    }
  }, async (request, reply) => {
    try {
      const testConfig = request.body;
      
      // バリアントの重みの合計が100であることを確認
      const totalWeight = testConfig.variants.reduce((sum, v) => sum + v.weight, 0);
      if (totalWeight !== 100) {
        return reply.status(400).send({
          error: 'バリアントの重みの合計は100である必要があります',
          current_total: totalWeight
        });
      }

      const result = await abTestFramework.createTest(testConfig);
      
      return {
        success: true,
        message: 'A/Bテストを作成しました',
        data: result
      };
    } catch (error) {
      console.error('A/B test creation error:', error);
      return reply.status(500).send({
        error: 'A/Bテストの作成に失敗しました',
        details: error.message
      });
    }
  });

  /**
   * A/Bテストを開始
   */
  fastify.post('/ab-test/:testId/start', {
    preHandler: [fastify.authenticate] // TODO: 管理者権限チェックを追加
  }, async (request, reply) => {
    try {
      const testId = parseInt(request.params.testId);
      
      if (isNaN(testId)) {
        return reply.status(400).send({ error: '無効なテストIDです' });
      }

      const result = await abTestFramework.startTest(testId);
      
      return {
        success: true,
        message: 'A/Bテストを開始しました',
        data: result
      };
    } catch (error) {
      console.error('A/B test start error:', error);
      return reply.status(500).send({
        error: 'A/Bテストの開始に失敗しました',
        details: error.message
      });
    }
  });

  /**
   * A/Bテストを停止
   */
  fastify.post('/ab-test/:testId/stop', {
    preHandler: [fastify.authenticate] // TODO: 管理者権限チェックを追加
  }, async (request, reply) => {
    try {
      const testId = parseInt(request.params.testId);
      
      if (isNaN(testId)) {
        return reply.status(400).send({ error: '無効なテストIDです' });
      }

      const result = await abTestFramework.stopTest(testId);
      
      return {
        success: true,
        message: 'A/Bテストを停止しました',
        data: result
      };
    } catch (error) {
      console.error('A/B test stop error:', error);
      return reply.status(500).send({
        error: 'A/Bテストの停止に失敗しました',
        details: error.message
      });
    }
  });

  /**
   * A/Bテスト結果を取得
   */
  fastify.get('/ab-test/:testName/results', {
    preHandler: [fastify.authenticate] // TODO: 管理者権限チェックを追加
  }, async (request, reply) => {
    try {
      const { testName } = request.params;
      const results = await abTestFramework.getTestResults(testName);
      
      return {
        data: results
      };
    } catch (error) {
      console.error('A/B test results error:', error);
      return reply.status(500).send({
        error: 'A/Bテスト結果の取得に失敗しました',
        details: error.message
      });
    }
  });

  /**
   * すべてのA/Bテスト一覧を取得
   */
  fastify.get('/ab-test/list', {
    preHandler: [fastify.authenticate] // TODO: 管理者権限チェックを追加
  }, async (request, reply) => {
    try {
      const { status = 'all', limit = 50, offset = 0 } = request.query;
      
      let whereClause = '';
      const params = [];
      
      if (status !== 'all') {
        whereClause = 'WHERE status = $1';
        params.push(status);
      }
      
      const query = `
        SELECT 
          id, name, description, status, 
          start_date, end_date, traffic_allocation,
          (SELECT COUNT(*) FROM ab_test_assignments WHERE test_id = ab_tests.id) as total_assignments,
          created_at, updated_at
        FROM ab_tests 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;
      
      params.push(parseInt(limit), parseInt(offset));
      
      const result = await fastify.database.query(query, params);
      
      // 総数を取得
      const countQuery = `SELECT COUNT(*) FROM ab_tests ${whereClause}`;
      const countParams = status !== 'all' ? [status] : [];
      const countResult = await fastify.database.query(countQuery, countParams);
      
      return {
        data: result.rows,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: parseInt(countResult.rows[0].count)
        }
      };
    } catch (error) {
      console.error('A/B test list error:', error);
      return reply.status(500).send({
        error: 'A/Bテスト一覧の取得に失敗しました',
        details: error.message
      });
    }
  });

  /**
   * 現在のユーザーの参加中テスト一覧を取得
   */
  fastify.get('/ab-test/my-assignments', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const userId = request.user.id;
      
      const query = `
        SELECT 
          t.id, t.name, t.description,
          a.variant, a.assigned_at,
          t.status, t.start_date, t.end_date
        FROM ab_test_assignments a
        JOIN ab_tests t ON a.test_id = t.id
        WHERE a.user_id = $1 AND t.status = 'active'
        ORDER BY a.assigned_at DESC
      `;
      
      const result = await fastify.database.query(query, [userId]);
      
      return {
        data: result.rows
      };
    } catch (error) {
      console.error('User A/B test assignments error:', error);
      return reply.status(500).send({
        error: 'ユーザーのA/Bテスト参加状況の取得に失敗しました',
        details: error.message
      });
    }
  });
}