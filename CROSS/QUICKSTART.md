# 快速开始指南

## 安装步骤

### 1. 安装前端依赖

```bash
cd CROSS
npm install
```

### 2. 安装后端依赖

```bash
# 在 CROSS 目录内
cd server
npm install
```

## 运行项目

### 方式一：分别启动（推荐开发时使用）

**终端 1 - 启动前端：**
```bash
cd CROSS
npm run dev
```
前端将在 http://localhost:3000 运行

**终端 2 - 启动后端：**
```bash
cd server
npm run dev
```
后端将在 http://localhost:3001 运行

### 方式二：使用 npm scripts（需要同时运行两个终端）

前端和后端需要分别在不同的终端窗口中运行。

## 使用说明

1. **打开浏览器**访问 http://localhost:3000

2. **加载预设路线**：
   - 在地图规划页面点击"加载改革开放路线"按钮
   - 将自动加载：深圳 → 东莞 → 广州 → 上海 → 北京

3. **查看日程**：
   - 点击顶部菜单"日程视图"
   - 查看按时间线排列的每日行程

4. **管理预算**：
   - 点击顶部菜单"预算管理"
   - 添加预算项，查看统计图表

## 功能特性

✅ 交互式地图（OpenLayers）
✅ 路线可视化
✅ 日程管理
✅ 预算统计
✅ 响应式设计

## 常见问题

### 端口被占用
如果 3000 或 3001 端口被占用，可以修改：
- 前端端口：修改 `vite.config.ts` 中的 `server.port`
- 后端端口：修改 `server/index.js` 中的 `PORT` 或设置环境变量

### 依赖安装失败
尝试清除缓存后重新安装：
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

