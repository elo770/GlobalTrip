# MyGlobalTrip - 全球旅行规划网站

一个基于地图的全球旅行规划网站，帮助用户快速制定全球旅行计划。用户可以在交互式地图上标注目的地、生成路线、记录每日行程、管理预算。

##  功能

 **地图路线规划** - 基于 OpenLayers 的交互式地图，支持添加目的地、调整顺序并生成行程路线
 **日程视图** - 清晰的每日行程安排，包含活动、住宿和备注
 **云端存储** - 可保存、同步和分享旅行计划（后端 API 支持）
 **预算管理** - 简单的预算规划工具，支持添加费用项目和金额

## 示例：改革开放特色路线


## 技术栈

### 前端
- **Vue 3** (3.3+) - 主框架，组合式 API
- **Vite** (4.4+) - 构建工具，快速开发
- **TypeScript** (5.0+) - 类型安全
- **Pinia** (2.1+) - 状态管理
- **ECharts** (5.4+) - 数据可视化
- **Axios** (1.5+) - HTTP 请求

### 后端
- **Node.js** (18+) - 运行时环境
- **Express.js** (4.18+) - Web 框架
- **PostgreSQL** (15+) - 主数据库（可选）
- **PostGIS** (3.3+) - 空间数据库扩展（可选）

##  安装与运行

### 前置要求

- Node.js 18+ 
- npm 或 yarn

### 安装依赖

```bash
# 安装前端依赖
cd CROSS
npm install


### 运行项目

# 启动前端开发服务器（在 CROSS 目录）
npm run dev


前端将在 `http://localhost:3000` 运行

#### 生产构建

```bash
# 构建前端
npm run build

# 预览构建结果
npm run preview
```

##  项目结构

```
CROSS/
├── src/
│   ├── components/          # 组件
│   │   └── MapComponent.vue # 地图组件
│   ├── views/               # 视图页面
│   │   ├── MapView.vue      # 地图规划视图
│   │   ├── ScheduleView.vue # 日程视图
│   │   └── BudgetView.vue   # 预算管理视图
│   ├── store/               # Pinia 状态管理
│   │   └── trip.ts          # 行程状态管理
│   ├── router/              # 路由配置
│   │   └── index.ts
│   ├── types/               # TypeScript 类型定义
│   │   └── index.ts
│   ├── App.vue              # 根组件
│   └── main.ts              # 入口文件
├── server/                  # 后端服务器
│   ├── routes/              # API 路由
│   │   ├── trip.js          # 行程相关 API
│   │   └── budget.js        # 预算相关 API
│   └── index.js             # 服务器入口
├── public/                  # 静态资源
└── package.json
```
