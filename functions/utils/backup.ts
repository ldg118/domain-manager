// 数据库备份和恢复工具
// 处理数据库备份、导出和恢复功能

import { logSystem } from './migration';

/**
 * 备份结果
 */
interface BackupResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * 恢复结果
 */
interface RestoreResult {
  success: boolean;
  error?: string;
  tablesRestored?: number;
  recordsRestored?: number;
}

/**
 * 备份数据库
 * @param db D1数据库实例
 * @returns 备份结果
 */
export async function backupDatabase(db: D1Database): Promise<BackupResult> {
  try {
    // 获取所有表
    const tables = await db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all<{ name: string }>();
    
    if (!tables.results || tables.results.length === 0) {
      return {
        success: false,
        error: '未找到任何表'
      };
    }
    
    // 备份数据
    const backup: Record<string, any[]> = {};
    
    for (const table of tables.results) {
      const tableName = table.name;
      
      // 获取表结构
      const structure = await db.prepare(`PRAGMA table_info(${tableName})`).all();
      
      // 获取表数据
      const data = await db.prepare(`SELECT * FROM ${tableName}`).all();
      
      backup[tableName] = {
        structure: structure.results,
        data: data.results || []
      };
    }
    
    // 添加备份元数据
    const metadata = {
      timestamp: new Date().toISOString(),
      version: 1,
      tables: tables.results.map(t => t.name)
    };
    
    // 记录日志
    await logSystem(
      db,
      'info',
      '创建数据库备份',
      'backup',
      { tables: tables.results.length }
    );
    
    return {
      success: true,
      data: {
        metadata,
        backup
      }
    };
  } catch (error) {
    console.error('备份数据库失败:', error);
    
    // 记录日志
    await logSystem(
      db,
      'error',
      '备份数据库失败',
      'backup',
      { error: error.message }
    );
    
    return {
      success: false,
      error: `备份数据库失败: ${error.message}`
    };
  }
}

/**
 * 恢复数据库
 * @param db D1数据库实例
 * @param backup 备份数据
 * @returns 恢复结果
 */
export async function restoreDatabase(db: D1Database, backup: any): Promise<RestoreResult> {
  try {
    // 验证备份数据
    if (!backup || !backup.metadata || !backup.backup) {
      return {
        success: false,
        error: '无效的备份数据'
      };
    }
    
    // 开始事务
    await db.exec('BEGIN TRANSACTION');
    
    let tablesRestored = 0;
    let recordsRestored = 0;
    
    // 恢复每个表
    for (const [tableName, tableData] of Object.entries(backup.backup)) {
      // 清空表
      await db.prepare(`DELETE FROM ${tableName}`).run();
      
      // 恢复数据
      const data = tableData.data || [];
      
      if (data.length > 0) {
        // 获取列名
        const columns = Object.keys(data[0]);
        
        // 批量插入数据
        for (const record of data) {
          const placeholders = columns.map(() => '?').join(', ');
          const values = columns.map(col => record[col]);
          
          await db.prepare(`
            INSERT INTO ${tableName} (${columns.join(', ')})
            VALUES (${placeholders})
          `).bind(...values).run();
          
          recordsRestored++;
        }
      }
      
      tablesRestored++;
    }
    
    // 提交事务
    await db.exec('COMMIT');
    
    // 记录日志
    await logSystem(
      db,
      'info',
      '恢复数据库备份',
      'restore',
      { 
        tablesRestored,
        recordsRestored,
        backupTimestamp: backup.metadata.timestamp
      }
    );
    
    return {
      success: true,
      tablesRestored,
      recordsRestored
    };
  } catch (error) {
    console.error('恢复数据库失败:', error);
    
    // 回滚事务
    try {
      await db.exec('ROLLBACK');
    } catch (rollbackError) {
      console.error('回滚事务失败:', rollbackError);
    }
    
    // 记录日志
    await logSystem(
      db,
      'error',
      '恢复数据库失败',
      'restore',
      { error: error.message }
    );
    
    return {
      success: false,
      error: `恢复数据库失败: ${error.message}`
    };
  }
}

/**
 * 优化数据库
 * @param db D1数据库实例
 * @returns 优化结果
 */
export async function optimizeDatabase(db: D1Database): Promise<{ success: boolean; error?: string }> {
  try {
    // 执行VACUUM操作
    await db.exec('VACUUM');
    
    // 分析表以优化查询计划
    await db.exec('ANALYZE');
    
    // 记录日志
    await logSystem(
      db,
      'info',
      '优化数据库',
      'optimize'
    );
    
    return { success: true };
  } catch (error) {
    console.error('优化数据库失败:', error);
    
    // 记录日志
    await logSystem(
      db,
      'error',
      '优化数据库失败',
      'optimize',
      { error: error.message }
    );
    
    return {
      success: false,
      error: `优化数据库失败: ${error.message}`
    };
  }
}

/**
 * 重置数据库
 * @param db D1数据库实例
 * @returns 重置结果
 */
export async function resetDatabase(db: D1Database): Promise<{ success: boolean; error?: string }> {
  try {
    // 获取所有表
    const tables = await db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all<{ name: string }>();
    
    if (!tables.results || tables.results.length === 0) {
      return {
        success: false,
        error: '未找到任何表'
      };
    }
    
    // 开始事务
    await db.exec('BEGIN TRANSACTION');
    
    // 删除所有表数据
    for (const table of tables.results) {
      await db.prepare(`DELETE FROM ${table.name}`).run();
    }
    
    // 重新导入初始数据
    // 创建默认管理员账户
    await db.prepare(`
      INSERT INTO users (username, password, is_admin) 
      VALUES ('admin', 'admin123', 1)
    `).run();
    
    // 插入默认通知配置
    await db.prepare(`INSERT INTO alertcfg (days) VALUES (30)`).run();
    
    // 插入默认系统设置
    await db.prepare(`
      INSERT INTO settings (key, value) 
      VALUES ('telegram', '{"botToken":"","chatId":"","enabled":false}')
    `).run();
    
    await db.prepare(`
      INSERT INTO settings (key, value) 
      VALUES ('reminders', '{"domainExpiryDays":[30,15,7],"certificateExpiryDays":[30,15,7]}')
    `).run();
    
    await db.prepare(`
      INSERT INTO settings (key, value) 
      VALUES ('monitoring', '{"domainMonitoringEnabled":true,"domainMonitoringInterval":"daily","certificateMonitoringEnabled":true,"certificateMonitoringInterval":"daily"}')
    `).run();
    
    // 提交事务
    await db.exec('COMMIT');
    
    // 记录日志
    await logSystem(
      db,
      'warning',
      '重置数据库',
      'reset',
      { tables: tables.results.length }
    );
    
    return { success: true };
  } catch (error) {
    console.error('重置数据库失败:', error);
    
    // 回滚事务
    try {
      await db.exec('ROLLBACK');
    } catch (rollbackError) {
      console.error('回滚事务失败:', rollbackError);
    }
    
    // 记录日志
    await logSystem(
      db,
      'error',
      '重置数据库失败',
      'reset',
      { error: error.message }
    );
    
    return {
      success: false,
      error: `重置数据库失败: ${error.message}`
    };
  }
}
