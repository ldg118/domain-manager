// Telegram 通知工具函数
// 处理 Telegram 机器人通知

/**
 * 发送 Telegram 消息
 * @param token Telegram 机器人令牌
 * @param chatId Telegram 聊天 ID
 * @param message 消息内容
 * @returns 发送结果
 */
export async function sendTelegramMessage(
  token: string,
  chatId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 检查参数
    if (!token || !chatId || !message) {
      return { success: false, error: '参数不完整' };
    }

    // 构建 Telegram API URL
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    // 发送请求
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    // 解析响应
    const data = await response.json();

    // 检查响应
    if (!data.ok) {
      return { success: false, error: data.description || '发送失败' };
    }

    return { success: true };
  } catch (error) {
    console.error('发送 Telegram 消息失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 发送域名到期提醒
 * @param token Telegram 机器人令牌
 * @param chatId Telegram 聊天 ID
 * @param domains 域名列表
 * @returns 发送结果
 */
export async function sendDomainExpiryNotification(
  token: string,
  chatId: string,
  domains: Domain[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // 检查参数
    if (!token || !chatId || !domains.length) {
      return { success: false, error: '参数不完整' };
    }

    // 构建消息
    let message = '<b>域名到期提醒</b>\n\n';
    message += '以下域名即将到期，请及时续费：\n\n';

    domains.forEach((domain, index) => {
      const expiryDate = new Date(domain.expiry_date);
      const now = new Date();
      const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      message += `${index + 1}. <b>${domain.domain}</b>\n`;
      message += `   到期日期: ${domain.expiry_date}\n`;
      message += `   剩余天数: ${daysRemaining} 天\n`;
      if (domain.registrar) {
        message += `   注册商: ${domain.registrar}\n`;
      }
      message += '\n';
    });

    // 发送消息
    return await sendTelegramMessage(token, chatId, message);
  } catch (error) {
    console.error('发送域名到期提醒失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 发送证书到期提醒
 * @param token Telegram 机器人令牌
 * @param chatId Telegram 聊天 ID
 * @param certificates 证书列表
 * @returns 发送结果
 */
export async function sendCertificateExpiryNotification(
  token: string,
  chatId: string,
  certificates: any[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // 检查参数
    if (!token || !chatId || !certificates.length) {
      return { success: false, error: '参数不完整' };
    }

    // 构建消息
    let message = '<b>SSL证书到期提醒</b>\n\n';
    message += '以下SSL证书即将到期，请及时续期：\n\n';

    certificates.forEach((cert, index) => {
      const validTo = new Date(cert.valid_to);
      const now = new Date();
      const daysRemaining = Math.ceil((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      message += `${index + 1}. <b>${cert.common_name}</b>\n`;
      message += `   域名: ${cert.domain_name || '未知'}\n`;
      message += `   到期日期: ${cert.valid_to}\n`;
      message += `   剩余天数: ${daysRemaining} 天\n`;
      message += `   自动续期: ${cert.auto_renew ? '是' : '否'}\n`;
      message += '\n';
    });

    // 发送消息
    return await sendTelegramMessage(token, chatId, message);
  } catch (error) {
    console.error('发送证书到期提醒失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 测试 Telegram 配置
 * @param token Telegram 机器人令牌
 * @param chatId Telegram 聊天 ID
 * @returns 测试结果
 */
export async function testTelegramConfig(
  token: string,
  chatId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 构建测试消息
    const message = '<b>域名管理系统</b>\n\n这是一条测试消息，如果您收到此消息，说明 Telegram 通知配置正确。';

    // 发送消息
    return await sendTelegramMessage(token, chatId, message);
  } catch (error) {
    console.error('测试 Telegram 配置失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}
