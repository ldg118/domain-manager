// 数据库性能优化工具
// 提供索引分析、查询优化和缓存管理功能

import { logSystem } from './migration';

/**
 * 分析表索引使用情况
 * @param db D1数据库实例
 * @param tableName 表名
 * @returns 索引分析结果
 */
export async function analyzeTableIndexes(db: D1Database, tableName: string): Promise<any> {
  try {
    // 获取表结构
    const tableInfo = await db.prepare(`PRAGMA table_info(${tableName})`).all();
    
    // 获取表索引
    const indexList = await db.prepare(`PRAGMA index_list(${tableName})`).all();
    
    // 获取索引详情
    const indexDetails = [];
    if (indexList.results && indexList.results.length > 0) {
      for (const index of indexList.results) {
        const indexName = index.name;
        const indexInfo = await db.prepare(`PRAGMA index_info(${indexName})`).all();
        indexDetails.push({
          name: indexName,
          unique: index.unique === 1,
          columns: indexInfo.results
        });
      }
    }
    
    // 记录日志
    await logSystem(
      db,
      'info',
      `分析表索引: ${tableName}`,
      'db-optimize',
      { 
        tableColumns: tableInfo.results?.length || 0,
        indexCount: indexList.results?.length || 0
      }
    );
    
    return {
      table: tableName,
      columns: tableInfo.results || [],
      indexes: indexList.results || [],
      indexDetails
    };
  } catch (error) {
    console.error(`分析表索引失败 (${tableName}):`, error);
    
    // 记录日志
    await logSystem(
      db,
      'error',
      `分析表索引失败: ${tableName}`,
      'db-optimize',
      { error: error.message }
    );
    
    return {
      table: tableName,
      error: error.message
    };
  }
}

/**
 * 添加表索引
 * @param db D1数据库实例
 * @param tableName 表名
 * @param columnName 列名
 * @param indexName 索引名（可选）
 * @param unique 是否唯一索引（可选）
 * @returns 操作结果
 */
export async function addTableIndex(
  db: D1Database,
  tableName: string,
  columnName: string,
  indexName?: string,
  unique: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    // 生成索引名（如果未提供）
    const actualIndexName = indexName || `idx_${tableName}_${columnName}`;
    
    // 检查索引是否已存在
    const indexExists = await db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND name=?
    `).bind(actualIndexName).first();
    
    if (indexExists) {
      return {
        success: false,
        error: `索引已存在: ${actualIndexName}`
      };
    }
    
    // 创建索引
    const uniqueStr = unique ? 'UNIQUE' : '';
    await db.prepare(`
      CREATE ${uniqueStr} INDEX ${actualIndexName} ON ${tableName}(${columnName})
    `).run();
    
    // 记录日志
    await logSystem(
      db,
      'info',
      `添加表索引: ${actualIndexName} (${tableName}.${columnName})`,
      'db-optimize',
      { unique }
    );
    
    return { success: true };
  } catch (error) {
    console.error(`添加表索引失败 (${tableName}.${columnName}):`, error);
    
    // 记录日志
    await logSystem(
      db,
      'error',
      `添加表索引失败: ${tableName}.${columnName}`,
      'db-optimize',
      { error: error.message }
    );
    
    return {
      success: false,
      error: `添加表索引失败: ${error.message}`
    };
  }
}

/**
 * 删除表索引
 * @param db D1数据库实例
 * @param indexName 索引名
 * @returns 操作结果
 */
export async function dropTableIndex(
  db: D1Database,
  indexName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 检查索引是否存在
    const indexExists = await db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND name=?
    `).bind(indexName).first();
    
    if (!indexExists) {
      return {
        success: false,
        error: `索引不存在: ${indexName}`
      };
    }
    
    // 删除索引
    await db.prepare(`DROP INDEX ${indexName}`).run();
    
    // 记录日志
    await logSystem(
      db,
      'info',
      `删除表索引: ${indexName}`,
      'db-optimize'
    );
    
    return { success: true };
  } catch (error) {
    console.error(`删除表索引失败 (${indexName}):`, error);
    
    // 记录日志
    await logSystem(
      db,
      'error',
      `删除表索引失败: ${indexName}`,
      'db-optimize',
      { error: error.message }
    );
    
    return {
      success: false,
      error: `删除表索引失败: ${error.message}`
    };
  }
}

/**
 * 优化查询性能
 * @param db D1数据库实例
 * @returns 优化结果
 */
