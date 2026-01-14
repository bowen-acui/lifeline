# 🚀 LifeLine 快速部署指南（30分钟）

## ✅ 准备工作

需要注册以下免费账号：
- [ ] [Supabase](https://supabase.com/) - 数据库 + 认证
- [ ] [Fly.io](https://fly.io/) - 后端服务器
- [ ] [Cloudflare](https://cloudflare.com/) - 前端托管
- [ ] [Google Cloud](https://console.cloud.google.com/) - OAuth登录
- [ ] [GitHub](https://github.com/settings/developers) - OAuth登录

## 📝 部署步骤

### 第一步：配置 Supabase（10分钟）

1. **创建项目**
   - 访问 https://supabase.com/dashboard
   - 点击 "New Project"，命名为 `lifeline`
   - 选择最近的区域（Singapore 或 Tokyo）
   - 等待初始化完成（约2分钟）

2. **执行数据库Schema**
   ```sql
   -- 在 SQL Editor 中执行 server/supabase-schema.sql 的全部内容
   ```

3. **获取配置信息**
   - 进入 Settings → API
   - 复制 `Project URL` → 这是 `VITE_SUPABASE_URL`
   - 复制 `anon public` → 这是 `VITE_SUPABASE_ANON_KEY`
   - 复制 `service_role` → 这是 `SUPABASE_SERVICE_KEY`（后端用）

4. **配置 Google OAuth**
   - 访问 https://console.cloud.google.com/
   - 创建项目 → APIs & Services → Credentials
   - Create Credentials → OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs: `https://你的项目ID.supabase.co/auth/v1/callback`
   - 复制 Client ID 和 Client Secret
   - 回到 Supabase → Authentication → Providers → Google
   - 启用并粘贴凭据

5. **配置 GitHub OAuth**
   - 访问 https://github.com/settings/developers
   - New OAuth App
   - Homepage: `https://你的域名.pages.dev`（先填临时的）
   - Callback: `https://你的项目ID.supabase.co/auth/v1/callback`
   - 复制 Client ID 和 Client Secret
   - 回到 Supabase → Authentication → Providers → GitHub
   - 启用并粘贴凭据

### 第二步：部署后端到 Fly.io（10分钟）

1. **安装 Fly CLI**
   ```powershell
   # Windows PowerShell
   powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
   ```

2. **登录并初始化**
   ```bash
   fly auth login
   cd server
   fly launch
   
   # 配置选项：
   # App name: lifeline-api (或自定义)
   # Region: Hong Kong (hkg) 或 Tokyo (nrt)
   # PostgreSQL: No
   # Deploy now: No
   ```

3. **配置环境变量**
   ```bash
   fly secrets set SUPABASE_URL="https://你的项目.supabase.co"
   fly secrets set SUPABASE_SERVICE_KEY="你的service_role密钥"
   fly secrets set DEEPSEEK_API_KEY="sk-d8166e468c4d49099c5f3149119766b6"
   fly secrets set ADMIN_TOKEN="随便设置一个复杂密码"
   fly secrets set FRONTEND_URL="https://lifeline-xxx.pages.dev"
   ```

4. **创建 fly.toml**（复制DEPLOYMENT.md中的配置）

5. **部署**
   ```bash
   fly deploy
   ```
   
   成功后记录API地址：`https://lifeline-api.fly.dev`

### 第三步：部署前端到 Cloudflare Pages（10分钟）

1. **推送代码到 GitHub**
   ```bash
   git add .
   git commit -m "feat: 添加认证和部署配置"
   git push
   ```

2. **连接 Cloudflare Pages**
   - 访问 https://dash.cloudflare.com/
   - Workers & Pages → Create → Pages → Connect to Git
   - 选择 `lifeline` 仓库
   - 授权 Cloudflare 访问

3. **配置构建**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/`（留空）

4. **配置环境变量**
   点击 "Add variable" 添加：
   ```
   VITE_SUPABASE_URL=https://你的项目.supabase.co
   VITE_SUPABASE_ANON_KEY=你的anon_key
   VITE_API_URL=https://lifeline-api.fly.dev
   ```

5. **部署**
   - 点击 "Save and Deploy"
   - 等待构建（约2-3分钟）
   - 记录生成的地址：`https://lifeline-xxx.pages.dev`

### 第四步：更新回调地址（5分钟）

1. **更新 Supabase**
   - Authentication → URL Configuration
   - Site URL: `https://lifeline-xxx.pages.dev`
   - Redirect URLs: 添加 `https://lifeline-xxx.pages.dev/**`

2. **更新 Google OAuth**
   - 在 Google Cloud Console 的 OAuth 客户端设置中
   - 添加 Authorized redirect URIs: `https://lifeline-xxx.pages.dev`

3. **更新 GitHub OAuth**
   - 在 GitHub OAuth App 设置中
   - 更新 Homepage URL 为实际地址

4. **更新 Fly.io 环境变量**
   ```bash
   fly secrets set FRONTEND_URL="https://lifeline-xxx.pages.dev"
   ```

## ✅ 验证部署

1. 访问你的前端地址：`https://lifeline-xxx.pages.dev`
2. 点击右上角"登录"按钮
3. 尝试 Google/GitHub 登录
4. 登录成功后，右上角应显示剩余次数（19次）
5. 填写生日信息，生成报告（会扣除1次）

## 🎉 完成！

现在你的应用已经上线，可以分享给用户了！

## 🔧 管理用户次数

### 方式1：使用管理页面
- 打开 `admin.html`（在浏览器中直接打开）
- 输入用户邮箱、增加次数、管理员Token
- 提交即可

### 方式2：直接修改数据库
```sql
-- 在 Supabase SQL Editor 执行
UPDATE users 
SET remaining_calls = remaining_calls + 19 
WHERE email = 'user@example.com';
```

## 📊 监控

- **后端日志**: `fly logs -a lifeline-api`
- **后端状态**: `fly status -a lifeline-api`
- **Supabase监控**: Dashboard → Settings → Usage
- **Cloudflare分析**: 项目页面 → Analytics

## 💡 下一步

- [ ] 购买自定义域名（可选）
- [ ] 配置域名解析到 Cloudflare Pages
- [ ] 申请微信公众号（如需微信登录）
- [ ] 设置告警通知（Fly.io/Supabase）
- [ ] 备份数据库（Supabase自动每日备份）

## ❓ 遇到问题？

查看完整文档：[DEPLOYMENT.md](./DEPLOYMENT.md)
