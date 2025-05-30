<template>
  <div class="certificates-container">
    <div class="page-header">
      <h2>SSL证书管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="showApplyCertificateDialog">申请证书</el-button>
        <el-button type="success" @click="showImportDialog">导入证书</el-button>
        <el-button type="info" @click="exportCertificates">导出列表</el-button>
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
            <el-tag :type="getCertStatusType(scope.row.status)">
              {{ getCertStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="source" label="来源" width="100">
          <template #default="scope">
            <el-tag type="info" v-if="scope.row.source === 'manual'">手动添加</el-tag>
            <el-tag type="success" v-else-if="scope.row.source === 'acme'">自动申请</el-tag>
            <el-tag type="warning" v-else-if="scope.row.source === 'import'">导入</el-tag>
            <el-tag v-else>{{ scope.row.source }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="showCertificateDetails(scope.row)">详情</el-button>
            <el-button size="small" @click="showEditCertificateDialog(scope.row)">编辑</el-button>
            <el-button size="small" type="success" v-if="canRenew(scope.row)" @click="renewCertificate(scope.row)">续期</el-button>
            <el-button size="small" type="danger" @click="confirmDeleteCertificate(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 申请证书对话框 -->
    <el-dialog
      title="申请SSL证书"
      v-model="applyCertificateDialogVisible"
      width="600px"
    >
      <el-form :model="applyCertificateForm" label-width="120px" :rules="applyRules" ref="applyCertificateFormRef">
        <el-form-item label="通用名称" prop="common_name">
          <el-input v-model="applyCertificateForm.common_name" placeholder="请输入域名，如 example.com" />
        </el-form-item>
        <el-form-item label="备用名称">
          <el-tag
            v-for="(altName, index) in applyCertificateForm.alt_names"
            :key="index"
            closable
            @close="removeAltName(index)"
            class="alt-name-tag"
          >
            {{ altName }}
          </el-tag>
          <el-input
            v-if="inputAltNameVisible"
            ref="inputAltNameRef"
            v-model="inputAltName"
            class="alt-name-input"
            size="small"
            @keyup.enter="addAltName"
            @blur="addAltName"
          />
          <el-button v-else class="button-new-tag" size="small" @click="showInputAltName">
            + 添加备用名称
          </el-button>
        </el-form-item>
        <el-form-item label="关联域名">
          <el-select v-model="applyCertificateForm.domain_id" placeholder="选择关联域名" clearable style="width: 100%">
            <el-option
              v-for="domain in domains"
              :key="domain.id"
              :label="domain.domain"
              :value="domain.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="验证方式" prop="validation_method">
          <el-radio-group v-model="applyCertificateForm.validation_method">
            <el-radio label="http-01">HTTP验证</el-radio>
            <el-radio label="dns-01">DNS验证</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="密钥类型">
          <el-radio-group v-model="applyCertificateForm.key_type">
            <el-radio label="RSA">RSA</el-radio>
            <el-radio label="ECDSA">ECDSA</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="密钥大小">
          <el-select v-model="applyCertificateForm.key_size" placeholder="选择密钥大小">
            <el-option label="2048位" :value="2048" v-if="applyCertificateForm.key_type === 'RSA'" />
            <el-option label="4096位" :value="4096" v-if="applyCertificateForm.key_type === 'RSA'" />
            <el-option label="P-256" :value="256" v-if="applyCertificateForm.key_type === 'ECDSA'" />
            <el-option label="P-384" :value="384" v-if="applyCertificateForm.key_type === 'ECDSA'" />
          </el-select>
        </el-form-item>
        <el-form-item label="自动续期">
          <el-switch v-model="applyCertificateForm.auto_renew" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="applyCertificateDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitApplyCertificateForm">申请证书</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 验证步骤对话框 -->
    <el-dialog
      title="证书验证"
      v-model="validationDialogVisible"
      width="600px"
    >
      <div v-if="currentValidation">
        <el-alert
          title="请完成以下验证步骤，以便颁发证书"
          type="info"
          :closable="false"
          style="margin-bottom: 20px"
        />
        
        <div v-if="currentValidation.validations && currentValidation.validations.length > 0">
          <div v-for="(validation, index) in currentValidation.validations" :key="index" class="validation-step">
            <h3>验证域名: {{ validation.domain }}</h3>
            
            <div v-if="validation.type === 'http-01'">
              <p>请在您的Web服务器上创建以下文件:</p>
              <el-input
                type="text"
                :value="`.well-known/acme-challenge/${validation.token}`"
                readonly
                class="validation-input"
              >
                <template #prepend>文件路径</template>
              </el-input>
              <el-input
                type="text"
                :value="validation.content"
                readonly
                class="validation-input"
              >
                <template #prepend>文件内容</template>
              </el-input>
              <p class="validation-note">确保该文件可以通过 http://{{ validation.domain }}/.well-known/acme-challenge/{{ validation.token }} 访问</p>
            </div>
            
            <div v-if="validation.type === 'dns-01'">
              <p>请在您的DNS服务商添加以下TXT记录:</p>
              <el-input
                type="text"
                :value="`_acme-challenge.${validation.domain.replace(/^[*][.]/, '')}`"
                readonly
                class="validation-input"
              >
                <template #prepend>记录名称</template>
              </el-input>
              <el-input
                type="text"
                :value="validation.content"
                readonly
                class="validation-input"
              >
                <template #prepend>记录值</template>
              </el-input>
              <p class="validation-note">DNS记录可能需要一些时间才能生效，请耐心等待</p>
            </div>
          </div>
        </div>
        
        <div class="validation-actions">
          <el-button type="primary" @click="completeValidation" :loading="validationLoading">
            我已完成验证步骤
          </el-button>
          <el-button @click="checkValidationStatus" :loading="checkStatusLoading">
            检查验证状态
          </el-button>
        </div>
      </div>
      <div v-else>
        <el-empty description="无验证信息" />
      </div>
    </el-dialog>

    <!-- 证书详情对话框 -->
    <el-dialog
      title="证书详情"
      v-model="certificateDetailsDialogVisible"
      width="700px"
    >
      <div v-if="certificateDetails" class="certificate-details">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="通用名称">{{ certificateDetails.common_name }}</el-descriptions-item>
          <el-descriptions-item label="备用名称">
            <el-tag v-for="(name, index) in certificateDetails.alt_names" :key="index" class="alt-name-tag">
              {{ name }}
            </el-tag>
            <span v-if="!certificateDetails.alt_names || certificateDetails.alt_names.length === 0">无</span>
          </el-descriptions-item>
          <el-descriptions-item label="颁发机构">{{ certificateDetails.issuer }}</el-descriptions-item>
          <el-descriptions-item label="有效期">
            {{ certificateDetails.valid_from }} 至 {{ certificateDetails.valid_to }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getCertStatusType(certificateDetails.status)">
              {{ getCertStatusText(certificateDetails.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="来源">
            <el-tag type="info" v-if="certificateDetails.source === 'manual'">手动添加</el-tag>
            <el-tag type="success" v-else-if="certificateDetails.source === 'acme'">自动申请</el-tag>
            <el-tag type="warning" v-else-if="certificateDetails.source === 'import'">导入</el-tag>
            <el-tag v-else>{{ certificateDetails.source }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="指纹">{{ certificateDetails.fingerprint }}</el-descriptions-item>
          <el-descriptions-item label="密钥类型">{{ certificateDetails.key_type }} {{ certificateDetails.key_size }}</el-descriptions-item>
          <el-descriptions-item label="自动续期">
            <el-switch v-model="certificateDetails.auto_renew" disabled />
          </el-descriptions-item>
          <el-descriptions-item label="关联域名">
            {{ certificateDetails.domain ? certificateDetails.domain.domain : '无' }}
          </el-descriptions-item>
          <el-descriptions-item label="最后续期日期">
            {{ certificateDetails.last_renewal_date || '无' }}
          </el-descriptions-item>
          <el-descriptions-item label="下次续期日期">
            {{ certificateDetails.next_renewal_date || '无' }}
          </el-descriptions-item>
        </el-descriptions>
        
        <div class="certificate-actions">
          <el-button type="primary" @click="downloadCertificate(certificateDetails.id, 'pem')">下载 PEM</el-button>
          <el-button type="primary" @click="downloadCertificate(certificateDetails.id, 'pfx')">下载 PFX</el-button>
          <el-button type="primary" @click="downloadCertificate(certificateDetails.id, 'p7b')">下载 P7B</el-button>
        </div>
        
        <el-collapse>
          <el-collapse-item title="证书内容" name="certificate">
            <pre class="certificate-content">{{ certificateDetails.certificate_pem }}</pre>
          </el-collapse-item>
          <el-collapse-item title="证书链" name="chain" v-if="certificateDetails.certificate_chain_pem">
            <pre class="certificate-content">{{ certificateDetails.certificate_chain_pem }}</pre>
          </el-collapse-item>
        </el-collapse>
      </div>
      <div v-else>
        <el-empty description="无证书详情" />
      </div>
    </el-dialog>

    <!-- 编辑证书对话框 -->
    <el-dialog
      title="编辑证书"
      v-model="editCertificateDialogVisible"
      width="500px"
    >
      <el-form :model="editCertificateForm" label-width="100px" :rules="editRules" ref="editCertificateFormRef">
        <el-form-item label="通用名称" prop="common_name">
          <el-input v-model="editCertificateForm.common_name" placeholder="请输入通用名称" />
        </el-form-item>
        <el-form-item label="颁发机构">
          <el-input v-model="editCertificateForm.issuer" placeholder="请输入颁发机构" />
        </el-form-item>
        <el-form-item label="生效日期">
          <el-date-picker
            v-model="editCertificateForm.valid_from"
            type="date"
            placeholder="选择生效日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="到期日期" prop="valid_to">
          <el-date-picker
            v-model="editCertificateForm.valid_to"
            type="date"
            placeholder="选择到期日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="关联域名">
          <el-select v-model="editCertificateForm.domain_id" placeholder="选择关联域名" clearable style="width: 100%">
            <el-option
              v-for="domain in domains"
              :key="domain.id"
              :label="domain.domain"
              :value="domain.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="自动续期">
          <el-switch v-model="editCertificateForm.auto_renew" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="editCertificateForm.memo"
            type="textarea"
            placeholder="请输入备注"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editCertificateDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitEditCertificateForm">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 导入证书对话框 -->
    <el-dialog title="导入证书" v-model="importDialogVisible" width="600px">
      <el-tabs v-model="importTabActive">
        <el-tab-pane label="PEM格式" name="pem">
          <el-form :model="importPemForm" label-width="120px" :rules="importPemRules" ref="importPemFormRef">
            <el-form-item label="通用名称" prop="common_name">
              <el-input v-model="importPemForm.common_name" placeholder="请输入通用名称" />
            </el-form-item>
            <el-form-item label="关联域名">
              <el-select v-model="importPemForm.domain_id" placeholder="选择关联域名" clearable style="width: 100%">
                <el-option
                  v-for="domain in domains"
                  :key="domain.id"
                  :label="domain.domain"
                  :value="domain.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="证书内容" prop="certificate">
              <el-input
                v-model="importPemForm.certificate"
                type="textarea"
                placeholder="请粘贴PEM格式证书内容，以 -----BEGIN CERTIFICATE----- 开头"
                :rows="5"
              />
            </el-form-item>
            <el-form-item label="私钥内容" prop="private_key">
              <el-input
                v-model="importPemForm.private_key"
                type="textarea"
                placeholder="请粘贴PEM格式私钥内容，以 -----BEGIN PRIVATE KEY----- 开头"
                :rows="5"
              />
            </el-form-item>
            <el-form-item label="证书链内容">
              <el-input
                v-model="importPemForm.certificate_chain"
                type="textarea"
                placeholder="请粘贴PEM格式证书链内容（可选）"
                :rows="5"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="PFX/PKCS#12格式" name="pfx">
          <el-form :model="importPfxForm" label-width="120px" :rules="importPfxRules" ref="importPfxFormRef">
            <el-form-item label="关联域名">
              <el-select v-model="importPfxForm.domain_id" placeholder="选择关联域名" clearable style="width: 100%">
                <el-option
                  v-for="domain in domains"
                  :key="domain.id"
                  :label="domain.domain"
                  :value="domain.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="PFX文件" prop="pfx_file">
              <el-upload
                class="upload-demo"
                drag
                action="#"
                :auto-upload="false"
                :on-change="handlePfxFileChange"
                :limit="1"
                accept=".pfx,.p12"
              >
                <el-icon class="el-icon--upload"><upload-filled /></el-icon>
                <div class="el-upload__text">
                  拖拽文件到此处，或 <em>点击上传</em>
                </div>
                <template #tip>
                  <div class="el-upload__tip">
                    请上传PFX/PKCS#12格式证书文件
                  </div>
                </template>
              </el-upload>
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="importPfxForm.password" placeholder="请输入PFX文件密码（如果有）" show-password />
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="批量导入" name="batch">
          <el-upload
            class="upload-demo"
            drag
            action="#"
            :auto-upload="false"
            :on-change="handleBatchFileChange"
            :limit="1"
            accept=".json"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              拖拽文件到此处，或 <em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                请上传JSON格式文件，包含证书信息数组
              </div>
            </template>
          </el-upload>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="importDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="importCertificate">导入</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
// 导入全局 axios 实例
import axiosInstance from '../utils/axios'

// 证书列表
const certificates = ref([])
const domains = ref([])
const loading = ref(false)

// 对话框控制
const applyCertificateDialogVisible = ref(false)
const validationDialogVisible = ref(false)
const certificateDetailsDialogVisible = ref(false)
const editCertificateDialogVisible = ref(false)
const importDialogVisible = ref(false)

// 表单引用
const applyCertificateFormRef = ref(null)
const editCertificateFormRef = ref(null)
const importPemFormRef = ref(null)
const importPfxFormRef = ref(null)

// 申请证书表单
const applyCertificateForm = ref({
  common_name: '',
  alt_names: [],
  domain_id: null,
  validation_method: 'http-01',
  key_type: 'RSA',
  key_size: 2048,
  auto_renew: true
})

// 编辑证书表单
const editCertificateForm = ref({
  id: null,
  common_name: '',
  issuer: '',
  valid_from: '',
  valid_to: '',
  domain_id: null,
  auto_renew: true,
  memo: ''
})

// 导入PEM证书表单
const importPemForm = ref({
  common_name: '',
  domain_id: null,
  certificate: '',
  private_key: '',
  certificate_chain: ''
})

// 导入PFX证书表单
const importPfxForm = ref({
  domain_id: null,
  pfx_file: null,
  pfx_base64: '',
  password: ''
})

// 导入选项卡
const importTabActive = ref('pem')

// 批量导入文件
const batchImportFile = ref(null)

// 当前验证信息
const currentValidation = ref(null)
const validationLoading = ref(false)
const checkStatusLoading = ref(false)

// 证书详情
const certificateDetails = ref(null)

// 备用名称输入
const inputAltNameVisible = ref(false)
const inputAltName = ref('')
const inputAltNameRef = ref(null)

// 表单验证规则
const applyRules = {
  common_name: [
    { required: true, message: '请输入通用名称', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+$/, message: '请输入有效的域名', trigger: 'blur' }
  ],
  validation_method: [
    { required: true, message: '请选择验证方式', trigger: 'change' }
  ]
}

const editRules = {
  common_name: [
    { required: true, message: '请输入通用名称', trigger: 'blur' }
  ],
  valid_to: [
    { required: true, message: '请选择到期日期', trigger: 'change' }
  ]
}

const importPemRules = {
  common_name: [
    { required: true, message: '请输入通用名称', trigger: 'blur' }
  ],
  certificate: [
    { required: true, message: '请输入证书内容', trigger: 'blur' }
  ],
  private_key: [
    { required: true, message: '请输入私钥内容', trigger: 'blur' }
  ]
}

const importPfxRules = {
  pfx_file: [
    { required: true, message: '请选择PFX文件', trigger: 'change' }
  ]
}

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

// 显示申请证书对话框
const showApplyCertificateDialog = () => {
  applyCertificateForm.value = {
    common_name: '',
    alt_names: [],
    domain_id: null,
    validation_method: 'http-01',
    key_type: 'RSA',
    key_size: 2048,
    auto_renew: true
  }
  applyCertificateDialogVisible.value = true
}

// 显示编辑证书对话框
const showEditCertificateDialog = (row) => {
  editCertificateForm.value = { 
    id: row.id,
    common_name: row.common_name,
    issuer: row.issuer,
    valid_from: row.valid_from,
    valid_to: row.valid_to,
    domain_id: row.domain_id,
    auto_renew: row.auto_renew === 1,
    memo: row.memo
  }
  editCertificateDialogVisible.value = true
}

// 显示证书详情
const showCertificateDetails = async (row) => {
  try {
    const response = await axiosInstance.get(`/api/certificates/${row.id}/details`)

    if (response.data.status === 200) {
      certificateDetails.value = response.data.data
      certificateDetailsDialogVisible.value = true
    } else {
      ElMessage.error(response.data.message || '获取证书详情失败')
    }
  } catch (error) {
    console.error('获取证书详情失败:', error)
    ElMessage.error('获取证书详情失败')
  }
}

// 下载证书
const downloadCertificate = async (id, format) => {
  try {
    // 对于PEM格式，使用JSON响应
    if (format === 'pem') {
      const response = await axiosInstance.get(`/api/certificates/${id}/export?format=pem`)
      
      if (response.data.status === 200) {
        // 创建证书文件内容
        const certContent = response.data.data.certificate
        const keyContent = response.data.data.privateKey
        const chainContent = response.data.data.chain || ''
        
        // 创建下载链接 - 证书
        downloadFile(
          certContent, 
          `${certificateDetails.value.common_name.replace(/[^a-zA-Z0-9]/g, '_')}_cert.pem`, 
          'application/x-pem-file'
        )
        
        // 创建下载链接 - 私钥
        downloadFile(
          keyContent, 
          `${certificateDetails.value.common_name.replace(/[^a-zA-Z0-9]/g, '_')}_key.pem`, 
          'application/x-pem-file'
        )
        
        // 如果有证书链，也下载
        if (chainContent) {
          downloadFile(
            chainContent, 
            `${certificateDetails.value.common_name.replace(/[^a-zA-Z0-9]/g, '_')}_chain.pem`, 
            'application/x-pem-file'
          )
        }
        
        ElMessage.success('证书下载成功')
      } else {
        ElMessage.error(response.data.message || '证书下载失败')
      }
    } else {
      // 对于其他格式，直接下载二进制文件
      window.open(`/api/certificates/${id}/export?format=${format}`, '_blank')
    }
  } catch (error) {
    console.error('下载证书失败:', error)
    ElMessage.error('下载证书失败')
  }
}

// 辅助函数：下载文件
const downloadFile = (content, filename, contentType) => {
  const blob = new Blob([content], { type: contentType })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

// 提交申请证书表单
const submitApplyCertificateForm = async () => {
  if (!applyCertificateFormRef.value) return

  applyCertificateFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const response = await axiosInstance.post('/api/certificates/apply', applyCertificateForm.value)

        if (response.data.status === 200) {
          ElMessage.success('证书申请已提交')
          applyCertificateDialogVisible.value = false
          
          // 显示验证步骤
          currentValidation.value = response.data.data
          validationDialogVisible.value = true
        } else {
          ElMessage.error(response.data.message || '证书申请失败')
        }
      } catch (error) {
        console.error('申请证书失败:', error)
        ElMessage.error('申请证书失败')
      }
    }
  })
}

// 完成验证
const completeValidation = async () => {
  if (!currentValidation.value) return
  
  validationLoading.value = true
  try {
    let response
    
    // 根据验证类型调用不同的API
    if (currentValidation.value.validations[0].type === 'http-01') {
      response = await axiosInstance.post(
        `/api/certificates/apply/${currentValidation.value.id}/complete-http-validation`
      )
    } else if (currentValidation.value.validations[0].type === 'dns-01') {
      // 对于DNS验证，需要为每个域名单独验证
      for (const validation of currentValidation.value.validations) {
        response = await axiosInstance.post(
          `/api/certificates/apply/${currentValidation.value.id}/complete-dns-validation`,
          { domain: validation.domain }
        )
        
        if (response.data.status !== 200) {
          ElMessage.error(`域名 ${validation.domain} 验证失败: ${response.data.message || '未知错误'}`)
          validationLoading.value = false
          return
        }
      }
    }

    if (response.data.status === 200) {
      ElMessage.success('验证已提交，证书正在处理中')
      validationDialogVisible.value = false
      fetchCertificates()
    } else {
      ElMessage.error(response.data.message || '验证失败')
    }
  } catch (error) {
    console.error('完成验证失败:', error)
    ElMessage.error('完成验证失败')
  } finally {
    validationLoading.value = false
  }
}

// 检查验证状态
const checkValidationStatus = async () => {
  if (!currentValidation.value) return
  
  checkStatusLoading.value = true
  try {
    const response = await axiosInstance.get(
      `/api/certificates/apply/${currentValidation.value.id}/status`
    )

    if (response.data.status === 200) {
      const status = response.data.data.status
      
      if (status === 'valid') {
        ElMessage.success('证书已成功颁发')
        validationDialogVisible.value = false
        fetchCertificates()
      } else if (status === 'failed') {
        ElMessage.error('证书颁发失败')
      } else {
        ElMessage.info(`证书状态: ${getCertStatusText(status)}`)
      }
    } else {
      ElMessage.error(response.data.message || '获取状态失败')
    }
  } catch (error) {
    console.error('检查验证状态失败:', error)
    ElMessage.error('检查验证状态失败')
  } finally {
    checkStatusLoading.value = false
  }
}

// 提交编辑证书表单
const submitEditCertificateForm = async () => {
  if (!editCertificateFormRef.value) return

  editCertificateFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // 转换自动续期为数字
        const formData = {
          ...editCertificateForm.value,
          auto_renew: editCertificateForm.value.auto_renew ? 1 : 0
        }
        
        const response = await axiosInstance.put(
          `/api/certificates/${editCertificateForm.value.id}`, 
          formData
        )

        if (response.data.status === 200) {
          ElMessage.success('证书更新成功')
          editCertificateDialogVisible.value = false
          fetchCertificates()
        } else {
          ElMessage.error(response.data.message || '证书更新失败')
        }
      } catch (error) {
        console.error('更新证书失败:', error)
        ElMessage.error('更新证书失败')
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

// 续期证书
const renewCertificate = async (row) => {
  try {
    const response = await axiosInstance.post(`/api/certificates/${row.id}/renew`)

    if (response.data.status === 200) {
      ElMessage.success('证书续期已提交')
      
      // 显示验证步骤
      currentValidation.value = response.data.data
      validationDialogVisible.value = true
    } else {
      ElMessage.error(response.data.message || '证书续期失败')
    }
  } catch (error) {
    console.error('续期证书失败:', error)
    ElMessage.error('续期证书失败')
  }
}

// 判断证书是否可以续期
const canRenew = (row) => {
  return row.source === 'acme' && (row.status === 'valid' || row.status === 'expired')
}

// 显示导入对话框
const showImportDialog = () => {
  importPemForm.value = {
    common_name: '',
    domain_id: null,
    certificate: '',
    private_key: '',
    certificate_chain: ''
  }
  
  importPfxForm.value = {
    domain_id: null,
    pfx_file: null,
    pfx_base64: '',
    password: ''
  }
  
  batchImportFile.value = null
  importTabActive.value = 'pem'
  importDialogVisible.value = true
}

// 处理PFX文件变更
const handlePfxFileChange = (file) => {
  importPfxForm.value.pfx_file = file.raw
  
  // 读取文件为Base64
  const reader = new FileReader()
  reader.onload = (e) => {
    importPfxForm.value.pfx_base64 = e.target.result.split(',')[1]
  }
  reader.readAsDataURL(file.raw)
}

// 处理批量导入文件变更
const handleBatchFileChange = (file) => {
  batchImportFile.value = file.raw
}

// 导入证书
const importCertificate = async () => {
  try {
    if (importTabActive.value === 'pem') {
      if (!importPemFormRef.value) return
      
      importPemFormRef.value.validate(async (valid) => {
        if (valid) {
          const response = await axiosInstance.post('/api/certificates/import/pem', importPemForm.value)
          
          if (response.data.status === 200) {
            ElMessage.success('PEM证书导入成功')
            importDialogVisible.value = false
            fetchCertificates()
          } else {
            ElMessage.error(response.data.message || 'PEM证书导入失败')
          }
        }
      })
    } else if (importTabActive.value === 'pfx') {
      if (!importPfxFormRef.value) return
      
      importPfxFormRef.value.validate(async (valid) => {
        if (valid) {
          const response = await axiosInstance.post('/api/certificates/import/pfx', {
            domain_id: importPfxForm.value.domain_id,
            pfx_base64: importPfxForm.value.pfx_base64,
            password: importPfxForm.value.password
          })
          
          if (response.data.status === 200) {
            ElMessage.success('PFX证书导入成功')
            importDialogVisible.value = false
            fetchCertificates()
          } else {
            ElMessage.error(response.data.message || 'PFX证书导入失败')
          }
        }
      })
    } else if (importTabActive.value === 'batch') {
      if (!batchImportFile.value) {
        ElMessage.warning('请选择要导入的文件')
        return
      }
      
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const certificates = JSON.parse(e.target.result)
          
          if (!Array.isArray(certificates)) {
            ElMessage.error('导入文件格式错误，请提供证书数组')
            return
          }
          
          const response = await axiosInstance.post('/api/certificates/import/batch', { certificates })
          
          if (response.data.status === 200) {
            ElMessage.success(`成功导入 ${response.data.data.success} 个证书，失败 ${response.data.data.failed} 个`)
            importDialogVisible.value = false
            fetchCertificates()
          } else {
            ElMessage.error(response.data.message || '批量导入证书失败')
          }
        } catch (error) {
          console.error('解析导入文件失败:', error)
          ElMessage.error('解析导入文件失败，请确保文件格式正确')
        }
      }
      reader.readAsText(batchImportFile.value)
    }
  } catch (error) {
    console.error('导入证书失败:', error)
    ElMessage.error('导入证书失败')
  }
}

// 导出证书列表
const exportCertificates = async () => {
  try {
    const response = await axiosInstance.get('/api/certificates')

    if (response.data.status === 200) {
      // 创建下载链接
      const dataStr = JSON.stringify(response.data.data, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
      
      const exportFileDefaultName = `certificates_${new Date().toISOString().split('T')[0]}.json`
      
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()
      
      ElMessage.success('证书列表导出成功')
    } else {
      ElMessage.error(response.data.message || '证书列表导出失败')
    }
  } catch (error) {
    console.error('导出证书列表失败:', error)
    ElMessage.error('导出证书列表失败')
  }
}

// 获取证书状态类型
const getCertStatusType = (status) => {
  switch (status) {
    case 'valid':
      return 'success'
    case 'expired':
      return 'danger'
    case 'pending':
    case 'processing':
    case 'renewal_pending':
      return 'warning'
    case 'failed':
      return 'error'
    default:
      return 'info'
  }
}

// 获取证书状态文本
const getCertStatusText = (status) => {
  switch (status) {
    case 'valid':
      return '有效'
    case 'expired':
      return '已过期'
    case 'pending':
      return '待验证'
    case 'processing':
      return '处理中'
    case 'renewal_pending':
      return '待续期'
    case 'failed':
      return '失败'
    default:
      return status
  }
}

// 显示备用名称输入框
const showInputAltName = () => {
  inputAltNameVisible.value = true
  nextTick(() => {
    inputAltNameRef.value.focus()
  })
}

// 添加备用名称
const addAltName = () => {
  if (inputAltName.value) {
    applyCertificateForm.value.alt_names.push(inputAltName.value)
  }
  inputAltNameVisible.value = false
  inputAltName.value = ''
}

// 移除备用名称
const removeAltName = (index) => {
  applyCertificateForm.value.alt_names.splice(index, 1)
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

.alt-name-tag {
  margin-right: 6px;
  margin-bottom: 6px;
}

.alt-name-input {
  width: 90px;
  margin-right: 10px;
  vertical-align: bottom;
}

.validation-step {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #e6e6e6;
  border-radius: 4px;
  background-color: #f9f9f9;
}

.validation-input {
  margin-bottom: 10px;
}

.validation-note {
  font-size: 12px;
  color: #666;
  margin-top: 10px;
}

.validation-actions {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  gap: 15px;
}

.certificate-details {
  margin-bottom: 20px;
}

.certificate-actions {
  margin: 20px 0;
  display: flex;
  gap: 10px;
}

.certificate-content {
  font-family: monospace;
  font-size: 12px;
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  white-space: pre-wrap;
  max-height: 300px;
  overflow-y: auto;
}
</style>
