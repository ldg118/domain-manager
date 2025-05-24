// 日志系统工具
// 提供详细的操作日志记录、查询和归档功能

import { logSystem } from './migration';

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error'
}

/**
 * 日志来源
 */
export enum LogSource {
  DOMAIN = 'domain',
  CERTIFICATE = 'certificate',
  SETTINGS = 'settings',
  AUTH = 'auth',
  BACKUP = 'backup',
  MIGRATION = 'migration',
  MONITOR = 'monitor',
  SYSTEM = 'system'
}

/**
 * 日志查询参数
 */
export interface LogQueryParams {
  level?: LogLevel;
  source?: LogSource;
  startDate?: string;
  endDate?: string;
  keyword?: string;
  limit?: number;
  offset?: number;
}

/**
 * 日志记录
 * @param db D1数据库实例
 * @param level 日志级别
 * @param message 日志消息
 * @param source 日志来源
 * @param details 详细信息
 * @returns 操作结果
 */
export async function recordLog(
  db: D1Database,
  level: LogLevel,
  message: string,
  source: LogSource,
  details?: any
): Promise<{ success: boolean; error?: string }> {
  try {
    // 检查日志表是否存在
    const tableExists = await db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='system_logs'
    `).first();
    
    // 如果日志表不存在，创建日志表
    if (!tableExists) {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS system_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          level TEXT NOT NULL,
          message TEXT NOT NULL,
          source TEXT,
          details TEXT
        );
        
        CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON system_logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_logs_level ON system_logs(level);
        CREATE INDEX IF NOT EXISTS idx_logs_source ON system_logs(source);
      `).run();
    }
    
    // 记录日志
    await db.prepare(`
      INSERT INTO system_logs (level, message, source, details)
      VALUES (?, ?, ?, ?)
    `).bind(
      level,
      message,
      source,
      details ? JSON.stringify(details) : null
    ).run();
    
    return { success: true };
  } catch (error) {
    console.error('记录日志失败:', error);
    return {
      success: false,
      error: `记录日志失败: ${error.message}`
    };
  }
}

/**
 * 查询日志
 * @param db D1数据库实例
 * @param params 查询参数
 * @returns 查询结果
 */
export async function queryLogs(
  db: D1Database,
  params: LogQueryParams = {}
): Promise<{ success: boolean; error?: string; logs?: any[]; total?: number }> {
  try {
    // 检查日志表是否存在
    const tableExists = await db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='system_logs'
    `).first();
    
    if (!tableExists) {
      return {
        success: true,
        logs: [],
        total: 0
      };
    }
    
    // 构建查询条件
    const conditions: string[] = [];
    const bindings: any[] = [];
    
    if (params.level) {
      conditions.push('level = ?');
      bindings.push(params.level);
    }
    
    if (params.source) {
      conditions.push('source = ?');
      bindings.push(params.source);
    }
    
    if (params.startDate) {
      conditions.push('timestamp >= ?');
      bindings.push(params.startDate);
    }
    
    if (params.endDate) {
      conditions.push('timestamp <= ?');
      bindings.push(params.endDate);
    }
    
    if (params.keyword) {
      conditions.push('(message LIKE ? OR details LIKE ?)');
      const keyword = `%${params.keyword}%`;
      bindings.push(keyword, keyword);
    }
    
    // 构建WHERE子句
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // 获取总记录数
    const countQuery = `SELECT COUNT(*) as total FROM system_logs ${whereClause}`;
    const countResult = await db.prepare(countQuery).bind(...bindings).first<{ total: number }>();
    const total = countResult?.total || 0;
    
    // 构建分页查询
    const limit = params.limit || 100;
    const offset = params.offset || 0;
    
    // 查询日志
    const query = `
      SELECT * FROM system_logs
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `;
    
    const result = await db.prepare(query).bind(...bindings, limit, offset).all();
    
    return {
      success: true,
      logs: result.results || [],
      total
    };
  } catch (error) {
    console.error('查询日志失败:', error);
    return {
      success: false,
      error: `查询日志失败: ${error.message}`
    };
  }
}

/**
 * 清除日志
 * @param db D1数据库实例
 * @param days 保留天数
 * @returns 操作结果
 */
export async function clearLogs(
  db: D1Database,
  days: number = 90
): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    // 检查日志表是否存在
    const tableExists = await db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='system_logs'
    `).first();
    
    if (!tableExists) {
      return {
        success: true,
        count: 0
      };
    }
    
    // 清除过期日志
    const result = await db.prepare(`
      DELETE FROM system_logs
      WHERE timestamp < datetime('now', '-' || ? || ' days')
    `).bind(days).run();
    
    const count = result.meta?.changes || 0;
    
    // 记录日志
    await logSystem(
      db,
      'info',
      `清除了 ${count} 条过期日志`,
      'logs',
      { days }
    );
    
    return {
      success: true,
      count
    };
  } catch (error) {
    console.error('清除日志失败:', error);
    return {
      success: false,
      error: `清除日志失败: ${error.message}`
    };
  }
}

