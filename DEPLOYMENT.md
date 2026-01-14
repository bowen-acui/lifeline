# LifeLine 部署指南

## 📋 架构概览

```
前端 (Cloudflare Pages)    后端 (Fly.io)         数据库 (Supabase)
├─ React + Vite          ├─ Express           ├─ PostgreSQL
├─ Supabase Auth客户端   ├─ API代理           ├─ Auth (Google/GitHub)
└─ 静态资源              └─ Quota控制         └─ 用户数据存储
```

## 🚀 部署步骤

### 1️⃣ Supabase 配置（数据库 + 认证）

#### 1.1 创建项目
1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 点击 "New Project"，选择免费版
3. 记录以下信息：
   - `Project URL`: https://xxxxx.supabase.co
   - `anon public key`: eyJhbGci... (在 Settings > API 中)
   - `service_role key`: eyJhbGci... (后端用)

#### 1.2 执行数据库Schema
1. 打开 SQL Editor
2. 复制 `server/supabase-schema.sql` 的内容
3. 执行SQL脚本，创建所有表和触发器

#### 1.3 配置OAuth登录
**Google OAuth:**
1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建项目 → APIs & Services → Credentials
3. 创建 OAuth 2.0 Client ID (Web application)
4. Authorized redirect URIs 添加:
   ```
   https://xxxxx.supabase.co/auth/v1/callback
   ```
5. 复制 Client ID 和 Client Secret
6. 在 Supabase Dashboard → Authentication → Providers → Google:
   - 启用 Google Provider
   - 粘贴 Client ID 和 Secret
   - Site URL: `https://your-domain.pages.dev`

