// 用户 API 端点
// 处理用户相关请求，如修改密码等

import { extractApiToken, validateApiToken, createApiResponse, createErrorResponse } from '../utils/auth';
import { getUserByUsername } from '../utils/db';

export async function onRequestPost(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 验证API令牌
  const token = extractApiToken(request);
  if (!token || !validateApiToken(token, env.API_TOKEN || 'default_token')) {
    return createErrorResponse(401, '未授权访问');
  }
  
  // 处理修改密码请求
  if (path.endsWith('/change-password')) {
    return handleChangePassword(request, env);
  }
  
  // 未知路径
  return createErrorResponse(404, '未找到请求的资源');
}

/**
 * 处理修改密码请求
 */
async function handleChangePassword(request: Request, env: Env): Promise<Response> {
  try {
    // 解析请求体
    const body = await request.json() as { currentPassword: string; newPassword: string; username?: string };
    
    // 验证参数
    if (!body.currentPassword || !body.newPassword) {
      return createErrorResponse(400, '当前密码和新密码不能为空');
    }
    
    // 如果是环境变量中的用户
    if (env.USER && env.PASS && body.currentPassword === env.PASS) {
      // 环境变量用户不支持修改密码
      return createErrorResponse(400, '环境变量用户不支持修改密码');
    }
    
    // 获取用户名（如果未提供，则使用默认用户名）
    const username = body.username || 'admin';
    
    // 获取用户信息
    const user = await getUserByUsername(env.DB, username);
    if (!user) {
      return createErrorResponse(404, '用户不存在');
    }
    
    // 验证当前密码
    if (user.password !== body.currentPassword) {
      return createErrorResponse(400, '当前密码错误');
    }
    
    // 更新密码
    await env.DB.prepare('UPDATE users SET password = ? WHERE username = ?')
      .bind(body.newPassword, username)
      .run();
    
    // 返回成功响应
    return createApiResponse(200, '密码修改成功');
  } catch (error) {
    console.error('修改密码失败:', error);
    return createErrorResponse(500, '服务器错误');
  }
}

// 支持 OPTIONS 请求，用于 CORS 预检
export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}
