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
    // 无需添加任何token或授权信息，系统已改为无授权模式
    console.log('请求拦截器 - 发送请求:', {
      url: config.url,
      method: config.method
    });
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

export default instance;
