// 数据库初始化脚本
// 用于在 Cloudflare Pages 部署时自动初始化数据库

import { initializeDatabase, checkDatabaseInitialized } from './utils/db';

export async function onRequest(context: EventContext<Env, string, {}>) {
  const { env } = context;
  
  try {
    // 检查数据库是否已初始化
    const isInitialized = await checkDatabaseInitialized(env.DB);
    
    if (isInitialized) {
      return new Response('数据库已初始化', { status: 200 });
    }
    
    // 读取 schema.sql 文件
    const schema = `
-- 域名管理系统数据库架构
-- 适用于 Cloudflare D1 SQL 数据库

-- 删除已存在的表（如果存在）
DROP TABLE IF EXISTS domains;
DROP TABLE IF EXISTS certificates;
DROP TABLE IF EXISTS alertcfg;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS settings;

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT,
  is_admin INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建域名表
CREATE TABLE IF NOT EXISTS domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT NOT NULL,
  registrar TEXT,
  registrar_link TEXT,
  registrar_date TEXT,
  expiry_date TEXT NOT NULL,
  service_type TEXT,
  status TEXT NOT NULL DEFAULT '离线',
  tgsend INTEGER DEFAULT 0,
  memo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_check DATETIME,
  user_id INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 创建SSL证书表
CREATE TABLE IF NOT EXISTS certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id INTEGER,
  common_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown',
  auto_renew INTEGER DEFAULT 1,
  issuer TEXT,
  valid_from TEXT,
  valid_to TEXT,
  last_check DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (domain_id) REFERENCES domains(id)
);

-- 创建通知配置表
CREATE TABLE IF NOT EXISTS alertcfg (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_token TEXT,
  tg_userid TEXT,
  days INTEGER NOT NULL DEFAULT 30,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建系统设置表
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认通知配置
INSERT INTO alertcfg (days) VALUES (30);

-- 创建默认管理员账户
INSERT INTO users (username, password, is_admin) 
VALUES ('admin', 'admin123', 1);

-- 插入默认系统设置
INSERT INTO settings (key, value) VALUES ('telegram', '{"botToken":"","chatId":"","enabled":false}');
INSERT INTO settings (key, value) VALUES ('reminders', '{"domainExpiryDays":[30,15,7],"certificateExpiryDays":[30,15,7]}');
INSERT INTO settings (key, value) VALUES ('monitoring', '{"domainMonitoringEnabled":true,"domainMonitoringInterval":"daily","certificateMonitoringEnabled":true,"certificateMonitoringInterval":"daily"}');
    `;
    
    // 初始化数据库
    const success = await initializeDatabase(env.DB, schema);
    
    if (success) {
      return new Response('数据库初始化成功', { status: 200 });
    } else {
      return new Response('数据库初始化失败', { status: 500 });
    }
  } catch (error) {
    console.error('数据库初始化错误:', error);
    return new Response('数据库初始化错误: ' + (error instanceof Error ? error.message : String(error)), { status: 500 });
  }
}
