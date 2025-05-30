<template>
  <div class="settings-container">
    <div class="page-header">
      <h2>系统设置</h2>
    </div>

    <el-card class="settings-card">
      <el-tabs v-model="activeTab">
        <!-- 通知设置 -->
        <el-tab-pane label="通知设置" name="notifications">
          <el-form :model="notificationSettings" label-width="120px">
            <h3>Telegram 通知设置</h3>
            <el-form-item label="Bot Token">
              <el-input v-model="notificationSettings.tg_token" placeholder="请输入 Telegram Bot Token" />
            </el-form-item>
            <el-form-item label="用户 ID">
              <el-input v-model="notificationSettings.tg_userid" placeholder="请输入 Telegram 用户 ID" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="testTelegramNotification">测试通知</el-button>
            </el-form-item>

            <h3>提醒设置</h3>
            <el-form-item label="提前提醒天数">
              <el-input-number v-model="notificationSettings.days" :min="1" :max="90" />
            </el-form-item>
            <el-form-item label="启用域名到期提醒">
              <el-switch v-model="notificationSettings.domain_expiry_enabled" />
            </el-form-item>
            <el-form-item label="启用证书到期提醒">
              <el-switch v-model="notificationSettings.cert_expiry_enabled" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveNotificationSettings">保存设置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 监控设置 -->
        <el-tab-pane label="监控设置" name="monitoring">
          <el-form :model="monitoringSettings" label-width="120px">
            <h3>域名监控</h3>
            <el-form-item label="启用域名监控">
              <el-switch v-model="monitoringSettings.domain_monitoring_enabled" />
            </el-form-item>
            <el-form-item label="监控频率">
              <el-select v-model="monitoringSettings.domain_check_interval" placeholder="选择监控频率">
                <el-option label="每小时" value="hourly" />
                <el-option label="每天" value="daily" />
                <el-option label="每周" value="weekly" />
              </el-select>
            </el-form-item>

            <h3>证书监控</h3>
            <el-form-item label="启用证书监控">
              <el-switch v-model="monitoringSettings.cert_monitoring_enabled" />
            </el-form-item>
            <el-form-item label="监控频率">
              <el-select v-model="monitoringSettings.cert_check_interval" placeholder="选择监控频率">
                <el-option label="每天" value="daily" />
                <el-option label="每周" value="weekly" />
                <el-option label="每月" value="monthly" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveMonitoringSettings">保存设置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 数据库设置 -->
        <el-tab-pane label="数据库管理" name="database">
          <el-form label-width="120px">
            <h3>数据库备份</h3>
            <el-form-item>
              <el-button type="primary" @click="backupDatabase">创建备份</el-button>
              <el-button @click="showRestoreDialog">恢复备份</el-button>
            </el-form-item>

            <h3>数据库维护</h3>
            <el-form-item>
              <el-button type="warning" @click="optimizeDatabase">优化数据库</el-button>
              <el-button type="danger" @click="confirmResetDatabase">重置数据库</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 用户管理 -->
        <el-tab-pane label="用户管理" name="users">
          <el-form label-width="120px">
            <h3>多用户协作</h3>
            <p>本系统已设置为手动配置模式，无需用户认证。如需启用多用户协作，请联系系统管理员。</p>
          </el-form>
        </el-tab-pane>

        <!-- 系统日志 -->
        <el-tab-pane label="系统日志" name="logs">
          <el-form label-width="120px">
            <h3>操作日志</h3>
            <el-form-item>
              <el-button @click="fetchSystemLogs">刷新日志</el-button>
              <el-button type="danger" @click="clearSystemLogs">清除日志</el-button>
            </el-form-item>
            <el-table :data="systemLogs" style="width: 100%" v-loading="logsLoading">
              <el-table-column prop="timestamp" label="时间" width="180" />
              <el-table-column prop="level" label="级别" width="100">
                <template #default="scope">
                  <el-tag :type="getLogLevelType(scope.row.level)">{{ scope.row.level }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="message" label="消息" />
              <el-table-column prop="source" label="来源" width="150" />
            </el-table>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 恢复备份对话框 -->
    <el-dialog title="恢复数据库备份" v-model="restoreDialogVisible" width="500px">
      <el-upload
        class="upload-demo"
        drag
        action="#"
        :auto-upload="false"
        :on-change="handleBackupFileChange"
        :limit="1"
        accept=".json,.sql"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          拖拽备份文件到此处，或 <em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            请上传之前导出的数据库备份文件
          </div>
        </template>
      </el-upload>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="restoreDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="restoreDatabase">恢复</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import axiosInstance from '../utils/axios'

// 当前激活的标签页
const activeTab = ref('notifications')

// 通知设置
const notificationSettings = ref({
  tg_token: '',
  tg_userid: '',
  days: 30,
  domain_expiry_enabled: true,
  cert_expiry_enabled: true
})

// 监控设置
const monitoringSettings = ref({
  domain_monitoring_enabled: true,
  domain_check_interval: 'daily',
  cert_monitoring_enabled: true,
  cert_check_interval: 'weekly'
})

// 系统日志
const systemLogs = ref([])
const logsLoading = ref(false)

// 恢复备份对话框
const restoreDialogVisible = ref(false)
const backupFile = ref(null)

// 获取通知设置
const fetchNotificationSettings = async () => {
  try {
    const response = await axiosInstance.get('/api/monitor/config')
    
    if (response.data.status === 200) {
      const config = response.data.data || {}
      notificationSettings.value = {
        tg_token: config.tg_token || '',
        tg_userid: config.tg_userid || '',
        days: config.days || 30,
        domain_expiry_enabled: config.domain_expiry_enabled !== false,
        cert_expiry_enabled: config.cert_expiry_enabled !== false
      }
    } else {
      ElMessage.error(response.data.message || '获取通知设置失败')
    }
  } catch (error) {
    console.error('获取通知设置失败:', error)
    ElMessage.error('获取通知设置失败')
  }
}

// 获取监控设置
const fetchMonitoringSettings = async () => {
  try {
    const response = await axiosInstance.get('/api/settings/monitoring')
    
    if (response.data.status === 200) {
      const settings = response.data.data || {}
      monitoringSettings.value = {
        domain_monitoring_enabled: settings.domain_monitoring_enabled !== false,
        domain_check_interval: settings.domain_check_interval || 'daily',
        cert_monitoring_enabled: settings.cert_monitoring_enabled !== false,
        cert_check_interval: settings.cert_check_interval || 'weekly'
      }
    } else {
      console.error('获取监控设置失败:', response.data.message)
    }
  } catch (error) {
    console.error('获取监控设置失败:', error)
  }
}

// 保存通知设置
const saveNotificationSettings = async () => {
  try {
    const response = await axiosInstance.post('/api/monitor/config', notificationSettings.value)
    
    if (response.data.status === 200) {
      ElMessage.success('通知设置保存成功')
    } else {
      ElMessage.error(response.data.message || '保存通知设置失败')
    }
  } catch (error) {
    console.error('保存通知设置失败:', error)
    ElMessage.error('保存通知设置失败')
  }
}

// 保存监控设置
const saveMonitoringSettings = async () => {
  try {
    const response = await axiosInstance.post('/api/settings/monitoring', monitoringSettings.value)
    
    if (response.data.status === 200) {
      ElMessage.success('监控设置保存成功')
    } else {
      ElMessage.error(response.data.message || '保存监控设置失败')
    }
  } catch (error) {
    console.error('保存监控设置失败:', error)
    ElMessage.error('保存监控设置失败')
  }
}

// 测试 Telegram 通知
const testTelegramNotification = async () => {
  if (!notificationSettings.value.tg_token || !notificationSettings.value.tg_userid) {
    ElMessage.warning('请先填写 Telegram Bot Token 和用户 ID')
    return
  }
  
  try {
    const response = await axiosInstance.post('/api/monitor/test-telegram', {
      token: notificationSettings.value.tg_token,
      chat_id: notificationSettings.value.tg_userid
    })
    
    if (response.data.status === 200) {
      ElMessage.success('Telegram 通知测试成功')
    } else {
      ElMessage.error(response.data.message || 'Telegram 通知测试失败')
    }
  } catch (error) {
    console.error('Telegram 通知测试失败:', error)
    ElMessage.error('Telegram 通知测试失败')
  }
}

// 备份数据库
const backupDatabase = async () => {
  try {
    const response = await axiosInstance.get('/api/settings/backup')
    
    if (response.data.status === 200) {
      // 创建下载链接
      const dataStr = JSON.stringify(response.data.data, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
      
      const exportFileDefaultName = `domain_manager_backup_${new Date().toISOString().split('T')[0]}.json`
      
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()
      
      ElMessage.success('数据库备份成功')
    } else {
      ElMessage.error(response.data.message || '数据库备份失败')
    }
  } catch (error) {
    console.error('数据库备份失败:', error)
    ElMessage.error('数据库备份失败')
  }
}

// 显示恢复备份对话框
const showRestoreDialog = () => {
  backupFile.value = null
  restoreDialogVisible.value = true
}

// 处理备份文件变更
const handleBackupFileChange = (file) => {
  backupFile.value = file.raw
}

// 恢复数据库
const restoreDatabase = async () => {
  if (!backupFile.value) {
    ElMessage.warning('请选择要恢复的备份文件')
    return
  }

  try {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const backup = JSON.parse(e.target.result)
        
        // 确认恢复
        ElMessageBox.confirm(
          '恢复数据库将覆盖当前所有数据，确定要继续吗？',
          '警告',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        ).then(async () => {
          try {
            const response = await axiosInstance.post('/api/settings/restore', { backup })
            
            if (response.data.status === 200) {
              ElMessage.success('数据库恢复成功')
              restoreDialogVisible.value = false
              // 刷新页面以反映恢复的数据
              setTimeout(() => {
                window.location.reload()
              }, 1500)
            } else {
              ElMessage.error(response.data.message || '数据库恢复失败')
            }
          } catch (error) {
            console.error('数据库恢复失败:', error)
            ElMessage.error('数据库恢复失败')
          }
        }).catch(() => {
          // 取消恢复
        })
      } catch (error) {
        console.error('解析备份文件失败:', error)
        ElMessage.error('解析备份文件失败，请确保文件格式正确')
      }
    }
    reader.readAsText(backupFile.value)
  } catch (error) {
    console.error('读取备份文件失败:', error)
    ElMessage.error('读取备份文件失败')
  }
}

