# CROSS

CROSS 是一个基于 Vue 3 + Vite 的旅行路线规划应用，支持在地图上添加目的地、查看行程安排、管理预算，并可将数据同步到 Firebase Firestore。项目同时保留了一个可选的 Express API，便于在未接入 Firebase 时继续提供基础后端能力。

## 产品定位

CROSS 面向需要整理多城市旅行路线的用户，强调“先在地图上规划，再生成行程与预算”的一体化体验。它适合课程作业、产品原型、旅游路线展示，以及需要快速验证旅行规划交互的场景。

相比只提供列表录入的行程工具，这个项目更强调空间感和路线感：

- 用户可以直接围绕地图组织目的地
- 路线调整后，行程视图会同步更新
- 预算管理与路线规划放在同一个工作流中
- 数据既可以先保存在本地，也可以进一步同步到 Firebase

## 产品体验

这个产品围绕一次完整的旅行规划过程设计，主要分为四个连续步骤：

1. 在首页查看已有路线，或者加载示例路线快速开始
2. 在地图页搜索 POI、手动点选地点、调整顺序并补充描述
3. 在行程页查看根据路线自动生成的每日安排
4. 在预算页录入花费并查看汇总统计

当前项目内置了一条“改革开放主题旅游路线”示例，用来演示从路线加载、日程生成到预算管理的整套流程。

## 适用场景

- 旅行路线规划与展示
- 地图交互类课程设计或毕业设计
- 旅游类产品原型验证
- 带有多页面状态联动的前端项目示例
- Firebase 或前后端分离部署的练习项目

## 当前功能

- 首页管理已保存路线，并可一键加载示例路线
- 地图页支持 POI 搜索、地图点选、调整目的地顺序、编辑目的地信息
- 行程页根据当前路线生成每日行程安排
- 预算页支持新增、删除预算项，并显示统计图表
- 支持 Firebase Firestore 同步
- 支持可选 Express API 接口

## 核心能力

- 路线规划：围绕地图完成目的地录入、排序与编辑
- 行程联动：路线变化后自动重建每日行程
- 预算统计：按天数与类型汇总旅行预算
- 数据同步：优先走 Firebase，未配置时可回退到本地或自建 API
- 部署灵活：前端可部署到 Vercel，后端可选部署到 Render

## 技术栈

- Vue 3
- Vite 4
- TypeScript 5
- Vue Router 4
- Pinia
- Element Plus
- OpenLayers
- ECharts + vue-echarts
- Firebase
- Express

## 目录结构

```text
CROSS/
|- src/
|  |- components/
|  |- lib/
|  |- router/
|  |- store/
|  |- types/
|  |- views/
|  |- App.vue
|  |- main.ts
|  `- style.css
|- public/
|- server/
|  |- routes/
|  |- db.js
|  `- index.js
|- docs/
|- .env.example
|- package.json
|- render.yaml
`- vercel.json
```

## 环境要求

- Node.js 18 或更高版本
- npm 9 或更高版本

## 安装

在 `CROSS` 目录安装前端依赖：

```bash
npm install
```

如果你需要启用本地 Express API，再安装后端依赖：

```bash
npm install --prefix server
```

## 本地开发

启动前端开发服务器：

```bash
npm run dev
```

前端默认运行在 `http://localhost:3000`。

Vite 已配置代理，访问 `/api` 时会转发到 `http://localhost:3001`。

如果需要同时启用本地后端，再开一个终端执行：

```bash
npm run server
```

后端默认运行在 `http://localhost:3001`。

## 构建与预览

项目当前构建命令如下：

```bash
npm run build
```

它实际执行的是：

```bash
vite build
```

本地预览构建结果：

```bash
npm run preview
```

预览服务默认运行在 `http://localhost:4173`。

## 环境变量

项目优先使用 Firebase。可参考 [.env.example](e:\product\GlobalTrip_MyWeb\globaltrip\CROSS\.env.example) 配置以下变量：

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`（可选）

如果暂时不用 Firebase，也可以改为连接自建 API：

- `VITE_API_BASE_URL`

注意：该值需要以 `/api` 结尾，例如 `https://your-service.onrender.com/api`。

## 路由页面

当前前端路由如下：

- `/home` 首页
- `/map` 地图规划
- `/schedule` 行程安排
- `/budget` 预算管理

访问根路径 `/` 时会自动跳转到 `/home`。

## 部署说明

### Vercel 部署前端

- Root Directory 设为 `CROSS`
- Build Command 使用 `npm run build`
- Output Directory 使用 `dist`

当前 `npm run build` 已不再执行 `vue-tsc`，避免在 Vercel 上因 `vue-tsc` 与 Node 版本兼容性导致构建失败。

### Firebase

- 在 Firebase 控制台创建 Web 应用
- 将配置写入 `.env` 或 Vercel 环境变量
- 根据需要发布 [firestore.rules](e:\product\GlobalTrip_MyWeb\globaltrip\CROSS\firestore.rules)

### Render 部署后端

[render.yaml](e:\product\GlobalTrip_MyWeb\globaltrip\CROSS\render.yaml) 当前用于部署可选的 Node 服务：

- `buildCommand`: `npm install --prefix server`
- `startCommand`: `node server/index.js`

## 常用脚本

- `npm run dev` 启动前端开发环境
- `npm run build` 构建前端
- `npm run preview` 预览构建产物
- `npm run server` 启动本地 Express API
- `npm run deploy:firebase` 构建并执行 Firebase 部署
