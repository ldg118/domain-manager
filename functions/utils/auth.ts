// 认证工具函数
// 处理用户认证和令牌验证

import { getUserByUsername } from './db';

/**
 * 验证用户凭据
 * @param db D1数据库实例
 * @param username 用户名
 * @param password 密码
 * @returns 认证结果
 */
export async function authenticateUser(db: D1Database, username: string, password: string): Promise<AuthResult> {
  try {
    // 获取用户信息
    const user = await getUserByUsername(db, username);
    
    // 用户不存在
    if (!user) {
      return { authenticated: false, error: '用户名或密码错误' };
    }
    
    // 验证密码
    if (user.password !== password) {
      return { authenticated: false, error: '用户名或密码错误' };
    }
    
    // 认证成功，返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user;
    return { authenticated: true, user: userWithoutPassword };
  } catch (error) {
    console.error('用户认证失败:', error);
    return { authenticated: false, error: '认证过程中发生错误' };
  }
}

/**
 * 从请求中提取API令牌
 * @param request 请求对象
 * @returns API令牌或null
 */
export function extractApiToken(request: Request): string | null {
  try {
    // 调试日志
    console.log('提取API令牌 - 请求头:', JSON.stringify(Object.fromEntries([...request.headers.entries()])));
    
    // 尝试从URL参数中获取令牌
    const url = new URL(request.url);
    const tokenParam = url.searchParams.get('token');
    if (tokenParam) {
      console.log('从URL参数提取到令牌:', tokenParam);
      return tokenParam;
    }
    
    // 尝试从Authorization头中获取令牌
    const authHeader = request.headers.get('Authorization');
    console.log('Authorization头:', authHeader);
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('从Authorization头提取到令牌:', token);
      return token;
    }
    
    // 尝试从自定义头中获取令牌
    const customToken = request.headers.get('X-API-Token');
    if (customToken) {
      console.log('从自定义头提取到令牌:', customToken);
      return customToken;
    }
    
    // 尝试从Cookie中获取令牌
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').map(cookie => cookie.trim());
      const tokenCookie = cookies.find(cookie => cookie.startsWith('token='));
      if (tokenCookie) {
        const token = tokenCookie.substring(6);
        console.log('从Cookie提取到令牌:', token);
        return token;
      }
    }
    
    console.log('未能提取到令牌');
    return null;
  } catch (error) {
    console.error('提取API令牌失败:', error);
    return null;
  }
}

/**
 * 验证API令牌
 * @param token 待验证的令牌
 * @param validToken 有效的令牌
 * @returns 是否有效
 */
export function validateApiToken(token: string, validToken: string): boolean {
  // 调试日志
  console.log('验证API令牌 - 提供的令牌:', token);
  console.log('验证API令牌 - 有效令牌:', validToken);
  
  // 调试模式：如果提供了特殊的调试令牌，始终返回有效
  if (token === 'DEBUG_TOKEN') {
    console.log('使用调试令牌，跳过验证');
    return true;
  }
  
  // 正常验证
  const isValid = token === validToken;
  console.log('令牌验证结果:', isValid);
  return isValid;
}

/**
 * 创建默认管理员账户
 * @param db D1数据库实例
 * @param password 自定义密码（可选）
 * @returns 创建结果
 */
export async function createDefaultAdmin(db: D1Database, password?: string | null): Promise<{ isNew: boolean, username: string, password: string }> {
  try {
    // 检查是否已存在管理员账户
    const admin = await getUserByUsername(db, 'admin');
    
    if (admin) {
      // 管理员已存在
      return { isNew: false, username: 'admin', password: '' };
    }
    
    // 生成随机密码（如果未提供）
    const adminPassword = password || generateRandomPassword();
    
    // 创建管理员账户
    await db.prepare(`
      INSERT INTO users (username, password, is_admin)
      VALUES (?, ?, 1)
    `).bind('admin', adminPassword).run();
    
    return { isNew: true, username: 'admin', password: adminPassword };
  } catch (error) {
    console.error('创建默认管理员账户失败:', error);
    // 出错时返回默认值
    return { isNew: false, username: 'admin', password: '' };
  }
}

/**
 * 生成随机密码
 * @param length 密码长度
 * @returns 随机密码
 */
function generateRandomPassword(length = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    password += chars.charAt(randomIndex);
  }
  
  return password;
}

/**
 * 创建API响应
 * @param status 状态码
 * @param message 消息
 * @param data 数据（可选）
 * @returns Response对象
 */
export function createApiResponse(status: number, message: string, data?: any): Response {
  return new Response(
    JSON.stringify({
      status,
      message,
      data
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Token'
      }
    }
  );
}

/**
 * 创建错误响应
 * @param status 状态码
 * @param message 错误消息
 * @returns Response对象
 */
export function createErrorResponse(status: number, message: string): Response {
  return createApiResponse(status, message);
}

/**
 * 处理认证错误
 * @returns 认证错误响应
 */
export function handleAuthError(): Response {
  return createErrorResponse(401, '未授权访问');
}
