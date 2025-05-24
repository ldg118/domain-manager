// 监控和告警工具
// 提供域名和证书状态监控、异常检测和多渠道告警功能

import { logSystem, LogLevel, LogSource } from './logging';
import { recordLog } from './logging';

/**
 * 监控类型
 */
export enum MonitorType {
  DOMAIN = 'domain',
  CERTIFICATE = 'certificate',
  SYSTEM = 'system'
}

/**
 * 告警级别
 */
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

/**
 * 告警渠道
 */
export enum AlertChannel {
  TELEGRAM = 'telegram',
  EMAIL = 'email',
  WEBHOOK = 'webhook',
  SYSTEM = 'system'
}

/**
 * 告警配置
 */
interface AlertConfig {
  enabled: boolean;
  channels: {
    telegram?: {
      enabled: boolean;
      botToken: string;
      chatId: string;
    };
    email?: {
      enabled: boolean;
      recipients: string[];
      smtpConfig?: any;
    };
    webhook?: {
      enabled: boolean;
      url: string;
      headers?: Record<string, string>;
    };
  };
  rules: {
    domainExpiryDays: number[];
    certificateExpiryDays: number[];
    systemAlerts: boolean;
  };
}

/**
 * 获取告警配置
 * @param db D1数据库实例
 * @returns 告警配置
 */
export async function getAlertConfig(db: D1Database): Promise<AlertConfig> {
  try {
    // 获取Telegram配置
    const telegramConfig = await db.prepare(`
      SELECT value FROM settings WHERE key = 'telegram'
    `).first<{ value: string }>();
    
    // 获取提醒配置
    const remindersConfig = await db.prepare(`
      SELECT value FROM settings WHERE key = 'reminders'
    `).first<{ value: string }>();
    
    // 获取监控配置
    const monitoringConfig = await db.prepare(`
      SELECT value FROM settings WHERE key = 'monitoring'
    `).first<{ value: string }>();
    
    // 获取邮件配置
    const emailConfig = await db.prepare(`
      SELECT value FROM settings WHERE key = 'email'
    `).first<{ value: string }>();
    
    // 获取Webhook配置
    const webhookConfig = await db.prepare(`
      SELECT value FROM settings WHERE key = 'webhook'
    `).first<{ value: string }>();
    
    // 解析配置
    const telegram = telegramConfig ? JSON.parse(telegramConfig.value) : { enabled: false, botToken: '', chatId: '' };
    const reminders = remindersConfig ? JSON.parse(remindersConfig.value) : { domainExpiryDays: [30, 15, 7], certificateExpiryDays: [30, 15, 7] };
    const monitoring = monitoringConfig ? JSON.parse(monitoringConfig.value) : { domainMonitoringEnabled: true, certificateMonitoringEnabled: true };
    const email = emailConfig ? JSON.parse(emailConfig.value) : { enabled: false, recipients: [] };
    const webhook = webhookConfig ? JSON.parse(webhookConfig.value) : { enabled: false, url: '' };
    
    // 构建告警配置
    return {
      enabled: monitoring.domainMonitoringEnabled || monitoring.certificateMonitoringEnabled,
      channels: {
        telegram: {
          enabled: telegram.enabled,
          botToken: telegram.botToken,
          chatId: telegram.chatId
        },
        email: {
          enabled: email.enabled,
          recipients: email.recipients,
          smtpConfig: email.smtpConfig
        },
        webhook: {
          enabled: webhook.enabled,
          url: webhook.url,
          headers: webhook.headers
        }
      },
      rules: {
        domainExpiryDays: reminders.domainExpiryDays,
        certificateExpiryDays: reminders.certificateExpiryDays,
        systemAlerts: true
      }
    };
  } catch (error) {
    console.error('获取告警配置失败:', error);
    
    // 记录日志
    await logSystem(
      db,
      'error',
      '获取告警配置失败',
      'monitor',
      { error: error.message }
    );
    
    // 返回默认配置
    return {
      enabled: false,
      channels: {
        telegram: {
          enabled: false,
          botToken: '',
          chatId: ''
        }
      },
      rules: {
        domainExpiryDays: [30, 15, 7],
        certificateExpiryDays: [30, 15, 7],
        systemAlerts: true
      }
    };
  }
}

