// axios 配置和拦截器
import axios from 'axios';
import { ElMessage } from 'element-plus';
import router from '../router';

// 创建 axios 实例
const instance = axios.create({
  baseURL: '/',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
instance.interceptors.request.use(
  config => {
    // 从 localStorage 获取 token
    const token = localStorage.getItem('token');
    
    // 如果存在 token，则添加到请求头（多种方式确保兼容性）
    if (token) {
      // 标准 Authorization Bearer 头
      config.headers['Authorization'] = `Bearer ${token}`;
      
      // 添加自定义头，确保兼容性
      config.headers['X-API-Token'] = token;
      
      // 添加 URL 参数
      if (config.url && !config.url.includes('?')) {
        config.url = `${config.url}?token=${token}`;
      } else if (config.url) {
        config.url = `${config.url}&token=${token}`;
      }
      
      // 添加调试信息
      console.log('请求拦截器 - 添加令牌到请求:', {
        url: config.url,
        headers: config.headers,
        token: token
      });
    } else {
      console.log('请求拦截器 - 未找到令牌');
    }
    
    return config;
  },
  error => {
    console.error('请求拦截器错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
instance.interceptors.response.use(
  response => {
    // 如果响应成功，直接返回数据
    console.log('响应拦截器 - 成功响应:', {
      status: response.status,
      data: response.data
    });
    return response;
  },
  error => {
    console.error('响应拦截器 - 错误响应:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // 未授权，清除 token 并跳转到登录页面
          ElMessage.error('登录已过期，请重新登录');
          localStorage.removeItem('token');
          router.push('/login');
          break;
        case 403:
          ElMessage.error('没有权限访问此资源');
          break;
        case 404:
          ElMessage.error('请求的资源不存在');
          break;
        case 500:
          ElMessage.error('服务器错误，请稍后再试');
          break;
        default:
          ElMessage.error(error.response.data?.message || '请求失败');
      }
    } else {
      ElMessage.error('网络错误，请检查您的网络连接');
    }
    return Promise.reject(error);
  }
);

// 添加调试模式令牌
export function enableDebugMode() {
  localStorage.setItem('token', 'DEBUG_TOKEN');
  console.log('已启用调试模式，使用特殊令牌');
}

// 检查是否已登录
export function isLoggedIn() {
  return !!localStorage.getItem('token');
}

export default instance;