export async function optimizeQueryPerformance(db: D1Database): Promise<{ success: boolean; error?: string; optimizations: any[] }> {
  try {
    const optimizations = [];
    
    // 1. 为domains表添加索引
    // 域名到期日期索引（用于到期查询）
    const domainExpiryResult = await addTableIndex(db, 'domains', 'expiry_date', 'idx_domains_expiry');
    if (domainExpiryResult.success) {
      optimizations.push('添加域名到期日期索引');
    }
    
    // 域名状态索引（用于状态筛选）
    const domainStatusResult = await addTableIndex(db, 'domains', 'status', 'idx_domains_status');
    if (domainStatusResult.success) {
      optimizations.push('添加域名状态索引');
    }
    
    // 2. 为certificates表添加索引
    // 证书有效期索引（用于到期查询）
    const certValidToResult = await addTableIndex(db, 'certificates', 'valid_to', 'idx_certificates_valid_to');
    if (certValidToResult.success) {
      optimizations.push('添加证书有效期索引');
    }
    
    // 证书状态索引（用于状态筛选）
    const certStatusResult = await addTableIndex(db, 'certificates', 'status', 'idx_certificates_status');
    if (certStatusResult.success) {
      optimizations.push('添加证书状态索引');
    }
    
    // 3. 为settings表添加索引
    // 设置键索引（用于快速查找设置）
    const settingsKeyResult = await addTableIndex(db, 'settings', 'key', 'idx_settings_key', true);
    if (settingsKeyResult.success) {
      optimizations.push('添加设置键唯一索引');
    }
    
    // 4. 为system_logs表添加索引（如果存在）
    const logsTableExists = await db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='system_logs'
    `).first();
    
    if (logsTableExists) {
      // 日志时间戳索引（用于日志查询）
      const logsTimestampResult = await addTableIndex(db, 'system_logs', 'timestamp', 'idx_logs_timestamp');
      if (logsTimestampResult.success) {
        optimizations.push('添加日志时间戳索引');
      }
      
      // 日志级别索引（用于日志筛选）
      const logsLevelResult = await addTableIndex(db, 'system_logs', 'level', 'idx_logs_level');
      if (logsLevelResult.success) {
        optimizations.push('添加日志级别索引');
      }
    }
    
    // 记录日志
    await logSystem(
      db,
      'info',
      `优化查询性能，完成了 ${optimizations.length} 项优化`,
      'db-optimize',
      { optimizations }
    );
    
    return { 
      success: true,
      optimizations
    };
  } catch (error) {
    console.error('优化查询性能失败:', error);
    
    // 记录日志
    await logSystem(
      db,
      'error',
      '优化查询性能失败',
      'db-optimize',
      { error: error.message }
    );
    
    return {
      success: false,
      error: `优化查询性能失败: ${error.message}`,
      optimizations: []
    };
  }
}

// 内存缓存
const memoryCache: Record<string, { data: any; expiry: number }> = {};

/**
 * 从缓存获取数据
 * @param key 缓存键
 * @returns 缓存数据或null
 */
export function getFromCache(key: string): any | null {
  const cacheItem = memoryCache[key];
  
  // 缓存不存在
  if (!cacheItem) {
    return null;
  }
  
  // 缓存已过期
  if (cacheItem.expiry < Date.now()) {
    delete memoryCache[key];
    return null;
  }
  
  return cacheItem.data;
}

/**
 * 设置缓存数据
 * @param key 缓存键
 * @param data 缓存数据
 * @param ttlSeconds 缓存有效期（秒）
 */
export function setCache(key: string, data: any, ttlSeconds: number = 300): void {
  memoryCache[key] = {
    data,
    expiry: Date.now() + (ttlSeconds * 1000)
  };
}

/**
 * 清除缓存
 * @param key 缓存键（可选，不提供则清除所有缓存）
 */
export function clearCache(key?: string): void {
  if (key) {
    delete memoryCache[key];
  } else {
    Object.keys(memoryCache).forEach(k => delete memoryCache[k]);
  }
}

/**
 * 获取缓存统计信息
 * @returns 缓存统计信息
 */
export function getCacheStats(): { count: number; keys: string[] } {
  const keys = Object.keys(memoryCache);
  
  // 清理过期缓存
  const now = Date.now();
  keys.forEach(key => {
    if (memoryCache[key].expiry < now) {
      delete memoryCache[key];
    }
  });
  
  // 返回最新统计
  const updatedKeys = Object.keys(memoryCache);
  return {
    count: updatedKeys.length,
    keys: updatedKeys
  };
}
