# Vercel 前端 + Render 后端部署说明

## 1. 仓库结构

若 Git 仓库根目录是本项目文件夹（内含 `package.json`、`server/`、`vite.config.ts`），Vercel / Render 的 **Root Directory** 留空即可。  
若仓库根目录更上层，请在两个平台把根目录指到这一层（包含 `server` 与 `src` 的目录）。

## 2. Render：PostgreSQL

1. Render 控制台 **New → PostgreSQL**，创建免费实例。  
2. 复制 **Internal Database URL**（与 Web Service 同区时优先）或 **External**，作为 `DATABASE_URL`。

## 3. Render：Web Service（Express）

1. **New → Web Service**，连接同一 GitHub 仓库。  
2. **Build Command**：`npm install --prefix server`  
3. **Start Command**：`node server/index.js`  
4. **Environment**（示例）：
   - `DATABASE_URL`：粘贴上一步的数据库连接串（创建 Web Service 时可将 Postgres 资源 **Link** 到该服务，会自动注入）。  
   - `CORS_ORIGIN`：你的 Vercel 地址，例如 `https://xxx.vercel.app`（多个用英文逗号分隔）。不配置则允许任意来源（仅建议演示）。  
5. 部署完成后记下公网地址，例如 `https://globaltrip-api.onrender.com`。

健康检查：`GET https://你的服务域名/api/health`

## 4. Vercel：前端

1. **Import** 同一仓库。  
2. **Environment Variables** 新增：  
   - `VITE_API_BASE_URL` = `https://你的-render-服务.onrender.com/api`（**末尾必须有 `/api`**）  
3. Framework Preset 选 **Vite**，Build 默认 `npm run build`，Output `dist`。  
4. 保存后重新部署一次，使环境变量打进构建产物。

## 5. 本地开发

- 后端：在 `server/` 配置 `.env`（参考 `server/env.example`），安装依赖后 `npm run dev`（在 `server` 目录）或从项目根执行 `node server/index.js`（需已 `cd server && npm install`）。  
- 前端：根目录 `npm run dev`，默认通过 Vite 代理访问 `localhost:3001`。  
- 本地可不设 `VITE_API_BASE_URL`，继续使用 `/api` 代理。

## 6. 冷启动

Render 免费实例在无流量时会休眠，首次访问可能需等待十余秒，属正常现象。