**GitHub OAuth:**
1. 访问 [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. New OAuth App:
   - Homepage URL: `https://your-domain.pages.dev`
   - Authorization callback URL: `https://xxxxx.supabase.co/auth/v1/callback`
3. 复制 Client ID 和 Client Secret
4. 在 Supabase Dashboard → Authentication → Providers → GitHub:
   - 启用 GitHub Provider
   - 粘贴 Client ID 和 Secret

#### 1.4 配置认证设置
在 Authentication → URL Configuration:
- Site URL: `https://your-domain.pages.dev`
- Redirect URLs: 添加 `https://your-domain.pages.dev/**`

---

### 2️⃣ 后端部署到 Fly.io（免费额度够用）

#### 2.1 安装 Fly CLI
```bash
# Windows (PowerShell)
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# 登录
fly auth login
```

#### 2.2 初始化 Fly 应用
```bash
cd server
fly launch

# 选择配置:
# - App name: lifeline-api (或自定义)
# - Region: 选择 Hong Kong (hkg) 或 Tokyo (nrt) - 离中国近
# - PostgreSQL: No (我们用Supabase)
# - Redis: No
```

#### 2.3 配置环境变量
```bash
fly secrets set SUPABASE_URL="https://xxxxx.supabase.co"
fly secrets set SUPABASE_SERVICE_KEY="eyJhbGci..."
fly secrets set DEEPSEEK_API_KEY="sk-xxx"
fly secrets set FRONTEND_URL="https://your-domain.pages.dev"
fly secrets set ADMIN_TOKEN="your-random-secure-token-here"
```

#### 2.4 创建 fly.toml
在 `server/` 目录创建 `fly.toml`:
```toml
app = "lifeline-api"
primary_region = "hkg"

[build]
  [build.args]
    NODE_VERSION = "20"

[env]
  PORT = "3001"

[http_service]
  internal_port = 3001
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
  [http_service.concurrency]
    type = "connections"
    hard_limit = 25
    soft_limit = 20

[[vm]]
  memory = '256mb'
  cpu_kind = 'shared'
  cpus = 1
```

#### 2.5 部署
```bash
fly deploy
```

部署成功后，记录 API 地址：`https://lifeline-api.fly.dev`

---

### 3️⃣ 前端部署到 Cloudflare Pages

#### 3.1 连接 GitHub
1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Workers & Pages → Create application → Pages → Connect to Git
3. 选择你的 GitHub 仓库 `lifeline`

#### 3.2 配置构建
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `/` (不是 /server)

#### 3.3 配置环境变量
在 Settings → Environment variables 添加：
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci... (anon public key)
VITE_API_URL=https://lifeline-api.fly.dev
```

#### 3.4 部署
点击 "Save and Deploy"，等待构建完成。
部署后地址：`https://lifeline-xxx.pages.dev`

#### 3.5 配置自定义域名（可选）
1. 在 Cloudflare Pages 项目 → Custom domains
2. 添加域名（可在 Cloudflare 或其他注册商购买）
3. **注意**：不需要ICP备案，Cloudflare CDN 在国内可访问

---

### 4️⃣ 回到 Supabase 更新回调地址

在 Supabase Dashboard → Authentication → URL Configuration:
- 更新 Site URL 为实际域名: `https://your-domain.pages.dev`
- 更新 Redirect URLs

在 Google/GitHub OAuth 配置中更新回调地址为实际域名。

---

## 🔧 本地开发

### 启动后端
```bash
cd server
npm install
cp .env.example .env
# 编辑 .env 填入Supabase配置
npm run dev
```

### 启动前端
```bash
# 在项目根目录
npm install
# 编辑 .env 填入Supabase配置和后端地址
npm run dev
```

---

## 📊 管理员功能：手动添加用户次数

### 方式1：使用API（推荐）
创建一个简单的HTML管理页面：
```html
<!DOCTYPE html>
<html>
<head><title>管理后台</title></head>
<body>
  <h1>添加用户次数</h1>
  <input id="email" placeholder="用户邮箱">
  <input id="count" type="number" placeholder="增加次数" value="19">
  <input id="token" type="password" placeholder="管理员Token">
  <button onclick="addQuota()">提交</button>
  <div id="result"></div>
  
  <script>
    async function addQuota() {
      const email = document.getElementById('email').value;
      const addCount = parseInt(document.getElementById('count').value);
      const adminToken = document.getElementById('token').value;
      
      const res = await fetch('https://lifeline-api.fly.dev/api/admin/add-quota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: email, addCount, adminToken })
      });
      
      const data = await res.json();
      document.getElementById('result').innerText = JSON.stringify(data, null, 2);
    }
  </script>
</body>
</html>
```

### 方式2：直接修改数据库
在 Supabase SQL Editor 执行：
```sql
UPDATE users 
SET remaining_calls = remaining_calls + 19 
WHERE email = 'user@example.com';
```

---

## 💰 费用估算（月）

| 服务 | 费用 | 说明 |
|------|------|------|
| Cloudflare Pages | $0 | 无限流量，免费 |
| Fly.io | $0-5 | 免费额度：3个共享CPU虚拟机，160GB流量 |
| Supabase | $0 | 免费版：50K用户，500MB数据库，2GB文件存储 |
| 域名 | $10/年 | .com域名 |
| DeepSeek API | 按量 | ~$0.14/百万token（输入），1000用户/月约$20-30 |
| **总计** | **$20-35/月** | 1000+用户规模 |

---

## 🛡️ 安全检查清单

- ✅ API密钥存储在服务端（Fly.io secrets）
- ✅ 前端只使用 Supabase anon key（安全）
- ✅ 数据库启用 Row Level Security (RLS)
- ✅ CORS配置只允许你的域名
- ✅ OAuth回调地址白名单限制
- ✅ 管理员API需要token验证

---

## 📈 监控和维护

### Fly.io 监控
```bash
# 查看日志
fly logs

# 查看状态
fly status

# 扩容（如果需要）
fly scale vm shared-cpu-1x --memory 512
```

### Supabase 监控
在 Dashboard → Settings → Usage 查看：
- 数据库大小
- API请求数
- 存储使用量

### Cloudflare Pages
在项目 → Analytics 查看：
- 访问量
- 构建状态
- 错误日志

---

## 🐛 常见问题

### Q1: 国内访问慢？
**A:** Cloudflare Pages 在国内已有CDN节点，速度不错。如果还慢，可以：
1. 后端选择香港节点（hkg）
2. 使用Cloudflare China Network（需要合作伙伴）

### Q2: 登录后显示"未登录"？
**A:** 检查：
1. Supabase URL配置是否正确
2. CORS配置是否包含前端域名
3. OAuth回调地址是否正确

### Q3: API调用失败？
**A:** 检查：
1. 后端是否正常运行：`fly status`
2. 环境变量是否配置：`fly secrets list`
3. 前端VITE_API_URL是否指向正确地址

### Q4: 如何添加微信登录？
**A:** 微信开放平台需要企业资质。个人开发者可以：
1. 申请微信公众号服务号（300元/年）
2. 使用网页授权登录
3. 或等用户量起来后注册企业

---

## 📞 支持

遇到问题？
1. 查看 Fly.io 日志：`fly logs`
2. 查看 Cloudflare Pages 构建日志
3. 查看 Supabase Dashboard 错误信息
