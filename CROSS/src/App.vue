<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="header-content">
        <h1 class="logo">
          <el-icon><MapLocation /></el-icon>
          越陌CROSS
        </h1>
        <el-menu
          :default-active="activeMenu"
          mode="horizontal"
          router
          :ellipsis="false"
          class="header-menu"
        >
          <el-menu-item index="/home">
            <el-icon><HomeFilled /></el-icon>
            <span>首页</span>
          </el-menu-item>
          <el-menu-item index="/map">
            <el-icon><MapLocation /></el-icon>
            <span>路线规划</span>
          </el-menu-item>
          <el-menu-item index="/schedule">
            <el-icon><Calendar /></el-icon>
            <span>日程安排</span>
          </el-menu-item>
          <el-menu-item index="/budget">
            <el-icon><Money /></el-icon>
            <span>预算管理</span>
          </el-menu-item>
        </el-menu>
      </div>
    </el-header>
    <el-main class="app-main">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { HomeFilled, MapLocation, Calendar, Money } from '@element-plus/icons-vue'

const route = useRoute()
const activeMenu = computed(() => route.path)
</script>

<style scoped>
.app-container {
  height: 100vh;
}

.app-header {
  background: #F5F5F5;
  color: #2C2C2C;
  padding: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid #E0E0E0;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0 20px;
  position: relative;
  min-width: 800px;
}

.logo {
  position: absolute;
  left: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.header-menu {
  background: transparent;
  border: none;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.header-menu :deep(.el-menu-item) {
  color: #666;
  border-bottom: 2px solid transparent;
}

.header-menu :deep(.el-menu-item:hover),
.header-menu :deep(.el-menu-item.is-active) {
  background: rgba(0, 0, 0, 0.05);
  color: #333;
  border-bottom-color: #999;
}

.app-main {
  padding: 0;
  overflow: auto;
  height: calc(100vh - 60px);
}
</style>
