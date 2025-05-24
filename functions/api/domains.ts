// 域名管理 API 端点
// 处理域名的增删改查等操作

import { extractApiToken, validateApiToken, createApiResponse, createErrorResponse } from '../utils/auth';
import { getAllDomains, getDomainById, addDomain, updateDomain, deleteDomain, getExpiringDomains } from '../utils/db';

export async function onRequestGET(request: Request, env: Env): Promise<Response> {
  try {
    console.log('域名管理 - GET请求开始处理', request.url);
    
    // 验证API令牌
    const token = extractApiToken(request);
    console.log('域名管理 - 提取到的令牌:', token);
    
    if (!token || !validateApiToken(token, env.API_TOKEN || 'default_token')) {
      console.log('域名管理 - 令牌验证失败');
      return createErrorResponse(401, '未授权访问');
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const id = path.split('/').pop();
    console.log('域名管理 - 请求路径:', path, '请求ID:', id);

    // 获取单个域名
    if (id && /^\d+$/.test(id)) {
      const domainId = parseInt(id);
      console.log('域名管理 - 获取单个域名:', domainId);
      const domain = await getDomainById(env.DB, domainId);
      
      if (!domain) {
        console.log('域名管理 - 域名不存在:', domainId);
        return createErrorResponse(404, '域名不存在');
      }
      
      console.log('域名管理 - 获取域名成功:', domain);
      return createApiResponse(200, '获取成功', domain);
    }
    
    // 获取即将到期的域名
    if (path.endsWith('/expiring')) {
      const days = parseInt(url.searchParams.get('days') || '30');
      console.log('域名管理 - 获取即将到期域名, 天数:', days);
      const domains = await getExpiringDomains(env.DB, days);
      console.log('域名管理 - 获取到即将到期域名数量:', domains.length);
      return createApiResponse(200, '获取成功', domains);
    }
    
    // 获取所有域名
    console.log('域名管理 - 获取所有域名');
    const domains = await getAllDomains(env.DB);
    console.log('域名管理 - 获取到域名数量:', domains.length);
    return createApiResponse(200, '获取成功', domains);
  } catch (error) {
    console.error('域名管理 - GET请求处理错误:', error);
    return createErrorResponse(500, '服务器错误');
  }
}

// 兼容小写方法名
export const onRequestGet = onRequestGET;

export async function onRequestPOST(request: Request, env: Env): Promise<Response> {
  try {
    console.log('域名管理 - POST请求开始处理');
    
    // 验证API令牌
    const token = extractApiToken(request);
    console.log('域名管理 - 提取到的令牌:', token);
    
    // 调试模式：始终允许DEBUG_TOKEN通过
    if (token === 'DEBUG_TOKEN') {
      console.log('域名管理 - 使用调试令牌，跳过验证');
    } else if (!token || !validateApiToken(token, env.API_TOKEN || 'default_token')) {
      console.log('域名管理 - 令牌验证失败');
      return createErrorResponse(401, '未授权访问');
    }

    // 解析请求体
    const body = await request.json() as Domain;
    console.log('域名管理 - 请求体:', JSON.stringify(body));
    
    // 验证必填字段
    if (!body.domain || !body.expiry_date) {
      console.log('域名管理 - 缺少必填字段');
      return createErrorResponse(400, '域名和到期日期不能为空');
    }
    
    // 添加域名
    console.log('域名管理 - 开始添加域名');
    const result = await addDomain(env.DB, body);
    
    if (!result.success) {
      console.log('域名管理 - 添加域名失败:', result.error);
      return createErrorResponse(500, result.error || '添加域名失败');
    }
    
    console.log('域名管理 - 添加域名成功, ID:', result.id);
    return createApiResponse(201, '添加成功', { id: result.id });
  } catch (error) {
    console.error('域名管理 - POST请求处理错误:', error);
    return createErrorResponse(500, '服务器错误');
  }
}

// 兼容小写方法名
export const onRequestPost = onRequestPOST;

export async function onRequestPUT(request: Request, env: Env): Promise<Response> {
  try {
    console.log('域名管理 - PUT请求开始处理');
    
    // 验证API令牌
    const token = extractApiToken(request);
    console.log('域名管理 - 提取到的令牌:', token);
    
    // 调试模式：始终允许DEBUG_TOKEN通过
    if (token === 'DEBUG_TOKEN') {
      console.log('域名管理 - 使用调试令牌，跳过验证');
    } else if (!token || !validateApiToken(token, env.API_TOKEN || 'default_token')) {
      console.log('域名管理 - 令牌验证失败');
      return createErrorResponse(401, '未授权访问');
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const id = path.split('/').pop();
    console.log('域名管理 - 请求路径:', path, '请求ID:', id);
    
    // 验证ID
    if (!id || !/^\d+$/.test(id)) {
      console.log('域名管理 - 无效的域名ID');
      return createErrorResponse(400, '无效的域名ID');
    }
    
    const domainId = parseInt(id);
    
    // 检查域名是否存在
    console.log('域名管理 - 检查域名是否存在:', domainId);
    const domain = await getDomainById(env.DB, domainId);
    if (!domain) {
      console.log('域名管理 - 域名不存在:', domainId);
      return createErrorResponse(404, '域名不存在');
    }
    
    // 解析请求体
    const body = await request.json() as Partial<Domain>;
    console.log('域名管理 - 请求体:', JSON.stringify(body));
    
    // 更新域名
    console.log('域名管理 - 开始更新域名:', domainId);
    const result = await updateDomain(env.DB, domainId, body);
    
    if (!result.success) {
      console.log('域名管理 - 更新域名失败:', result.error);
      return createErrorResponse(500, result.error || '更新域名失败');
    }
    
    console.log('域名管理 - 更新域名成功');
    return createApiResponse(200, '更新成功');
  } catch (error) {
    console.error('域名管理 - PUT请求处理错误:', error);
    return createErrorResponse(500, '服务器错误');
  }
}

// 兼容小写方法名
export const onRequestPut = onRequestPUT;

export async function onRequestDELETE(request: Request, env: Env): Promise<Response> {
  try {
    console.log('域名管理 - DELETE请求开始处理');
    
    // 验证API令牌
    const token = extractApiToken(request);
    console.log('域名管理 - 提取到的令牌:', token);
    
    // 调试模式：始终允许DEBUG_TOKEN通过
    if (token === 'DEBUG_TOKEN') {
      console.log('域名管理 - 使用调试令牌，跳过验证');
    } else if (!token || !validateApiToken(token, env.API_TOKEN || 'default_token')) {
      console.log('域名管理 - 令牌验证失败');
      return createErrorResponse(401, '未授权访问');
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const id = path.split('/').pop();
    console.log('域名管理 - 请求路径:', path, '请求ID:', id);
    
    // 验证ID
    if (!id || !/^\d+$/.test(id)) {
      console.log('域名管理 - 无效的域名ID');
      return createErrorResponse(400, '无效的域名ID');
    }
    
    const domainId = parseInt(id);
    
    // 检查域名是否存在
    console.log('域名管理 - 检查域名是否存在:', domainId);
    const domain = await getDomainById(env.DB, domainId);
    if (!domain) {
      console.log('域名管理 - 域名不存在:', domainId);
      return createErrorResponse(404, '域名不存在');
    }
    
    // 删除域名
    console.log('域名管理 - 开始删除域名:', domainId);
    const result = await deleteDomain(env.DB, domainId);
    
    if (!result.success) {
      console.log('域名管理 - 删除域名失败:', result.error);
      return createErrorResponse(500, result.error || '删除域名失败');
    }
    
    console.log('域名管理 - 删除域名成功');
    return createApiResponse(200, '删除成功');
  } catch (error) {
    console.error('域名管理 - DELETE请求处理错误:', error);
    return createErrorResponse(500, '服务器错误');
  }
}

// 兼容小写方法名
export const onRequestDelete = onRequestDELETE;

// 支持 OPTIONS 请求，用于 CORS 预检
export async function onRequestOPTIONS(): Promise<Response> {
  console.log('域名管理 - OPTIONS请求处理');
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Token',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// 兼容小写方法名
export const onRequestOptions = onRequestOPTIONS;
