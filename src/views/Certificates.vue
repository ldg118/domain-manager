<template>
  <div class="certificates-container">
    <div class="page-header">
      <h2>证书管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="showAddCertificateDialog">添加证书</el-button>
        <el-button type="success" @click="showImportDialog">导入</el-button>
        <el-button type="info" @click="exportCertificates">导出</el-button>
      </div>
    </div>

    <!-- 证书列表 -->
    <el-card class="certificate-list">
      <el-table :data="certificates" style="width: 100%" v-loading="loading">
        <el-table-column prop="common_name" label="通用名称" min-width="150" />
        <el-table-column prop="issuer" label="颁发机构" min-width="120" />
        <el-table-column prop="valid_from" label="生效日期" min-width="120" />
        <el-table-column prop="valid_to" label="到期日期" min-width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'valid' ? 'success' : 'danger'">
              {{ scope.row.status === 'valid' ? '有效' : '过期' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="showEditCertificateDialog(scope.row)">编辑</el-button>
            <el-button size="small" type="danger" @click="confirmDeleteCertificate(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑证书对话框 -->
    <el-dialog
      :title="isEdit ? '编辑证书' : '添加证书'"
      v-model="certificateDialogVisible"
      width="500px"
    >
      <el-form :model="certificateForm" label-width="100px" :rules="rules" ref="certificateFormRef">
        <el-form-item label="通用名称" prop="common_name">
          <el-input v-model="certificateForm.common_name" placeholder="请输入通用名称" />
        </el-form-item>
        <el-form-item label="颁发机构">
          <el-input v-model="certificateForm.issuer" placeholder="请输入颁发机构" />
        </el-form-item>
        <el-form-item label="生效日期">
          <el-date-picker
            v-model="certificateForm.valid_from"
            type="date"
            placeholder="选择生效日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="到期日期" prop="valid_to">
          <el-date-picker
            v-model="certificateForm.valid_to"
            type="date"
            placeholder="选择到期日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="关联域名">
          <el-select v-model="certificateForm.domain_id" placeholder="选择关联域名" clearable style="width: 100%">
            <el-option
              v-for="domain in domains"
              :key="domain.id"
              :label="domain.domain"
              :value="domain.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="certificateForm.memo"
            type="textarea"
            placeholder="请输入备注"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="certificateDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitCertificateForm">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 导入证书对话框 -->
    <el-dialog title="导入证书" v-model="importDialogVisible" width="500px">
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
            请上传JSON格式文件，包含证书信息
          </div>
        </template>
      </el-upload>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="importDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="importCertificates">导入</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
// 导入全局 axios 实例
import axiosInstance from '../utils/axios'

// 证书列表
const certificates = ref([])
const domains = ref([])
const loading = ref(false)

// 对话框控制
const certificateDialogVisible = ref(false)
const importDialogVisible = ref(false)
const isEdit = ref(false)

// 表单引用
const certificateFormRef = ref(null)

// 证书表单
const certificateForm = ref({
  id: null,
  common_name: '',
  issuer: '',
  valid_from: '',
  valid_to: '',
  domain_id: null,
  memo: ''
})

// 表单验证规则
const rules = {
  common_name: [
    { required: true, message: '请输入通用名称', trigger: 'blur' }
  ],
  valid_to: [
    { required: true, message: '请选择到期日期', trigger: 'change' }
  ]
}

// 导入文件
const importFile = ref(null)

// 获取证书列表
const fetchCertificates = async () => {
  loading.value = true
  try {
    const response = await axiosInstance.get('/api/certificates')

    if (response.data.status === 200) {
      certificates.value = response.data.data || []
    } else {
      ElMessage.error(response.data.message || '获取证书列表失败')
    }
  } catch (error) {
    console.error('获取证书列表失败:', error)
    ElMessage.error('获取证书列表失败')
  } finally {
    loading.value = false
  }
}

// 获取域名列表（用于关联）
const fetchDomains = async () => {
  try {
    const response = await axiosInstance.get('/api/domains')

    if (response.data.status === 200) {
      domains.value = response.data.data || []
    } else {
      console.error('获取域名列表失败:', response.data.message)
    }
  } catch (error) {
    console.error('获取域名列表失败:', error)
  }
}

// 显示添加证书对话框
const showAddCertificateDialog = () => {
  isEdit.value = false
  certificateForm.value = {
    id: null,
    common_name: '',
    issuer: '',
    valid_from: '',
    valid_to: '',
    domain_id: null,
    memo: ''
  }
  certificateDialogVisible.value = true
}

// 显示编辑证书对话框
const showEditCertificateDialog = (row) => {
  isEdit.value = true
  certificateForm.value = { ...row }
  certificateDialogVisible.value = true
}

// 提交证书表单
const submitCertificateForm = async () => {
  if (!certificateFormRef.value) return

  certificateFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        let response

        if (isEdit.value) {
          // 编辑证书
          response = await axiosInstance.put(`/api/certificates/${certificateForm.value.id}`, certificateForm.value)
        } else {
          // 添加证书
          response = await axiosInstance.post('/api/certificates', certificateForm.value)
        }

        if (response.data.status === 200 || response.data.status === 201) {
          ElMessage.success(isEdit.value ? '证书更新成功' : '证书添加成功')
          certificateDialogVisible.value = false
          fetchCertificates()
        } else {
          ElMessage.error(response.data.message || (isEdit.value ? '证书更新失败' : '证书添加失败'))
        }
      } catch (error) {
        console.error(isEdit.value ? '更新证书失败:' : '添加证书失败:', error)
        ElMessage.error(isEdit.value ? '更新证书失败' : '添加证书失败')
      }
    }
  })
}

