// SSL证书管理 API 端点
// 处理SSL证书的申请、更新、删除等操作

import { createApiResponse, createErrorResponse } from '../utils/auth';
import { getAllCertificates, getCertificateById, addCertificate, updateCertificate, deleteCertificate } from '../utils/db';

export async function onRequestGET(request: Request, env: Env): Promise<Response> {
  try {
    console.log('证书管理 - GET请求开始处理');

    const url = new URL(request.url);
    const path = url.pathname;
    const id = path.split('/').pop();
    console.log('证书管理 - 请求路径:', path, '请求ID:', id);

    // 获取单个证书
    if (id && /^\d+$/.test(id)) {
      const certId = parseInt(id);
      console.log('证书管理 - 获取单个证书:', certId);
      const cert = await getCertificateById(env.DB, certId);
      
      if (!cert) {
        console.log('证书管理 - 证书不存在:', certId);
        return createErrorResponse(404, '证书不存在');
      }
      
      console.log('证书管理 - 获取证书成功:', cert);
      return createApiResponse(200, '获取成功', cert);
    }
    
    // 获取所有证书
    console.log('证书管理 - 获取所有证书');
    const certs = await getAllCertificates(env.DB);
    console.log('证书管理 - 获取到证书数量:', certs.length);
    return createApiResponse(200, '获取成功', certs);
  } catch (error) {
    console.error('证书管理 - GET请求处理错误:', error);
    return createErrorResponse(500, '服务器错误');
  }
}

// 兼容小写方法名
export const onRequestGet = onRequestGET;

export async function onRequestPOST(request: Request, env: Env): Promise<Response> {
  try {
    console.log('证书管理 - POST请求开始处理');

    // 解析请求体
    const body = await request.json() as Certificate;
    console.log('证书管理 - 请求体:', JSON.stringify(body));
    
    // 验证必填字段
    if (!body.common_name) {
      console.log('证书管理 - 缺少必填字段');
      return createErrorResponse(400, '证书通用名称不能为空');
    }
    
    // 添加证书
    console.log('证书管理 - 开始添加证书');
    const result = await addCertificate(env.DB, body);
    
    if (!result.success) {
      console.log('证书管理 - 添加证书失败:', result.error);
      return createErrorResponse(500, result.error || '添加证书失败');
    }
    
    console.log('证书管理 - 添加证书成功, ID:', result.id);
    return createApiResponse(201, '添加成功', { id: result.id });
  } catch (error) {
    console.error('证书管理 - POST请求处理错误:', error);
    return createErrorResponse(500, '服务器错误');
  }
}

// 兼容小写方法名
export const onRequestPost = onRequestPOST;

export async function onRequestPUT(request: Request, env: Env): Promise<Response> {
  try {
    console.log('证书管理 - PUT请求开始处理');

    const url = new URL(request.url);
    const path = url.pathname;
    const id = path.split('/').pop();
    console.log('证书管理 - 请求路径:', path, '请求ID:', id);
    
    // 验证ID
    if (!id || !/^\d+$/.test(id)) {
      console.log('证书管理 - 无效的证书ID');
      return createErrorResponse(400, '无效的证书ID');
    }
    
    const certId = parseInt(id);
    
    // 检查证书是否存在
    console.log('证书管理 - 检查证书是否存在:', certId);
    const cert = await getCertificateById(env.DB, certId);
    if (!cert) {
      console.log('证书管理 - 证书不存在:', certId);
      return createErrorResponse(404, '证书不存在');
    }
    
    // 解析请求体
    const body = await request.json() as Partial<Certificate>;
    console.log('证书管理 - 请求体:', JSON.stringify(body));
    
    // 更新证书
    console.log('证书管理 - 开始更新证书:', certId);
    const result = await updateCertificate(env.DB, certId, body);
    
    if (!result.success) {
      console.log('证书管理 - 更新证书失败:', result.error);
      return createErrorResponse(500, result.error || '更新证书失败');
    }
    
    console.log('证书管理 - 更新证书成功');
    return createApiResponse(200, '更新成功');
  } catch (error) {
    console.error('证书管理 - PUT请求处理错误:', error);
    return createErrorResponse(500, '服务器错误');
  }
}

// 兼容小写方法名
export const onRequestPut = onRequestPUT;

export async function onRequestDELETE(request: Request, env: Env): Promise<Response> {
  try {
    console.log('证书管理 - DELETE请求开始处理');

    const url = new URL(request.url);
    const path = url.pathname;
    const id = path.split('/').pop();
    console.log('证书管理 - 请求路径:', path, '请求ID:', id);
    
    // 验证ID
    if (!id || !/^\d+$/.test(id)) {
      console.log('证书管理 - 无效的证书ID');
      return createErrorResponse(400, '无效的证书ID');
    }
    
    const certId = parseInt(id);
    
    // 检查证书是否存在
    console.log('证书管理 - 检查证书是否存在:', certId);
    const cert = await getCertificateById(env.DB, certId);
    if (!cert) {
      console.log('证书管理 - 证书不存在:', certId);
      return createErrorResponse(404, '证书不存在');
    }
    
    // 删除证书
    console.log('证书管理 - 开始删除证书:', certId);
    const result = await deleteCertificate(env.DB, certId);
    
    if (!result.success) {
      console.log('证书管理 - 删除证书失败:', result.error);
      return createErrorResponse(500, result.error || '删除证书失败');
    }
    
    console.log('证书管理 - 删除证书成功');
    return createApiResponse(200, '删除成功');
  } catch (error) {
    console.error('证书管理 - DELETE请求处理错误:', error);
    return createErrorResponse(500, '服务器错误');
  }
}

// 兼容小写方法名
export const onRequestDelete = onRequestDELETE;

// 支持 OPTIONS 请求，用于 CORS 预检
export async function onRequestOPTIONS(): Promise<Response> {
  console.log('证书管理 - OPTIONS请求处理');
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// 兼容小写方法名
export const onRequestOptions = onRequestOPTIONS;
