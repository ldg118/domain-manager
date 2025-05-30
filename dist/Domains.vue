// 修改 Domains.vue 使用全局 axios 实例
<template>
  <div class="domains-container">
    <div class="page-header">
      <h2>域名管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="showAddDomainDialog">添加域名</el-button>
        <el-button type="success" @click="showImportDialog">导入</el-button>
        <el-button type="info" @click="exportDomains">导出</el-button>
      </div>
    </div>

    <!-- 域名列表 -->
    <el-card class="domain-list">
      <el-table :data="domains" style="width: 100%" v-loading="loading">
        <el-table-column prop="domain" label="域名" min-width="150" />
        <el-table-column prop="registrar" label="注册商" min-width="120" />
        <el-table-column prop="expiry_date" label="到期日期" min-width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === '在线' ? 'success' : 'danger'">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="service_type" label="服务类型" min-width="120" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="showEditDomainDialog(scope.row)">编辑</el-button>
            <el-button size="small" type="danger" @click="confirmDeleteDomain(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑域名对话框 -->
    <el-dialog
      :title="isEdit ? '编辑域名' : '添加域名'"
      v-model="domainDialogVisible"
      width="500px"
    >
      <el-form :model="domainForm" label-width="100px" :rules="rules" ref="domainFormRef">
        <el-form-item label="域名" prop="domain">
          <el-input v-model="domainForm.domain" placeholder="请输入域名" />
        </el-form-item>
        <el-form-item label="注册商">
          <el-input v-model="domainForm.registrar" placeholder="请输入注册商" />
        </el-form-item>
        <el-form-item label="注册商链接">
          <el-input v-model="domainForm.registrar_link" placeholder="请输入注册商链接" />
        </el-form-item>
        <el-form-item label="注册日期">
          <el-date-picker
            v-model="domainForm.registrar_date"
            type="date"
            placeholder="选择注册日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="到期日期" prop="expiry_date">
          <el-date-picker
            v-model="domainForm.expiry_date"
            type="date"
            placeholder="选择到期日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="服务类型">
          <el-input v-model="domainForm.service_type" placeholder="请输入服务类型" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="domainForm.memo"
            type="textarea"
            placeholder="请输入备注"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="domainDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitDomainForm">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 导入域名对话框 -->
    <el-dialog title="导入域名" v-model="importDialogVisible" width="500px">
      <el-upload
        class="upload-demo"
        drag
        action="#"
        :auto-upload="false"
        :on-change="handleFileChange"
        :limit="1"
        accept=".json"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          拖拽文件到此处，或 <em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            请上传JSON格式文件，包含域名信息
          </div>
        </template>
      </el-upload>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="importDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="importDomains">导入</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
// 导入全局 axios 实例
import axiosInstance from '../utils/axios'

// 域名列表
const domains = ref([])
const loading = ref(false)

// 对话框控制
const domainDialogVisible = ref(false)
const importDialogVisible = ref(false)
const isEdit = ref(false)

// 表单引用
const domainFormRef = ref(null)

// 域名表单
const domainForm = ref({
  id: null,
  domain: '',
  registrar: '',
  registrar_link: '',
  registrar_date: '',
  expiry_date: '',
  service_type: '',
  memo: ''
})

// 表单验证规则
const rules = {
  domain: [
    { required: true, message: '请输入域名', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+$/, message: '请输入有效的域名', trigger: 'blur' }
  ],
  expiry_date: [
    { required: true, message: '请选择到期日期', trigger: 'change' }
  ]
}

// 导入文件
const importFile = ref(null)

// 获取域名列表
const fetchDomains = async () => {
  loading.value = true
  try {
    // 使用全局 axios 实例，自动携带 token
    const response = await axiosInstance.get('/api/domains')

    if (response.data.status === 200) {
      domains.value = response.data.data || []
    } else {
      ElMessage.error(response.data.message || '获取域名列表失败')
    }
  } catch (error) {
    console.error('获取域名列表失败:', error)
    ElMessage.error('获取域名列表失败')
  } finally {
    loading.value = false
  }
}

