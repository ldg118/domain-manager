// 系统设置 API 端点
// 处理系统设置的获取和更新

import { extractApiToken, validateApiToken, createApiResponse, createErrorResponse } from '../utils/auth';
import { getSettings, updateSettings } from '../utils/db';

export async function onRequestGET(request: Request, env: Env): Promise<Response> {
  try {
    console.log('系统设置 - GET请求开始处理');
    
    // 验证API令牌
    const token = extractApiToken(request);
    console.log('系统设置 - 提取到的令牌:', token);
    
    // 调试模式：始终允许DEBUG_TOKEN通过
    if (token === 'DEBUG_TOKEN') {
      console.log('系统设置 - 使用调试令牌，跳过验证');
    } else if (!token || !validateApiToken(token, env.API_TOKEN || 'default_token')) {
      console.log('系统设置 - 令牌验证失败');
      return createErrorResponse(401, '未授权访问');
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
    
    // 验证API令牌
    const token = extractApiToken(request);
    console.log('系统设置 - 提取到的令牌:', token);
    
    // 调试模式：始终允许DEBUG_TOKEN通过
    if (token === 'DEBUG_TOKEN') {
      console.log('系统设置 - 使用调试令牌，跳过验证');
    } else if (!token || !validateApiToken(token, env.API_TOKEN || 'default_token')) {
      console.log('系统设置 - 令牌验证失败');
      return createErrorResponse(401, '未授权访问');
    }
    
    // 解析请求体
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
    
    console.log('系统设置 - 更新设置成功');
    return createApiResponse(200, '更新成功');
  } catch (error) {
    console.error('系统设置 - POST请求处理错误:', error);
    return createErrorResponse(500, '服务器错误');
  }
}

// 兼容小写方法名
export const onRequestPost = onRequestPOST;

// 支持 OPTIONS 请求，用于 CORS 预检
export async function onRequestOPTIONS(): Promise<Response> {
  console.log('系统设置 - OPTIONS请求处理');
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Token',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// 兼容小写方法名
export const onRequestOptions = onRequestOPTIONS;
