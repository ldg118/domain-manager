// Cloudflare D1 数据库类型定义
declare interface Env {
  DB: D1Database;
  USER?: string;
  PASS?: string;
  API_TOKEN?: string;
}

// 请求处理函数类型
declare type RequestHandler = (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response>;

// 域名数据类型
declare interface Domain {
  id?: number;
  domain: string;
  registrar?: string;
  registrar_link?: string;
  registrar_date?: string;
  expiry_date: string;
  service_type?: string;
  status?: string;
  tgsend?: number;
  memo?: string;
  created_at?: string;
  last_check?: string;
  user_id?: number;
}

// 证书数据类型
declare interface Certificate {
  id?: number;
  domain_id: number;
  common_name: string;
  status?: string;
  auto_renew?: number;
  issuer?: string;
  valid_from?: string;
  valid_to?: string;
  last_check?: string;
  created_at?: string;
}

// 通知配置类型
declare interface AlertConfig {
  id?: number;
  tg_token?: string;
  tg_userid?: string;
  days?: number;
  created_at?: string;
}

// 用户类型
declare interface User {
  id?: number;
  username: string;
  password?: string;
  email?: string;
  is_admin?: number;
  created_at?: string;
}

// API响应类型
declare interface ApiResponse {
  status: number;
  message: string;
  data?: any;
}

// 认证结果类型
declare interface AuthResult {
  authenticated: boolean;
  user?: User;
  error?: string;
}
