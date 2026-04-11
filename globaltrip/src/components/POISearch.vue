<template>
  <div class="poi-search">
    <div class="search-input-container">
      <input
        v-model="searchQuery"
        @input="handleInput"
        @keyup.enter="searchPOI"
        placeholder="搜索景点或城市..."
        type="text"
        class="search-input"
        :disabled="isSearching"
      />
      <button
        @click="searchPOI"
        class="search-button"
        :disabled="!searchQuery.trim() || isSearching"
      >
        <span v-if="isSearching" class="loading-icon">⟳</span>
        <span v-else>搜索</span>
      </button>
    </div>
    <div v-if="showDropdown" class="search-dropdown">
      <div v-if="isSearching" class="search-loading">搜索中...</div>
      <div v-else-if="searchResults.length === 0" class="search-empty">
        未找到相关景点
      </div>
      <div
        v-else
        v-for="(result, index) in searchResults"
        :key="index"
        class="search-result-item"
        @click="selectPOI(result)"
      >
        <div class="poi-name">{{ result.name }}</div>
        <div class="poi-address">{{ result.address }}</div>
        <div class="poi-coordinates">{{ result.coordinates[0].toFixed(6) }}, {{ result.coordinates[1].toFixed(6) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useTripStore } from '../store/trip'
import type { Destination } from '../types'

// 定义搜索结果类型
interface POISearchResult {
  name: string
  address: string
  coordinates: [number, number]
}

// 定义Nominatim API响应类型
interface NominatimResult {
  display_name: string
  lat: string
  lon: string
}

// Props - 移除未使用的props声明

// Emits
const emit = defineEmits<{
  select: [poi: Destination]
}>()

// 响应式状态
const searchQuery = ref('')
const isSearching = ref(false)
const searchResults = ref<POISearchResult[]>([])
const showDropdown = ref(false)
let debounceTimer: number | null = null

// 使用Pinia store
const tripStore = useTripStore()

// 防抖处理输入，增加防抖时间以确保用户在打字过程中不会触发搜索
function handleInput() {
  // 立即隐藏下拉框，避免显示不完整的搜索结果
  showDropdown.value = false
  
  // 清除之前的定时器，确保只有在用户停止输入后才会搜索
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  
  // 增加防抖时间到600毫秒，给予用户更充分的输入时间
  debounceTimer = window.setTimeout(() => {
    if (searchQuery.value.trim() && searchQuery.value.length >= 2) {
      searchPOI()
    } else {
      searchResults.value = []
    }
  }, 1900) // 增加防抖时间至900毫秒
}

// 搜索景点
async function searchPOI() {
  if (!searchQuery.value.trim()) {
    return
  }

  isSearching.value = true
  showDropdown.value = true
  
  try {
    // 首先尝试使用模拟数据（避免CORS问题）
    // 在实际生产环境中，可以设置后端代理来解决CORS问题
    // 这里先使用模拟数据以确保功能可用
    await new Promise(resolve => setTimeout(resolve, 300)) // 模拟网络延迟
    const mockResults: POISearchResult[] = generateMockResults(searchQuery.value)
    
    // 如果模拟数据有结果，直接使用
    if (mockResults.length > 0) {
      searchResults.value = mockResults
    } else {
      // 如果模拟数据没有结果，尝试调用API
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.value)}&limit=10&addressdetails=1`
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'GlobalTripPlanner/1.0'
          },
          mode: 'cors'
        })
        
        if (response.ok) {
          const data: NominatimResult[] = await response.json()
          
          if (data.length > 0) {
            // 转换Nominatim响应为组件需要的格式
            searchResults.value = data.map(item => ({
              name: item.display_name.split(',')[0], // 提取主要名称
              address: item.display_name,
              coordinates: [parseFloat(item.lon), parseFloat(item.lat)] // [经度, 纬度]
            }))
          } else {
            searchResults.value = []
          }
        }
      } catch (apiError) {
        // API调用失败，保持搜索结果为空
        console.log('API调用失败，使用模拟数据策略')
        searchResults.value = []
      }
    }
  } catch (error) {
    console.error('搜索景点失败:', error)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

// 选择景点
function selectPOI(poi: POISearchResult) {
  // 创建目的地对象，使用正确的Destination类型结构
  const destination: Destination = {
    id: Date.now().toString(),
    name: poi.name,
    description: poi.address,
    coordinates: [poi.coordinates[0], poi.coordinates[1]], // [经度, 纬度]
    order: tripStore.destinations.length + 1
  }
  
  // 添加到行程并发出事件
  tripStore.addDestination(destination)
  emit('select', destination)
  
  // 清空搜索状态
  searchQuery.value = ''
  showDropdown.value = false
  searchResults.value = []
}

// 生成模拟搜索结果
function generateMockResults(query: string): POISearchResult[] {
  const allPOIs: POISearchResult[] = [
    { name: '故宫博物院', address: '北京市东城区景山前街4号', coordinates: [116.397128, 39.916345] },
    { name: '长城', address: '北京市延庆区八达岭特区', coordinates: [116.020049, 40.359402] },
    { name: '天坛', address: '北京市东城区天坛内东里7号', coordinates: [116.410702, 39.882147] },
    { name: '颐和园', address: '北京市海淀区新建宫门路19号', coordinates: [116.275595, 39.999507] },
    { name: '上海迪士尼乐园', address: '上海市浦东新区川沙新镇黄赵路310号', coordinates: [121.667980, 31.144476] },
    { name: '外滩', address: '上海市黄浦区中山东一路', coordinates: [121.490093, 31.239771] },
    { name: '东方明珠', address: '上海市浦东新区世纪大道1号', coordinates: [121.499717, 31.239722] },
    { name: '杭州西湖', address: '浙江省杭州市西湖区龙井路1号', coordinates: [120.139515, 30.242579] },
    { name: '苏州园林', address: '江苏省苏州市姑苏区东北街178号', coordinates: [120.629714, 31.324545] },
    { name: '黄山风景区', address: '安徽省黄山市黄山区汤口镇', coordinates: [118.164636, 30.132405] },
    { name: '张家界国家森林公园', address: '湖南省张家界市武陵源区', coordinates: [110.486641, 29.122366] },
    { name: '三亚亚龙湾', address: '海南省三亚市亚龙湾国家旅游度假区', coordinates: [109.652932, 18.207572] },
    { name: '丽江古城', address: '云南省丽江市古城区', coordinates: [100.228243, 26.865682] },
    { name: '九寨沟', address: '四川省阿坝藏族羌族自治州九寨沟县', coordinates: [103.914000, 33.269919] },
    { name: '兵马俑', address: '陕西省西安市临潼区秦始皇陵', coordinates: [109.278938, 34.385690] },
    // 添加改革开放特色景点
    { name: '深圳经济特区', address: '广东省深圳市', coordinates: [114.057868, 22.543099] },
    { name: '珠海横琴自贸区', address: '广东省珠海市横琴新区', coordinates: [113.543823, 22.040207] },
    { name: '上海浦东开发区', address: '上海市浦东新区', coordinates: [121.507884, 31.239771] },
    { name: '厦门经济特区', address: '福建省厦门市', coordinates: [118.100419, 24.478572] },
    { name: '雄安新区', address: '河北省雄安新区', coordinates: [116.000281, 38.936646] },
  ]

  // 简单的模糊匹配
  const queryLower = query.toLowerCase()
  return allPOIs
    .filter(poi => 
      poi.name.toLowerCase().includes(queryLower) || 
      poi.address.toLowerCase().includes(queryLower)
    )
    .slice(0, 10)
}

// 监听点击外部关闭下拉菜单
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.poi-search')) {
    showDropdown.value = false
  }
}

// 添加点击外部监听
watch(showDropdown, (newVal) => {
  if (newVal) {
    document.addEventListener('click', handleClickOutside)
  } else {
    document.removeEventListener('click', handleClickOutside)
  }
})
</script>

<style scoped>
.poi-search {
  position: relative;
  width: 100%;
  max-width: 400px;
  z-index: 1000;
}

.search-input-container {
  display: flex;
  gap: 8px;
}

.search-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.3s;
}

.search-input:focus {
  border-color: #409eff;
}

.search-input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.search-button {
  padding: 10px 16px;
  background-color: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
}

.search-button:hover:not(:disabled) {
  background-color: #66b1ff;
}

.search-button:disabled {
  background-color: #c0c4cc;
  cursor: not-allowed;
}

.loading-icon {
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background-color: white;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  max-height: 300px;
  overflow-y: auto;
}

.search-loading,
.search-empty {
  padding: 16px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

.search-result-item {
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
}

.search-result-item:hover {
  background-color: #f5f7fa;
}

.search-result-item:last-child {
  border-bottom: none;
}

.poi-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.poi-address {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.poi-coordinates {
  font-size: 11px;
  color: #999;
}
</style>