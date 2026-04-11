<template>
  <div class="budget-view">
    <el-row :gutter="20">
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>预算明细</span>
              <el-button type="primary" @click="showAddDialog = true">
                <el-icon><Plus /></el-icon>
                添加预算项
              </el-button>
            </div>
          </template>

          <el-table :data="budgetItems" style="width: 100%">
            <el-table-column prop="day" label="天数" width="80" />
            <el-table-column prop="type" label="类型" width="120">
              <template #default="{ row }">
                <el-tag :type="getTypeColor(row.type)">{{ row.type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" />
            <el-table-column prop="amount" label="金额" width="120" align="right">
              <template #default="{ row }">
                ¥{{ row.amount.toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center">
              <template #default="{ row }">
                <el-button
                  type="danger"
                  :icon="Delete"
                  circle
                  size="small"
                  @click="removeBudgetItem(row.id)"
                />
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card>
          <template #header>
            <span>预算统计</span>
          </template>

          <div class="budget-summary">
            <div class="summary-item">
              <div class="summary-label">总预算</div>
              <div class="summary-value total">¥{{ totalBudget.toFixed(2) }}</div>
            </div>

            <el-divider />

            <div class="summary-section">
              <h4>按类型统计</h4>
              <div
                v-for="(amount, type) in budgetByType"
                :key="type"
                class="summary-item"
              >
                <div class="summary-label">{{ type }}</div>
                <div class="summary-value">¥{{ amount.toFixed(2) }}</div>
              </div>
            </div>

            <el-divider />

            <div class="summary-section">
              <h4>按天数统计</h4>
              <div
                v-for="(amount, day) in budgetByDay"
                :key="day"
                class="summary-item"
              >
                <div class="summary-label">第 {{ day }} 天</div>
                <div class="summary-value">¥{{ amount.toFixed(2) }}</div>
              </div>
            </div>
          </div>

          <el-divider />

          <div class="chart-container">
            <v-chart :option="chartOption" style="height: 300px" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 添加预算项对话框 -->
    <el-dialog v-model="showAddDialog" title="添加预算项" width="500px">
      <el-form :model="newBudgetItem" label-width="80px">
        <el-form-item label="天数">
          <el-input-number v-model="newBudgetItem.day" :min="1" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="newBudgetItem.type" placeholder="选择类型">
            <el-option label="交通" value="交通" />
            <el-option label="住宿" value="住宿" />
            <el-option label="餐饮" value="餐饮" />
            <el-option label="景点" value="景点" />
            <el-option label="购物" value="购物" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="newBudgetItem.description" />
        </el-form-item>
        <el-form-item label="金额">
          <el-input-number v-model="newBudgetItem.amount" :min="0" :precision="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="addBudgetItem">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart, BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import { useTripStore } from '@/store/trip'
import type { BudgetItem } from '@/types'
import { Plus, Delete } from '@element-plus/icons-vue'

use([
  CanvasRenderer,
  PieChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

const tripStore = useTripStore()

const budgetItems = computed(() => tripStore.budgetItems)
const totalBudget = computed(() => tripStore.totalBudget)
const budgetByType = computed(() => tripStore.budgetByType)
const budgetByDay = computed(() => tripStore.budgetByDay)

const showAddDialog = ref(false)
const newBudgetItem = ref<Partial<BudgetItem>>({
  day: 1,
  type: '交通',
  description: '',
  amount: 0,
  currency: 'CNY'
})

const chartOption = computed(() => {
  const typeData = Object.entries(budgetByType.value).map(([name, value]) => ({
    name,
    value
  }))

  return {
    title: {
      text: '预算分布',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: ¥{c} ({d}%)'
    },
    series: [
      {
        name: '预算类型',
        type: 'pie',
        radius: '60%',
        data: typeData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }
})

function getTypeColor(type: string) {
  const colorMap: Record<string, string> = {
    交通: 'primary',
    住宿: 'success',
    餐饮: 'warning',
    景点: 'danger',
    购物: 'info',
    其他: ''
  }
  return colorMap[type] || ''
}

function addBudgetItem() {
  if (!newBudgetItem.value.description || !newBudgetItem.value.amount) {
    return
  }

  const item: BudgetItem = {
    id: Date.now().toString(),
    day: newBudgetItem.value.day || 1,
    type: newBudgetItem.value.type as BudgetItem['type'],
    description: newBudgetItem.value.description,
    amount: newBudgetItem.value.amount || 0,
    currency: 'CNY'
  }

  tripStore.addBudgetItem(item)
  showAddDialog.value = false

  // 重置表单
  newBudgetItem.value = {
    day: 1,
    type: '交通',
    description: '',
    amount: 0,
    currency: 'CNY'
  }
}

function removeBudgetItem(id: string) {
  tripStore.removeBudgetItem(id)
}
</script>

<style scoped>
.budget-view {
  padding: 20px;
  background: #F5F5F5;
  min-height: calc(100vh - 60px);
  overflow-y: auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.budget-summary {
  padding: 10px 0;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
}

.summary-label {
  color: #666;
}

.summary-value {
  font-weight: 600;
  color: #333;
}

.summary-value.total {
  font-size: 24px;
  color: #666;
}

.summary-section {
  margin: 16px 0;
}

.summary-section h4 {
  margin: 0 0 12px 0;
  color: #333;
}

.chart-container {
  margin-top: 20px;
}
</style>

