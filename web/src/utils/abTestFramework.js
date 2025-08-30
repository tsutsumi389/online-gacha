import database from '../config/database.js';
import cacheManager from './cacheManager.js';

class ABTestFramework {
  constructor() {
    this.activeTests = new Map();
    this.userAssignments = new Map();
    this.loadActiveTests();
  }

  /**
   * アクティブなA/Bテストを読み込み
   */
  async loadActiveTests() {
    try {
      const query = `
        SELECT 
          id, name, description, config, variants, 
          traffic_allocation, start_date, end_date,
          target_criteria, status
        FROM ab_tests 
        WHERE status = 'active' 
          AND start_date <= NOW() 
          AND (end_date IS NULL OR end_date > NOW())
      `;
      
      const result = await database.query(query);
      
      result.rows.forEach(test => {
        this.activeTests.set(test.id, {
          ...test,
          config: typeof test.config === 'string' ? JSON.parse(test.config) : test.config,
          variants: typeof test.variants === 'string' ? JSON.parse(test.variants) : test.variants,
          target_criteria: typeof test.target_criteria === 'string' 
            ? JSON.parse(test.target_criteria) : test.target_criteria
        });
      });

      console.log(`Loaded ${this.activeTests.size} active A/B tests`);
    } catch (error) {
      console.error('Failed to load A/B tests:', error);
    }
  }

  /**
   * ユーザーをA/Bテストのバリアントに割り当て
   * @param {number} userId - ユーザーID
   * @param {string} testName - テスト名
   * @param {Object} userContext - ユーザーコンテキスト（デモグラフィック情報など）
   * @returns {string|null} バリアント名
   */
  async assignUserToTest(userId, testName, userContext = {}) {
    try {
      // キャッシュから既存の割り当てを確認
      const cacheKey = `ab_assignment_${userId}_${testName}`;
      let assignment = await cacheManager.get(cacheKey);
      
      if (assignment) {
        return assignment.variant;
      }

      // アクティブなテストを検索
      const test = Array.from(this.activeTests.values())
        .find(t => t.name === testName);

      if (!test) {
        return null;
      }

      // ターゲット基準をチェック
      if (!this.matchesTargetCriteria(userContext, test.target_criteria)) {
        return null;
      }

      // データベースから既存の割り当てを確認
      const existingQuery = `
        SELECT variant, assigned_at 
        FROM ab_test_assignments 
        WHERE test_id = $1 AND user_id = $2
      `;
      const existingResult = await database.query(existingQuery, [test.id, userId]);

      if (existingResult.rows.length > 0) {
        assignment = {
          variant: existingResult.rows[0].variant,
          assigned_at: existingResult.rows[0].assigned_at
        };
      } else {
        // 新しい割り当てを作成
        const variant = this.determineVariant(userId, test);
        
        if (variant) {
          const insertQuery = `
            INSERT INTO ab_test_assignments (test_id, user_id, variant, user_context, assigned_at)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING variant, assigned_at
          `;
          const insertResult = await database.query(insertQuery, [
            test.id, userId, variant, JSON.stringify(userContext)
          ]);

          assignment = {
            variant: insertResult.rows[0].variant,
            assigned_at: insertResult.rows[0].assigned_at
          };

          // イベントを記録
          this.trackEvent(test.id, userId, 'assigned', { variant });
        }
      }

      // キャッシュに保存（24時間）
      if (assignment) {
        await cacheManager.set(cacheKey, assignment, 24 * 60 * 60);
        return assignment.variant;
      }

      return null;
    } catch (error) {
      console.error(`Error assigning user ${userId} to test ${testName}:`, error);
      return null;
    }
  }

  /**
   * バリアントを決定（ハッシュベースで一貫性を保証）
   * @param {number} userId 
   * @param {Object} test 
   * @returns {string|null}
   */
  determineVariant(userId, test) {
    // ユーザーIDとテストIDからハッシュを生成
    const hash = this.hashUserId(userId, test.id);
    const percentage = hash % 100;

    // トラフィック割り当てをチェック
    if (percentage >= test.traffic_allocation) {
      return null; // テストに参加させない
    }

    // バリアントの重み付けに基づいて選択
    let cumulativeWeight = 0;
    const targetPercentage = (percentage / test.traffic_allocation) * 100;

    for (const variant of test.variants) {
      cumulativeWeight += variant.weight;
      if (targetPercentage < cumulativeWeight) {
        return variant.name;
      }
    }

    // デフォルトはコントロールバリアント
    return test.variants[0]?.name || null;
  }

