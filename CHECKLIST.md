# ✅ 部署检查清单

## 📋 Supabase 配置
- [ ] 创建 Supabase 项目
- [ ] 执行 `server/supabase-schema.sql`
- [ ] 记录 Project URL
- [ ] 记录 anon public key
- [ ] 记录 service_role key
- [ ] 配置 Google OAuth（Client ID + Secret）
- [ ] 配置 GitHub OAuth（Client ID + Secret）
- [ ] 设置 Site URL
- [ ] 设置 Redirect URLs

## 🚀 Fly.io 后端
- [ ] 安装 Fly CLI
- [ ] 登录 `fly auth login`
- [ ] 初始化项目 `fly launch`
- [ ] 设置环境变量：
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_KEY`
  - [ ] `DEEPSEEK_API_KEY`
  - [ ] `ADMIN_TOKEN`
  - [ ] `FRONTEND_URL`（部署后更新）
- [ ] 创建 `fly.toml`
- [ ] 部署 `fly deploy`
- [ ] 记录 API 地址
- [ ] 测试健康检查：`curl https://你的API.fly.dev/health`

## ☁️ Cloudflare Pages 前端
- [ ] 推送代码到 GitHub
- [ ] 连接 Cloudflare Pages 到 GitHub 仓库
- [ ] 配置构建命令：`npm run build`
- [ ] 配置输出目录：`dist`
- [ ] 设置环境变量：
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
  - [ ] `VITE_API_URL`
- [ ] 部署并记录前端地址
- [ ] 测试访问前端

## 🔄 回调地址更新
- [ ] 更新 Supabase Site URL 为前端地址
- [ ] 更新 Supabase Redirect URLs
- [ ] 更新 Google OAuth redirect URI
- [ ] 更新 GitHub OAuth callback URL
- [ ] 更新 Fly.io 的 `FRONTEND_URL` 环境变量

## 🧪 功能测试
- [ ] 访问前端地址，页面正常加载
- [ ] 点击登录按钮，弹出登录模态框
- [ ] Google 登录成功，显示用户信息和剩余次数
- [ ] GitHub 登录成功
- [ ] 填写生日表单，生成命盘卡片
- [ ] 选择分析体系，点击"生成分析报告"
- [ ] 报告生成成功，剩余次数减1
- [ ] 刷新页面，登录状态保持
- [ ] 点击"深度求解"，进入对话页面
- [ ] 发送消息，AI回复正常，次数扣除
- [ ] 登出功能正常

## 🔒 安全检查
- [ ] API密钥未暴露在前端代码
- [ ] `.env` 文件已加入 `.gitignore`
- [ ] Supabase RLS 策略已启用
- [ ] CORS 配置正确
- [ ] 管理员Token足够复杂

## 📊 监控设置
- [ ] 查看 Fly.io 日志：`fly logs`
- [ ] 查看 Supabase Usage
- [ ] 查看 Cloudflare Analytics
- [ ] 设置告警（可选）

## 📝 文档和工具
- [ ] 阅读 `DEPLOYMENT.md` 完整文档
- [ ] 阅读 `QUICKSTART.md` 快速指南
- [ ] 保存 `admin.html` 管理页面
- [ ] 记录所有配置信息到密码管理器

## 🎯 可选优化
- [ ] 购买自定义域名
- [ ] 配置 Cloudflare DNS
- [ ] 申请微信公众号（如需微信登录）
- [ ] 设置自动备份
- [ ] 配置CDN加速
- [ ] 添加错误追踪（Sentry）

---

**部署完成时间**: ___________
**前端地址**: ___________
**后端地址**: ___________
**管理员Token**: ___________ （安全保存）