/**
 * 发送告警
 * @param db D1数据库实例
 * @param level 告警级别
 * @param message 告警消息
 * @param type 监控类型
 * @param details 详细信息
 * @returns 操作结果
 */
export async function sendAlert(
  db: D1Database,
  level: AlertLevel,
  message: string,
  type: MonitorType,
  details?: any
): Promise<{ success: boolean; error?: string; channels?: string[] }> {
  try {
    // 获取告警配置
    const config = await getAlertConfig(db);
    
    // 如果告警功能未启用，直接返回
    if (!config.enabled) {
      return { success: true, channels: [] };
    }
    
    // 记录告警日志
    await recordLog(
      db,
      level === AlertLevel.INFO ? LogLevel.INFO : level === AlertLevel.WARNING ? LogLevel.WARNING : LogLevel.ERROR,
      message,
      type === MonitorType.DOMAIN ? LogSource.DOMAIN : type === MonitorType.CERTIFICATE ? LogSource.CERTIFICATE : LogSource.SYSTEM,
      details
    );
    
    // 发送到各个启用的渠道
    const sentChannels: string[] = [];
    
    // 发送到Telegram
    if (config.channels.telegram?.enabled && config.channels.telegram.botToken && config.channels.telegram.chatId) {
      try {
        const telegramMessage = `[${level.toUpperCase()}] ${message}`;
        
        // 实际发送Telegram消息的代码
        // 这里只是模拟，实际项目中需要使用fetch或其他方式调用Telegram API
        console.log('发送Telegram告警:', telegramMessage);
        
        sentChannels.push(AlertChannel.TELEGRAM);
      } catch (error) {
        console.error('发送Telegram告警失败:', error);
      }
    }
    
    // 发送到Email
    if (config.channels.email?.enabled && config.channels.email.recipients?.length > 0) {
      try {
        const emailSubject = `[${level.toUpperCase()}] 域名管理系统告警`;
        const emailBody = message;
        
        // 实际发送Email的代码
        // 这里只是模拟，实际项目中需要使用SMTP或其他方式发送邮件
        console.log('发送Email告警:', emailSubject, emailBody);
        
        sentChannels.push(AlertChannel.EMAIL);
      } catch (error) {
        console.error('发送Email告警失败:', error);
      }
    }
    
    // 发送到Webhook
    if (config.channels.webhook?.enabled && config.channels.webhook.url) {
      try {
        const webhookPayload = {
          level,
          message,
          type,
          timestamp: new Date().toISOString(),
          details
        };
        
        // 实际发送Webhook的代码
        // 这里只是模拟，实际项目中需要使用fetch或其他方式调用Webhook
        console.log('发送Webhook告警:', webhookPayload);
        
        sentChannels.push(AlertChannel.WEBHOOK);
      } catch (error) {
        console.error('发送Webhook告警失败:', error);
      }
    }
    
    // 始终添加系统渠道（日志已记录）
    sentChannels.push(AlertChannel.SYSTEM);
    
    return {
      success: true,
      channels: sentChannels
    };
  } catch (error) {
    console.error('发送告警失败:', error);
    
    // 记录日志
    await logSystem(
      db,
      'error',
      '发送告警失败',
      'monitor',
      { error: error.message }
    );
    
    return {
      success: false,
      error: `发送告警失败: ${error.message}`
    };
  }
}

/**
 * 检查域名过期
 * @param db D1数据库实例
 * @returns 检查结果
 */
