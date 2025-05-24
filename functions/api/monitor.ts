// 监控 API 端点
// 处理域名和证书的监控、检查等操作

import { extractApiToken, validateApiToken, createApiResponse, createErrorResponse } from '../utils/auth';
import { getAllDomains, updateDomain, getAlertConfig, updateAlertConfig } from '../utils/db';
import { getAllCertificates, updateCertificate } from '../utils/db';
import { sendDomainExpiryNotification, sendCertificateExpiryNotification, testTelegramConfig } from '../utils/telegram';
import { getExpiringDomains } from '../utils/db';
import { getExpiringCertificates, checkDomainSSL } from '../utils/ssl';

export async function onRequestGET(request: Request, env: Env): Promise<Response> {
  // 验证API令牌
  const token = extractApiToken(request);
  if (!token || !validateApiToken(token, env.API_TOKEN || 'default_token')) {
    return createErrorResponse(401, '未授权访问');
  }

  const url = new URL(request.url);
  const path = url.pathname;

  // 获取通知配置
  if (path.endsWith('/config')) {
    const config = await getAlertConfig(env.DB);
    return createApiResponse(200, '获取成功', config);
  }
  
  // 获取监控概览
  if (path.endsWith('/overview')) {
    try {
      // 获取通知配置
      const config = await getAlertConfig(env.DB);
      const days = config?.days || 30;
      
      // 获取即将到期的域名
      const expiringDomains = await getExpiringDomains(env.DB, days);
      
      // 获取即将到期的证书
      const expiringCertificates = await getExpiringCertificates(env.DB, days);
      
      return createApiResponse(200, '获取成功', {
        expiringDomains,
        expiringCertificates,
        config
      });
    } catch (error) {
      console.error('获取监控概览失败:', error);
      return createErrorResponse(500, '服务器错误');
    }
  }
  
  return createErrorResponse(404, '未找到请求的资源');
}

// 兼容小写方法名
export const onRequestGet = onRequestGET;

