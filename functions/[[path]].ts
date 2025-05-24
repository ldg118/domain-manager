// 路由处理入口文件
// 处理所有API请求的路由分发

import { createApiResponse, createErrorResponse } from './utils/auth';
import { checkDatabaseInitialized, initializeDatabase } from './utils/db';
import { createDefaultAdmin } from './utils/auth';

// 处理所有请求
export async function onRequest(context) {
  const { request, env } = context;
  
  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return handleCors();
  }
  
  // 检查数据库是否初始化
  const isInitialized = await checkDatabaseInitialized(env.DB);
  
  // 如果数据库未初始化，尝试初始化
  if (!isInitialized) {
    try {
      // 获取schema.sql内容
      const response = await fetch('https://raw.githubusercontent.com/frankiejun/Domains-Support/main/schema.sql');
      const schema = await response.text();
      
      // 初始化数据库
      const success = await initializeDatabase(env.DB, schema);
      
      if (!success) {
        return createErrorResponse(500, '数据库初始化失败');
      }
      
      // 创建默认管理员账户
      const adminResult = await createDefaultAdmin(env.DB, env.PASS || null);
      
      if (adminResult.isNew) {
        console.log(`已创建默认管理员账户: ${adminResult.username} / ${adminResult.password}`);
      }
    } catch (error) {
      console.error('数据库初始化失败:', error);
      return createErrorResponse(500, '数据库初始化失败');
    }
  }
  
  // 获取请求路径
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 静态文件请求，直接返回
  if (!path.startsWith('/api/')) {
    return context.next();
  }
  
  try {
    // 根据路径分发请求
    if (path.startsWith('/api/auth')) {
      // 认证相关请求
      return await import('./api/auth').then(module => {
        const handler = module[`onRequest${request.method}`];
        return handler ? handler(request, env) : methodNotAllowed();
      });
    } else if (path.startsWith('/api/domains')) {
      // 域名相关请求
      return await import('./api/domains').then(module => {
        const handler = module[`onRequest${request.method}`];
        return handler ? handler(request, env) : methodNotAllowed();
      });
    } else if (path.startsWith('/api/certificates')) {
      // 证书相关请求
      return await import('./api/certificates').then(module => {
        const handler = module[`onRequest${request.method}`];
        return handler ? handler(request, env) : methodNotAllowed();
      });
    } else if (path.startsWith('/api/monitor')) {
      // 监控相关请求
      return await import('./api/monitor').then(module => {
        const handler = module[`onRequest${request.method}`];
        return handler ? handler(request, env) : methodNotAllowed();
      });
    } else if (path.startsWith('/api/settings')) {
      // 系统设置相关请求
      return await import('./api/settings').then(module => {
        const handler = module[`onRequest${request.method}`];
        return handler ? handler(request, env) : methodNotAllowed();
      });
    } else if (path === '/api/check') {
      // 兼容参考仓库的API检查端点
      return handleApiCheck(request, env);
    }
    
    // 未找到匹配的路由
    return createErrorResponse(404, '未找到请求的资源');
  } catch (error) {
    console.error('请求处理失败:', error);
    return createErrorResponse(500, '服务器错误');
  }
}

// 处理跨域请求
function handleCors() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// 处理不支持的请求方法
function methodNotAllowed() {
  return createErrorResponse(405, '不支持的请求方法');
}

// 处理API检查请求（兼容参考仓库）
async function handleApiCheck(request: Request, env: Env): Promise<Response> {
  // 验证API令牌
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const authHeader = request.headers.get('Authorization');
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  
  // 检查令牌是否有效
  const validToken = env.API_TOKEN || '';
  if ((token && token !== validToken) || (bearerToken && bearerToken !== validToken)) {
    return createErrorResponse(401, '未授权访问');
  }
  
  try {
    // 导入监控模块
    const monitorModule = await import('./api/monitor');
    
    // 获取监控概览
    const response = await monitorModule.onRequestGet(
      new Request(`${url.origin}/api/monitor/overview`, {
        headers: request.headers
      }),
      env
    );
    
    // 解析响应
    const data = await response.json();
    
    // 转换为兼容格式
    return createApiResponse(200, '检查完成', {
      total_domains: data.data.expiringDomains.length,
      notified_domains: data.data.expiringDomains.map(domain => ({
        domain: domain.domain,
        remainingDays: Math.ceil((new Date(domain.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        expiry_date: domain.expiry_date
      }))
    });
  } catch (error) {
    console.error('API检查失败:', error);
    return createErrorResponse(500, '服务器错误');
  }
}
