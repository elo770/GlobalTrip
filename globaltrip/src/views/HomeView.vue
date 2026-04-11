<template>
  <div class="home-view">
    <div class="home-container">
      <div class="welcome-section">
        <h1 class="welcome-title">
          <el-icon><MapLocation /></el-icon>
          GlobalTrip Planner
        </h1>
        <p class="welcome-subtitle">创建和管理您的全球旅行路线</p>
      </div>

      <div class="actions-section">
        <el-button type="primary" size="large" @click="createNewRoute">
          <el-icon><Plus /></el-icon>
          创建新路线
        </el-button>
        <el-button type="info" size="large" @click="viewExampleRoute">
          <el-icon><Star /></el-icon>
          查看示例路线
        </el-button>
      </div>

      <div class="routes-section">
        <h2 class="section-title">我的路线</h2>
        <div v-if="savedRoutes.length === 0" class="empty-state">
          <el-empty description="还没有保存的路线，开始创建您的第一条路线吧！" />
        </div>
        <div v-else class="routes-grid">
          <el-card
            v-for="route in savedRoutes"
            :key="route.id"
            class="route-card"
            shadow="hover"
            @click="openRoute(route.id)"
          >
            <template #header>
              <div class="route-card-header">
                <h3>{{ route.name }}</h3>
                <el-button
                  type="danger"
                  :icon="Delete"
                  circle
                  size="small"
                  @click.stop="handleDeleteRoute(route.id)"
                />
              </div>
            </template>
            <div class="route-card-content">
              <div class="route-info-item">
                <el-icon><Location /></el-icon>
                <span>{{ route.destinations.length }} 个目的地</span>
              </div>
              <div class="route-info-item">
                <el-icon><Calendar /></el-icon>
                <span>{{ route.estimatedDays }} 天</span>
              </div>
              <div class="route-destinations">
                <el-tag
                  v-for="(dest) in route.destinations.slice(0, 3)"
                  :key="dest.id"
                  size="small"
                  class="destination-tag"
                >
                  {{ dest.name }}
                </el-tag>
                <span v-if="route.destinations.length > 3" class="more-destinations">
                  +{{ route.destinations.length - 3 }} 更多
                </span>
              </div>
            </div>
          </el-card>
        </div>
      </div>

      <div class="examples-section">
        <h2 class="section-title">示例路线</h2>
        <el-card class="example-card" shadow="hover" @click="loadExampleRoute">
          <div class="example-card-content">
            <div class="example-icon">
              <el-icon><Star /></el-icon>
            </div>
            <div class="example-info">
              <h3>改革开放旅行路线</h3>
              <p>探索中国改革开放的重要城市，从经济特区到金融中心</p>
              <div class="example-details">
                <span>8 个城市</span>
                <span>•</span>
                <span>11 天</span>
              </div>
            </div>
            <el-button type="primary" @click.stop="loadExampleRoute">
              加载路线
            </el-button>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useTripStore } from '@/store/trip'
import { MapLocation, Plus, Star, Delete, Location, Calendar } from '@element-plus/icons-vue'

const router = useRouter()
const tripStore = useTripStore()

const savedRoutes = computed(() => tripStore.savedRoutes)

function createNewRoute() {
  // 清空当前路线
  tripStore.destinations = []
  tripStore.currentRoute = null
  tripStore.schedule = []
  // 跳转到地图规划页面
  router.push('/map')
}

function viewExampleRoute() {
  loadExampleRoute()
}

function loadExampleRoute() {
  tripStore.loadPresetRoute('reform-opening')
  ElMessage.success('已加载示例路线：改革开放旅行路线')
  router.push('/map')
}

function openRoute(routeId: string) {
  tripStore.loadRouteFromList(routeId)
  router.push('/map')
}

function handleDeleteRoute(routeId: string) {
  ElMessageBox.confirm('确定要删除这条路线吗？', '删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    tripStore.deleteRoute(routeId)
    ElMessage.success('路线已删除')
  }).catch(() => {})
}
</script>

<style scoped>
.home-view {
  min-height: calc(100vh - 60px);
  background: #F5F5F5;
  padding: 20px;
  overflow-y: auto;
}

.home-container {
  max-width: 1200px;
  margin: 0 auto;
}

.welcome-section {
  text-align: center;
  margin-bottom: 24px;
}

.welcome-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 32px;
  font-weight: 700;
  color: #333;
  margin-bottom: 8px;
}

.welcome-subtitle {
  font-size: 16px;
  color: #666;
}

.actions-section {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 24px;
}

.routes-section,
.examples-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.empty-state {
  padding: 40px 20px;
  background: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #E0E0E0;
}

.routes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.route-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.route-card:hover {
  transform: translateY(-4px);
}

.route-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.route-card-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.route-card-content {
  padding: 8px 0;
}

.route-info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  color: #666;
  font-size: 13px;
}

.route-destinations {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #E0E0E0;
}

.destination-tag {
  margin: 0;
}

.more-destinations {
  color: #999;
  font-size: 12px;
  line-height: 24px;
}

.example-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.example-card:hover {
  transform: translateY(-4px);
}

.example-card-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
}

.example-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #E0E0E0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 24px;
  flex-shrink: 0;
}

.example-info {
  flex: 1;
}

.example-info h3 {
  margin: 0 0 6px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.example-info p {
  margin: 0 0 8px 0;
  color: #666;
  line-height: 1.5;
  font-size: 14px;
}

.example-details {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #999;
  font-size: 14px;
}
</style>

