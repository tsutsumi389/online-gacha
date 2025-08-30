// ハイブリッド統計更新システム
import Analytics from '../models/Analytics.js';
import { analyzeUserActivity, cleanupOldActivityLogs } from '../middleware/activityLogger.js';
import database from '../config/database.js';

/**
 * 統計更新システムのメインクラス
 */
class StatsUpdater {
  constructor() {
    this.isRunning = false;
    this.updateInterval = null;
    this.lastUpdateTime = null;
  }

  /**
   * 統計更新システムを開始
   * @param {Object} options - 設定オプション
   */
  start(options = {}) {
    if (this.isRunning) {
      console.log('Stats updater is already running');
      return;
    }

    const {
      hourlyInterval = 60 * 60 * 1000, // 1時間毎
      enableRealtimeUpdates = true,
      enableCleanup = true
    } = options;

    console.log('Starting hybrid stats update system...');

    // 1時間毎の定期更新
    this.updateInterval = setInterval(async () => {
      try {
        await this.runScheduledUpdates();
      } catch (error) {
        console.error('Scheduled stats update failed:', error);
      }
    }, hourlyInterval);

    // クリーンアップタスクのスケジュール（毎日1回）
    if (enableCleanup) {
      setInterval(async () => {
        try {
          await this.runMaintenanceTasks();
        } catch (error) {
          console.error('Maintenance tasks failed:', error);
        }
      }, 24 * 60 * 60 * 1000); // 24時間毎
    }

    this.isRunning = true;
    console.log(`Stats updater started with ${hourlyInterval/1000/60}min intervals`);
  }

