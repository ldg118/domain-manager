<template>
  <div class="settings-container">
    <div class="page-header">
      <h2>系统设置</h2>
    </div>

    <el-card class="settings-card">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="通知设置" name="notifications">
          <div class="settings-section">
            <h3>Telegram 通知设置</h3>
            <el-form :model="telegramForm" label-width="120px">
              <el-form-item label="Bot Token">
                <el-input v-model="telegramForm.botToken" placeholder="请输入 Telegram Bot Token" />
              </el-form-item>
              <el-form-item label="Chat ID">
                <el-input v-model="telegramForm.chatId" placeholder="请输入 Telegram Chat ID" />
              </el-form-item>
              <el-form-item label="启用通知">
                <el-switch v-model="telegramForm.enabled" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="saveTelegramSettings">保存设置</el-button>
                <el-button @click="testTelegramNotification">测试通知</el-button>
              </el-form-item>
            </el-form>
          </div>

          <el-divider />

          <div class="settings-section">
            <h3>提醒设置</h3>
            <el-form :model="reminderForm" label-width="200px">
              <el-form-item label="域名到期提前提醒天数">
                <el-select
                  v-model="reminderForm.domainExpiryDays"
                  multiple
                  placeholder="选择提醒天数"
                  style="width: 100%"
                >
                  <el-option label="7天" :value="7" />
                  <el-option label="15天" :value="15" />
                  <el-option label="30天" :value="30" />
                  <el-option label="60天" :value="60" />
                  <el-option label="90天" :value="90" />
                </el-select>
              </el-form-item>
              <el-form-item label="SSL证书到期提前提醒天数">
                <el-select
                  v-model="reminderForm.certificateExpiryDays"
                  multiple
                  placeholder="选择提醒天数"
                  style="width: 100%"
                >
                  <el-option label="7天" :value="7" />
                  <el-option label="15天" :value="15" />
                  <el-option label="30天" :value="30" />
                  <el-option label="60天" :value="60" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="saveReminderSettings">保存设置</el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>

        <el-tab-pane label="监控设置" name="monitoring">
          <div class="settings-section">
            <h3>域名监控设置</h3>
            <el-form :model="monitoringForm" label-width="120px">
              <el-form-item label="启用域名监控">
                <el-switch v-model="monitoringForm.domainMonitoringEnabled" />
              </el-form-item>
              <el-form-item label="监控频率">
                <el-select v-model="monitoringForm.domainMonitoringInterval" placeholder="选择监控频率" style="width: 100%">
                  <el-option label="每天" value="daily" />
                  <el-option label="每周" value="weekly" />
                  <el-option label="每月" value="monthly" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="saveMonitoringSettings">保存设置</el-button>
              </el-form-item>
            </el-form>
          </div>

          <el-divider />

          <div class="settings-section">
            <h3>SSL证书监控设置</h3>
            <el-form :model="monitoringForm" label-width="120px">
              <el-form-item label="启用证书监控">
                <el-switch v-model="monitoringForm.certificateMonitoringEnabled" />
              </el-form-item>
              <el-form-item label="监控频率">
                <el-select v-model="monitoringForm.certificateMonitoringInterval" placeholder="选择监控频率" style="width: 100%">
                  <el-option label="每天" value="daily" />
                  <el-option label="每周" value="weekly" />
                  <el-option label="每月" value="monthly" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="saveMonitoringSettings">保存设置</el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>

        <el-tab-pane label="账户设置" name="account">
          <div class="settings-section">
            <h3>修改密码</h3>
            <el-form :model="passwordForm" label-width="120px" :rules="passwordRules" ref="passwordFormRef">
              <el-form-item label="当前密码" prop="currentPassword">
                <el-input v-model="passwordForm.currentPassword" type="password" placeholder="请输入当前密码" />
              </el-form-item>
              <el-form-item label="新密码" prop="newPassword">
                <el-input v-model="passwordForm.newPassword" type="password" placeholder="请输入新密码" />
              </el-form-item>
              <el-form-item label="确认新密码" prop="confirmPassword">
                <el-input v-model="passwordForm.confirmPassword" type="password" placeholder="请再次输入新密码" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="changePassword">修改密码</el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
// 导入全局 axios 实例
import axiosInstance from '../utils/axios'

// 当前激活的标签页
const activeTab = ref('notifications')

// Telegram 设置表单
const telegramForm = ref({
  botToken: '',
  chatId: '',
  enabled: false
})

// 提醒设置表单
const reminderForm = ref({
  domainExpiryDays: [30, 15, 7],
  certificateExpiryDays: [30, 15, 7]
})

// 监控设置表单
const monitoringForm = ref({
  domainMonitoringEnabled: true,
  domainMonitoringInterval: 'daily',
  certificateMonitoringEnabled: true,
  certificateMonitoringInterval: 'daily'
})

