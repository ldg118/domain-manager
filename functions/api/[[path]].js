// 路由处理入口文件
// 处理所有API请求的路由分发

export async function onRequest(context) {
  const { request, env } = context;
  
  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return handleCors();
  }
  
  // 检查数据库是否初始化
  const isInitialized = await checkDatabaseInitialized(env.DB);
  
  // 如果数据库未初始化，尝试初始化
  if (!isInitialized) {
    try {
      // 获取schema.sql内容
      const response = await fetch('https://raw.githubusercontent.com/frankiejun/Domains-Support/main/schema.sql');
      const schema = await response.text();
      
      // 初始化数据库
      const success = await initializeDatabase(env.DB, schema);
      
      if (!success) {
        return createErrorResponse(500, '数据库初始化失败');
      }
    } catch (error) {
      console.error('数据库初始化失败:', error);
      return createErrorResponse(500, '数据库初始化失败');
    }
  }
  
  // 获取请求路径
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 静态文件请求，直接返回
  if (!path.startsWith('/api/')) {
    return context.next();
  }
  
  try {
    // 根据路径分发请求
    if (path.startsWith('/api/domains')) {
      return handleDomainsRequest(request, env);
    } else if (path.startsWith('/api/certificates')) {
      return handleCertificatesRequest(request, env);
    } else if (path.startsWith('/api/monitor')) {
      return handleMonitorRequest(request, env);
    } else if (path.startsWith('/api/settings')) {
      return handleSettingsRequest(request, env);
    } else if (path === '/api/check') {
      return handleApiCheck(request, env);
    }
    
    // 未找到匹配的路由
    return createErrorResponse(404, '未找到请求的资源');
  } catch (error) {
    console.error('请求处理失败:', error);
    return createErrorResponse(500, '服务器错误');
  }
}

// 处理域名请求
async function handleDomainsRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  
  // 获取域名ID（如果存在）
  const idMatch = path.match(/\/api\/domains\/(\d+)$/);
  const id = idMatch ? parseInt(idMatch[1], 10) : null;
  
  // 根据请求方法处理
  if (method === 'GET') {
    if (id) {
      // 获取单个域名
      try {
        const stmt = env.DB.prepare('SELECT * FROM domains WHERE id = ?').bind(id);
        const domain = await stmt.first();
        
        if (!domain) {
          return createErrorResponse(404, '域名不存在');
        }
        
        return createApiResponse(200, '获取域名成功', domain);
      } catch (error) {
        console.error('获取域名失败:', error);
        return createErrorResponse(500, '服务器错误');
      }
    } else {
      // 获取所有域名
      try {
        const stmt = env.DB.prepare('SELECT * FROM domains ORDER BY created_at DESC');
        const domains = await stmt.all();
        return createApiResponse(200, '获取域名列表成功', domains.results);
      } catch (error) {
        console.error('获取域名列表失败:', error);
        return createErrorResponse(500, '服务器错误');
      }
    }
  } else if (method === 'POST') {
    // 添加域名
    try {
      const data = await request.json();
      
      // 验证必填字段
      if (!data.domain || !data.expiry_date) {
        return createErrorResponse(400, '域名和到期日期为必填项');
      }
      
      const stmt = env.DB.prepare(`
        INSERT INTO domains (domain, registrar, registrar_link, registrar_date, expiry_date, service_type, status, memo, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(
        data.domain,
        data.registrar || '',
        data.registrar_link || '',
        data.registrar_date || null,
        data.expiry_date,
        data.service_type || '',
        data.status || 'active',
        data.memo || ''
      );
      
      const result = await stmt.run();
      
      return createApiResponse(201, '添加域名成功', { id: result.lastRowId });
    } catch (error) {
      console.error('添加域名失败:', error);
      return createErrorResponse(500, '服务器错误');
    }
  } else if (method === 'PUT') {
    // 更新域名
    if (!id) {
      return createErrorResponse(400, '缺少域名ID');
    }
    
    try {
      const data = await request.json();
      
      // 验证必填字段
      if (!data.domain || !data.expiry_date) {
        return createErrorResponse(400, '域名和到期日期为必填项');
      }
      
      const stmt = env.DB.prepare(`
        UPDATE domains
        SET domain = ?, registrar = ?, registrar_link = ?, registrar_date = ?, expiry_date = ?, 
            service_type = ?, status = ?, memo = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(
        data.domain,
        data.registrar || '',
        data.registrar_link || '',
        data.registrar_date || null,
        data.expiry_date,
        data.service_type || '',
        data.status || 'active',
        data.memo || '',
        id
      );
      
      const result = await stmt.run();
      
      if (result.changes === 0) {
        return createErrorResponse(404, '域名不存在');
      }
      
      return createApiResponse(200, '更新域名成功');
    } catch (error) {
      console.error('更新域名失败:', error);
      return createErrorResponse(500, '服务器错误');
    }
  } else if (method === 'DELETE') {
    // 删除域名
    if (!id) {
      return createErrorResponse(400, '缺少域名ID');
    }
    
    try {
      const stmt = env.DB.prepare('DELETE FROM domains WHERE id = ?').bind(id);
      const result = await stmt.run();
      
      if (result.changes === 0) {
        return createErrorResponse(404, '域名不存在');
      }
      
      return createApiResponse(200, '删除域名成功');
    } catch (error) {
      console.error('删除域名失败:', error);
      return createErrorResponse(500, '服务器错误');
    }
  }
  
  return createErrorResponse(405, '不支持的请求方法');
}

