<template>
  <div class="welcome-container">
    <div class="welcome-card">
      <div class="welcome-header">
        <h2>域名管理系统</h2>
        <p>欢迎使用域名管理系统</p>
      </div>
      
      <div class="welcome-content">
        <p>本系统已采用手动配置模式，无需登录即可使用所有功能。</p>
        <p>点击下方按钮直接进入系统。</p>
        
        <el-button 
          type="primary" 
          class="enter-button" 
          @click="enterSystem"
        >
          进入系统
        </el-button>
      </div>
      
      <div class="welcome-footer">
        <p>© {{ new Date().getFullYear() }} 域名管理系统</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()

const enterSystem = () => {
  ElMessage.success('欢迎使用域名管理系统')
  router.push('/')
}
</script>

<style scoped>
.welcome-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.welcome-card {
  width: 400px;
  padding: 40px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.welcome-header {
  text-align: center;
  margin-bottom: 30px;
}

.welcome-header h2 {
  margin-bottom: 10px;
  font-weight: 500;
  color: #303133;
}

.welcome-header p {
  color: #909399;
}

.welcome-content {
  text-align: center;
  margin-bottom: 30px;
}

.enter-button {
  width: 100%;
  margin-top: 20px;
}

.welcome-footer {
  text-align: center;
  color: #909399;
  font-size: 12px;
}
</style>
