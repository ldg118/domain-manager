// SSL证书管理工具函数
// 处理SSL证书的申请、更新和状态检查

import { getDomainById, addCertificate, updateCertificate, getCertificateById } from './db';

/**
 * 申请SSL证书
 * @param db D1数据库实例
 * @param domainId 域名ID
 * @param commonName 通用名称（可选，默认使用域名）
 * @returns 申请结果
 */
export async function requestCertificate(
  db: D1Database,
  domainId: number,
  commonName?: string
): Promise<{ success: boolean; certificateId?: number; error?: string }> {
  try {
    // 获取域名信息
    const domain = await getDomainById(db, domainId);
    if (!domain) {
      return { success: false, error: '域名不存在' };
    }

    // 如果未提供通用名称，使用域名
    const certCommonName = commonName || domain.domain;

    // 模拟证书申请过程
    console.log(`为域名 ${domain.domain} 申请SSL证书`);

    // 设置证书有效期（当前日期到90天后）
    const now = new Date();
    const validFrom = now.toISOString();
    const validTo = new Date(now.setDate(now.getDate() + 90)).toISOString();

    // 创建证书记录
    const result = await addCertificate(db, {
      domain_id: domainId,
      common_name: certCommonName,
      status: 'valid',
      auto_renew: 1,
      issuer: "Let's Encrypt Authority X3",
      valid_from: validFrom,
      valid_to: validTo,
    });

    if (!result.success) {
      return { success: false, error: result.error || '证书申请失败' };
    }

    return { success: true, certificateId: result.id };
  } catch (error) {
    console.error('SSL证书申请失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 检查证书状态
 * @param db D1数据库实例
 * @param certificateId 证书ID
 * @returns 检查结果
 */
export async function checkCertificateStatus(
  db: D1Database,
  certificateId: number
): Promise<{ success: boolean; status?: string; daysRemaining?: number; error?: string }> {
  try {
    // 获取证书信息
    const certificate = await getCertificateById(db, certificateId);
    if (!certificate) {
      return { success: false, error: '证书不存在' };
    }

    // 检查证书是否过期
    const now = new Date();
    const validTo = new Date(certificate.valid_to || '');
    const isValid = validTo > now;

    // 计算剩余天数
    const daysRemaining = Math.ceil((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // 更新证书状态
    const status = isValid ? 'valid' : 'expired';
    await updateCertificate(db, certificateId, {
      status,
      last_check: now.toISOString(),
    });

    return { success: true, status, daysRemaining };
  } catch (error) {
    console.error('检查证书状态失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 续期证书
 * @param db D1数据库实例
 * @param certificateId 证书ID
 * @returns 续期结果
 */
export async function renewCertificate(
  db: D1Database,
  certificateId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // 获取证书信息
    const certificate = await getCertificateById(db, certificateId);
    if (!certificate) {
      return { success: false, error: '证书不存在' };
    }

    // 获取域名信息
    const domain = await getDomainById(db, certificate.domain_id);
    if (!domain) {
      return { success: false, error: '域名不存在' };
    }

    // 模拟证书续期过程
    console.log(`为域名 ${domain.domain} 续期SSL证书`);

    // 设置新的证书有效期（当前日期到90天后）
    const now = new Date();
    const validFrom = now.toISOString();
    const validTo = new Date(now.setDate(now.getDate() + 90)).toISOString();

    // 更新证书记录
    await updateCertificate(db, certificateId, {
      status: 'valid',
      valid_from: validFrom,
      valid_to: validTo,
      last_check: now.toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error('续期证书失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 获取即将过期的证书
 * @param db D1数据库实例
 * @param days 天数
 * @returns 即将过期的证书列表
 */
export async function getExpiringCertificates(
  db: D1Database,
  days: number
): Promise<Certificate[]> {
  try {
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + days);

    const { results } = await db.prepare(`
      SELECT c.*, d.domain as domain_name
      FROM certificates c
      JOIN domains d ON c.domain_id = d.id
      WHERE c.valid_to >= ? AND c.valid_to <= ?
      ORDER BY c.valid_to ASC
    `).bind(
      now.toISOString(),
      futureDate.toISOString()
    ).all();

    return results as any[];
  } catch (error) {
    console.error('获取即将过期的证书失败:', error);
    return [];
  }
}

/**
 * 检查域名SSL状态
 * @param domain 域名
 * @returns 检查结果
 */
export async function checkDomainSSL(
  domain: string
): Promise<{ success: boolean; valid: boolean; issuer?: string; validTo?: string; error?: string }> {
  try {
    // 模拟检查域名SSL状态
    console.log(`检查域名 ${domain} 的SSL状态`);

    // 在实际环境中，这里应该进行真实的SSL检查
    // 这里仅返回模拟数据
    return {
      success: true,
      valid: true,
      issuer: "Let's Encrypt Authority X3",
      validTo: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60天后
    };
  } catch (error) {
    console.error('检查域名SSL状态失败:', error);
    return { success: false, valid: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}