// 优化数据库
const optimizeDatabase = async () => {
  try {
    const response = await axiosInstance.post('/api/settings/optimize')
    
    if (response.data.status === 200) {
      ElMessage.success('数据库优化成功')
    } else {
      ElMessage.error(response.data.message || '数据库优化失败')
    }
  } catch (error) {
    console.error('数据库优化失败:', error)
    ElMessage.error('数据库优化失败')
  }
}

// 确认重置数据库
const confirmResetDatabase = () => {
  ElMessageBox.confirm(
    '重置数据库将删除所有数据并恢复到初始状态，此操作不可逆，确定要继续吗？',
    '危险操作',
    {
      confirmButtonText: '确定重置',
      cancelButtonText: '取消',
      type: 'danger'
    }
  ).then(() => {
    resetDatabase()
  }).catch(() => {
    // 取消重置
  })
}

// 重置数据库
const resetDatabase = async () => {
  try {
    const response = await axiosInstance.post('/api/settings/reset')
    
    if (response.data.status === 200) {
      ElMessage.success('数据库重置成功')
      // 刷新页面以反映重置后的状态
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } else {
      ElMessage.error(response.data.message || '数据库重置失败')
    }
  } catch (error) {
    console.error('数据库重置失败:', error)
    ElMessage.error('数据库重置失败')
  }
}