// 显示添加域名对话框
const showAddDomainDialog = () => {
  isEdit.value = false
  domainForm.value = {
    id: null,
    domain: '',
    registrar: '',
    registrar_link: '',
    registrar_date: '',
    expiry_date: '',
    service_type: '',
    memo: ''
  }
  domainDialogVisible.value = true
}

// 显示编辑域名对话框
const showEditDomainDialog = (row) => {
  isEdit.value = true
  domainForm.value = { ...row }
  domainDialogVisible.value = true
}

// 提交域名表单
const submitDomainForm = async () => {
  if (!domainFormRef.value) return

  domainFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        let response

        if (isEdit.value) {
          // 编辑域名
          response = await axiosInstance.put(`/api/domains/${domainForm.value.id}`, domainForm.value)
        } else {
          // 添加域名
          response = await axiosInstance.post('/api/domains', domainForm.value)
        }

        if (response.data.status === 200) {
          ElMessage.success(isEdit.value ? '域名更新成功' : '域名添加成功')
          domainDialogVisible.value = false
          fetchDomains()
        } else {
          ElMessage.error(response.data.message || (isEdit.value ? '域名更新失败' : '域名添加失败'))
        }
      } catch (error) {
        console.error(isEdit.value ? '更新域名失败:' : '添加域名失败:', error)
        ElMessage.error(isEdit.value ? '更新域名失败' : '添加域名失败')
      }
    }
  })
}

// 确认删除域名
const confirmDeleteDomain = (row) => {
  ElMessageBox.confirm(
    `确定要删除域名 ${row.domain} 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    deleteDomain(row.id)
  }).catch(() => {
    // 取消删除
  })
}

// 删除域名
const deleteDomain = async (id) => {
  try {
    const response = await axiosInstance.delete(`/api/domains/${id}`)

    if (response.data.status === 200) {
      ElMessage.success('域名删除成功')
      fetchDomains()
    } else {
      ElMessage.error(response.data.message || '域名删除失败')
    }
  } catch (error) {
    console.error('删除域名失败:', error)
    ElMessage.error('删除域名失败')
  }
}

// 显示导入对话框
const showImportDialog = () => {
  importFile.value = null
  importDialogVisible.value = true
}

// 处理文件变更
const handleFileChange = (file) => {
  importFile.value = file.raw
}

// 导入域名
const importDomains = async () => {
  if (!importFile.value) {
    ElMessage.warning('请选择要导入的文件')
    return
  }

  try {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const domains = JSON.parse(e.target.result)
        
        if (!Array.isArray(domains)) {
          ElMessage.error('导入文件格式错误，请提供域名数组')
          return
        }

        const response = await axiosInstance.post('/api/domains/import', { domains })

        if (response.data.status === 200) {
          ElMessage.success(`成功导入 ${response.data.data.imported} 个域名`)
          importDialogVisible.value = false
          fetchDomains()
        } else {
          ElMessage.error(response.data.message || '导入域名失败')
        }
      } catch (error) {
        console.error('解析导入文件失败:', error)
        ElMessage.error('解析导入文件失败，请确保文件格式正确')
      }
    }
    reader.readAsText(importFile.value)
  } catch (error) {
    console.error('导入域名失败:', error)
    ElMessage.error('导入域名失败')
  }
}

// 导出域名
const exportDomains = async () => {
  try {
    const response = await axiosInstance.get('/api/domains/export')

    if (response.data.status === 200) {
      // 创建下载链接
      const dataStr = JSON.stringify(response.data.data, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
      
      const exportFileDefaultName = `domains_${new Date().toISOString().split('T')[0]}.json`
      
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()
      
      ElMessage.success('域名导出成功')
    } else {
      ElMessage.error(response.data.message || '域名导出失败')
    }
  } catch (error) {
    console.error('导出域名失败:', error)
    ElMessage.error('导出域名失败')
  }
}

onMounted(() => {
  fetchDomains()
})
</script>

<style scoped>
.domains-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.domain-list {
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 10px;
}
</style>