// 处理证书请求
async function handleCertificatesRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  
  // 获取证书ID（如果存在）
  const idMatch = path.match(/\/api\/certificates\/(\d+)$/);
  const id = idMatch ? parseInt(idMatch[1], 10) : null;
  
  // 根据请求方法处理
  if (method === 'GET') {
    if (id) {
      // 获取单个证书
      try {
        const stmt = env.DB.prepare('SELECT * FROM certificates WHERE id = ?').bind(id);
        const certificate = await stmt.first();
        
        if (!certificate) {
          return createErrorResponse(404, '证书不存在');
        }
        
        return createApiResponse(200, '获取证书成功', certificate);
      } catch (error) {
        console.error('获取证书失败:', error);
        return createErrorResponse(500, '服务器错误');
      }
    } else {
      // 获取所有证书
      try {
        const stmt = env.DB.prepare('SELECT * FROM certificates ORDER BY created_at DESC');
        const certificates = await stmt.all();
        return createApiResponse(200, '获取证书列表成功', certificates.results);
      } catch (error) {
        console.error('获取证书列表失败:', error);
        return createErrorResponse(500, '服务器错误');
      }
    }
  } else if (method === 'POST') {
    // 添加证书
    try {
      const data = await request.json();
      
      // 验证必填字段
      if (!data.common_name) {
        return createErrorResponse(400, '通用名称为必填项');
      }
      
      const stmt = env.DB.prepare(`
        INSERT INTO certificates (
          domain_id, common_name, status, auto_renew, issuer, valid_from, valid_to,
          certificate_content, private_key, certificate_chain, fingerprint, key_type,
          key_size, san, source, memo, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(
        data.domain_id || null,
        data.common_name,
        data.status || 'unknown',
        data.auto_renew ? 1 : 0,
        data.issuer || '',
        data.valid_from || null,
        data.valid_to || null,
        data.certificate_content || '',
        data.private_key || '',
        data.certificate_chain || '',
        data.fingerprint || '',
        data.key_type || '',
        data.key_size || null,
        data.san || '',
        data.source || 'manual',
        data.memo || ''
      );
      
      const result = await stmt.run();
      
      return createApiResponse(201, '添加证书成功', { id: result.lastRowId });
    } catch (error) {
      console.error('添加证书失败:', error);
      return createErrorResponse(500, '服务器错误');
    }
  } else if (method === 'PUT') {
    // 更新证书
    if (!id) {
      return createErrorResponse(400, '缺少证书ID');
    }
    
    try {
      const data = await request.json();
      
      // 验证必填字段
      if (!data.common_name) {
        return createErrorResponse(400, '通用名称为必填项');
      }
      
      const stmt = env.DB.prepare(`
        UPDATE certificates
        SET domain_id = ?, common_name = ?, status = ?, auto_renew = ?, issuer = ?,
            valid_from = ?, valid_to = ?, certificate_content = ?, private_key = ?,
            certificate_chain = ?, fingerprint = ?, key_type = ?, key_size = ?,
            san = ?, source = ?, memo = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(
        data.domain_id || null,
        data.common_name,
        data.status || 'unknown',
        data.auto_renew ? 1 : 0,
        data.issuer || '',
        data.valid_from || null,
        data.valid_to || null,
        data.certificate_content || null,
        data.private_key || null,
        data.certificate_chain || null,
        data.fingerprint || '',
        data.key_type || '',
        data.key_size || null,
        data.san || '',
        data.source || 'manual',
        data.memo || '',
        id
      );
      
      const result = await stmt.run();
      
      if (result.changes === 0) {
        return createErrorResponse(404, '证书不存在');
      }
      
      return createApiResponse(200, '更新证书成功');
    } catch (error) {
      console.error('更新证书失败:', error);
      return createErrorResponse(500, '服务器错误');
    }
  } else if (method === 'DELETE') {
    // 删除证书
    if (!id) {
      return createErrorResponse(400, '缺少证书ID');
    }
    
    try {
      const stmt = env.DB.prepare('DELETE FROM certificates WHERE id = ?').bind(id);
      const result = await stmt.run();
      
      if (result.changes === 0) {
        return createErrorResponse(404, '证书不存在');
      }
      
      return createApiResponse(200, '删除证书成功');
    } catch (error) {
      console.error('删除证书失败:', error);
      return createErrorResponse(500, '服务器错误');
    }
  }
  
  return createErrorResponse(405, '不支持的请求方法');
}

