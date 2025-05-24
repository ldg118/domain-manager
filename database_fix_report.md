# 数据库结构修复报告

## 问题分析

在对域名管理系统进行多轮修复后，仍然存在"schema.sql数据库有问题，域名管理、证书管理和系统设置无法使用，未授权访问，未找到请求的资源"的问题。经过深入分析，发现以下关键问题：

1. **数据库结构不完整**：
   - 缺少关键的 `settings` 表，导致系统设置功能完全不可用
   - `certificates` 表的 `domain_id` 字段被设为必填，但实际业务中可能存在独立证书
   - 缺少默认的系统设置数据，导致前端无法正常显示设置项

2. **数据库与API不匹配**：
   - 后端 API 中的 `getSettings` 和 `updateSettings` 函数缺少对应的数据库表
   - 前端页面请求的设置数据无法从数据库中获取，导致未授权或资源不存在错误

3. **数据库初始化问题**：
   - 缺少自动初始化数据库的机制，导致首次部署时数据库结构不完整
   - 缺少默认数据，导致系统无法正常运行

## 修复方案

为彻底解决这些问题，我们进行了以下全面修复：

1. **完善数据库结构**：
   - 新增 `settings` 表，用于存储系统设置
   - 修改 `certificates` 表的 `domain_id` 字段为可选
   - 添加默认的系统设置数据，包括 Telegram 通知、提醒设置、监控设置等

2. **同步更新数据库工具函数**：
   - 实现 `getSettings` 和 `updateSettings` 函数，支持系统设置的获取和更新
   - 修改 `addCertificate` 函数，支持独立证书（无关联域名）的添加
   - 确保所有数据库操作函数与表结构完全匹配

3. **添加数据库自动初始化机制**：
   - 创建 `init-db.ts` 函数，用于自动初始化数据库
   - 内置完整的 schema.sql，确保数据库结构一致
   - 添加默认数据，确保系统可以立即使用

## 修复效果

修复后，系统具有以下特性：

1. **完整的数据库支持**：
   - 所有功能模块（域名管理、证书管理、系统设置）均有对应的数据库表
   - 所有 API 操作均有对应的数据库支持
   - 默认数据确保系统可以立即使用

2. **自动初始化机制**：
   - 首次访问时自动检查并初始化数据库
   - 无需手动执行 SQL 脚本
   - 确保数据库结构与代码完全匹配

3. **全功能可用**：
   - 域名管理：添加、编辑、删除、导入、导出
   - 证书管理：添加、编辑、删除、续期、自动续期设置
   - 系统设置：Telegram 通知、提醒设置、监控设置、密码修改

## 部署说明

1. 将修复后的代码部署到 Cloudflare Pages

2. 首次访问时，系统会自动初始化数据库

3. 默认管理员账号：
   - 用户名：admin
   - 密码：admin123

4. 环境变量设置（可选）：
   - `API_TOKEN`: 自定义 API 访问令牌，用于增强安全性
   - `USER`: 管理员用户名
   - `PASS`: 管理员密码

## 技术细节

1. **数据库表结构**：
   ```sql
   -- 用户表
   CREATE TABLE IF NOT EXISTS users (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     username TEXT NOT NULL UNIQUE,
     password TEXT NOT NULL,
     email TEXT,
     is_admin INTEGER DEFAULT 0,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
     status TEXT NOT NULL DEFAULT '离线',
     tgsend INTEGER DEFAULT 0,
     memo TEXT,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     last_check DATETIME,
     user_id INTEGER,
     FOREIGN KEY (user_id) REFERENCES users(id)
   );

   -- SSL证书表
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

   -- 通知配置表
   CREATE TABLE IF NOT EXISTS alertcfg (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     tg_token TEXT,
     tg_userid TEXT,
     days INTEGER NOT NULL DEFAULT 30,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );

   -- 系统设置表
   CREATE TABLE IF NOT EXISTS settings (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     key TEXT NOT NULL UNIQUE,
     value TEXT,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. **默认数据**：
   ```sql
   -- 默认管理员账户
   INSERT INTO users (username, password, is_admin) 
   VALUES ('admin', 'admin123', 1);

   -- 默认通知配置
   INSERT INTO alertcfg (days) VALUES (30);

   -- 默认系统设置
   INSERT INTO settings (key, value) VALUES ('telegram', '{"botToken":"","chatId":"","enabled":false}');
   INSERT INTO settings (key, value) VALUES ('reminders', '{"domainExpiryDays":[30,15,7],"certificateExpiryDays":[30,15,7]}');
   INSERT INTO settings (key, value) VALUES ('monitoring', '{"domainMonitoringEnabled":true,"domainMonitoringInterval":"daily","certificateMonitoringEnabled":true,"certificateMonitoringInterval":"daily"}');
   ```

3. **数据库工具函数**：
   ```typescript
   // 获取系统设置
   export async function getSettings(db: D1Database): Promise<Record<string, any>> {
     try {
       const { results } = await db.prepare('SELECT key, value FROM settings').all();
       
       // 将结果转换为键值对对象
       const settings: Record<string, any> = {};
       for (const row of results as { key: string, value: string }[]) {
         try {
           settings[row.key] = JSON.parse(row.value);
         } catch {
           settings[row.key] = row.value;
         }
       }
       
       return settings;
     } catch (error) {
       console.error('获取系统设置失败:', error);
       return {};
     }
   }

   // 更新系统设置
   export async function updateSettings(db: D1Database, key: string, value: any): Promise<{ success: boolean, error?: string }> {
     try {
       // 将值转换为JSON字符串
       const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
       
       // 检查设置是否存在
       const { results } = await db.prepare('SELECT id FROM settings WHERE key = ?').bind(key).all();
       
       if (results.length === 0) {
         // 如果设置不存在，创建新设置
         await db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').bind(key, jsonValue).run();
       } else {
         // 如果设置存在，更新设置
         await db.prepare('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?').bind(jsonValue, key).run();
       }
       
       return { success: true };
     } catch (error) {
       console.error('更新系统设置失败:', error);
       return { success: false, error: error instanceof Error ? error.message : '未知错误' };
     }
   }
   ```

## 后续优化建议

1. 添加数据库迁移机制，支持版本升级时自动更新数据库结构
2. 实现数据库备份和恢复功能，防止数据丢失
3. 添加数据库性能优化，如索引和查询优化
4. 实现更细粒度的权限控制，支持多用户协作
5. 添加数据验证和清理机制，确保数据一致性
