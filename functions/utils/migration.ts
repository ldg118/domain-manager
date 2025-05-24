// 数据库迁移工具
// 处理数据库版本控制和自动迁移

/**
 * 数据库迁移配置
 */
interface MigrationConfig {
  version: number;
  description: string;
  sql: string;
}

/**
 * 迁移结果
 */
interface MigrationResult {
  success: boolean;
  error?: string;
  migrationsApplied?: number;
  currentVersion?: number;
}

/**
 * 获取当前数据库版本
 * @param db D1数据库实例
 * @returns 当前版本号
 */
export async function getCurrentVersion(db: D1Database): Promise<number> {
  try {
    // 检查版本表是否存在
    const tableExists = await db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='db_version'
    `).first();
    
    if (!tableExists) {
      // 版本表不存在，创建版本表
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS db_version (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          version INTEGER NOT NULL,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          description TEXT
        )
      `).run();
      
      // 初始版本为0
      await db.prepare(`
        INSERT INTO db_version (version, description)
        VALUES (0, '初始版本')
      `).run();
      
      return 0;
    }
    
    // 获取当前版本
    const versionRecord = await db.prepare(`
      SELECT version FROM db_version
      ORDER BY id DESC LIMIT 1
    `).first<{ version: number }>();
    
    return versionRecord?.version || 0;
  } catch (error) {
    console.error('获取数据库版本失败:', error);
    return 0;
  }
}

/**
 * 应用迁移
 * @param db D1数据库实例
 * @param migration 迁移配置
 * @returns 是否成功
 */
async function applyMigration(db: D1Database, migration: MigrationConfig): Promise<boolean> {
  try {
    // 执行迁移SQL
    await db.exec(migration.sql);
    
    // 记录迁移版本
    await db.prepare(`
      INSERT INTO db_version (version, description)
      VALUES (?, ?)
    `).bind(migration.version, migration.description).run();
    
    console.log(`成功应用迁移: ${migration.version} - ${migration.description}`);
    return true;
  } catch (error) {
    console.error(`应用迁移失败 (版本 ${migration.version}):`, error);
    return false;
  }
}

/**
 * 执行数据库迁移
 * @param db D1数据库实例
 * @returns 迁移结果
 */
export async function runMigrations(db: D1Database): Promise<MigrationResult> {
  try {
    // 获取当前版本
    const currentVersion = await getCurrentVersion(db);
    console.log('当前数据库版本:', currentVersion);
    
    // 定义迁移列表
    const migrations: MigrationConfig[] = [
      {
        version: 1,
        description: '添加日志表',
        sql: `
          CREATE TABLE IF NOT EXISTS system_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            level TEXT NOT NULL,
            message TEXT NOT NULL,
            source TEXT,
            details TEXT
          );
          
          CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON system_logs(timestamp);
          CREATE INDEX IF NOT EXISTS idx_logs_level ON system_logs(level);
        `
      },
      {
        version: 2,
        description: '添加备份表',
        sql: `
          CREATE TABLE IF NOT EXISTS backups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            size INTEGER,
            comment TEXT
          );
        `
      },
      {
        version: 3,
        description: '优化域名表索引',
        sql: `
          CREATE INDEX IF NOT EXISTS idx_domains_expiry ON domains(expiry_date);
          CREATE INDEX IF NOT EXISTS idx_domains_status ON domains(status);
        `
      },
      {
        version: 4,
        description: '优化证书表索引',
        sql: `
          CREATE INDEX IF NOT EXISTS idx_certificates_valid_to ON certificates(valid_to);
          CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);
        `
      },
      {
        version: 5,
        description: '添加权限表',
        sql: `
          CREATE TABLE IF NOT EXISTS permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT
          );
          
          CREATE TABLE IF NOT EXISTS user_permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            permission_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (permission_id) REFERENCES permissions(id)
          );
          
          CREATE INDEX IF NOT EXISTS idx_user_permissions ON user_permissions(user_id, permission_id);
          
          -- 添加默认权限
          INSERT INTO permissions (name, description) VALUES 
            ('manage_domains', '管理域名'),
            ('manage_certificates', '管理证书'),
            ('manage_settings', '管理系统设置'),
            ('view_logs', '查看系统日志'),
            ('manage_users', '管理用户');
        `
      }
    ];
    
    // 筛选需要应用的迁移
    const pendingMigrations = migrations.filter(m => m.version > currentVersion);
    
    if (pendingMigrations.length === 0) {
      console.log('数据库已是最新版本');
      return {
        success: true,
        migrationsApplied: 0,
        currentVersion
      };
    }
    
    console.log(`发现 ${pendingMigrations.length} 个待应用的迁移`);
    
    // 应用迁移
    let migrationsApplied = 0;
    let latestVersion = currentVersion;
    
    for (const migration of pendingMigrations) {
      const success = await applyMigration(db, migration);
      
      if (success) {
        migrationsApplied++;
        latestVersion = migration.version;
      } else {
        return {
          success: false,
          error: `迁移失败: 版本 ${migration.version}`,
          migrationsApplied,
          currentVersion: latestVersion
        };
      }
    }
    
    return {
      success: true,
      migrationsApplied,
      currentVersion: latestVersion
    };
  } catch (error) {
    console.error('执行数据库迁移失败:', error);
    return {
      success: false,
      error: `执行迁移过程中发生错误: ${error.message}`
    };
  }
}

/**
 * 记录系统日志
 * @param db D1数据库实例
 * @param level 日志级别
 * @param message 日志消息
 * @param source 日志来源
 * @param details 详细信息
 */
export async function logSystem(
  db: D1Database,
  level: 'info' | 'warning' | 'error' | 'debug',
  message: string,
  source?: string,
  details?: any
): Promise<void> {
  try {
    // 检查日志表是否存在
    const tableExists = await db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='system_logs'
    `).first();
    
    if (!tableExists) {
      console.log('日志表不存在，跳过日志记录');
      return;
    }
    
    // 记录日志
    await db.prepare(`
      INSERT INTO system_logs (level, message, source, details)
      VALUES (?, ?, ?, ?)
    `).bind(
      level,
      message,
      source || '',
      details ? JSON.stringify(details) : null
    ).run();
  } catch (error) {
    console.error('记录系统日志失败:', error);
  }
}
