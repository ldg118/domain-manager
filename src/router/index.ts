import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('../views/Layout.vue'),
      children: [
        {
          path: '',
          name: 'Dashboard',
          component: () => import('../views/Dashboard.vue')
        },
        {
          path: 'domains',
          name: 'Domains',
          component: () => import('../views/Domains.vue')
        },
        {
          path: 'certificates',
          name: 'Certificates',
          component: () => import('../views/Certificates.vue')
        },
        {
          path: 'settings',
          name: 'Settings',
          component: () => import('../views/Settings.vue')
        }
      ]
    },
    {
      path: '/welcome',
      name: 'Welcome',
      component: () => import('../views/Login.vue')
    }
  ]
})

// 移除所有路由守卫，实现无认证直接访问
// 无需任何token校验和跳转限制

export default router