// 处理设置请求
async function handleSettingsRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  
  // 处理数据库迁移请求
  if (path === '/api/settings/migrate' && method === 'GET') {
    try {
      // 检查版本表是否存在
      const checkVersionTable = env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='db_version'"
      );
      const versionTableExists = await checkVersionTable.first();
      
      if (!versionTableExists) {
        // 创建版本表
        await env.DB.exec(
          "CREATE TABLE IF NOT EXISTS db_version (version INTEGER PRIMARY KEY, applied_at TEXT)"
        );
        
        // 插入初始版本
        await env.DB.exec(
          "INSERT INTO db_version (version, applied_at) VALUES (1, datetime('now'))"
        );
      }
      
      return createApiResponse(200, '数据库迁移成功', { version: 1 });
    } catch (error) {
      console.error('数据库迁移失败:', error);
      return createErrorResponse(500, '数据库迁移失败: ' + error.message);
    }
  }
  
  // 处理备份请求
  if (path === '/api/settings/backup' && method === 'GET') {
    try {
      // 获取所有表
      const tablesStmt = env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );
      const tables = await tablesStmt.all();
      
      // 准备备份数据
      const backup = {};
      
      // 获取每个表的数据
      for (const table of tables.results) {
        const dataStmt = env.DB.prepare(`SELECT * FROM ${table.name}`);
        const data = await dataStmt.all();
        backup[table.name] = data.results;
      }
      
      return createApiResponse(200, '备份成功', backup);
    } catch (error) {
      console.error('备份失败:', error);
      return createErrorResponse(500, '备份失败: ' + error.message);
    }
  }
  
  // 处理恢复请求
  if (path === '/api/settings/restore' && method === 'POST') {
    try {
      const data = await request.json();
      
      // 验证备份数据
      if (!data || typeof data !== 'object') {
        return createErrorResponse(400, '无效的备份数据');
      }
      
      // 开始事务
      await env.DB.exec('BEGIN TRANSACTION');
      
      try {
        // 恢复每个表的数据
        for (const [tableName, tableData] of Object.entries(data)) {
          if (!Array.isArray(tableData)) continue;
          
          // 清空表
          await env.DB.exec(`DELETE FROM ${tableName}`);
          
          // 插入数据
          for (const row of tableData) {
            const columns = Object.keys(row).join(', ');
            const placeholders = Object.keys(row).map(() => '?').join(', ');
            const values = Object.values(row);
            
            const stmt = env.DB.prepare(
              `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`
            ).bind(...values);
            
            await stmt.run();
          }
        }
        
        // 提交事务
        await env.DB.exec('COMMIT');
        
        return createApiResponse(200, '恢复成功');
      } catch (error) {
        // 回滚事务
        await env.DB.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('恢复失败:', error);
      return createErrorResponse(500, '恢复失败: ' + error.message);
    }
  }
  
  // 获取所有设置
  if (method === 'GET') {
    try {
      const stmt = env.DB.prepare('SELECT key, value FROM settings');
      const settings = await stmt.all();
      
      // 将设置转换为键值对对象
      const settingsObj = {};
      for (const setting of settings.results) {
        settingsObj[setting.key] = setting.value;
      }
      
      return createApiResponse(200, '获取设置成功', settingsObj);
    } catch (error) {
      console.error('获取设置失败:', error);
      return createErrorResponse(500, '服务器错误');
    }
  }
  
  // 更新设置
  if (method === 'POST') {
    try {
      const data = await request.json();
      
      // 更新每个设置
      for (const [key, value] of Object.entries(data)) {
        const stmt = env.DB.prepare(
          'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime("now"))'
        ).bind(key, value);
        
        await stmt.run();
      }
      
      return createApiResponse(200, '更新设置成功', data);
    } catch (error) {
      console.error('更新设置失败:', error);
      return createErrorResponse(500, '服务器错误');
    }
  }
  
  return createErrorResponse(405, '不支持的请求方法');
}