// 获取系统日志
const fetchSystemLogs = async () => {
  logsLoading.value = true
  try {
    const response = await axiosInstance.get('/api/settings/logs')
    
    if (response.data.status === 200) {
      systemLogs.value = response.data.data || []
    } else {
      ElMessage.error(response.data.message || '获取系统日志失败')
    }
  } catch (error) {
    console.error('获取系统日志失败:', error)
    ElMessage.error('获取系统日志失败')
  } finally {
    logsLoading.value = false
  }
}

// 清除系统日志
const clearSystemLogs = async () => {
  try {
    const response = await axiosInstance.delete('/api/settings/logs')
    
    if (response.data.status === 200) {
      ElMessage.success('系统日志清除成功')
      systemLogs.value = []
    } else {
      ElMessage.error(response.data.message || '清除系统日志失败')
    }
  } catch (error) {
    console.error('清除系统日志失败:', error)
    ElMessage.error('清除系统日志失败')
  }
}

// 获取日志级别对应的标签类型
const getLogLevelType = (level) => {
  switch (level.toLowerCase()) {
    case 'error':
      return 'danger'
    case 'warning':
      return 'warning'
    case 'info':
      return 'info'
    case 'debug':
      return ''
    default:
      return ''
  }
}

onMounted(() => {
  fetchNotificationSettings()
  fetchMonitoringSettings()
  fetchSystemLogs()
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

h3 {
  margin-top: 20px;
  margin-bottom: 15px;
  font-weight: 500;
  color: #303133;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 10px;
}
</style>
