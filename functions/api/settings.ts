// 系统设置 API 端点
// 处理系统设置的获取和更新、数据库备份恢复等操作

import { createApiResponse, createErrorResponse } from '../utils/auth';
import { getSettings, updateSettings } from '../utils/db';
import { runMigrations, getCurrentVersion, logSystem } from '../utils/migration';
import { backupDatabase, restoreDatabase, optimizeDatabase, resetDatabase } from '../utils/backup';

export async function onRequestGET(request: Request, env: Env): Promise<Response> {
  try {
    console.log('系统设置 - GET请求开始处理');
    
    const url = new URL(request.url);
    const path = url.pathname;
    
    // 获取监控设置
    if (path.endsWith('/monitoring')) {
      console.log('系统设置 - 获取监控设置');
      const monitoringSettings = await getSettings(env.DB, 'monitoring');
      
      // 如果设置不存在，返回默认值
      const settings = monitoringSettings || {
        domain_monitoring_enabled: true,
        domain_check_interval: 'daily',
        cert_monitoring_enabled: true,
        cert_check_interval: 'weekly'
      };
      
      return createApiResponse(200, '获取成功', settings);
    }
    
    // 获取数据库备份
    if (path.endsWith('/backup')) {
      console.log('系统设置 - 获取数据库备份');
      const result = await backupDatabase(env.DB);
      
      if (!result.success) {
        return createErrorResponse(500, result.error || '备份数据库失败');
      }
      
      return createApiResponse(200, '备份成功', result.data);
    }
    
    // 获取数据库版本
    if (path.endsWith('/version')) {
      console.log('系统设置 - 获取数据库版本');
      const version = await getCurrentVersion(env.DB);
      return createApiResponse(200, '获取成功', { version });
    }
    
    // 获取系统日志
    if (path.endsWith('/logs')) {
      console.log('系统设置 - 获取系统日志');
      
      // 检查日志表是否存在
      const tableExists = await env.DB.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='system_logs'
      `).first();
      
      if (!tableExists) {
        return createApiResponse(200, '获取成功', []);
      }
      
      // 获取最近的日志
      const logs = await env.DB.prepare(`
        SELECT * FROM system_logs
        ORDER BY timestamp DESC
        LIMIT 100
      `).all();
      
      return createApiResponse(200, '获取成功', logs.results || []);
    }
    
    // 获取所有设置
    console.log('系统设置 - 获取所有设置');
    const settings = await getSettings(env.DB);
    console.log('系统设置 - 获取到设置:', JSON.stringify(settings));
    
    return createApiResponse(200, '获取成功', settings);
  } catch (error) {
    console.error('系统设置 - GET请求处理错误:', error);
    return createErrorResponse(500, '服务器错误');
  }
}

// 兼容小写方法名
export const onRequestGet = onRequestGET;

export async function onRequestPOST(request: Request, env: Env): Promise<Response> {
  try {
    console.log('系统设置 - POST请求开始处理');
    
    const url = new URL(request.url);
    const path = url.pathname;
    
    // 更新监控设置
    if (path.endsWith('/monitoring')) {
      console.log('系统设置 - 更新监控设置');
      const body = await request.json();
      console.log('系统设置 - 请求体:', JSON.stringify(body));
      
      // 更新监控设置
      const result = await updateSettings(env.DB, 'monitoring', body);
      
      if (!result.success) {
        return createErrorResponse(500, result.error || '更新监控设置失败');
      }
      
      // 记录日志
      await logSystem(
        env.DB,
        'info',
        '更新监控设置',
        'settings'
      );
      
      return createApiResponse(200, '更新成功');
    }
    
    // 恢复数据库备份
    if (path.endsWith('/restore')) {
      console.log('系统设置 - 恢复数据库备份');
      const body = await request.json() as { backup: any };
      
      if (!body.backup) {
        return createErrorResponse(400, '备份数据不能为空');
      }
      
      const result = await restoreDatabase(env.DB, body.backup);
      
      if (!result.success) {
        return createErrorResponse(500, result.error || '恢复数据库失败');
      }
      
      return createApiResponse(200, '恢复成功', {
        tablesRestored: result.tablesRestored,
        recordsRestored: result.recordsRestored
      });
    }
    
    // 优化数据库
    if (path.endsWith('/optimize')) {
      console.log('系统设置 - 优化数据库');
      const result = await optimizeDatabase(env.DB);
      
      if (!result.success) {
        return createErrorResponse(500, result.error || '优化数据库失败');
      }
      
      return createApiResponse(200, '优化成功');
    }
    
    // 重置数据库
    if (path.endsWith('/reset')) {
      console.log('系统设置 - 重置数据库');
      const result = await resetDatabase(env.DB);
      
      if (!result.success) {
        return createErrorResponse(500, result.error || '重置数据库失败');
      }
      
      return createApiResponse(200, '重置成功');
    }
    
    // 运行数据库迁移
    if (path.endsWith('/migrate')) {
      console.log('系统设置 - 运行数据库迁移');
      const result = await runMigrations(env.DB);
      
      if (!result.success) {
        return createErrorResponse(500, result.error || '数据库迁移失败');
      }
      
      return createApiResponse(200, '迁移成功', {
        migrationsApplied: result.migrationsApplied,
        currentVersion: result.currentVersion
      });
    }
    
    // 记录系统日志
    if (path.endsWith('/log')) {
      console.log('系统设置 - 记录系统日志');
      const body = await request.json() as { level: 'info' | 'warning' | 'error' | 'debug'; message: string; source?: string; details?: any };
      
      if (!body.level || !body.message) {
        return createErrorResponse(400, '日志级别和消息不能为空');
      }
      
      await logSystem(env.DB, body.level, body.message, body.source, body.details);
      return createApiResponse(200, '记录成功');
    }
    
    // 更新设置
    console.log('系统设置 - 更新设置');
    const body = await request.json() as { key: string, value: any };
    console.log('系统设置 - 请求体:', JSON.stringify(body));
    
    // 验证必填字段
    if (!body.key) {
      console.log('系统设置 - 缺少必填字段');
      return createErrorResponse(400, '设置键不能为空');
    }
    
    // 更新设置
    console.log('系统设置 - 开始更新设置:', body.key);
    const result = await updateSettings(env.DB, body.key, body.value);
    
    if (!result.success) {
      console.log('系统设置 - 更新设置失败:', result.error);
      return createErrorResponse(500, result.error || '更新设置失败');
    }
    
    // 记录日志
    await logSystem(
      env.DB,
      'info',
      `更新系统设置: ${body.key}`,
      'settings'
    );
    
    console.log('系统设置 - 更新设置成功');
    return createApiResponse(200, '更新成功');
  } catch (error) {
    console.error('系统设置 - POST请求处理错误:', error);
    return createErrorResponse(500, '服务器错误');
  }
}

// 兼容小写方法名
export const onRequestPost = onRequestPOST;

export async function onRequestDELETE(request: Request, env: Env): Promise<Response> {
  try {
    console.log('系统设置 - DELETE请求开始处理');
    
    const url = new URL(request.url);
    const path = url.pathname;
    
    // 清除系统日志
    if (path.endsWith('/logs')) {
      console.log('系统设置 - 清除系统日志');
      
      // 检查日志表是否存在
      const tableExists = await env.DB.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='system_logs'
      `).first();
      
      if (!tableExists) {
        return createApiResponse(200, '清除成功');
      }
      
      // 清除日志
      await env.DB.prepare('DELETE FROM system_logs').run();
      
      // 记录新日志
      await logSystem(
        env.DB,
        'info',
        '清除系统日志',
        'settings'
      );
      
      return createApiResponse(200, '清除成功');
    }
    
    return createErrorResponse(404, '未找到请求的资源');
  } catch (error) {
    console.error('系统设置 - DELETE请求处理错误:', error);
    return createErrorResponse(500, '服务器错误');
  }
}

// 兼容小写方法名
export const onRequestDelete = onRequestDELETE;

// 支持 OPTIONS 请求，用于 CORS 预检
export async function onRequestOPTIONS(): Promise<Response> {
  console.log('系统设置 - OPTIONS请求处理');
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// 兼容小写方法名
export const onRequestOptions = onRequestOPTIONS;
