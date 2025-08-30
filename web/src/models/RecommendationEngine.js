import database from '../config/database.js';

class RecommendationEngine {
  /**
   * ユーザーの趣味嗜好に基づくガチャ推薦
   * @param {number} userId - ユーザーID
   * @param {Object} options - 推薦オプション
   * @returns {Array} 推薦ガチャリスト
   */
  static async getPersonalizedGachas(userId, options = {}) {
    try {
      const limit = options.limit || 10;
      const excludeUserOwned = options.excludeUserOwned || false;

      let excludeCondition = '';
      if (excludeUserOwned) {
        excludeCondition = 'AND g.user_id != $2';
      }

      const query = `
        WITH user_interests AS (
          SELECT category_id, interest_level
          FROM user_interest_categories
          WHERE user_id = $1
        ),
        user_activity AS (
          SELECT gacha_id, COUNT(*) as interaction_count
          FROM user_activity_logs
          WHERE user_id = $1 AND action_type IN ('view_gacha', 'draw_gacha', 'favorite_gacha')
          GROUP BY gacha_id
        ),
        gacha_scores AS (
          SELECT 
            g.id,
            g.name,
            g.description,
            g.price,
            g.user_id,
            -- 基本スコア（人気度ベース）
            COALESCE(gs.total_draws, 0) * 0.1 as popularity_score,
            
            -- 興味カテゴリスコア
            COALESCE(AVG(ui.interest_level * 20), 0) as interest_score,
            
            -- 年齢・性別マッチングスコア
            CASE 
              WHEN v.age_group = (SELECT age_group FROM v_users_with_demographics WHERE id = $1) THEN 10
              ELSE 0
            END as age_match_score,
            
            CASE 
              WHEN v.gender = (SELECT gender FROM v_users_with_demographics WHERE id = $1) THEN 5
              ELSE 0
            END as gender_match_score,
            
            -- 価格スコア（ユーザーの平均支払い額に近いほど高スコア）
            CASE 
              WHEN g.price BETWEEN 
                (SELECT AVG(g2.price) * 0.8 FROM gacha_results gr2 JOIN gachas g2 ON gr2.gacha_id = g2.id WHERE gr2.user_id = $1)
                AND 
                (SELECT AVG(g2.price) * 1.2 FROM gacha_results gr2 JOIN gachas g2 ON gr2.gacha_id = g2.id WHERE gr2.user_id = $1)
              THEN 10
              ELSE 0
            END as price_match_score,
            
            -- 平均評価スコア
            COALESCE(AVG(ugr.rating) * 5, 0) as rating_score,
            
            -- 既に評価済みなら減点
            CASE WHEN EXISTS(SELECT 1 FROM user_gacha_ratings WHERE user_id = $1 AND gacha_id = g.id) THEN -20 ELSE 0 END as already_rated_penalty,
            
            -- 最近の活動があるガチャは優遇
            CASE WHEN g.updated_at >= CURRENT_DATE - INTERVAL '7 days' THEN 5 ELSE 0 END as recency_score
            
          FROM gachas g
          LEFT JOIN gacha_category_mappings gcm ON g.id = gcm.gacha_id
          LEFT JOIN user_interests ui ON gcm.category_id = ui.category_id
          LEFT JOIN gacha_statistics gs ON g.id = gs.gacha_id
          LEFT JOIN v_users_with_demographics v ON g.user_id = v.id
          LEFT JOIN user_gacha_ratings ugr ON g.id = ugr.gacha_id
          WHERE g.is_public = true 
            AND g.display_from <= NOW() 
            AND (g.display_to IS NULL OR g.display_to >= NOW())
            ${excludeCondition}
          GROUP BY g.id, g.name, g.description, g.price, g.user_id, gs.total_draws, v.age_group, v.gender, g.updated_at
        )
        SELECT 
          gs.*,
          (gs.popularity_score + gs.interest_score + gs.age_match_score + gs.gender_match_score + 
           gs.price_match_score + gs.rating_score + gs.already_rated_penalty + gs.recency_score) as total_score
        FROM gacha_scores gs
        ORDER BY total_score DESC, gs.id
        LIMIT $${excludeUserOwned ? 3 : 2}
      `;

      const params = excludeUserOwned ? [userId, userId, limit] : [userId, limit];
      const result = await database.query(query, params);

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        price: row.price,
        userId: row.user_id,
        personalizationScore: parseFloat(row.total_score),
        scoreBreakdown: {
          popularity: parseFloat(row.popularity_score),
          interest: parseFloat(row.interest_score),
          ageMatch: parseFloat(row.age_match_score),
          genderMatch: parseFloat(row.gender_match_score),
          priceMatch: parseFloat(row.price_match_score),
          rating: parseFloat(row.rating_score),
          recency: parseFloat(row.recency_score)
        }
      }));
    } catch (error) {
      console.error('Error getting personalized gachas:', error);
      throw error;
    }
  }

  /**
   * ユーザーの行動履歴から興味プロファイルを更新
   * @param {number} userId - ユーザーID
   */
  static async updateUserInterestProfile(userId) {
    try {
      // ユーザーの最近の行動を分析
      const activityQuery = `
        SELECT 
          gcm.category_id,
          ual.action_type,
          COUNT(*) as action_count,
          MAX(ual.created_at) as last_action
        FROM user_activity_logs ual
        JOIN gacha_category_mappings gcm ON ual.gacha_id = gcm.gacha_id
        WHERE ual.user_id = $1 
          AND ual.created_at >= CURRENT_DATE - INTERVAL '30 days'
          AND ual.action_type IN ('view_gacha', 'draw_gacha', 'favorite_gacha')
        GROUP BY gcm.category_id, ual.action_type
      `;

      const activities = await database.query(activityQuery, [userId]);

      // 行動タイプ別の重み
      const actionWeights = {
        'view_gacha': 1,
        'draw_gacha': 3,
        'favorite_gacha': 5
      };

      // カテゴリ別の興味スコアを計算
      const categoryScores = {};
      activities.rows.forEach(activity => {
        const categoryId = activity.category_id;
        const weight = actionWeights[activity.action_type] || 1;
        const score = activity.action_count * weight;

        if (!categoryScores[categoryId]) {
          categoryScores[categoryId] = 0;
        }
        categoryScores[categoryId] += score;
      });

      // 興味レベルを1-5の範囲に正規化
      const maxScore = Math.max(...Object.values(categoryScores), 1);
      const updatedInterests = [];

      for (const [categoryId, score] of Object.entries(categoryScores)) {
        const normalizedLevel = Math.min(5, Math.max(1, Math.ceil((score / maxScore) * 5)));
        
        const upsertQuery = `
          INSERT INTO user_interest_categories (user_id, category_id, interest_level)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, category_id) DO UPDATE SET
            interest_level = GREATEST(user_interest_categories.interest_level, EXCLUDED.interest_level),
            created_at = CASE 
              WHEN user_interest_categories.interest_level < EXCLUDED.interest_level 
              THEN NOW() 
              ELSE user_interest_categories.created_at 
            END
        `;

        await database.query(upsertQuery, [userId, categoryId, normalizedLevel]);
        updatedInterests.push({ categoryId: parseInt(categoryId), level: normalizedLevel });
      }

      return updatedInterests;
    } catch (error) {
      console.error('Error updating user interest profile:', error);
      throw error;
    }
  }

  /**
   * 類似ユーザーを見つける
   * @param {number} userId - ユーザーID
   * @param {number} limit - 結果数制限
   * @returns {Array} 類似ユーザーリスト
   */
  static async findSimilarUsers(userId, limit = 10) {
    try {
      const query = `
        WITH target_user_interests AS (
          SELECT category_id, interest_level
          FROM user_interest_categories
          WHERE user_id = $1
        ),
        user_similarity AS (
          SELECT 
            uic.user_id,
            v.name,
            v.age_group,
            v.gender,
            -- 興味の類似度を計算（コサイン類似度の簡易版）
            SUM(uic.interest_level * COALESCE(tui.interest_level, 0)) / 
            (SQRT(SUM(uic.interest_level * uic.interest_level)) * 
             SQRT(SUM(COALESCE(tui.interest_level, 0) * COALESCE(tui.interest_level, 0)))) as similarity_score
          FROM user_interest_categories uic
          LEFT JOIN target_user_interests tui ON uic.category_id = tui.category_id
          JOIN v_users_with_demographics v ON uic.user_id = v.id
          WHERE uic.user_id != $1
          GROUP BY uic.user_id, v.name, v.age_group, v.gender
          HAVING COUNT(tui.category_id) > 0  -- 共通の興味カテゴリがある
        )
        SELECT *
        FROM user_similarity
        WHERE similarity_score > 0.3  -- 類似度30%以上
        ORDER BY similarity_score DESC
        LIMIT $2
      `;

      const result = await database.query(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      console.error('Error finding similar users:', error);
      throw error;
    }
  }

  /**
   * 協調フィルタリングによる推薦
   * @param {number} userId - ユーザーID
   * @param {Object} options - オプション
   * @returns {Array} 推薦ガチャリスト
   */
  static async getCollaborativeRecommendations(userId, options = {}) {
    try {
      const limit = options.limit || 5;

      const query = `
        WITH similar_users AS (
          SELECT 
            uic.user_id,
            -- 興味の類似度計算
            SUM(uic.interest_level * COALESCE(target.interest_level, 0)) as similarity_score
          FROM user_interest_categories uic
          LEFT JOIN (
            SELECT category_id, interest_level 
            FROM user_interest_categories 
            WHERE user_id = $1
          ) target ON uic.category_id = target.category_id
          WHERE uic.user_id != $1
          GROUP BY uic.user_id
          HAVING SUM(uic.interest_level * COALESCE(target.interest_level, 0)) > 10
          ORDER BY similarity_score DESC
          LIMIT 20
        ),
        recommended_gachas AS (
          SELECT 
            ugr.gacha_id,
            g.name,
            g.description,
            g.price,
            AVG(ugr.rating) as avg_rating,
            COUNT(*) as recommendation_count,
            AVG(su.similarity_score) as avg_similarity
          FROM user_gacha_ratings ugr
          JOIN similar_users su ON ugr.user_id = su.user_id
          JOIN gachas g ON ugr.gacha_id = g.id
          WHERE ugr.rating >= 4  -- 高評価のみ
            AND ugr.gacha_id NOT IN (
              SELECT gacha_id FROM user_gacha_ratings WHERE user_id = $1
            )  -- 未評価のガチャのみ
            AND g.is_public = true
            AND g.display_from <= NOW()
            AND (g.display_to IS NULL OR g.display_to >= NOW())
          GROUP BY ugr.gacha_id, g.name, g.description, g.price
          HAVING COUNT(*) >= 2  -- 複数の類似ユーザーが評価
        )
        SELECT 
          gacha_id as id,
          name,
          description,
          price,
          avg_rating,
          recommendation_count,
          avg_similarity,
          (avg_rating * 20 + recommendation_count * 5 + avg_similarity * 0.1) as recommendation_score
        FROM recommended_gachas
        ORDER BY recommendation_score DESC
        LIMIT $2
      `;

      const result = await database.query(query, [userId, limit]);
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        price: row.price,
        avgRating: parseFloat(row.avg_rating),
        recommendationCount: parseInt(row.recommendation_count),
        recommendationScore: parseFloat(row.recommendation_score)
      }));
    } catch (error) {
      console.error('Error getting collaborative recommendations:', error);
      throw error;
    }
  }

  /**
   * パーソナライゼーションスコアを計算
   * @param {number} userId - ユーザーID
   * @param {number} gachaId - ガチャID
   * @returns {number} パーソナライゼーションスコア
   */
  static async calculatePersonalizationScore(userId, gachaId) {
    try {
      const query = `
        WITH user_profile AS (
          SELECT 
            v.age_group,
            v.gender,
            AVG(g.price) as avg_spend
          FROM v_users_with_demographics v
          LEFT JOIN gacha_results gr ON v.id = gr.user_id
          LEFT JOIN gachas g ON gr.gacha_id = g.id
          WHERE v.id = $1
          GROUP BY v.id, v.age_group, v.gender
        ),
        gacha_info AS (
          SELECT 
            g.*,
            COALESCE(gs.total_draws, 0) as total_draws,
            COALESCE(AVG(ugr.rating), 0) as avg_rating
          FROM gachas g
          LEFT JOIN gacha_statistics gs ON g.id = gs.gacha_id
          LEFT JOIN user_gacha_ratings ugr ON g.id = ugr.gacha_id
          WHERE g.id = $2
          GROUP BY g.id, gs.total_draws
        ),
        interest_match AS (
          SELECT AVG(uic.interest_level) as avg_interest_level
          FROM user_interest_categories uic
          JOIN gacha_category_mappings gcm ON uic.category_id = gcm.category_id
          WHERE uic.user_id = $1 AND gcm.gacha_id = $2
        )
        SELECT 
          -- 人気度スコア (0-20点)
          LEAST(20, gi.total_draws * 0.1) as popularity_score,
          
          -- 興味マッチスコア (0-25点)
          COALESCE(im.avg_interest_level * 5, 0) as interest_score,
          
          -- 価格マッチスコア (0-15点)
          CASE 
            WHEN up.avg_spend IS NOT NULL AND gi.price BETWEEN up.avg_spend * 0.8 AND up.avg_spend * 1.2 
            THEN 15
            WHEN up.avg_spend IS NOT NULL AND gi.price BETWEEN up.avg_spend * 0.6 AND up.avg_spend * 1.4 
            THEN 10
            WHEN up.avg_spend IS NOT NULL AND gi.price BETWEEN up.avg_spend * 0.4 AND up.avg_spend * 1.6 
            THEN 5
            ELSE 0
          END as price_score,
          
          -- 評価スコア (0-25点)
          gi.avg_rating * 5 as rating_score,
          
          -- 新しさスコア (0-10点)
          CASE 
            WHEN gi.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 10
            WHEN gi.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 5
            ELSE 0
          END as recency_score,
          
          -- ペナルティ
          CASE WHEN EXISTS(SELECT 1 FROM user_gacha_ratings WHERE user_id = $1 AND gacha_id = $2) THEN -20 ELSE 0 END as already_rated_penalty
          
        FROM gacha_info gi
        CROSS JOIN user_profile up
        CROSS JOIN interest_match im
      `;

      const result = await database.query(query, [userId, gachaId]);
      
      if (result.rows.length === 0) {
        return 0;
      }

      const scores = result.rows[0];
      const totalScore = parseFloat(scores.popularity_score || 0) + 
                        parseFloat(scores.interest_score || 0) + 
                        parseFloat(scores.price_score || 0) + 
                        parseFloat(scores.rating_score || 0) + 
                        parseFloat(scores.recency_score || 0) + 
                        parseFloat(scores.already_rated_penalty || 0);

      return Math.max(0, Math.min(100, totalScore)); // 0-100の範囲に正規化
    } catch (error) {
      console.error('Error calculating personalization score:', error);
      throw error;
    }
  }
}

export default RecommendationEngine;