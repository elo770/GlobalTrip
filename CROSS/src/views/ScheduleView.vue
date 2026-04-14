<template>
  <div class="schedule-view">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>日程安排</span>
          <el-button type="primary" @click="loadPresetRoute">
            <el-icon><Refresh /></el-icon>
            加载示例：欧洲自由行
          </el-button>
        </div>
      </template>

      <el-timeline v-if="schedule.length > 0">
        <el-timeline-item
          v-for="day in schedule"
          :key="day.day"
          :timestamp="`第 ${day.day} 天`"
          placement="top"
          type="primary"
          size="large"
        >
          <el-card>
            <h3>{{ day.city }}</h3>
            <p class="schedule-date">{{ formatDate(day.date) }}</p>
            
            <el-divider />
            
            <div class="schedule-section">
              <h4>
                <el-icon><Document /></el-icon>
                备注
              </h4>
              <p>{{ day.notes || '暂无备注' }}</p>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>

      <el-empty
        v-else
        description="请先在「路线规划」添加或调整目的地，日程会随路线自动更新；也可加载示例路线。"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTripStore } from '@/store/trip'
import { Refresh, Document } from '@element-plus/icons-vue'

const tripStore = useTripStore()

const schedule = computed(() => tripStore.schedule)

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function loadPresetRoute() {
  tripStore.loadPresetRoute('europe-free')
}
</script>

<style scoped>
.schedule-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  background: #F5F5F5;
  min-height: calc(100vh - 60px);
  overflow-y: auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.schedule-date {
  color: #666;
  margin: 8px 0;
}

.schedule-section {
  margin: 16px 0;
}

.schedule-section h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: #333;
}
</style>