// 密码修改表单
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 密码表单验证规则
const passwordRules = {
  currentPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.value.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 表单引用
const passwordFormRef = ref(null)

// 获取设置
const fetchSettings = async () => {
  try {
    // 使用全局 axios 实例，自动携带 token
    const response = await axiosInstance.get('/api/settings')

    if (response.data.status === 200) {
      const settings = response.data.data || {}
      
      // 填充 Telegram 设置
      if (settings.telegram) {
        telegramForm.value.botToken = settings.telegram.botToken || ''
        telegramForm.value.chatId = settings.telegram.chatId || ''
        telegramForm.value.enabled = settings.telegram.enabled || false
      }
      
      // 填充提醒设置
      if (settings.reminders) {
        reminderForm.value.domainExpiryDays = settings.reminders.domainExpiryDays || [30, 15, 7]
        reminderForm.value.certificateExpiryDays = settings.reminders.certificateExpiryDays || [30, 15, 7]
      }
      
      // 填充监控设置
      if (settings.monitoring) {
        monitoringForm.value.domainMonitoringEnabled = settings.monitoring.domainMonitoringEnabled !== false
        monitoringForm.value.domainMonitoringInterval = settings.monitoring.domainMonitoringInterval || 'daily'
        monitoringForm.value.certificateMonitoringEnabled = settings.monitoring.certificateMonitoringEnabled !== false
        monitoringForm.value.certificateMonitoringInterval = settings.monitoring.certificateMonitoringInterval || 'daily'
      }
    } else {
      ElMessage.error(response.data.message || '获取设置失败')
    }
  } catch (error) {
    console.error('获取设置失败:', error)
    ElMessage.error('获取设置失败')
  }
}

// 保存 Telegram 设置
const saveTelegramSettings = async () => {
  try {
    // 使用全局 axios 实例，自动携带 token
    const response = await axiosInstance.post('/api/settings/telegram', telegramForm.value)

    if (response.data.status === 200) {
      ElMessage.success('Telegram 设置保存成功')
    } else {
      ElMessage.error(response.data.message || 'Telegram 设置保存失败')
    }
  } catch (error) {
    console.error('保存 Telegram 设置失败:', error)
    ElMessage.error('保存 Telegram 设置失败')
  }
}

// 测试 Telegram 通知
const testTelegramNotification = async () => {
  try {
    // 使用全局 axios 实例，自动携带 token
    const response = await axiosInstance.post('/api/settings/telegram/test', {})

    if (response.data.status === 200) {
      ElMessage.success('测试通知已发送，请检查您的 Telegram')
    } else {
      ElMessage.error(response.data.message || '测试通知发送失败')
    }
  } catch (error) {
    console.error('发送测试通知失败:', error)
    ElMessage.error('发送测试通知失败')
  }
}

// 保存提醒设置
const saveReminderSettings = async () => {
  try {
    // 使用全局 axios 实例，自动携带 token
    const response = await axiosInstance.post('/api/settings/reminders', reminderForm.value)

    if (response.data.status === 200) {
      ElMessage.success('提醒设置保存成功')
    } else {
      ElMessage.error(response.data.message || '提醒设置保存失败')
    }
  } catch (error) {
    console.error('保存提醒设置失败:', error)
    ElMessage.error('保存提醒设置失败')
  }
}

// 保存监控设置
const saveMonitoringSettings = async () => {
  try {
    // 使用全局 axios 实例，自动携带 token
    const response = await axiosInstance.post('/api/settings/monitoring', monitoringForm.value)

    if (response.data.status === 200) {
      ElMessage.success('监控设置保存成功')
    } else {
      ElMessage.error(response.data.message || '监控设置保存失败')
    }
  } catch (error) {
    console.error('保存监控设置失败:', error)
    ElMessage.error('保存监控设置失败')
  }
}

// 修改密码
const changePassword = async () => {
  if (!passwordFormRef.value) return

  passwordFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // 使用全局 axios 实例，自动携带 token
        const response = await axiosInstance.post('/api/auth/change-password', {
          currentPassword: passwordForm.value.currentPassword,
          newPassword: passwordForm.value.newPassword
        })

        if (response.data.status === 200) {
          ElMessage.success('密码修改成功')
          // 清空表单
          passwordForm.value.currentPassword = ''
          passwordForm.value.newPassword = ''
          passwordForm.value.confirmPassword = ''
        } else {
          ElMessage.error(response.data.message || '密码修改失败')
        }
      } catch (error) {
        console.error('修改密码失败:', error)
        ElMessage.error('修改密码失败')
      }
    }
  })
}

onMounted(() => {
  fetchSettings()
})
</script>

<style scoped>
.settings-container {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.settings-card {
  margin-bottom: 20px;
}

.settings-section {
  margin-bottom: 20px;
}

.settings-section h3 {
  margin-bottom: 20px;
  font-weight: 500;
}
</style>
