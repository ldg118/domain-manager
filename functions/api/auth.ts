// 认证 API 端点
// 处理用户登录、注册等认证相关请求
// 注意：已移除所有授权检查，实现无授权访问

import { authenticateUser, createApiResponse, createErrorResponse } from '../utils/auth';
import { getUserByUsername, createUser } from '../utils/db';

export async function onRequestPOST(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 处理登录请求
  if (path.endsWith('/login')) {
    return handleLogin(request, env);
  }
  
  // 处理注册请求
  if (path.endsWith('/register')) {
    return handleRegister(request, env);
  }
  
  // 处理修改密码请求
  if (path.endsWith('/change-password')) {
    return handleChangePassword(request, env);
  }
  
  // 未知路径
  return createErrorResponse(404, '未找到请求的资源');
}

// 兼容小写方法名
export const onRequestPost = onRequestPOST;

/**
 * 处理登录请求
 */
async function handleLogin(request: Request, env: Env): Promise<Response> {
  try {
    // 解析请求体
    const body = await request.json() as { username: string; password: string };
    
    // 验证参数
    if (!body.username || !body.password) {
      return createErrorResponse(400, '用户名和密码不能为空');
    }
    
    // 先尝试数据库认证
    const authResult = await authenticateUser(env.DB, body.username, body.password);
    
    if (authResult.authenticated) {
      // 数据库认证成功
      return createApiResponse(200, '登录成功', {
        username: authResult.user?.username,
        isAdmin: authResult.user?.is_admin === 1
      });
    }
    
    // 如果数据库认证失败，尝试环境变量认证
    // 注意：这里不检查环境变量是否存在，直接比较值，避免环境变量为空字符串的情况
    if (body.username === (env.USER || '') && body.password === (env.PASS || '')) {
      // 环境变量认证成功
      return createApiResponse(200, '登录成功', {
        username: body.username,
        isAdmin: true
      });
    }
    
    // 所有认证方式都失败
    return createErrorResponse(401, '用户名或密码错误');
  } catch (error) {
    console.error('登录处理失败:', error);
    return createErrorResponse(500, '服务器错误');
  }
}

/**
 * 处理注册请求
 */
async function handleRegister(request: Request, env: Env): Promise<Response> {
  try {
    // 解析请求体
    const body = await request.json() as { username: string; password: string; email?: string };
    
    // 验证参数
    if (!body.username || !body.password) {
      return createErrorResponse(400, '用户名和密码不能为空');
    }
    
    // 检查用户名是否已存在
    const existingUser = await getUserByUsername(env.DB, body.username);
    if (existingUser) {
      return createErrorResponse(400, '用户名已存在');
    }
    
    // 创建用户
    const result = await createUser(env.DB, {
      username: body.username,
      password: body.password,
      email: body.email,
      is_admin: 0
    });
    
    if (!result.success) {
      return createErrorResponse(500, result.error || '用户创建失败');
    }
    
    // 注册成功
    return createApiResponse(201, '注册成功', {
      username: body.username
    });
  } catch (error) {
    console.error('注册处理失败:', error);
    return createErrorResponse(500, '服务器错误');
  }
}

/**
 * 处理修改密码请求
 * 注意：已移除授权检查，任何人都可以修改密码
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
    if (body.username === (env.USER || '') && body.currentPassword === (env.PASS || '')) {
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
export async function onRequestOPTIONS(): Promise<Response> {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// 兼容小写方法名
export const onRequestOptions = onRequestOPTIONS;
