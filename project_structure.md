# 域名管理系统 - 项目结构设计

## 概述

基于对 [frankiejun/Domains-Support](https://github.com/frankiejun/Domains-Support) 仓库的分析，我们将设计一个完全兼容 Cloudflare Pages 部署的域名管理系统，包含域名管理、状态监控、到期提醒、SSL证书管理等功能。

## 目录结构

```
domain-manager-new/
├── functions/                  # Cloudflare Pages Functions (后端API)
│   ├── api/                    # API端点
│   │   ├── auth.ts             # 认证相关API
│   │   ├── domains.ts          # 域名管理API
│   │   ├── certificates.ts     # SSL证书管理API
│   │   ├── monitor.ts          # 监控相关API
│   │   └── telegram.ts         # Telegram通知API
│   ├── utils/                  # 工具函数
│   │   ├── auth.ts             # 认证工具
│   │   ├── db.ts               # 数据库操作
│   │   ├── ssl.ts              # SSL证书工具
│   │   └── telegram.ts         # Telegram通知工具
│   ├── [[path]].ts             # 路由处理
│   ├── cloudflare.d.ts         # Cloudflare类型定义
│   ├── tsconfig.json           # TypeScript配置
│   └── types.ts                # 类型定义
├── src/                        # 前端源码
│   ├── assets/                 # 静态资源
│   ├── components/             # Vue组件
│   ├── views/                  # 页面视图
│   ├── router/                 # 路由配置
│   ├── store/                  # 状态管理
│   ├── utils/                  # 工具函数
│   ├── App.vue                 # 主应用组件
│   ├── main.ts                 # 入口文件
│   └── vite-env.d.ts           # Vite环境定义
├── public/                     # 公共静态资源
├── index.html                  # HTML入口
├── package.json                # 项目依赖
├── tsconfig.json               # TypeScript配置
├── vite.config.ts              # Vite配置
└── schema.sql                  # 数据库架构
```

## 关键配置

### 1. 构建配置

```javascript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist', // 构建输出目录，必须与Cloudflare Pages配置一致
  }
})
```

### 2. 环境变量

系统将使用以下环境变量，通过 Cloudflare Pages 项目设置配置：

```
USER=管理员用户名
PASS=管理员密码
API_TOKEN=API访问令牌
```

### 3. 数据库绑定

在 Cloudflare Pages 项目设置中添加 D1 数据库绑定：
- 绑定名称：`DB`
- 数据库：选择创建的 D1 数据库

### 4. API认证

采用参数化认证方式，支持两种认证方法：
1. URL参数：`/api/endpoint?token=your_token`
2. Bearer Token：`Authorization: Bearer your_token`

## 部署流程

1. **准备工作**
   - 创建 GitHub 仓库
   - 准备项目代码

2. **Cloudflare 配置**
   - 创建 D1 数据库（命名为 `domains-db`）
   - 记录数据库 ID

3. **Cloudflare Pages 项目创建**
   - 连接 GitHub 仓库
   - 配置构建设置：
     - 构建命令：`npm run build`
     - 构建输出目录：`dist`
   - 配置环境变量：
     - `USER=your_username`
     - `PASS=your_password`
     - `API_TOKEN=your_api_token`
   - 配置 D1 数据库绑定：
     - 绑定名称：`DB`
     - 数据库 ID：粘贴之前记录的 ID

4. **数据库初始化**
   - 在 Cloudflare Dashboard 中进入 D1 页面
   - 选择创建的数据库
   - 执行 `schema.sql` 中的 SQL 语句

5. **部署**
   - 点击 "Save and Deploy"
   - 等待部署完成

6. **访问系统**
   - 使用 Cloudflare Pages 提供的域名访问系统
   - 使用配置的管理员账户登录

## 数据库架构

数据库将包含以下表：
- `domains`：域名信息
- `certificates`：SSL证书信息
- `alertcfg`：通知配置

详细架构见 `schema.sql` 文件。

## 认证流程

1. 用户通过用户名/密码登录
2. 系统验证凭据并生成 API Token
3. 前端存储 Token 并在后续请求中使用
4. API 请求通过 URL 参数或 Bearer Token 方式携带 Token
5. 后端验证 Token 有效性

## 注意事项

1. 确保构建输出目录为 `dist`
2. 确保 D1 数据库绑定名称为 `DB`
3. 手动执行 `schema.sql` 初始化数据库
4. 环境变量区分大小写
