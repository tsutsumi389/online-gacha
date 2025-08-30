// ユーザー活動ログミドルウェア
import database from '../config/database.js';
import Analytics from '../models/Analytics.js';

/**
 * ユーザーの行動をログに記録するミドルウェア
 * @param {string} actionType - 行動タイプ ('view_gacha', 'draw_gacha', 'favorite_gacha', 'share_gacha')
 * @returns {Function} Fastifyミドルウェア関数
 */
export const logUserActivity = (actionType) => {
  return async (request, reply) => {
    try {
      if (!request.user || !request.user.id) {
        // 認証されていない場合はログを記録しない
        return;
      }

      const userId = request.user.id;
      const gachaId = request.params.id || request.body?.gacha_id || null;
      const gachaItemId = request.body?.gacha_item_id || null;
      
      // セッションIDを生成または取得
      let sessionId = request.cookies?.sessionId;
      if (!sessionId) {
        sessionId = `sess_${userId}_${Date.now()}`;
        reply.setCookie('sessionId', sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 24 * 60 * 60 * 1000 // 24時間
        });
      }

      // IPアドレスを取得（プロキシ考慮）
      const ipAddress = request.headers['x-forwarded-for'] || 
                       request.headers['x-real-ip'] || 
                       request.ip || 
                       request.socket.remoteAddress;

      const userAgent = request.headers['user-agent'] || '';

      // 非同期でログを記録（パフォーマンスを考慮）
      setImmediate(async () => {
        try {
          await database.query(`
            INSERT INTO user_activity_logs (
              user_id, action_type, gacha_id, gacha_item_id, 
              session_id, ip_address, user_agent
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            userId, 
            actionType, 
            gachaId, 
            gachaItemId, 
            sessionId,
            ipAddress,
            userAgent
          ]);

          // ガチャ抽選時はリアルタイム統計更新
          if (actionType === 'draw_gacha' && gachaId) {
            await Analytics.updateBasicStatsRealtime(gachaId, userId);
          }

        } catch (error) {
          console.error('Failed to log user activity:', error);
          // ログ記録の失敗はメイン処理には影響させない
        }
      });

    } catch (error) {
      console.error('Activity logger middleware error:', error);
      // ミドルウェアエラーはメイン処理には影響させない
    }
  };
};

/**
 * ガチャ閲覧ログ
 */
export const logGachaView = logUserActivity('view_gacha');

/**
 * ガチャ抽選ログ
 */
export const logGachaDraw = logUserActivity('draw_gacha');

/**
 * ガチャお気に入りログ
 */
export const logGachaFavorite = logUserActivity('favorite_gacha');

/**
 * ガチャシェアログ
 */
export const logGachaShare = logUserActivity('share_gacha');

/**
 * バッチ処理でユーザー活動を分析
 * 定期的に実行される統計更新処理
 */
export const analyzeUserActivity = async () => {
  try {
    console.log('Starting user activity analysis...');

    // 1. 過去1時間のアクティビティを分析
    const hourlyActivityQuery = `
      SELECT 
        gacha_id,
        COUNT(*) as activity_count,
        COUNT(DISTINCT user_id) as unique_users,
        array_agg(DISTINCT action_type) as action_types
      FROM user_activity_logs
      WHERE created_at >= NOW() - INTERVAL '1 hour'
        AND gacha_id IS NOT NULL
      GROUP BY gacha_id
      HAVING COUNT(*) >= 5  -- 一定の活動量があるガチャのみ
    `;

    const hotGachas = await database.query(hourlyActivityQuery);

    // 2. トレンドガチャの検出
    if (hotGachas.rows.length > 0) {
      console.log(`Found ${hotGachas.rows.length} trending gachas in the last hour`);
      
      for (const gacha of hotGachas.rows) {
        console.log(`Gacha ${gacha.gacha_id}: ${gacha.activity_count} activities, ${gacha.unique_users} users`);
      }
    }

    // 3. 異常な活動パターンの検出
    const suspiciousActivityQuery = `
      SELECT 
        user_id,
        COUNT(*) as activity_count,
        COUNT(DISTINCT gacha_id) as unique_gachas,
        COUNT(DISTINCT session_id) as unique_sessions,
        array_agg(DISTINCT ip_address) as ip_addresses
      FROM user_activity_logs
      WHERE created_at >= NOW() - INTERVAL '1 hour'
        AND action_type = 'draw_gacha'
      GROUP BY user_id
      HAVING COUNT(*) > 50  -- 1時間に50回以上の抽選は異常
    `;

    const suspiciousUsers = await database.query(suspiciousActivityQuery);

    if (suspiciousUsers.rows.length > 0) {
      console.warn(`Found ${suspiciousUsers.rows.length} users with suspicious activity patterns`);
      
      for (const user of suspiciousUsers.rows) {
        console.warn(`User ${user.user_id}: ${user.activity_count} draws from ${user.ip_addresses.length} IPs`);
      }
    }

    // 4. セッション分析
    const sessionStatsQuery = `
      SELECT 
        DATE_TRUNC('hour', created_at) as hour_bucket,
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(DISTINCT user_id) as unique_users,
        AVG(EXTRACT(EPOCH FROM (
          MAX(created_at) - MIN(created_at)
        ))) as avg_session_duration
      FROM user_activity_logs
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY hour_bucket DESC
      LIMIT 5
    `;

    const sessionStats = await database.query(sessionStatsQuery);
    console.log('Recent session statistics:', sessionStats.rows);

    console.log('User activity analysis completed');
    return {
      trending_gachas: hotGachas.rows.length,
      suspicious_users: suspiciousUsers.rows.length,
      session_stats: sessionStats.rows
    };

  } catch (error) {
    console.error('User activity analysis failed:', error);
    throw error;
  }
};

/**
 * 古い活動ログをクリーンアップ
 * @param {number} daysToKeep - 保持日数（デフォルト: 90日）
 */
export const cleanupOldActivityLogs = async (daysToKeep = 90) => {
  try {
    console.log(`Starting cleanup of activity logs older than ${daysToKeep} days...`);

    const deleteQuery = `
      DELETE FROM user_activity_logs
      WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
    `;

    const result = await database.query(deleteQuery);
    console.log(`Deleted ${result.rowCount} old activity log records`);

    return result.rowCount;

  } catch (error) {
    console.error('Activity logs cleanup failed:', error);
    throw error;
  }
};

/**
 * ユーザーの活動パターンを分析してプロファイルを更新
 * @param {number} userId - 対象ユーザーID
 */
export const updateUserActivityProfile = async (userId) => {
  try {
    // ユーザーの活動パターンを分析
    const activityPatternQuery = `
      SELECT 
        action_type,
        EXTRACT(HOUR FROM created_at) as hour_of_day,
        EXTRACT(DOW FROM created_at) as day_of_week,
        COUNT(*) as activity_count
      FROM user_activity_logs
      WHERE user_id = $1 
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY action_type, EXTRACT(HOUR FROM created_at), EXTRACT(DOW FROM created_at)
      ORDER BY activity_count DESC
    `;

    const patterns = await database.query(activityPatternQuery, [userId]);

    // 最もアクティブな時間帯と曜日を特定
    const activityProfile = {
      most_active_hours: [],
      most_active_days: [],
      preferred_actions: []
    };

    const hourCounts = {};
    const dayCounts = {};
    const actionCounts = {};

    patterns.rows.forEach(row => {
      const hour = parseInt(row.hour_of_day);
      const day = parseInt(row.day_of_week);
      const action = row.action_type;
      const count = parseInt(row.activity_count);

      hourCounts[hour] = (hourCounts[hour] || 0) + count;
      dayCounts[day] = (dayCounts[day] || 0) + count;
      actionCounts[action] = (actionCounts[action] || 0) + count;
    });

    // 上位3時間帯
    activityProfile.most_active_hours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }));

    // 上位3曜日
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    activityProfile.most_active_days = Object.entries(dayCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([day, count]) => ({ day: dayNames[day], day_num: parseInt(day), count }));

    // 好みの行動
    activityProfile.preferred_actions = Object.entries(actionCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([action, count]) => ({ action, count }));

    console.log(`Updated activity profile for user ${userId}:`, activityProfile);
    return activityProfile;

  } catch (error) {
    console.error(`Failed to update activity profile for user ${userId}:`, error);
    throw error;
  }
};

/**
 * リアルタイム活動監視
 * 特定の条件でアラートを発生
 */
export const monitorRealtimeActivity = async () => {
  try {
    // 過去5分間の異常な活動を監視
    const alertQuery = `
      SELECT 
        'high_frequency_draws' as alert_type,
        user_id,
        COUNT(*) as activity_count,
        'User making unusually high number of draws' as message
      FROM user_activity_logs
      WHERE created_at >= NOW() - INTERVAL '5 minutes'
        AND action_type = 'draw_gacha'
      GROUP BY user_id
      HAVING COUNT(*) >= 20
      
      UNION ALL
      
      SELECT 
        'rapid_gacha_switching' as alert_type,
        user_id,
        COUNT(DISTINCT gacha_id) as activity_count,
        'User rapidly switching between many gachas' as message
      FROM user_activity_logs
      WHERE created_at >= NOW() - INTERVAL '5 minutes'
        AND action_type = 'view_gacha'
      GROUP BY user_id
      HAVING COUNT(DISTINCT gacha_id) >= 15
    `;

    const alerts = await database.query(alertQuery);

    if (alerts.rows.length > 0) {
      console.warn('Real-time activity alerts:', alerts.rows);
      // 必要に応じて外部監視システムに通知
    }

    return alerts.rows;

  } catch (error) {
    console.error('Real-time activity monitoring failed:', error);
    throw error;
  }
};

export default {
  logUserActivity,
  logGachaView,
  logGachaDraw,
  logGachaFavorite,
  logGachaShare,
  analyzeUserActivity,
  cleanupOldActivityLogs,
  updateUserActivityProfile,
  monitorRealtimeActivity
};