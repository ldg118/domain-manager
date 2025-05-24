// 数据验证和清理工具
// 提供输入数据验证、数据一致性检查和自动清理功能

import { logSystem } from './migration';

/**
 * 域名验证结果
 */
interface DomainValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 证书验证结果
 */
interface CertificateValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 验证域名数据
 * @param domain 域名数据
 * @returns 验证结果
 */
export function validateDomain(domain: any): DomainValidationResult {
  const errors: string[] = [];
  
  // 检查必填字段
  if (!domain.domain) {
    errors.push('域名不能为空');
  } else if (!/^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(domain.domain)) {
    errors.push('域名格式不正确');
  }
  
  if (!domain.expiry_date) {
    errors.push('到期日期不能为空');
  } else {
    // 验证日期格式
    try {
      const date = new Date(domain.expiry_date);
      if (isNaN(date.getTime())) {
        errors.push('到期日期格式不正确');
      }
    } catch (error) {
      errors.push('到期日期格式不正确');
    }
  }
  
  // 验证状态
  if (domain.status && !['在线', '离线', '未知', '过期', '即将过期'].includes(domain.status)) {
    errors.push('状态值不正确');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 验证证书数据
 * @param certificate 证书数据
 * @returns 验证结果
 */
export function validateCertificate(certificate: any): CertificateValidationResult {
  const errors: string[] = [];
  
  // 检查必填字段
  if (!certificate.common_name) {
    errors.push('通用名称不能为空');
  }
  
  // 验证状态
  if (certificate.status && !['valid', 'expired', 'revoked', 'unknown'].includes(certificate.status)) {
    errors.push('状态值不正确');
  }
  
  // 验证日期格式
  if (certificate.valid_from) {
    try {
      const date = new Date(certificate.valid_from);
      if (isNaN(date.getTime())) {
        errors.push('生效日期格式不正确');
      }
    } catch (error) {
      errors.push('生效日期格式不正确');
    }
  }
  
  if (certificate.valid_to) {
    try {
      const date = new Date(certificate.valid_to);
      if (isNaN(date.getTime())) {
        errors.push('过期日期格式不正确');
      }
    } catch (error) {
      errors.push('过期日期格式不正确');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 检查数据一致性
 * @param db D1数据库实例
 * @returns 一致性检查结果
 */
export async function checkDataConsistency(db: D1Database): Promise<{ 
  success: boolean; 
  issues: string[];
  fixedIssues?: string[];
  autoFix?: boolean;
}> {
  const issues: string[] = [];
  const fixedIssues: string[] = [];
  
  try {
    // 1. 检查孤立的证书记录（引用了不存在的域名）
    const orphanedCertificates = await db.prepare(`
      SELECT c.id, c.common_name
      FROM certificates c
      LEFT JOIN domains d ON c.domain_id = d.id
      WHERE c.domain_id IS NOT NULL AND d.id IS NULL
    `).all();
    
    if (orphanedCertificates.results && orphanedCertificates.results.length > 0) {
      issues.push(`发现 ${orphanedCertificates.results.length} 个孤立的证书记录`);
      
      // 自动修复：将孤立证书的domain_id设为NULL
      await db.prepare(`
        UPDATE certificates
        SET domain_id = NULL
        WHERE id IN (
          SELECT c.id
          FROM certificates c
          LEFT JOIN domains d ON c.domain_id = d.id
          WHERE c.domain_id IS NOT NULL AND d.id IS NULL
        )
      `).run();
      
      fixedIssues.push(`已修复 ${orphanedCertificates.results.length} 个孤立的证书记录`);
    }
    
    // 2. 检查过期日期格式不正确的域名
    const invalidExpiryDates = await db.prepare(`
      SELECT id, domain, expiry_date
      FROM domains
      WHERE expiry_date IS NOT NULL AND date(expiry_date) IS NULL
    `).all();
    
    if (invalidExpiryDates.results && invalidExpiryDates.results.length > 0) {
      issues.push(`发现 ${invalidExpiryDates.results.length} 个过期日期格式不正确的域名记录`);
    }
    
    // 3. 检查证书有效期格式不正确的记录
    const invalidCertDates = await db.prepare(`
      SELECT id, common_name, valid_from, valid_to
      FROM certificates
      WHERE (valid_from IS NOT NULL AND date(valid_from) IS NULL)
         OR (valid_to IS NOT NULL AND date(valid_to) IS NULL)
    `).all();
    
    if (invalidCertDates.results && invalidCertDates.results.length > 0) {
      issues.push(`发现 ${invalidCertDates.results.length} 个有效期格式不正确的证书记录`);
    }
    
    // 4. 检查重复的域名记录
    const duplicateDomains = await db.prepare(`
      SELECT domain, COUNT(*) as count
      FROM domains
      GROUP BY domain
      HAVING COUNT(*) > 1
    `).all();
    
    if (duplicateDomains.results && duplicateDomains.results.length > 0) {
      issues.push(`发现 ${duplicateDomains.results.length} 个重复的域名记录`);
    }
    
    // 记录日志
    await logSystem(
      db,
      issues.length > 0 ? 'warning' : 'info',
      `数据一致性检查完成，发现 ${issues.length} 个问题，修复了 ${fixedIssues.length} 个问题`,
      'data-validation',
      { issues, fixedIssues }
    );
    
    return {
      success: issues.length === 0,
      issues,
      fixedIssues,
      autoFix: fixedIssues.length > 0
    };
  } catch (error) {
    console.error('检查数据一致性失败:', error);
    
    // 记录日志
    await logSystem(
      db,
      'error',
      '检查数据一致性失败',
      'data-validation',
      { error: error.message }
    );
    
    return {
      success: false,
      issues: [`检查数据一致性失败: ${error.message}`]
    };
  }
}

/**
 * 清理过期数据
 * @param db D1数据库实例
 * @param daysToKeep 保留天数
 * @returns 清理结果
 */
export async function cleanupExpiredData(db: D1Database, daysToKeep: number = 90): Promise<{
  success: boolean;
  error?: string;
  cleanedRecords?: {
    logs?: number;
    backups?: number;
  };
}> {
  try {
    let cleanedLogs = 0;
    let cleanedBackups = 0;
    
    // 1. 清理过期的系统日志
    const logsTableExists = await db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='system_logs'
    `).first();
    
    if (logsTableExists) {
      const logsResult = await db.prepare(`
        DELETE FROM system_logs
        WHERE timestamp < datetime('now', '-' || ? || ' days')
      `).bind(daysToKeep).run();
      
      cleanedLogs = logsResult.meta?.changes || 0;
    }
    
    // 2. 清理过期的备份记录
    const backupsTableExists = await db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='backups'
    `).first();
    
    if (backupsTableExists) {
      const backupsResult = await db.prepare(`
        DELETE FROM backups
        WHERE created_at < datetime('now', '-' || ? || ' days')
      `).bind(daysToKeep).run();
      
      cleanedBackups = backupsResult.meta?.changes || 0;
    }
    
    // 记录日志
    await logSystem(
      db,
      'info',
      `清理过期数据完成，清理了 ${cleanedLogs} 条日志和 ${cleanedBackups} 条备份记录`,
      'data-cleanup',
      { daysToKeep, cleanedLogs, cleanedBackups }
    );
    
    return {
      success: true,
      cleanedRecords: {
        logs: cleanedLogs,
        backups: cleanedBackups
      }
    };
  } catch (error) {
    console.error('清理过期数据失败:', error);
    
    // 记录日志
    await logSystem(
      db,
      'error',
      '清理过期数据失败',
      'data-cleanup',
      { error: error.message }
    );
    
    return {
      success: false,
      error: `清理过期数据失败: ${error.message}`
    };
  }
}

/**
 * 修复数据问题
 * @param db D1数据库实例
 * @returns 修复结果
 */
export async function fixDataIssues(db: D1Database): Promise<{
  success: boolean;
  error?: string;
  fixedIssues: string[];
}> {
  const fixedIssues: string[] = [];
  
  try {
    // 开始事务
    await db.exec('BEGIN TRANSACTION');
    
    // 1. 修复孤立的证书记录
    const orphanedCertificatesResult = await db.prepare(`
      UPDATE certificates
      SET domain_id = NULL
      WHERE id IN (
        SELECT c.id
        FROM certificates c
        LEFT JOIN domains d ON c.domain_id = d.id
        WHERE c.domain_id IS NOT NULL AND d.id IS NULL
      )
    `).run();
    
    const fixedCertificates = orphanedCertificatesResult.meta?.changes || 0;
    if (fixedCertificates > 0) {
      fixedIssues.push(`修复了 ${fixedCertificates} 个孤立的证书记录`);
    }
    
    // 2. 修复域名状态
    const domainStatusResult = await db.prepare(`
      UPDATE domains
      SET status = '未知'
      WHERE status IS NULL OR status = ''
    `).run();
    
    const fixedDomainStatus = domainStatusResult.meta?.changes || 0;
    if (fixedDomainStatus > 0) {
      fixedIssues.push(`修复了 ${fixedDomainStatus} 个域名状态为空的记录`);
    }
    
    // 3. 修复证书状态
    const certStatusResult = await db.prepare(`
      UPDATE certificates
      SET status = 'unknown'
      WHERE status IS NULL OR status = ''
    `).run();
    
    const fixedCertStatus = certStatusResult.meta?.changes || 0;
    if (fixedCertStatus > 0) {
      fixedIssues.push(`修复了 ${fixedCertStatus} 个证书状态为空的记录`);
    }
    
    // 提交事务
    await db.exec('COMMIT');
    
    // 记录日志
    await logSystem(
      db,
      'info',
      `修复数据问题完成，修复了 ${fixedIssues.length} 类问题`,
      'data-repair',
      { fixedIssues }
    );
    
    return {
      success: true,
      fixedIssues
    };
  } catch (error) {
    console.error('修复数据问题失败:', error);
    
    // 回滚事务
    try {
      await db.exec('ROLLBACK');
    } catch (rollbackError) {
      console.error('回滚事务失败:', rollbackError);
    }
    
    // 记录日志
    await logSystem(
      db,
      'error',
      '修复数据问题失败',
      'data-repair',
      { error: error.message }
    );
    
    return {
      success: false,
      error: `修复数据问题失败: ${error.message}`,
      fixedIssues
    };
  }
}
