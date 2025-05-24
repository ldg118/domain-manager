// 数据库工具函数
// 处理与 Cloudflare D1 数据库的交互

/**
 * 获取所有域名
 * @param db D1数据库实例
 * @param userId 用户ID（可选，用于筛选特定用户的域名）
 * @returns 域名列表
 */
export async function getAllDomains(db: D1Database, userId?: number): Promise<Domain[]> {
  try {
    let query = 'SELECT * FROM domains';
    const params: any[] = [];
    
    if (userId) {
      query += ' WHERE user_id = ?';
      params.push(userId);
    }
    
    query += ' ORDER BY expiry_date ASC';
    
    const { results } = await db.prepare(query).bind(...params).all();
    return results as Domain[];
  } catch (error) {
    console.error('获取域名列表失败:', error);
    return [];
  }
}

/**
 * 获取单个域名
 * @param db D1数据库实例
 * @param id 域名ID
 * @returns 域名信息
 */
export async function getDomainById(db: D1Database, id: number): Promise<Domain | null> {
  try {
    const { results } = await db.prepare('SELECT * FROM domains WHERE id = ?').bind(id).all();
    return results.length > 0 ? (results[0] as Domain) : null;
  } catch (error) {
    console.error('获取域名信息失败:', error);
    return null;
  }
}

/**
 * 添加域名
 * @param db D1数据库实例
 * @param domain 域名信息
 * @returns 添加结果
 */