export async function onRequestPOST(request: Request, env: Env): Promise<Response> {
  // 验证API令牌
  const token = extractApiToken(request);
  if (!token || !validateApiToken(token, env.API_TOKEN || 'default_token')) {
    return createErrorResponse(401, '未授权访问');
  }

  const url = new URL(request.url);
  const path = url.pathname;

  // 更新通知配置
  if (path.endsWith('/config')) {
    try {
      // 解析请求体
      const body = await request.json() as Partial<AlertConfig>;
      
      // 更新配置
      const result = await updateAlertConfig(env.DB, body);
      
      if (!result.success) {
        return createErrorResponse(500, result.error || '更新配置失败');
      }
      
      return createApiResponse(200, '更新成功');
    } catch (error) {
      console.error('更新通知配置失败:', error);
      return createErrorResponse(500, '服务器错误');
    }
  }
  
  // 检查所有域名状态
  if (path.endsWith('/check-domains')) {
    try {
      // 获取所有域名
      const domains = await getAllDomains(env.DB);
      
      // 检查结果
      const results = {
        total: domains.length,
        online: 0,
        offline: 0,
        checked: [] as any[]
      };
      
      // 检查每个域名
      for (const domain of domains) {
        try {
          // 模拟检查域名状态
          const isOnline = Math.random() > 0.1; // 90%概率在线
          
          // 更新域名状态
          await updateDomain(env.DB, domain.id!, {
            status: isOnline ? '在线' : '离线',
            last_check: new Date().toISOString()
          });
          
          // 更新结果
          if (isOnline) {
            results.online++;
          } else {
            results.offline++;
          }
          
          results.checked.push({
            id: domain.id,
            domain: domain.domain,
            status: isOnline ? '在线' : '离线'
          });
        } catch (error) {
          console.error(`检查域名 ${domain.domain} 状态失败:`, error);
        }
      }
      
      return createApiResponse(200, '检查完成', results);
    } catch (error) {
      console.error('检查所有域名状态失败:', error);
      return createErrorResponse(500, '服务器错误');
    }
  }
  
  // 检查所有证书状态
  if (path.endsWith('/check-certificates')) {
    try {
      // 获取所有证书
      const certificates = await getAllCertificates(env.DB);
      
      // 检查结果
      const results = {
        total: certificates.length,
        valid: 0,
        expired: 0,
        checked: [] as any[]
      };
      
      // 检查每个证书
      for (const cert of certificates) {
        try {
          // 检查证书是否过期
          const now = new Date();
          const validTo = new Date(cert.valid_to || '');
          const isValid = validTo > now;
          
          // 计算剩余天数
          const daysRemaining = Math.ceil((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          // 更新证书状态
          await updateCertificate(env.DB, cert.id!, {
            status: isValid ? 'valid' : 'expired',
            last_check: now.toISOString()
          });
          
          // 更新结果
          if (isValid) {
            results.valid++;
          } else {
            results.expired++;
          }
          
          results.checked.push({
            id: cert.id,
            common_name: cert.common_name,
            status: isValid ? 'valid' : 'expired',
            daysRemaining
          });
        } catch (error) {
          console.error(`检查证书 ${cert.common_name} 状态失败:`, error);
        }
      }
      
      return createApiResponse(200, '检查完成', results);
    } catch (error) {
      console.error('检查所有证书状态失败:', error);
      return createErrorResponse(500, '服务器错误');
    }
  }
  
  // 发送域名到期提醒
  if (path.endsWith('/notify-domains')) {
    try {
      // 获取通知配置
      const config = await getAlertConfig(env.DB);
      
      if (!config || !config.tg_token || !config.tg_userid) {
        return createErrorResponse(400, 'Telegram 配置不完整');
      }
      
      // 获取即将到期的域名
      const days = config.days || 30;
      const domains = await getExpiringDomains(env.DB, days);
      
      if (domains.length === 0) {
        return createApiResponse(200, '没有即将到期的域名');
      }
      
      // 发送通知
      const result = await sendDomainExpiryNotification(
        config.tg_token,
        config.tg_userid,
        domains
      );
      
      if (!result.success) {
        return createErrorResponse(500, result.error || '发送通知失败');
      }
      
      // 更新域名通知状态
      for (const domain of domains) {
        await updateDomain(env.DB, domain.id!, { tgsend: 1 });
      }
      
      return createApiResponse(200, '通知发送成功', {
        count: domains.length,
        domains: domains.map(d => ({ id: d.id, domain: d.domain, expiry_date: d.expiry_date }))
      });
    } catch (error) {
      console.error('发送域名到期提醒失败:', error);
      return createErrorResponse(500, '服务器错误');
    }
  }
  
  // 发送证书到期提醒
  if (path.endsWith('/notify-certificates')) {
    try {
      // 获取通知配置
      const config = await getAlertConfig(env.DB);
      
      if (!config || !config.tg_token || !config.tg_userid) {
        return createErrorResponse(400, 'Telegram 配置不完整');
      }
      
      // 获取即将到期的证书
      const days = config.days || 30;
      const certificates = await getExpiringCertificates(env.DB, days);
      
      if (certificates.length === 0) {
        return createApiResponse(200, '没有即将到期的证书');
      }
      
      // 发送通知
      const result = await sendCertificateExpiryNotification(
        config.tg_token,
        config.tg_userid,
        certificates
      );
      
      if (!result.success) {
        return createErrorResponse(500, result.error || '发送通知失败');
      }
      
      return createApiResponse(200, '通知发送成功', {
        count: certificates.length,
        certificates: certificates.map(c => ({ id: c.id, common_name: c.common_name, valid_to: c.valid_to }))
      });
    } catch (error) {
      console.error('发送证书到期提醒失败:', error);
      return createErrorResponse(500, '服务器错误');
    }
  }
  
  // 测试 Telegram 配置
  if (path.endsWith('/test-telegram')) {
    try {
      // 解析请求体
      const body = await request.json() as { token: string; chat_id: string };
      
      // 验证参数
      if (!body.token || !body.chat_id) {
        return createErrorResponse(400, 'Telegram 令牌和聊天ID不能为空');
      }
      
      // 测试配置
      const result = await testTelegramConfig(body.token, body.chat_id);
      
      if (!result.success) {
        return createErrorResponse(500, result.error || '测试失败');
      }
      
      return createApiResponse(200, '测试成功');
    } catch (error) {
      console.error('测试 Telegram 配置失败:', error);
      return createErrorResponse(500, '服务器错误');
    }
  }
  
  return createErrorResponse(404, '未找到请求的资源');
}

// 兼容小写方法名
export const onRequestPost = onRequestPOST;

// 支持 OPTIONS 请求，用于 CORS 预检
export async function onRequestOPTIONS(): Promise<Response> {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// 兼容小写方法名
export const onRequestOptions = onRequestOPTIONS;
