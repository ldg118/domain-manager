// 数据库初始化脚本
// 在系统启动时自动运行，确保数据库结构最新

import { runMigrations, getCurrentVersion, logSystem } from './utils/migration';

/**
 * 初始化数据库
 * @param db D1数据库实例
 * @returns 初始化结果
 */
export async function initializeDatabase(db: D1Database): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('开始初始化数据库...');
    
    // 检查数据库是否已初始化
    const tableExists = await db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='users'
    `).first();
    
    // 如果数据库未初始化，创建初始表结构
    if (!tableExists) {
      console.log('数据库未初始化，创建初始表结构...');
      
      // 读取并执行schema.sql
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
      
      // 执行初始化脚本
      await db.exec(schema);
      
      console.log('初始表结构创建成功');
    } else {
      console.log('数据库已初始化');
    }
    
    // 获取当前数据库版本
    const currentVersion = await getCurrentVersion(db);
    console.log('当前数据库版本:', currentVersion);
    
    // 运行迁移脚本
    console.log('开始运行数据库迁移...');
    const migrationResult = await runMigrations(db);
    
    if (migrationResult.success) {
      console.log('数据库迁移成功:', {
        migrationsApplied: migrationResult.migrationsApplied,
        currentVersion: migrationResult.currentVersion
      });
      
      // 记录日志
      if (migrationResult.migrationsApplied > 0) {
        await logSystem(
          db,
          'info',
          `数据库迁移成功，应用了 ${migrationResult.migrationsApplied} 个迁移，当前版本: ${migrationResult.currentVersion}`,
          'init-db'
        );
      }
    } else {
      console.error('数据库迁移失败:', migrationResult.error);
      
      // 记录日志
      await logSystem(
        db,
        'error',
        `数据库迁移失败: ${migrationResult.error}`,
        'init-db'
      );
      
      return {
        success: false,
        error: `数据库迁移失败: ${migrationResult.error}`
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error('初始化数据库失败:', error);
    return {
      success: false,
      error: `初始化数据库失败: ${error.message}`
    };
  }
}
