-- 域名管理系统数据库架构
-- 适用于 Cloudflare D1

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT,
  is_admin INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 域名表
CREATE TABLE IF NOT EXISTS domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT NOT NULL,
  registrar TEXT,
  registrar_link TEXT,
  registrar_date TEXT,
  expiry_date TEXT NOT NULL,
  service_type TEXT,
  status TEXT DEFAULT 'active',
  tgsend INTEGER DEFAULT 0,
  memo TEXT,
  last_check TEXT,
  user_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 证书表
CREATE TABLE IF NOT EXISTS certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id INTEGER,
  common_name TEXT NOT NULL,
  status TEXT DEFAULT 'unknown',
  auto_renew INTEGER DEFAULT 1,
  issuer TEXT,
  valid_from TEXT,
  valid_to TEXT,
  last_check TEXT,
  certificate_content TEXT,
  private_key TEXT,
  certificate_chain TEXT,
  fingerprint TEXT,
  key_type TEXT,
  key_size INTEGER,
  san TEXT,
  source TEXT DEFAULT 'manual',
  acme_account_id INTEGER,
  last_renewal_date TEXT,
  next_renewal_date TEXT,
  memo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (domain_id) REFERENCES domains(id)
);

-- 通知配置表
CREATE TABLE IF NOT EXISTS alertcfg (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_token TEXT,
  tg_userid TEXT,
  days INTEGER DEFAULT 30,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 系统设置表
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ACME账户表
CREATE TABLE IF NOT EXISTS acme_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'letsencrypt',
  private_key TEXT NOT NULL,
  account_url TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 证书验证记录表
CREATE TABLE IF NOT EXISTS certificate_validations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  certificate_id INTEGER NOT NULL,
  validation_type TEXT NOT NULL,
  validation_domain TEXT NOT NULL,
  validation_token TEXT,
  validation_content TEXT,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (certificate_id) REFERENCES certificates(id)
);

-- 证书操作日志表
CREATE TABLE IF NOT EXISTS certificate_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  certificate_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (certificate_id) REFERENCES certificates(id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_domains_expiry_date ON domains(expiry_date);
CREATE INDEX IF NOT EXISTS idx_certificates_valid_to ON certificates(valid_to);
CREATE INDEX IF NOT EXISTS idx_certificates_domain_id ON certificates(domain_id);