// 处理监控请求
async function handleMonitorRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  
  // 获取监控概览
  if (path === '/api/monitor/overview' && method === 'GET') {
    try {
      // 获取即将过期的域名（30天内）
      const domainsStmt = env.DB.prepare(`
        SELECT * FROM domains 
        WHERE date(expiry_date) <= date('now', '+30 days') 
        AND date(expiry_date) >= date('now')
        ORDER BY expiry_date ASC
      `);
      const expiringDomains = await domainsStmt.all();
      
      // 获取即将过期的证书（30天内）
      const certsStmt = env.DB.prepare(`
        SELECT * FROM certificates 
        WHERE date(valid_to) <= date('now', '+30 days') 
        AND date(valid_to) >= date('now')
        ORDER BY valid_to ASC
      `);
      const expiringCertificates = await certsStmt.all();
      
      return createApiResponse(200, '获取监控概览成功', {
        expiringDomains: expiringDomains.results,
        expiringCertificates: expiringCertificates.results
      });
    } catch (error) {
      console.error('获取监控概览失败:', error);
      return createErrorResponse(500, '服务器错误');
    }
  }
  
  // 获取监控配置
  if (path === '/api/monitor/config' && method === 'GET') {
    try {
      const stmt = env.DB.prepare('SELECT * FROM alertcfg LIMIT 1');
      const config = await stmt.first();
      
      return createApiResponse(200, '获取监控配置成功', config || {
        tg_token: '',
        tg_userid: '',
        days: 30
      });
    } catch (error) {
      console.error('获取监控配置失败:', error);
      return createErrorResponse(500, '服务器错误');
    }
  }
  
  // 更新监控配置
  if (path === '/api/monitor/config' && method === 'POST') {
    try {
      const data = await request.json();
      
      // 检查配置是否存在
      const checkStmt = env.DB.prepare('SELECT COUNT(*) as count FROM alertcfg');
      const result = await checkStmt.first();
      
      if (result.count > 0) {
        // 更新配置
        const updateStmt = env.DB.prepare(`
          UPDATE alertcfg
          SET tg_token = ?, tg_userid = ?, days = ?, updated_at = datetime('now')
          WHERE id = 1
        `).bind(
          data.tg_token || '',
          data.tg_userid || '',
          data.days || 30
        );
        
        await updateStmt.run();
      } else {
        // 插入配置
        const insertStmt = env.DB.prepare(`
          INSERT INTO alertcfg (tg_token, tg_userid, days, created_at, updated_at)
          VALUES (?, ?, ?, datetime('now'), datetime('now'))
        `).bind(
          data.tg_token || '',
          data.tg_userid || '',
          data.days || 30
        );
        
        await insertStmt.run();
      }
      
      return createApiResponse(200, '更新监控配置成功');
    } catch (error) {
      console.error('更新监控配置失败:', error);
      return createErrorResponse(500, '服务器错误');
    }
  }
  
  return createApiResponse(200, '监控API响应成功', {});
}

// 处理API检查请求
async function handleApiCheck(request, env) {
  try {
    // 获取监控概览
    const domainsStmt = env.DB.prepare(`
      SELECT * FROM domains 
      WHERE date(expiry_date) <= date('now', '+30 days') 
      AND date(expiry_date) >= date('now')
      ORDER BY expiry_date ASC
    `);
    const expiringDomains = await domainsStmt.all();
    
    // 转换为兼容格式
    return createApiResponse(200, '检查完成', {
      total_domains: expiringDomains.results.length,
      notified_domains: expiringDomains.results.map(domain => ({
        domain: domain.domain,
        remainingDays: Math.ceil((new Date(domain.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        expiry_date: domain.expiry_date
      }))
    });
  } catch (error) {
    console.error('API检查失败:', error);
    return createErrorResponse(500, '服务器错误');
  }
}

// 处理跨域请求
function handleCors() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// 检查数据库是否初始化
async function checkDatabaseInitialized(db) {
  try {
    const stmt = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='domains'"
    );
    const result = await stmt.first();
    return !!result;
  } catch (error) {
    console.error('检查数据库初始化状态失败:', error);
    return false;
  }
}

// 初始化数据库
async function initializeDatabase(db, schema) {
  try {
    await db.exec(schema);
    return true;
  } catch (error) {
    console.error('初始化数据库失败:', error);
    return false;
  }
}

// 创建API响应
function createApiResponse(status, message, data) {
  return new Response(JSON.stringify({
    status: status,
    message: message,
    data: data
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// 创建错误响应
function createErrorResponse(status, message) {
  return new Response(JSON.stringify({
    status: status,
    message: message
  }), {
    status: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