/**
 * 导出日志
 * @param db D1数据库实例
 * @param params 查询参数
 * @returns 导出结果
 */
export async function exportLogs(
  db: D1Database,
  params: LogQueryParams = {}
): Promise<{ success: boolean; error?: string; logs?: any[] }> {
  try {
    // 查询日志
    const result = await queryLogs(db, {
      ...params,
      limit: 10000 // 限制导出数量
    });
    
    if (!result.success) {
      return {
        success: false,
        error: result.error
      };
    }
    
    // 记录日志
    await logSystem(
      db,
      'info',
      `导出了 ${result.logs?.length || 0} 条日志`,
      'logs',
      { params }
    );
    
    return {
      success: true,
      logs: result.logs
    };
  } catch (error) {
    console.error('导出日志失败:', error);
    return {
      success: false,
      error: `导出日志失败: ${error.message}`
    };
  }
}

/**
 * 归档日志
 * @param db D1数据库实例
 * @param days 归档天数
 * @returns 操作结果
 */
export async function archiveLogs(
  db: D1Database,
  days: number = 30
): Promise<{ success: boolean; error?: string; count?: number; archive?: any }> {
  try {
    // 检查日志表是否存在
    const tableExists = await db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='system_logs'
    `).first();
    
    if (!tableExists) {
      return {
        success: true,
        count: 0
      };
    }
    
    // 检查归档表是否存在
    const archiveTableExists = await db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='archived_logs'
    `).first();
    
    // 如果归档表不存在，创建归档表
    if (!archiveTableExists) {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS archived_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          original_id INTEGER,
          timestamp DATETIME,
          level TEXT NOT NULL,
          message TEXT NOT NULL,
          source TEXT,
          details TEXT,
          archived_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_archived_timestamp ON archived_logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_archived_level ON archived_logs(level);
        CREATE INDEX IF NOT EXISTS idx_archived_source ON archived_logs(source);
      `).run();
    }
    
    // 查询需要归档的日志
    const logsToArchive = await db.prepare(`
      SELECT * FROM system_logs
      WHERE timestamp < datetime('now', '-' || ? || ' days')
    `).bind(days).all();
    
    if (!logsToArchive.results || logsToArchive.results.length === 0) {
      return {
        success: true,
        count: 0
      };
    }
    
    // 开始事务
    await db.exec('BEGIN TRANSACTION');
    
    // 归档日志
    for (const log of logsToArchive.results) {
      await db.prepare(`
        INSERT INTO archived_logs (original_id, timestamp, level, message, source, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        log.id,
        log.timestamp,
        log.level,
        log.message,
        log.source,
        log.details
      ).run();
    }
    
    // 删除已归档的日志
    await db.prepare(`
      DELETE FROM system_logs
      WHERE timestamp < datetime('now', '-' || ? || ' days')
    `).bind(days).run();
    
    // 提交事务
    await db.exec('COMMIT');
    
    // 记录日志
    await logSystem(
      db,
      'info',
      `归档了 ${logsToArchive.results.length} 条日志`,
      'logs',
      { days }
    );
    
    // 创建归档摘要
    const archiveSummary = {
      count: logsToArchive.results.length,
      date: new Date().toISOString(),
      oldestLog: logsToArchive.results[logsToArchive.results.length - 1].timestamp,
      newestLog: logsToArchive.results[0].timestamp
    };
    
    return {
      success: true,
      count: logsToArchive.results.length,
      archive: archiveSummary
    };
  } catch (error) {
    console.error('归档日志失败:', error);
    
    // 回滚事务
    try {
      await db.exec('ROLLBACK');
    } catch (rollbackError) {
      console.error('回滚事务失败:', rollbackError);
    }
    
    return {
      success: false,
      error: `归档日志失败: ${error.message}`
    };
  }
}
