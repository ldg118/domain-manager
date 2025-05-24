# Cloudflare Pages 部署修复指南

## 问题概述

在尝试将域名管理系统部署到 Cloudflare Pages 时出现以下错误：
```
/dev/fd/63: line 1118: systemctl: command not found
/dev/fd/63: line 1121: systemctl: command not found
```

这表明部署过程中尝试使用 `systemctl` 命令，但 Cloudflare Pages 的无服务器环境中不支持此类系统级命令。

## 修复方案

我们已对项目进行全面检查和修复，确保完全兼容 Cloudflare Pages 的无服务器环境：

1. **移除所有系统级命令依赖**：
   - 已彻底排查并确认项目中不存在任何 systemctl 或系统级命令
   - 所有功能均基于云函数和前端逻辑实现，无需系统服务

2. **优化部署流程**：
   - 简化构建命令，仅保留前端构建步骤
   - 环境变量配置通过 Cloudflare Dashboard 完成
   - 数据库初始化通过 D1 Dashboard 或首次访问自动完成

3. **确保无服务器兼容性**：
   - 所有后端逻辑通过 Cloudflare Functions 实现
   - 数据存储完全依赖 Cloudflare D1 SQL 数据库
   - 所有功能设计为无状态，适合无服务器环境

## 部署步骤

### 1. 准备工作

确保您有：
- Cloudflare 账号
- 已创建的 Cloudflare Pages 项目
- 已创建的 D1 数据库

### 2. 配置构建设置

在 Cloudflare Pages 项目设置中：
- **构建命令**：`npm run build`
- **构建输出目录**：`dist`

### 3. 配置环境变量

在 Cloudflare Pages 项目设置中添加以下环境变量：
```
USER=your_username
PASS=your_password
API_TOKEN=your_api_token
```

### 4. 配置 D1 数据库绑定

1. 在 Cloudflare Pages 项目设置中，找到 "Functions" 选项卡
2. 在 "D1 database bindings" 部分，添加绑定：
   - 绑定名称：`DB`
   - 选择您创建的数据库

### 5. 部署项目

1. 提交代码到您的 GitHub 仓库
2. Cloudflare Pages 将自动触发部署
3. 首次访问系统时，数据库将自动初始化

## 常见问题

### 部署后仍然失败？

检查 Cloudflare Pages 的构建日志，确保：
- 没有使用任何系统级命令
- 构建命令正确执行
- 环境变量和数据库绑定正确配置

### 数据库初始化失败？

可以通过 Cloudflare D1 Dashboard 手动执行 `schema.sql` 中的 SQL 语句初始化数据库。

### API 请求失败？

确保：
- Functions 正确部署
- D1 数据库绑定正确
- API 路径格式正确

## 技术支持

如有任何问题，请参考：
- Cloudflare Pages 文档：https://developers.cloudflare.com/pages/
- Cloudflare D1 文档：https://developers.cloudflare.com/d1/
- Cloudflare Functions 文档：https://developers.cloudflare.com/pages/platform/functions/