export async function checkDomainExpiry(db: D1Database): Promise<{
  success: boolean;
  error?: string;
  alerts?: number;
}> {
  try {
    // 获取告警配置
    const config = await getAlertConfig(db);
    
    // 如果域名监控未启用，直接返回
    if (!config.enabled) {
      return { success: true, alerts: 0 };
    }
    
    // 获取提醒天数
    const expiryDays = config.rules.domainExpiryDays || [30, 15, 7];
    
    // 检查每个提醒天数
    let totalAlerts = 0;
    
    for (const days of expiryDays) {
      // 查询即将过期的域名
      const expiringDomains = await db.prepare(`
        SELECT id, domain, expiry_date
        FROM domains
        WHERE date(expiry_date) <= date('now', '+' || ? || ' days')
          AND date(expiry_date) > date('now')
          AND (tgsend = 0 OR tgsend < ?)
      `).bind(days, days).all();
      
      if (expiringDomains.results && expiringDomains.results.length > 0) {
        // 发送告警
        for (const domain of expiringDomains.results) {
          const daysRemaining = Math.ceil((new Date(domain.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          
          const alertLevel = daysRemaining <= 7 ? AlertLevel.CRITICAL : daysRemaining <= 15 ? AlertLevel.WARNING : AlertLevel.INFO;
          const alertMessage = `域名 ${domain.domain} 将在 ${daysRemaining} 天后过期`;
          
          await sendAlert(
            db,
            alertLevel,
            alertMessage,
            MonitorType.DOMAIN,
            {
              domainId: domain.id,
              domain: domain.domain,
              expiryDate: domain.expiry_date,
              daysRemaining
            }
          );
          
          // 更新通知状态
          await db.prepare(`
            UPDATE domains
            SET tgsend = ?
            WHERE id = ?
          `).bind(days, domain.id).run();
          
          totalAlerts++;
        }
      }
    }
    
    // 检查已过期的域名
    const expiredDomains = await db.prepare(`
      SELECT id, domain, expiry_date
      FROM domains
      WHERE date(expiry_date) < date('now')
        AND status != '过期'
    `).all();
    
    if (expiredDomains.results && expiredDomains.results.length > 0) {
      // 发送告警
      for (const domain of expiredDomains.results) {
        const alertMessage = `域名 ${domain.domain} 已过期`;
        
        await sendAlert(
          db,
          AlertLevel.CRITICAL,
          alertMessage,
          MonitorType.DOMAIN,
          {
            domainId: domain.id,
            domain: domain.domain,
            expiryDate: domain.expiry_date
          }
        );
        
        // 更新域名状态
        await db.prepare(`
          UPDATE domains
          SET status = '过期'
          WHERE id = ?
        `).bind(domain.id).run();
        
        totalAlerts++;
      }
    }
    
    // 记录日志
    await logSystem(
      db,
      'info',
      `域名过期检查完成，发送了 ${totalAlerts} 条告警`,
      'monitor'
    );
    
    return {
      success: true,
      alerts: totalAlerts
    };
  } catch (error) {
    console.error('检查域名过期失败:', error);
    
    // 记录日志
    await logSystem(
      db,
      'error',
      '检查域名过期失败',
      'monitor',
      { error: error.message }
    );
    
    return {
      success: false,
      error: `检查域名过期失败: ${error.message}`
    };
  }
}

/**
 * 检查证书过期
 * @param db D1数据库实例
 * @returns 检查结果
 */
export async function checkCertificateExpiry(db: D1Database): Promise<{
  success: boolean;
  error?: string;
  alerts?: number;
}> {
  try {
    // 获取告警配置
    const config = await getAlertConfig(db);
    
    // 如果证书监控未启用，直接返回
    if (!config.enabled) {
      return { success: true, alerts: 0 };
    }
    
    // 获取提醒天数
    const expiryDays = config.rules.certificateExpiryDays || [30, 15, 7];
    
    // 检查每个提醒天数
    let totalAlerts = 0;
    
    for (const days of expiryDays) {
      // 查询即将过期的证书
      const expiringCerts = await db.prepare(`
        SELECT c.id, c.common_name, c.valid_to, d.domain
        FROM certificates c
        LEFT JOIN domains d ON c.domain_id = d.id
        WHERE date(c.valid_to) <= date('now', '+' || ? || ' days')
          AND date(c.valid_to) > date('now')
          AND c.status != 'expired'
      `).bind(days).all();
      
      if (expiringCerts.results && expiringCerts.results.length > 0) {
        // 发送告警
        for (const cert of expiringCerts.results) {
          const daysRemaining = Math.ceil((new Date(cert.valid_to).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          
          const alertLevel = daysRemaining <= 7 ? AlertLevel.CRITICAL : daysRemaining <= 15 ? AlertLevel.WARNING : AlertLevel.INFO;
          const alertMessage = `证书 ${cert.common_name} 将在 ${daysRemaining} 天后过期`;
          
          await sendAlert(
            db,
            alertLevel,
            alertMessage,
            MonitorType.CERTIFICATE,
            {
              certId: cert.id,
              commonName: cert.common_name,
              domain: cert.domain,
              validTo: cert.valid_to,
              daysRemaining
            }
          );
          
          totalAlerts++;
        }
      }
    }
    
    // 检查已过期的证书
    const expiredCerts = await db.prepare(`
      SELECT c.id, c.common_name, c.valid_to, d.domain
      FROM certificates c
      LEFT JOIN domains d ON c.domain_id = d.id
      WHERE date(c.valid_to) < date('now')
        AND c.status != 'expired'
    `).all();
    
    if (expiredCerts.results && expiredCerts.results.length > 0) {
      // 发送告警
      for (const cert of expiredCerts.results) {
        const alertMessage = `证书 ${cert.common_name} 已过期`;
        
        await sendAlert(
          db,
          AlertLevel.CRITICAL,
          alertMessage,
          MonitorType.CERTIFICATE,
          {
            certId: cert.id,
            commonName: cert.common_name,
            domain: cert.domain,
            validTo: cert.valid_to
          }
        );
        
        // 更新证书状态
        await db.prepare(`
          UPDATE certificates
          SET status = 'expired'
          WHERE id = ?
        `).bind(cert.id).run();
        
        totalAlerts++;
      }
    }
    
    // 记录日志
    await logSystem(
      db,
      'info',
      `证书过期检查完成，发送了 ${totalAlerts} 条告警`,
      'monitor'
    );
    
    return {
      success: true,
      alerts: totalAlerts
    };
  } catch (error) {
    console.error('检查证书过期失败:', error);
    
    // 记录日志
    await logSystem(
      db,
      'error',
      '检查证书过期失败',
      'monitor',
      { error: error.message }
    );
    
    return {
      success: false,
      error: `检查证书过期失败: ${error.message}`
    };
  }
}

/**
 * 检查系统状态
 * @param db D1数据库实例
 * @returns 检查结果
 */
export async function checkSystemStatus(db: D1Database): Promise<{
  success: boolean;
  error?: string;
  status: {
    database: boolean;
    domains: number;
    certificates: number;
    alerts: number;
  };
}> {
  try {
    // 检查数据库连接
    const dbCheck = await db.prepare('SELECT 1').first();
    const dbStatus = !!dbCheck;
    
    // 获取域名数量
    const domainsCount = await db.prepare('SELECT COUNT(*) as count FROM domains').first<{ count: number }>();
    
    // 获取证书数量
    const certsCount = await db.prepare('SELECT COUNT(*) as count FROM certificates').first<{ count: number }>();
    
    // 获取告警数量
    const alertsCount = await db.prepare(`
      SELECT COUNT(*) as count FROM system_logs
      WHERE level IN ('warning', 'error')
        AND timestamp > datetime('now', '-1 day')
    `).first<{ count: number }>();
    
    // 记录日志
    await logSystem(
      db,
      'info',
      '系统状态检查完成',
      'monitor',
      {
        database: dbStatus,
        domains: domainsCount?.count || 0,
        certificates: certsCount?.count || 0,
        alerts: alertsCount?.count || 0
      }
    );
    
    return {
      success: true,
      status: {
        database: dbStatus,
        domains: domainsCount?.count || 0,
        certificates: certsCount?.count || 0,
        alerts: alertsCount?.count || 0
      }
    };
  } catch (error) {
    console.error('检查系统状态失败:', error);
    
    // 记录日志
    await logSystem(
      db,
      'error',
      '检查系统状态失败',
      'monitor',
      { error: error.message }
    );
    
    return {
      success: false,
      error: `检查系统状态失败: ${error.message}`,
      status: {
        database: false,
        domains: 0,
        certificates: 0,
        alerts: 0
      }
    };
  }
}
