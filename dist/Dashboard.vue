<template>
  <div class="dashboard-container">
    <el-row :gutter="20">
      <el-col :xs="24" :sm="12" :md="12" :lg="6">
        <el-card class="box-card">
          <template #header>
            <div class="card-header">
              <span>域名总数</span>
            </div>
          </template>
          <div class="card-body">
            <div class="card-value">{{ stats.totalDomains }}</div>
            <div class="card-desc">当前管理的域名总数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="12" :lg="6">
        <el-card class="box-card">
          <template #header>
            <div class="card-header">
              <span>即将到期域名</span>
            </div>
          </template>
          <div class="card-body">
            <div class="card-value">{{ stats.expiringDomains }}</div>
            <div class="card-desc">30天内到期的域名数量</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="12" :lg="6">
        <el-card class="box-card">
          <template #header>
            <div class="card-header">
              <span>证书总数</span>
            </div>
          </template>
          <div class="card-body">
            <div class="card-value">{{ stats.totalCertificates }}</div>
            <div class="card-desc">当前管理的证书总数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="12" :lg="6">
        <el-card class="box-card">
          <template #header>
            <div class="card-header">
              <span>即将到期证书</span>
            </div>
          </template>
          <div class="card-body">
            <div class="card-value">{{ stats.expiringCertificates }}</div>
            <div class="card-desc">30天内到期的证书数量</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="mt-20">
      <el-col :span="24">
        <el-card class="box-card">
          <template #header>
            <div class="card-header">
              <span>即将到期的域名</span>
            </div>
          </template>
          <el-table :data="expiringDomainsList" style="width: 100%">
            <el-table-column prop="domain" label="域名" />
            <el-table-column prop="expiry_date" label="到期日期" />
            <el-table-column prop="remainingDays" label="剩余天数" />
            <el-table-column prop="registrar" label="注册商" />
            <el-table-column label="操作">
              <template #default="scope">
                <el-button type="primary" size="small" @click="viewDomain(scope.row)">查看</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="mt-20">
      <el-col :span="24">
        <el-card class="box-card">
          <template #header>
            <div class="card-header">
              <span>即将到期的证书</span>
            </div>
          </template>
          <el-table :data="expiringCertificatesList" style="width: 100%">
            <el-table-column prop="common_name" label="通用名称" />
            <el-table-column prop="valid_to" label="到期日期" />
            <el-table-column prop="remainingDays" label="剩余天数" />
            <el-table-column prop="status" label="状态" />
            <el-table-column label="操作">
              <template #default="scope">
                <el-button type="primary" size="small" @click="viewCertificate(scope.row)">查看</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()

// 统计数据
const stats = ref({
  totalDomains: 0,
  expiringDomains: 0,
  totalCertificates: 0,
  expiringCertificates: 0
})

// 即将到期的域名列表
const expiringDomainsList = ref([])

// 即将到期的证书列表
const expiringCertificatesList = ref([])

// 获取仪表盘数据
const fetchDashboardData = async () => {
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get('/api/monitor/overview', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (response.data.status === 200) {
      const data = response.data.data
      
      // 更新统计数据
      stats.value = {
        totalDomains: data.totalDomains || 0,
        expiringDomains: data.expiringDomains?.length || 0,
        totalCertificates: data.totalCertificates || 0,
        expiringCertificates: data.expiringCertificates?.length || 0
      }
      
      // 更新即将到期的域名列表
      expiringDomainsList.value = data.expiringDomains || []
      
      // 计算剩余天数
      expiringDomainsList.value.forEach(domain => {
        const expiryDate = new Date(domain.expiry_date)
        const today = new Date()
        const diffTime = expiryDate.getTime() - today.getTime()
        domain.remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      })
      
      // 更新即将到期的证书列表
      expiringCertificatesList.value = data.expiringCertificates || []
      
      // 计算剩余天数
      expiringCertificatesList.value.forEach(cert => {
        const validToDate = new Date(cert.valid_to)
        const today = new Date()
        const diffTime = validToDate.getTime() - today.getTime()
        cert.remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      })
    }
  } catch (error) {
    console.error('获取仪表盘数据失败:', error)
  }
}

// 查看域名详情
const viewDomain = (domain) => {
  router.push(`/domains?id=${domain.id}`)
}

// 查看证书详情
const viewCertificate = (certificate) => {
  router.push(`/certificates?id=${certificate.id}`)
}

onMounted(() => {
  fetchDashboardData()
})
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
}

.mt-20 {
  margin-top: 20px;
}

.box-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-body {
  text-align: center;
  padding: 20px 0;
}

.card-value {
  font-size: 36px;
  font-weight: bold;
  color: #409EFF;
}

.card-desc {
  font-size: 14px;
  color: #909399;
  margin-top: 10px;
}
</style>
