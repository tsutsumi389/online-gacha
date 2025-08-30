// ユーザー設定・趣味嗜好APIルート
import database from '../config/database.js';
import RecommendationEngine from '../models/RecommendationEngine.js';

export default async function preferencesRoutes(fastify, options) {

  // ユーザー設定を取得
  fastify.get('/preferences', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const userId = request.user.id;

      // ユーザー設定を取得
      const preferencesQuery = `
        SELECT 
          sort_preference,
          theme_preference,
          notification_enabled,
          language,
          created_at,
          updated_at
        FROM user_preferences
        WHERE user_id = $1
      `;

      const preferences = await database.query(preferencesQuery, [userId]);

      // 興味カテゴリを取得
      const interestsQuery = `
        SELECT 
          gc.id as category_id,
          gc.name as category_name,
          gc.description as category_description,
          uic.interest_level,
          uic.created_at as interest_since
        FROM user_interest_categories uic
        JOIN gacha_categories gc ON uic.category_id = gc.id
        WHERE uic.user_id = $1
        ORDER BY uic.interest_level DESC, gc.name
      `;

      const interests = await database.query(interestsQuery, [userId]);

      // デフォルト設定を返す場合
      if (preferences.rows.length === 0) {
        reply.send({
          data: {
            sort_preference: 'newest',
            theme_preference: 'light',
            notification_enabled: true,
            language: 'ja',
            interest_categories: interests.rows,
            created_at: null,
            updated_at: null
          }
        });
      } else {
        reply.send({
          data: {
            ...preferences.rows[0],
            interest_categories: interests.rows
          }
        });
      }

    } catch (error) {
      console.error('Get preferences API error:', error);
      reply.code(500).send({
        error: 'ユーザー設定の取得に失敗しました',
        details: error.message
      });
    }
  });

  // ユーザー設定を更新
  fastify.put('/preferences', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          sort_preference: { 
            type: 'string', 
            enum: ['newest', 'oldest', 'popular', 'price_low', 'price_high', 'personalized']
          },
          theme_preference: { 
            type: 'string', 
            enum: ['light', 'dark', 'auto']
          },
          notification_enabled: { type: 'boolean' },
          language: { 
            type: 'string', 
            enum: ['ja', 'en']
          },
          interest_categories: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                category_id: { type: 'integer' },
                interest_level: { type: 'integer', minimum: 1, maximum: 5 }
              },
              required: ['category_id', 'interest_level']
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const userId = request.user.id;
      const {
        sort_preference,
        theme_preference,
        notification_enabled,
        language,
        interest_categories
      } = request.body;

      const client = await database.getClient();

      try {
        await client.query('BEGIN');

        // ユーザー設定をUPSERT
        const updatePreferencesQuery = `
          INSERT INTO user_preferences (
            user_id, sort_preference, theme_preference, notification_enabled, language
          )
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (user_id) DO UPDATE SET
            sort_preference = COALESCE(EXCLUDED.sort_preference, user_preferences.sort_preference),
            theme_preference = COALESCE(EXCLUDED.theme_preference, user_preferences.theme_preference),
            notification_enabled = COALESCE(EXCLUDED.notification_enabled, user_preferences.notification_enabled),
            language = COALESCE(EXCLUDED.language, user_preferences.language),
            updated_at = NOW()
          RETURNING *
        `;

        const preferencesResult = await client.query(updatePreferencesQuery, [
          userId, 
          sort_preference, 
          theme_preference, 
          notification_enabled, 
          language
        ]);

        // 興味カテゴリを更新
        if (interest_categories && interest_categories.length > 0) {
          // 既存の興味カテゴリを削除
          await client.query(
            'DELETE FROM user_interest_categories WHERE user_id = $1',
            [userId]
          );

          // 新しい興味カテゴリを挿入
          for (const interest of interest_categories) {
            // カテゴリの存在確認
            const categoryCheck = await client.query(
              'SELECT id FROM gacha_categories WHERE id = $1',
              [interest.category_id]
            );

            if (categoryCheck.rows.length > 0) {
              await client.query(
                'INSERT INTO user_interest_categories (user_id, category_id, interest_level) VALUES ($1, $2, $3)',
                [userId, interest.category_id, interest.interest_level]
              );
            }
          }
        }

        await client.query('COMMIT');

        // 更新後の興味カテゴリを取得
        const updatedInterestsQuery = `
          SELECT 
            gc.id as category_id,
            gc.name as category_name,
            gc.description as category_description,
            uic.interest_level,
            uic.created_at as interest_since
          FROM user_interest_categories uic
          JOIN gacha_categories gc ON uic.category_id = gc.id
          WHERE uic.user_id = $1
          ORDER BY uic.interest_level DESC, gc.name
        `;

        const updatedInterests = await database.query(updatedInterestsQuery, [userId]);

        reply.send({
          data: {
            ...preferencesResult.rows[0],
            interest_categories: updatedInterests.rows,
            message: 'ユーザー設定を更新しました'
          }
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Update preferences API error:', error);
      reply.code(500).send({
        error: 'ユーザー設定の更新に失敗しました',
        details: error.message
      });
    }
  });

  // 利用可能なカテゴリ一覧を取得
  fastify.get('/categories', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const query = `
        SELECT 
          id,
          name,
          description,
          created_at,
          -- このカテゴリに属するガチャ数
          (SELECT COUNT(*) FROM gacha_category_mappings WHERE category_id = gc.id) as gacha_count,
          -- このカテゴリの平均評価
          (SELECT AVG(ugr.rating) 
           FROM user_gacha_ratings ugr 
           JOIN gacha_category_mappings gcm ON ugr.gacha_id = gcm.gacha_id 
           WHERE gcm.category_id = gc.id) as avg_rating
        FROM gacha_categories gc
        ORDER BY gacha_count DESC, name
      `;

      const result = await database.query(query);

      reply.send({
        data: result.rows.map(row => ({
          id: row.id,
          name: row.name,
          description: row.description,
          gacha_count: parseInt(row.gacha_count || 0),
          avg_rating: row.avg_rating ? parseFloat(row.avg_rating) : null,
          created_at: row.created_at
        }))
      });

    } catch (error) {
      console.error('Get categories API error:', error);
      reply.code(500).send({
        error: 'カテゴリ一覧の取得に失敗しました',
        details: error.message
      });
    }
  });

  // ガチャの評価とレビューを投稿
  fastify.post('/gacha-rating', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          gacha_id: { type: 'integer' },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          review: { type: 'string', maxLength: 1000 },
          is_favorite: { type: 'boolean', default: false }
        },
        required: ['gacha_id', 'rating']
      }
    }
  }, async (request, reply) => {
    try {
      const userId = request.user.id;
      const { gacha_id, rating, review, is_favorite } = request.body;

      // ガチャの存在確認
      const gachaCheck = await database.query(
        'SELECT id, name FROM gachas WHERE id = $1 AND is_public = true',
        [gacha_id]
      );

      if (gachaCheck.rows.length === 0) {
        return reply.code(404).send({
          error: 'ガチャが見つかりません'
        });
      }

      // 評価をUPSERT
      const upsertQuery = `
        INSERT INTO user_gacha_ratings (user_id, gacha_id, rating, review, is_favorite)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, gacha_id) DO UPDATE SET
          rating = EXCLUDED.rating,
          review = EXCLUDED.review,
          is_favorite = EXCLUDED.is_favorite,
          updated_at = NOW()
        RETURNING *
      `;

      const result = await database.query(upsertQuery, [
        userId, gacha_id, rating, review, is_favorite
      ]);

      // 興味プロファイルを自動更新
      try {
        await RecommendationEngine.updateUserInterestProfile(userId);
      } catch (profileError) {
        console.warn('Interest profile update failed:', profileError);
        // 興味プロファイル更新は失敗してもメイン処理には影響させない
      }

      reply.send({
        data: {
          ...result.rows[0],
          gacha_name: gachaCheck.rows[0].name,
          message: '評価を投稿しました'
        }
      });

    } catch (error) {
      console.error('Post gacha rating API error:', error);
      reply.code(500).send({
        error: '評価の投稿に失敗しました',
        details: error.message
      });
    }
  });

  // ユーザーの評価・お気に入り一覧を取得
  fastify.get('/my-ratings', {
    preHandler: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          favorites_only: { type: 'boolean', default: false },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const userId = request.user.id;
      const { favorites_only, page, limit } = request.query;
      const offset = (page - 1) * limit;

      let favoritesCondition = '';
      if (favorites_only) {
        favoritesCondition = 'AND ugr.is_favorite = true';
      }

      const query = `
        SELECT 
          ugr.*,
          g.name as gacha_name,
          g.description as gacha_description,
          g.price as gacha_price,
          g.user_id as gacha_owner_id,
          u.name as gacha_owner_name
        FROM user_gacha_ratings ugr
        JOIN gachas g ON ugr.gacha_id = g.id
        JOIN users u ON g.user_id = u.id
        WHERE ugr.user_id = $1 ${favoritesCondition}
        ORDER BY ugr.updated_at DESC
        LIMIT $2 OFFSET $3
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM user_gacha_ratings ugr
        JOIN gachas g ON ugr.gacha_id = g.id
        WHERE ugr.user_id = $1 ${favoritesCondition}
      `;

      const [ratingsResult, countResult] = await Promise.all([
        database.query(query, [userId, limit, offset]),
        database.query(countQuery, [userId])
      ]);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      reply.send({
        data: ratingsResult.rows.map(row => ({
          id: row.id,
          gacha_id: row.gacha_id,
          gacha_name: row.gacha_name,
          gacha_description: row.gacha_description,
          gacha_price: row.gacha_price,
          gacha_owner: {
            id: row.gacha_owner_id,
            name: row.gacha_owner_name
          },
          rating: row.rating,
          review: row.review,
          is_favorite: row.is_favorite,
          created_at: row.created_at,
          updated_at: row.updated_at
        })),
        pagination: {
          page,
          limit,
          total,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1
        }
      });

    } catch (error) {
      console.error('Get my ratings API error:', error);
      reply.code(500).send({
        error: '評価一覧の取得に失敗しました',
        details: error.message
      });
    }
  });

  // パーソナライズされたガチャ推薦を取得
  fastify.get('/personalized-gachas', {
    preHandler: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 20, default: 10 },
          exclude_owned: { type: 'boolean', default: true }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const userId = request.user.id;
      const { limit, exclude_owned } = request.query;

      const personalizedGachas = await RecommendationEngine.getPersonalizedGachas(userId, {
        limit,
        excludeUserOwned: exclude_owned
      });

      reply.send({
        data: personalizedGachas
      });

    } catch (error) {
      console.error('Get personalized gachas API error:', error);
      reply.code(500).send({
        error: 'パーソナライズされたガチャの取得に失敗しました',
        details: error.message
      });
    }
  });
}