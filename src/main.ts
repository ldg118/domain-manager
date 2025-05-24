import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import App from './App.vue'
import router from './router'
import axios from 'axios'

// 导入全局 axios 实例
import axiosInstance from './utils/axios'

import 'element-plus/dist/index.css'

// 将自定义的 axios 实例挂载到全局
window.axios = axiosInstance

// 替换全局默认 axios
const originalAxios = axios.create
axios.create = function(...args) {
  const instance = originalAxios.apply(this, args)
  
  // 为所有新创建的实例添加请求拦截器
  instance.interceptors.request.use(
    config => {
      // 从 localStorage 获取 token
      const token = localStorage.getItem('token')
      
      // 如果存在 token，则添加到请求头
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`
      }
      
      return config
    },
    error => {
      console.error('请求拦截器错误:', error)
      return Promise.reject(error)
    }
  )
  
  return instance
}

// 为默认 axios 添加请求拦截器
axios.interceptors.request.use(
  config => {
    // 从 localStorage 获取 token
    const token = localStorage.getItem('token')
    
    // 如果存在 token，则添加到请求头
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    
    return config
  },
  error => {
    console.error('请求拦截器错误:', error)
    return Promise.reject(error)
  }
)

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

// 将 axios 实例挂载到 Vue 实例
app.config.globalProperties.$axios = axiosInstance

app.mount('#app')