export async function addDomain(db: D1Database, domain: Domain): Promise<{ success: boolean, id?: number, error?: string }> {
  try {
    const result = await db.prepare(`
      INSERT INTO domains (domain, registrar, registrar_link, registrar_date, expiry_date, service_type, memo, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      domain.domain,
      domain.registrar || '',
      domain.registrar_link || '',
      domain.registrar_date || '',
      domain.expiry_date,
      domain.service_type || '',
      domain.memo || '',
      domain.user_id || null
    ).run();
    
    return { success: true, id: result.meta.last_row_id };
  } catch (error) {
    console.error('添加域名失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 更新域名
 * @param db D1数据库实例
 * @param id 域名ID
 * @param domain 域名信息
 * @returns 更新结果
 */
export async function updateDomain(db: D1Database, id: number, domain: Partial<Domain>): Promise<{ success: boolean, error?: string }> {
  try {
    // 构建更新字段
    const fields: string[] = [];
    const values: any[] = [];
    
    if (domain.domain !== undefined) {
      fields.push('domain = ?');
      values.push(domain.domain);
    }
    
    if (domain.registrar !== undefined) {
      fields.push('registrar = ?');
      values.push(domain.registrar);
    }
    
    if (domain.registrar_link !== undefined) {
      fields.push('registrar_link = ?');
      values.push(domain.registrar_link);
    }
    
    if (domain.registrar_date !== undefined) {
      fields.push('registrar_date = ?');
      values.push(domain.registrar_date);
    }
    
    if (domain.expiry_date !== undefined) {
      fields.push('expiry_date = ?');
      values.push(domain.expiry_date);
    }
    
    if (domain.service_type !== undefined) {
      fields.push('service_type = ?');
      values.push(domain.service_type);
    }
    
    if (domain.status !== undefined) {
      fields.push('status = ?');
      values.push(domain.status);
    }
    
    if (domain.tgsend !== undefined) {
      fields.push('tgsend = ?');
      values.push(domain.tgsend);
    }
    
    if (domain.memo !== undefined) {
      fields.push('memo = ?');
      values.push(domain.memo);
    }
    
    if (domain.last_check !== undefined) {
      fields.push('last_check = ?');
      values.push(domain.last_check);
    }
    
    // 如果没有要更新的字段，直接返回成功
    if (fields.length === 0) {
      return { success: true };
    }
    
    // 添加ID条件
    values.push(id);
    
    // 执行更新
    await db.prepare(`UPDATE domains SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
    
    return { success: true };
  } catch (error) {
    console.error('更新域名失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 删除域名
 * @param db D1数据库实例
 * @param id 域名ID
 * @returns 删除结果
 */
export async function deleteDomain(db: D1Database, id: number): Promise<{ success: boolean, error?: string }> {
  try {
    // 先删除关联的证书
    await db.prepare('DELETE FROM certificates WHERE domain_id = ?').bind(id).run();
    
    // 再删除域名
    await db.prepare('DELETE FROM domains WHERE id = ?').bind(id).run();
    
    return { success: true };
  } catch (error) {
    console.error('删除域名失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 获取即将到期的域名
 * @param db D1数据库实例
 * @param days 天数
 * @param userId 用户ID（可选）
 * @returns 即将到期的域名列表
 */
export async function getExpiringDomains(db: D1Database, days: number, userId?: number): Promise<Domain[]> {
  try {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);
    
    const todayStr = today.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    let query = `
      SELECT * FROM domains 
      WHERE expiry_date >= ? AND expiry_date <= ?
    `;
    
    const params: any[] = [todayStr, futureDateStr];
    
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    
    query += ' ORDER BY expiry_date ASC';
    
    const { results } = await db.prepare(query).bind(...params).all();
    return results as Domain[];
  } catch (error) {
    console.error('获取即将到期域名失败:', error);
    return [];
  }
}

/**
 * 获取所有证书
 * @param db D1数据库实例
 * @returns 证书列表
 */
export async function getAllCertificates(db: D1Database): Promise<Certificate[]> {
  try {
    const { results } = await db.prepare('SELECT * FROM certificates ORDER BY valid_to ASC').all();
    return results as Certificate[];
  } catch (error) {
    console.error('获取证书列表失败:', error);
    return [];
  }
}

/**
 * 获取单个证书
 * @param db D1数据库实例
 * @param id 证书ID
 * @returns 证书信息
 */
export async function getCertificateById(db: D1Database, id: number): Promise<Certificate | null> {
  try {
    const { results } = await db.prepare('SELECT * FROM certificates WHERE id = ?').bind(id).all();
    return results.length > 0 ? (results[0] as Certificate) : null;
  } catch (error) {
    console.error('获取证书信息失败:', error);
    return null;
  }
}

/**
 * 添加证书
 * @param db D1数据库实例
 * @param certificate 证书信息
 * @returns 添加结果
 */
export async function addCertificate(db: D1Database, certificate: Certificate): Promise<{ success: boolean, id?: number, error?: string }> {
  try {
    const result = await db.prepare(`
      INSERT INTO certificates (domain_id, common_name, status, auto_renew, issuer, valid_from, valid_to)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      certificate.domain_id || null,
      certificate.common_name,
      certificate.status || 'unknown',
      certificate.auto_renew || 1,
      certificate.issuer || '',
      certificate.valid_from || '',
      certificate.valid_to || ''
    ).run();
    
    return { success: true, id: result.meta.last_row_id };
  } catch (error) {
    console.error('添加证书失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 更新证书
 * @param db D1数据库实例
 * @param id 证书ID
 * @param certificate 证书信息
 * @returns 更新结果
 */
export async function updateCertificate(db: D1Database, id: number, certificate: Partial<Certificate>): Promise<{ success: boolean, error?: string }> {
  try {
    // 构建更新字段
    const fields: string[] = [];
    const values: any[] = [];
    
    if (certificate.common_name !== undefined) {
      fields.push('common_name = ?');
      values.push(certificate.common_name);
    }
    
    if (certificate.status !== undefined) {
      fields.push('status = ?');
      values.push(certificate.status);
    }
    
    if (certificate.auto_renew !== undefined) {
      fields.push('auto_renew = ?');
      values.push(certificate.auto_renew);
    }
    
    if (certificate.issuer !== undefined) {
      fields.push('issuer = ?');
      values.push(certificate.issuer);
    }
    
    if (certificate.valid_from !== undefined) {
      fields.push('valid_from = ?');
      values.push(certificate.valid_from);
    }
    
    if (certificate.valid_to !== undefined) {
      fields.push('valid_to = ?');
      values.push(certificate.valid_to);
    }
    
    if (certificate.last_check !== undefined) {
      fields.push('last_check = ?');
      values.push(certificate.last_check);
    }
    
    // 如果没有要更新的字段，直接返回成功
    if (fields.length === 0) {
      return { success: true };
    }
    
    // 添加ID条件
    values.push(id);
    
    // 执行更新
    await db.prepare(`UPDATE certificates SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
    
    return { success: true };
  } catch (error) {
    console.error('更新证书失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 删除证书
 * @param db D1数据库实例
 * @param id 证书ID
 * @returns 删除结果
 */
export async function deleteCertificate(db: D1Database, id: number): Promise<{ success: boolean, error?: string }> {
  try {
    await db.prepare('DELETE FROM certificates WHERE id = ?').bind(id).run();
    return { success: true };
  } catch (error) {
    console.error('删除证书失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 获取通知配置
 * @param db D1数据库实例
 * @returns 通知配置
 */
export async function getAlertConfig(db: D1Database): Promise<AlertConfig | null> {
  try {
    const { results } = await db.prepare('SELECT * FROM alertcfg LIMIT 1').all();
    return results.length > 0 ? (results[0] as AlertConfig) : null;
  } catch (error) {
    console.error('获取通知配置失败:', error);
    return null;
  }
}

/**
 * 更新通知配置
 * @param db D1数据库实例
 * @param config 通知配置
 * @returns 更新结果
 */
export async function updateAlertConfig(db: D1Database, config: Partial<AlertConfig>): Promise<{ success: boolean, error?: string }> {
  try {
    // 获取现有配置
    const existingConfig = await getAlertConfig(db);
    
    if (!existingConfig) {
      // 如果不存在配置，创建新配置
      await db.prepare(`
        INSERT INTO alertcfg (tg_token, tg_userid, days)
        VALUES (?, ?, ?)
      `).bind(
        config.tg_token || '',
        config.tg_userid || '',
        config.days || 30
      ).run();
    } else {
      // 构建更新字段
      const fields: string[] = [];
      const values: any[] = [];
      
      if (config.tg_token !== undefined) {
        fields.push('tg_token = ?');
        values.push(config.tg_token);
      }
      
      if (config.tg_userid !== undefined) {
        fields.push('tg_userid = ?');
        values.push(config.tg_userid);
      }
      
      if (config.days !== undefined) {
        fields.push('days = ?');
        values.push(config.days);
      }
      
      // 如果没有要更新的字段，直接返回成功
      if (fields.length === 0) {
        return { success: true };
      }
      
      // 执行更新
      await db.prepare(`UPDATE alertcfg SET ${fields.join(', ')}`).bind(...values).run();
    }
    
    return { success: true };
  } catch (error) {
    console.error('更新通知配置失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 获取用户信息
 * @param db D1数据库实例
 * @param username 用户名
 * @returns 用户信息
 */
export async function getUserByUsername(db: D1Database, username: string): Promise<User | null> {
  try {
    const { results } = await db.prepare('SELECT * FROM users WHERE username = ?').bind(username).all();
    return results.length > 0 ? (results[0] as User) : null;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return null;
  }
}

/**
 * 创建用户
 * @param db D1数据库实例
 * @param user 用户信息
 * @returns 创建结果
 */
export async function createUser(db: D1Database, user: User): Promise<{ success: boolean, id?: number, error?: string }> {
  try {
    // 检查用户名是否已存在
    const existingUser = await getUserByUsername(db, user.username);
    if (existingUser) {
      return { success: false, error: '用户名已存在' };
    }
    
    const result = await db.prepare(`
      INSERT INTO users (username, password, email, is_admin)
      VALUES (?, ?, ?, ?)
    `).bind(
      user.username,
      user.password || '',
      user.email || '',
      user.is_admin || 0
    ).run();
    
    return { success: true, id: result.meta.last_row_id };
  } catch (error) {
    console.error('创建用户失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 获取系统设置
 * @param db D1数据库实例
 * @returns 所有系统设置
 */
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

/**
 * 更新系统设置
 * @param db D1数据库实例
 * @param key 设置键
 * @param value 设置值
 * @returns 更新结果
 */
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

/**
 * 初始化数据库
 * @param db D1数据库实例
 * @param schema SQL架构
 * @returns 初始化结果
 */
export async function initializeDatabase(db: D1Database, schema: string): Promise<boolean> {
  try {
    // 分割SQL语句
    const statements = schema
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    // 执行每条SQL语句
    for (const statement of statements) {
      await db.exec(statement + ';');
    }
    
    return true;
  } catch (error) {
    console.error('初始化数据库失败:', error);
    return false;
  }
}

/**
 * 检查数据库是否已初始化
 * @param db D1数据库实例
 * @returns 是否已初始化
 */
export async function checkDatabaseInitialized(db: D1Database): Promise<boolean> {
  try {
    // 检查users表是否存在
    const { results } = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").all();
    return results.length > 0;
  } catch (error) {
    console.error('检查数据库初始化状态失败:', error);
    return false;
  }
}