// 确认删除证书
const confirmDeleteCertificate = (row) => {
  ElMessageBox.confirm(
    `确定要删除证书 ${row.common_name} 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    deleteCertificate(row.id)
  }).catch(() => {
    // 取消删除
  })
}

// 删除证书
const deleteCertificate = async (id) => {
  try {
    const response = await axiosInstance.delete(`/api/certificates/${id}`)

    if (response.data.status === 200) {
      ElMessage.success('证书删除成功')
      fetchCertificates()
    } else {
      ElMessage.error(response.data.message || '证书删除失败')
    }
  } catch (error) {
    console.error('删除证书失败:', error)
    ElMessage.error('删除证书失败')
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

// 导入证书
const importCertificates = async () => {
  if (!importFile.value) {
    ElMessage.warning('请选择要导入的文件')
    return
  }

  try {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const certificates = JSON.parse(e.target.result)
        
        if (!Array.isArray(certificates)) {
          ElMessage.error('导入文件格式错误，请提供证书数组')
          return
        }

        const response = await axiosInstance.post('/api/certificates/import', { certificates })

        if (response.data.status === 200) {
          ElMessage.success(`成功导入 ${response.data.data.imported} 个证书`)
          importDialogVisible.value = false
          fetchCertificates()
        } else {
          ElMessage.error(response.data.message || '导入证书失败')
        }
      } catch (error) {
        console.error('解析导入文件失败:', error)
        ElMessage.error('解析导入文件失败，请确保文件格式正确')
      }
    }
    reader.readAsText(importFile.value)
  } catch (error) {
    console.error('导入证书失败:', error)
    ElMessage.error('导入证书失败')
  }
}

// 导出证书
const exportCertificates = async () => {
  try {
    const response = await axiosInstance.get('/api/certificates/export')

    if (response.data.status === 200) {
      // 创建下载链接
      const dataStr = JSON.stringify(response.data.data, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
      
      const exportFileDefaultName = `certificates_${new Date().toISOString().split('T')[0]}.json`
      
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()
      
      ElMessage.success('证书导出成功')
    } else {
      ElMessage.error(response.data.message || '证书导出失败')
    }
  } catch (error) {
    console.error('导出证书失败:', error)
    ElMessage.error('导出证书失败')
  }
}

onMounted(() => {
  fetchCertificates()
  fetchDomains()
})
</script>

<style scoped>
.certificates-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.certificate-list {
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 10px;
}
</style>
