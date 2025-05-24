# 域名管理系统部署指南

## 目录

1. [系统要求](#系统要求)
2. [部署步骤](#部署步骤)
3. [环境变量配置](#环境变量配置)
4. [数据库初始化](#数据库初始化)
5. [SSL证书管理配置](#ssl证书管理配置)
6. [常见问题](#常见问题)

## 系统要求

- GitHub 账号
- Cloudflare 账号

## 部署步骤

### 1. Fork 代码仓库

1. 访问本项目的 GitHub 仓库
2. 点击右上角的 "Fork" 按钮，将代码复制到您的 GitHub 账号下

### 2. 创建 Cloudflare Pages 项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 Pages 页面
3. 点击 "Create a project"
4. 选择 "Connect to Git"
5. 选择您 fork 的仓库

### 3. 配置构建设置

在 Cloudflare Pages 项目创建过程中，配置以下构建设置：

- **构建命令**：`npm run build`
- **构建输出目录**：`dist`

### 4. 创建 D1 数据库

1. 在 Cloudflare Dashboard 中进入 D1 页面
2. 点击 "Create database" 按钮
3. 输入数据库名称（例如：`domains-db`）
4. 点击 "Create" 按钮
5. 记录生成的数据库 ID

### 5. 配置环境变量

在 Cloudflare Pages 项目设置中，添加以下环境变量：

```
USER=your_username
PASS=your_password
API_TOKEN=your_api_token
```

### 6. 配置 D1 数据库绑定

1. 在 Cloudflare Pages 项目设置中，找到 "Functions" 选项卡
2. 在 "D1 database bindings" 部分，点击 "Add binding"
3. 输入绑定名称：`DB`
4. 选择您创建的数据库
5. 点击 "Save" 按钮

### 7. 初始化数据库

1. 在 Cloudflare Dashboard 中进入 D1 页面
2. 选择您创建的数据库
3. 点击 "Query" 选项卡
4. 复制 `schema.sql` 文件中的内容到查询编辑器
5. 点击 "Run query" 按钮

### 8. 部署项目

1. 返回 Cloudflare Pages 项目页面
2. 点击 "Save and Deploy" 按钮
3. 等待部署完成

## 环境变量配置

系统使用以下环境变量：

| 变量名 | 描述 | 必填 | 默认值 |
|--------|------|------|--------|
| USER | 管理员用户名 | 否 | - |
| PASS | 管理员密码 | 否  | - |
| API_TOKEN | API 访问令牌 | 否  | - |

## 数据库初始化

系统首次访问时会自动检查数据库是否已初始化。如果未初始化，系统会尝试自动初始化数据库并创建默认管理员账户。

如果自动初始化失败，您可以手动执行 `schema.sql` 文件中的 SQL 语句来初始化数据库。

## SSL证书管理配置

系统支持 SSL 证书的申请、续期和监控。要使用此功能，您需要：

1. 在系统中添加域名
2. 在域名详情页面点击 "申请证书" 按钮
3. 系统会自动申请证书并监控证书状态

## 常见问题

### 1. 部署后无法访问系统

- 检查 Cloudflare Pages 部署是否成功
- 确认环境变量配置正确
- 确认数据库绑定配置正确

### 2. 无法登录系统

- 确认使用了正确的用户名和密码
- 检查环境变量中的 USER 和 PASS 是否配置正确
- 尝试使用默认管理员账户（用户名：admin，密码：admin123）

### 3. API 请求失败

- 确认 API_TOKEN 环境变量配置正确
- 检查请求是否包含正确的认证信息
- 查看浏览器控制台是否有错误信息

### 4. 数据库初始化失败

- 尝试手动执行 `schema.sql` 文件中的 SQL 语句
- 确认 D1 数据库绑定配置正确
- 检查数据库权限是否正确