  /**
   * ユーザーIDのハッシュ化
   * @param {number} userId 
   * @param {number} testId 
   * @returns {number}
   */
  hashUserId(userId, testId) {
    const str = `${userId}_${testId}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }
    return Math.abs(hash);
  }

  /**
   * ターゲット基準との照合
   * @param {Object} userContext 
   * @param {Object} targetCriteria 
   * @returns {boolean}
   */
  matchesTargetCriteria(userContext, targetCriteria) {
    if (!targetCriteria || Object.keys(targetCriteria).length === 0) {
      return true; // 基準がない場合は全員が対象
    }

    for (const [key, criteria] of Object.entries(targetCriteria)) {
      const userValue = userContext[key];
      
      if (criteria.required && userValue === undefined) {
        return false;
      }

      if (criteria.values && !criteria.values.includes(userValue)) {
        return false;
      }

      if (criteria.min_value && userValue < criteria.min_value) {
        return false;
      }

      if (criteria.max_value && userValue > criteria.max_value) {
        return false;
      }
    }

    return true;
  }

  /**
   * A/Bテストイベントを記録
   * @param {number} testId 
   * @param {number} userId 
   * @param {string} eventType 
   * @param {Object} eventData 
   */
  async trackEvent(testId, userId, eventType, eventData = {}) {
    try {
      const query = `
        INSERT INTO ab_test_events (test_id, user_id, event_type, event_data, timestamp)
        VALUES ($1, $2, $3, $4, NOW())
      `;
      await database.query(query, [testId, userId, eventType, JSON.stringify(eventData)]);
    } catch (error) {
      console.error(`Error tracking A/B test event:`, error);
    }
  }

  /**
   * コンバージョン（目標達成）を記録
   * @param {number} userId 
   * @param {string} testName 
   * @param {string} goalName 
   * @param {number} value 
   */
  async trackConversion(userId, testName, goalName, value = 1) {
    try {
      const test = Array.from(this.activeTests.values())
        .find(t => t.name === testName);

      if (!test) return;

      // ユーザーの現在の割り当てを取得
      const assignmentQuery = `
        SELECT variant FROM ab_test_assignments 
        WHERE test_id = $1 AND user_id = $2
      `;
      const assignmentResult = await database.query(assignmentQuery, [test.id, userId]);

      if (assignmentResult.rows.length > 0) {
        const variant = assignmentResult.rows[0].variant;
        
        // コンバージョンイベントを記録
        await this.trackEvent(test.id, userId, 'conversion', {
          variant,
          goal: goalName,
          value
        });

        // 集計テーブルを更新
        const updateQuery = `
          INSERT INTO ab_test_conversions (test_id, variant, goal_name, conversions, total_value)
          VALUES ($1, $2, $3, 1, $4)
          ON CONFLICT (test_id, variant, goal_name) DO UPDATE SET
            conversions = ab_test_conversions.conversions + 1,
            total_value = ab_test_conversions.total_value + $4,
            updated_at = NOW()
        `;
        await database.query(updateQuery, [test.id, variant, goalName, value]);
      }
    } catch (error) {
      console.error(`Error tracking conversion:`, error);
    }
  }

  /**
   * A/Bテストの結果を取得
   * @param {string} testName 
   * @returns {Object}
   */
  async getTestResults(testName) {
    try {
      const test = Array.from(this.activeTests.values())
        .find(t => t.name === testName);

      if (!test) {
        throw new Error(`Test ${testName} not found`);
      }

      // 基本統計
      const statsQuery = `
        SELECT 
          variant,
          COUNT(*) as users,
          COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
        FROM ab_test_assignments 
        WHERE test_id = $1
        GROUP BY variant
        ORDER BY variant
      `;
      const statsResult = await database.query(statsQuery, [test.id]);

      // コンバージョン統計
      const conversionQuery = `
        SELECT 
          variant,
          goal_name,
          conversions,
          total_value,
          conversions * 100.0 / (
            SELECT COUNT(*) 
            FROM ab_test_assignments 
            WHERE test_id = $1 AND variant = ac.variant
          ) as conversion_rate
        FROM ab_test_conversions ac
        WHERE test_id = $1
        ORDER BY variant, goal_name
      `;
      const conversionResult = await database.query(conversionQuery, [test.id]);

      return {
        test_info: {
          id: test.id,
          name: test.name,
          description: test.description,
          start_date: test.start_date,
          end_date: test.end_date,
          status: test.status
        },
        variant_stats: statsResult.rows,
        conversion_stats: conversionResult.rows
      };
    } catch (error) {
      console.error(`Error getting test results for ${testName}:`, error);
      throw error;
    }
  }

  /**
   * A/Bテストを作成
   * @param {Object} testConfig 
   */
  async createTest(testConfig) {
    try {
      const {
        name, description, variants, traffic_allocation = 100,
        target_criteria = {}, config = {}, start_date, end_date
      } = testConfig;

      const query = `
        INSERT INTO ab_tests (
          name, description, variants, traffic_allocation,
          target_criteria, config, start_date, end_date, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')
        RETURNING id, name
      `;

      const result = await database.query(query, [
        name, description, JSON.stringify(variants), traffic_allocation,
        JSON.stringify(target_criteria), JSON.stringify(config),
        start_date, end_date
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error creating A/B test:', error);
      throw error;
    }
  }

  /**
   * A/Bテストを開始
   * @param {number} testId 
   */
  async startTest(testId) {
    try {
      const query = `
        UPDATE ab_tests 
        SET status = 'active', start_date = COALESCE(start_date, NOW())
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await database.query(query, [testId]);
      
      if (result.rows.length > 0) {
        // アクティブテストを再読み込み
        await this.loadActiveTests();
        return result.rows[0];
      }
      
      throw new Error('Test not found');
    } catch (error) {
      console.error(`Error starting test ${testId}:`, error);
      throw error;
    }
  }

  /**
   * A/Bテストを停止
   * @param {number} testId 
   */
  async stopTest(testId) {
    try {
      const query = `
        UPDATE ab_tests 
        SET status = 'completed', end_date = NOW()
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await database.query(query, [testId]);
      
      if (result.rows.length > 0) {
        // アクティブテストから削除
        this.activeTests.delete(testId);
        return result.rows[0];
      }
      
      throw new Error('Test not found');
    } catch (error) {
      console.error(`Error stopping test ${testId}:`, error);
      throw error;
    }
  }
}

// シングルトンインスタンス
const abTestFramework = new ABTestFramework();

export default abTestFramework;