  /**
   * 統計更新システムを停止
   */
  stop() {
    if (!this.isRunning) {
      console.log('Stats updater is not running');
      return;
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.isRunning = false;
    console.log('Stats updater stopped');
  }

  /**
   * スケジュールされた定期更新を実行
   */
  async runScheduledUpdates() {
    console.log('Running scheduled stats updates...');
    const startTime = Date.now();

    try {
      // 1. 時間別統計更新
      console.log('Updating hourly statistics...');
      const hourlyResult = await Analytics.updateHourlyStats();
      
      // 2. デモグラフィック統計更新
      console.log('Updating demographic statistics...');
      const demographicResult = await Analytics.updateDemographicStats();

      // 3. ユーザー活動分析
      console.log('Analyzing user activity...');
      const activityAnalysis = await analyzeUserActivity();

      // 4. 統計の整合性チェック
      console.log('Checking data consistency...');
      const consistencyResult = await this.checkDataConsistency();

      const duration = Date.now() - startTime;
      this.lastUpdateTime = new Date();

      console.log(`Scheduled stats update completed in ${duration}ms:`, {
        hourly_stats_updated: hourlyResult,
        demographic_stats_updated: demographicResult,
        activity_analysis: activityAnalysis,
        consistency_check: consistencyResult
      });

      // 更新ログを記録
      await this.logUpdateExecution('scheduled', {
        duration,
        hourly_result: hourlyResult,
        demographic_result: demographicResult,
        activity_analysis: activityAnalysis,
        consistency_result: consistencyResult
      });

    } catch (error) {
      console.error('Scheduled stats update failed:', error);
      await this.logUpdateExecution('scheduled_error', { error: error.message });
      throw error;
    }
  }

  /**
   * メンテナンスタスクを実行
   */
  async runMaintenanceTasks() {
    console.log('Running maintenance tasks...');

    try {
      // 1. 古い活動ログのクリーンアップ（90日より古いもの）
      const deletedLogs = await cleanupOldActivityLogs(90);

      // 2. 古い時間別統計のアーカイブ（6ヶ月より古いもの）
      const archivedHourlyStats = await this.archiveOldHourlyStats(180);

      // 3. 古いデモグラフィック統計のクリーンアップ（1年より古いもの）
      const deletedDemographicStats = await this.cleanupOldDemographicStats(365);

      // 4. データベースの最適化
      await this.optimizeDatabase();

      console.log('Maintenance tasks completed:', {
        deleted_activity_logs: deletedLogs,
        archived_hourly_stats: archivedHourlyStats,
        deleted_demographic_stats: deletedDemographicStats
      });

    } catch (error) {
      console.error('Maintenance tasks failed:', error);
      throw error;
    }
  }

  /**
   * データ整合性をチェック
   */
  async checkDataConsistency() {
    try {
      const issues = [];

      // 1. gacha_statisticsとgacha_resultsの整合性チェック
      const statsConsistencyQuery = `
        SELECT 
          gs.gacha_id,
          gs.total_draws as stats_draws,
          COUNT(gr.id) as actual_draws,
          gs.unique_users as stats_users,
          COUNT(DISTINCT gr.user_id) as actual_users
        FROM gacha_statistics gs
        LEFT JOIN gacha_results gr ON gs.gacha_id = gr.gacha_id
        GROUP BY gs.gacha_id, gs.total_draws, gs.unique_users
        HAVING gs.total_draws != COUNT(gr.id) OR gs.unique_users != COUNT(DISTINCT gr.user_id)
      `;

      const inconsistentStats = await database.query(statsConsistencyQuery);
      
      if (inconsistentStats.rows.length > 0) {
        issues.push({
          type: 'stats_inconsistency',
          count: inconsistentStats.rows.length,
          gachas: inconsistentStats.rows.map(row => row.gacha_id)
        });
        console.warn('Found inconsistent statistics for gachas:', inconsistentStats.rows);
      }

      // 2. 孤立したレコードのチェック
      const orphanedRecordsQuery = `
        SELECT 
          'user_activity_logs' as table_name,
          COUNT(*) as orphaned_count
        FROM user_activity_logs ual
        WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ual.user_id)
        
        UNION ALL
        
        SELECT 
          'gacha_results' as table_name,
          COUNT(*) as orphaned_count
        FROM gacha_results gr
        WHERE NOT EXISTS (SELECT 1 FROM gachas g WHERE g.id = gr.gacha_id)
      `;

      const orphanedRecords = await database.query(orphanedRecordsQuery);
      
      orphanedRecords.rows.forEach(row => {
        if (parseInt(row.orphaned_count) > 0) {
          issues.push({
            type: 'orphaned_records',
            table: row.table_name,
            count: parseInt(row.orphaned_count)
          });
        }
      });

      return {
        total_issues: issues.length,
        issues: issues
      };

    } catch (error) {
      console.error('Data consistency check failed:', error);
      return {
        total_issues: -1,
        error: error.message
      };
    }
  }

  /**
   * 古い時間別統計をアーカイブ
   */
  async archiveOldHourlyStats(daysToKeep = 180) {
    try {
      // 実際のアーカイブ処理（この例では削除のみ）
      const deleteQuery = `
        DELETE FROM gacha_hourly_stats
        WHERE hour_bucket < NOW() - INTERVAL '${daysToKeep} days'
      `;

      const result = await database.query(deleteQuery);
      console.log(`Archived ${result.rowCount} old hourly stats records`);

      return result.rowCount;
    } catch (error) {
      console.error('Failed to archive old hourly stats:', error);
      throw error;
    }
  }

  /**
   * 古いデモグラフィック統計をクリーンアップ
   */
  async cleanupOldDemographicStats(daysToKeep = 365) {
    try {
      const deleteQuery = `
        DELETE FROM gacha_demographic_stats
        WHERE date_bucket < CURRENT_DATE - INTERVAL '${daysToKeep} days'
      `;

      const result = await database.query(deleteQuery);
      console.log(`Deleted ${result.rowCount} old demographic stats records`);

      return result.rowCount;
    } catch (error) {
      console.error('Failed to cleanup old demographic stats:', error);
      throw error;
    }
  }

  /**
   * データベースの最適化
   */
  async optimizeDatabase() {
    try {
      const tables = [
        'user_activity_logs',
        'gacha_statistics', 
        'gacha_hourly_stats',
        'gacha_demographic_stats',
        'gacha_results'
      ];

      for (const table of tables) {
        // PostgreSQLのVACUUM ANALYZE
        await database.query(`VACUUM ANALYZE ${table}`);
        console.log(`Optimized table: ${table}`);
      }

    } catch (error) {
      console.error('Database optimization failed:', error);
      throw error;
    }
  }

  /**
   * 更新実行ログを記録
   */
  async logUpdateExecution(updateType, details) {
    try {
      const logEntry = {
        update_type: updateType,
        executed_at: new Date(),
        details: JSON.stringify(details),
        duration_ms: details.duration || null
      };

      // 簡単なログテーブルがあれば記録（なければconsoleログのみ）
      console.log('Stats update log:', logEntry);

    } catch (error) {
      console.error('Failed to log update execution:', error);
    }
  }

  /**
   * 手動で統計更新を実行
   */
  async forceUpdate() {
    console.log('Forcing manual stats update...');
    
    try {
      await this.runScheduledUpdates();
      console.log('Manual stats update completed');
    } catch (error) {
      console.error('Manual stats update failed:', error);
      throw error;
    }
  }

  /**
   * システムの状態を取得
   */
  getStatus() {
    return {
      is_running: this.isRunning,
      last_update_time: this.lastUpdateTime,
      uptime_ms: this.isRunning ? Date.now() - (this.lastUpdateTime?.getTime() || Date.now()) : null
    };
  }

  /**
   * 統計サマリーを取得
   */
  async getStatsSummary() {
    try {
      const query = `
        SELECT 
          (SELECT COUNT(*) FROM gacha_statistics) as total_gacha_stats,
          (SELECT COUNT(*) FROM user_activity_logs WHERE created_at >= CURRENT_DATE) as todays_activity_logs,
          (SELECT COUNT(*) FROM gacha_hourly_stats WHERE hour_bucket >= CURRENT_DATE - INTERVAL '24 hours') as recent_hourly_stats,
          (SELECT COUNT(*) FROM gacha_demographic_stats WHERE date_bucket >= CURRENT_DATE - INTERVAL '7 days') as recent_demographic_stats,
          (SELECT MAX(last_calculated) FROM gacha_statistics) as last_stats_calculation
      `;

      const result = await database.query(query);
      return result.rows[0];

    } catch (error) {
      console.error('Failed to get stats summary:', error);
      throw error;
    }
  }
}

// シングルトンインスタンス
const statsUpdater = new StatsUpdater();

export default statsUpdater;

// 個別の関数もエクスポート
export {
  StatsUpdater
};