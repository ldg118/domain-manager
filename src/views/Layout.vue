<template>
  <div class="layout-container">
    <el-container>
      <el-aside width="220px">
        <div class="logo">
          <h2>域名管理系统</h2>
        </div>
        <el-menu
          router
          :default-active="activeMenu"
          class="el-menu-vertical"
          background-color="#304156"
          text-color="#bfcbd9"
          active-text-color="#409EFF"
        >
          <el-menu-item index="/">
            <el-icon><el-icon-odometer /></el-icon>
            <span>仪表盘</span>
          </el-menu-item>
          <el-menu-item index="/domains">
            <el-icon><el-icon-connection /></el-icon>
            <span>域名管理</span>
          </el-menu-item>
          <el-menu-item index="/certificates">
            <el-icon><el-icon-document /></el-icon>
            <span>证书管理</span>
          </el-menu-item>
          <el-menu-item index="/settings">
            <el-icon><el-icon-setting /></el-icon>
            <span>系统设置</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-container>
        <el-header>
          <div class="header-right">
            <el-dropdown @command="handleCommand">
              <span class="el-dropdown-link">
                {{ username }}
                <el-icon class="el-icon--right"><el-icon-arrow-down /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="logout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>
        <el-main>
          <router-view />
        </el-main>
        <el-footer>
          <div class="footer">
            <p>© 2025 域名管理系统 | 基于 Cloudflare Pages</p>
          </div>
        </el-footer>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const username = ref('管理员')

// 计算当前激活的菜单项
const activeMenu = computed(() => {
  return route.path
})

// 处理下拉菜单命令
const handleCommand = (command: string) => {
  if (command === 'logout') {
    localStorage.removeItem('token')
    router.push('/login')
  }
}

onMounted(() => {
  // 可以在这里获取用户信息
  const storedUsername = localStorage.getItem('username')
  if (storedUsername) {
    username.value = storedUsername
  }
})
</script>

<style scoped>
.layout-container {
  height: 100%;
}

.el-container {
  height: 100%;
}

.el-aside {
  background-color: #304156;
  color: #bfcbd9;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.el-header {
  background-color: #fff;
  color: #333;
  line-height: 60px;
  border-bottom: 1px solid #e6e6e6;
}

.header-right {
  float: right;
  margin-right: 20px;
}

.el-dropdown-link {
  cursor: pointer;
  color: #409EFF;
}

.el-main {
  background-color: #f0f2f5;
  padding: 20px;
}

.el-footer {
  background-color: #fff;
  color: #666;
  text-align: center;
  line-height: 60px;
  border-top: 1px solid #e6e6e6;
}

.footer {
  font-size: 12px;
}
</style>
