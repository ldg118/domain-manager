# Cloudflare域名管理系统部署指南

本指南将帮助您通过Cloudflare Dashboard界面（无需使用Wrangler CLI）部署域名管理系统。

## 部署步骤

### 1. 准备工作

1. 登录您的Cloudflare账户：https://dash.cloudflare.com/
2. 确保您已解压下载的安装包，其中包含以下内容：
   - `dist` 目录（前端文件）
   - `functions` 目录（API函数）
   - `schema.sql`（数据库结构）
   - `_routes.json`（路由配置）

### 2. 创建D1数据库

1. 在Cloudflare Dashboard左侧菜单中，选择 **Workers & Pages**
2. 点击 **D1** 选项卡
3. 点击 **创建数据库** 按钮
4. 输入数据库名称，例如 `domain_manager_db`
5. 点击 **创建** 按钮
6. 创建完成后，点击数据库名称进入详情页
7. 点击 **查询** 标签页
8. 打开安装包中的 `schema.sql` 文件，复制其中的所有内容
9. 将内容粘贴到查询编辑器中
10. 点击 **运行** 按钮执行SQL语句，初始化数据库结构

### 3. 创建Pages项目

1. 在Cloudflare Dashboard左侧菜单中，选择 **Workers & Pages**
2. 点击 **Pages** 选项卡
3. 点击 **创建应用程序** 按钮
4. 选择 **直接上传** 选项
5. 为项目命名，例如 `domain-manager`
6. 上传 `dist` 目录中的所有文件（不要上传dist目录本身）
7. 点击 **部署站点** 按钮
8. 等待部署完成

### 4. 配置Pages Functions

1. 在Pages项目详情页面，点击 **设置** > **Functions**
2. 确保 **Functions** 已启用
3. 点击 **编辑** 按钮，创建以下文件结构：
   - `functions/api/[[path]].js`（复制安装包中对应文件的内容）
4. 点击 **保存并部署** 按钮

### 5. 绑定D1数据库

1. 在Pages项目详情页面，点击 **设置** > **Functions**
2. 在 **D1数据库绑定** 部分，点击 **添加绑定**
3. 变量名称填写 `DB`（必须使用这个名称）
4. 选择之前创建的数据库 `domain_manager_db`
5. 点击 **保存** 按钮

### 6. 添加路由配置

1. 在Pages项目详情页面，点击 **设置** > **构建与部署**
2. 在 **根目录** 部分，确保设置为 `/`
3. 上传 `_routes.json` 文件到项目根目录（可以通过重新部署或使用Dashboard界面上传）

### 7. 重新部署Pages项目

1. 在Pages项目详情页面，点击 **部署** > **重新部署**
2. 等待部署完成

### 8. 初始化数据库

1. 访问 `https://your-project-name.pages.dev/api/settings/migrate`
2. 确认看到成功消息，表示数据库已初始化

### 9. 访问系统

1. 访问 `https://your-project-name.pages.dev`
2. 现在您可以开始使用域名管理系统了！

## 故障排除

如果遇到问题，请检查：

1. D1数据库是否正确绑定（变量名必须是 `DB`）
2. Functions是否正确部署（检查Pages项目的 **Functions** 标签页）
3. 数据库是否已初始化（访问迁移API端点）
4. 浏览器控制台是否有错误信息

## 自定义域名（可选）

1. 在Pages项目详情页面，点击 **自定义域** 选项卡
2. 点击 **设置自定义域** 按钮
3. 输入您的域名，例如 `domains.example.com`
4. 按照指示完成DNS验证
5. 等待域名激活

## 更新系统

如需更新系统，只需重复上述步骤3-7，上传新版本的文件即可。
