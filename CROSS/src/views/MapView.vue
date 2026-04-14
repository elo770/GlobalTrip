<template>
  <div class="map-view">
    <!-- 顶部工具栏 -->
    <div class="top-toolbar">
      <div class="search-container">
        <POISearch :resolve-map-center="resolveMapCenterForPOI" @select="handlePOISelect" />
      </div>
      <div class="toolbar-item" :class="{ active: isAddingPoint }" @click="toggleAddPointMode" title="添加点">
        <el-icon><Location /></el-icon>
        <span>添加点</span>
      </div>
      <div class="toolbar-item" @click="panMode" title="平移地图">
        <span class="icon-text">⇄</span>
        <span>平移</span>
      </div>
      <div class="toolbar-item" @click="zoomIn" title="放大">
        <el-icon><Plus /></el-icon>
        <span>放大</span>
      </div>
      <div class="toolbar-item" @click="zoomOut" title="缩小">
        <span class="icon-text">−</span>
        <span>缩小</span>
      </div>
      <div class="toolbar-item" @click="fitBounds" title="适应范围" :disabled="destinations.length === 0">
        <span class="icon-text">⊞</span>
        <span>适应</span>
      </div>
    </div>
    <div class="map-container">
      <MapComponent ref="mapRef" />
    </div>
    <div ref="sidebarRef" class="sidebar">
      <div class="sidebar-content">
        <div class="header">
          <div class="card-header">
            <span>路线规划</span>
            <div class="header-buttons">
              <el-checkbox v-model="showRouteLine" size="small" class="route-line-toggle">
                显示连线
              </el-checkbox>
              <el-button type="primary" size="small" @click="loadPresetRoute">
                <el-icon><Star /></el-icon>
                加载示例：欧洲自由行
              </el-button>
            </div>
          </div>
          <div v-if="dayLegend.length > 0" class="day-legend">
            <div
              v-for="item in dayLegend"
              :key="item.day"
              class="day-legend-item"
              :class="{ active: selectedDay === item.day }"
              @click="handleLegendClick(item.day)"
            >
              <span class="day-legend-dot" :style="{ backgroundColor: item.color }" />
              <span class="day-legend-text">Day {{ item.day }}</span>
            </div>
          </div>
        </div>
        <div class="action-buttons">
          <el-button type="warning" size="small" @click="clearRoute" :disabled="destinations.length === 0">
            <el-icon><Delete /></el-icon>
            清空路线
          </el-button>
          <el-button type="info" size="small" @click="saveRoute" :disabled="destinations.length === 0">
            <el-icon><Document /></el-icon>
            保存路线
          </el-button>
        </div>
        <el-divider />
        <div class="destination-list">
          <el-empty v-if="destinations.length === 0" description="暂无目的地" />
          <div v-else>
            <div
              v-for="(dest, index) in destinations"
              :key="dest.id"
              class="destination-item"
              :class="{ 'reorder-mode': isReorderMode, dragging: draggingId === dest.id }"
              :draggable="isReorderMode"
              @dragstart="onDragStart($event, dest.id)"
              @dragover.prevent="onDragOver(dest.id)"
              @drop.prevent="onDrop(dest.id)"
              @pointerdown="onLongPressStart(dest.id)"
              @pointerup="onLongPressEnd"
              @pointercancel="onLongPressEnd"
              @pointerleave="onLongPressEnd"
              @click="focusDestination(dest)"
            >
              <div
                class="destination-order"
                :style="{ backgroundColor: MORANDI_PALETTE[((dayById.get(dest.id) || 1) - 1) % MORANDI_PALETTE.length] }"
              >
                {{ index + 1 }}
              </div>
              <div class="destination-info">
                <div class="destination-name">{{ dest.name }}</div>
                <div class="destination-day-tag">Day {{ dayById.get(dest.id) || 1 }}</div>
                <div v-if="dest.date" class="destination-date">
                  <el-icon><Calendar /></el-icon>
                  {{ dest.date }}
                </div>
                <div v-if="dest.description" class="destination-desc">{{ dest.description }}</div>
                <div v-if="dest.image" class="destination-image-preview">
                  <img :src="dest.image" alt="目的地图片" class="preview-image" />
                </div>
              </div>
              <div class="destination-actions">
                <el-button
                  type="info"
                  size="small"
                  :disabled="index === 0"
                  @click.stop="moveDestination(index, 'up')"
                >
                  ↑
                </el-button>
                <el-button
                  type="info"
                  size="small"
                  :disabled="index === destinations.length - 1"
                  @click.stop="moveDestination(index, 'down')"
                >
                  ↓
                </el-button>
                <el-button
                  type="primary"
                  :icon="Edit"
                  circle
                  size="small"
                  @click.stop="editDestination(dest)"
                />
                <el-button
                  type="danger"
                  :icon="Delete"
                  circle
                  size="small"
                  @click.stop="removeDestination(dest.id)"
                />
              </div>
            </div>
          </div>
        </div>
        <el-divider />
        <div class="route-info" v-if="destinations.length > 0">
          <h3>{{ currentRoute?.name || '我的旅行路线' }}</h3>
          <p>目的地数量: {{ destinations.length }} 个</p>
          <p v-if="currentRoute">总距离: {{ currentRoute.totalDistance.toFixed(2) }} 公里</p>
          <p>预计天数: {{ Math.max(destinations.length, 1) }} 天</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useTripStore } from '@/store/trip'
// @ts-ignore
import { ElMessage, ElMessageBox } from 'element-plus'
import MapComponent from '@/components/MapComponent.vue'
import POISearch from '@/components/POISearch.vue'
import type { Destination } from '@/types'
import { Star, Delete, Plus, Document, Location, Calendar, Edit } from '@element-plus/icons-vue'

const tripStore = useTripStore()
const mapRef = ref<InstanceType<typeof MapComponent>>()
const mapCenter = ref<[number, number] | null>(null)
const sidebarRef = ref<HTMLElement | null>(null)
let autoFitFrame = 0
const showRouteLine = ref(true)

// 萌萌马卡龙（与地图点位配色保持一致）
const MORANDI_PALETTE = [
  '#7B93C8',
  '#43C0DA',
  '#A6D9E8',
  '#5FA07F',
  '#A7CB86',
  '#D7E7C6',
  '#FFF1A6',
  '#FFC6AD',
  '#F3A280',
  '#F46F4F'
]

function getSidebarLeftPaddingPx() {
  // sidebar 实际宽度 + 左侧外边距/留白，再加一点缓冲，避免路线/点被挡住
  const sidebarWidth = sidebarRef.value?.getBoundingClientRect().width ?? 380
  return Math.round(sidebarWidth + 80)
}

function fitBoundsAvoidSidebar() {
  const map = mapRef.value
  if (!map || destinations.value.length === 0) return
  map.updateSize()
  // 确保源数据已写入（某些进入时序下，地图刚 ready 但还没 setData）
  map.updateMap(true)
  map.fitBounds({
    padding: { top: 50, right: 60, bottom: 50, left: getSidebarLeftPaddingPx() }
  })
}

function cancelAutoFitFrame() {
  if (!autoFitFrame) return
  cancelAnimationFrame(autoFitFrame)
  autoFitFrame = 0
}

function scheduleAutoFit() {
  const map = mapRef.value
  if (!map || destinations.value.length === 0) return
  map.onReady?.(() => {
    nextTick(() => {
      cancelAutoFitFrame()
      autoFitFrame = requestAnimationFrame(() => {
        autoFitFrame = requestAnimationFrame(() => {
          autoFitFrame = 0
          if (destinations.value.length === 0) return
          fitBoundsAvoidSidebar()
        })
      })
    })
  })
}

function focusDestination(dest: Destination) {
  const map = mapRef.value
  if (!map) return
  selectedDay.value = dayById.value.get(dest.id) ?? null
  map.setHighlightedDay?.(selectedDay.value)
  const [lng, lat] = dest.coordinates
  // 通过 offset 让点尽量落在屏幕中间偏右，避开左侧路线栏
  map.flyToLocation(lng, lat, { offset: [Math.round(getSidebarLeftPaddingPx() / 2), 0] })
}

/** POI 搜索：优先用地图实例的实时中心，其次为 moveend 同步值，最后默认北京 */
function resolveMapCenterForPOI(): [number, number] {
  return mapRef.value?.getMapCenter() ?? mapCenter.value ?? [116.39, 39.9]
}

const destinations = computed(() => tripStore.destinations)
const currentRoute = computed(() => tripStore.currentRoute)

const selectedDay = ref<number | null>(null)
const isReorderMode = ref(false)
const draggingId = ref<string | null>(null)
const dragOverId = ref<string | null>(null)
let longPressTimer: number | null = null

function onLongPressStart(id: string) {
  if (longPressTimer) window.clearTimeout(longPressTimer)
  longPressTimer = window.setTimeout(() => {
    isReorderMode.value = true
    draggingId.value = id
  }, 420)
}

function onLongPressEnd() {
  if (longPressTimer) {
    window.clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

function onDragStart(e: DragEvent, id: string) {
  if (!isReorderMode.value) {
    e.preventDefault()
    return
  }
  draggingId.value = id
  e.dataTransfer?.setData('text/plain', id)
  e.dataTransfer?.setDragImage?.((e.currentTarget as HTMLElement) ?? new Image(), 10, 10)
}

function onDragOver(id: string) {
  if (!isReorderMode.value) return
  dragOverId.value = id
}

function onDrop(targetId: string) {
  if (!isReorderMode.value || !draggingId.value) return
  const fromId = draggingId.value
  draggingId.value = null
  dragOverId.value = null

  const dests = [...tripStore.destinations]
  const fromIndex = dests.findIndex((d) => d.id === fromId)
  const toIndex = dests.findIndex((d) => d.id === targetId)
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    isReorderMode.value = false
    return
  }
  const [moved] = dests.splice(fromIndex, 1)
  dests.splice(toIndex, 0, moved)
  // 更新全局顺序
  dests.forEach((d, i) => {
    d.order = i + 1
  })
  tripStore.updateDestinationOrder(dests)
  // 更新路线
  const route = {
    id: currentRoute.value?.id || 'custom-route',
    name: currentRoute.value?.name || '我的旅行路线',
    destinations: tripStore.destinations,
    totalDistance: 0,
    estimatedDays: tripStore.destinations.length
  }
  tripStore.setRoute(route)
  mapRef.value?.updateMap(true)
  isReorderMode.value = false
}

function dateKeyFromDestDate(date: unknown) {
  if (!date) return ''
  if (date instanceof Date) return date.toISOString().slice(0, 10)
  const s = String(date)
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  return m?.[1] ?? ''
}

const dayById = computed(() => {
  const dests = [...destinations.value].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const dayIndexByKey = new Map<string, number>()
  let autoDay = 0
  const map = new Map<string, number>()
  for (const dest of dests) {
    const key = dateKeyFromDestDate(dest.date)
    if (!key) {
      autoDay += 1
      map.set(dest.id, autoDay)
      continue
    }
    let idx = dayIndexByKey.get(key)
    if (!idx) {
      idx = dayIndexByKey.size + 1
      dayIndexByKey.set(key, idx)
    }
    map.set(dest.id, idx)
  }
  return map
})

const dayLegend = computed(() => {
  const days = Array.from(
    new Set(Array.from(dayById.value.values()).filter((n) => Number.isFinite(n) && n > 0))
  ).sort((a, b) => a - b)
  return days.slice(0, 12).map((day) => ({
    day,
    color: MORANDI_PALETTE[(day - 1) % MORANDI_PALETTE.length]
  }))
})

function handleLegendClick(day: number) {
  const map = mapRef.value
  if (!map) return

  selectedDay.value = selectedDay.value === day ? null : day
  map.setHighlightedDay?.(selectedDay.value)

  if (selectedDay.value == null) {
    scheduleAutoFit()
    return
  }

  const points = destinations.value.filter((d) => dayById.value.get(d.id) === selectedDay.value)
  if (points.length === 0) return

  if (points.length === 1) {
    const [lng, lat] = points[0].coordinates
    map.flyToLocation(lng, lat, { offset: [Math.round(getSidebarLeftPaddingPx() / 2), 0], zoom: 14 })
    return
  }

  map.fitBounds({
    padding: { top: 50, right: 60, bottom: 50, left: getSidebarLeftPaddingPx() },
    duration: 900
  })
}

// 添加点模式状态
const isAddingPoint = ref(false)

// 进入地图页/切换路线时，目的地数据可能晚于地图初始化写入；
// 当目的地从 0 -> 有数据时，自动刷新并把路线放到可视区域（避开左侧栏）。
watch(
  () => ({
    routeId: currentRoute.value?.id ?? '',
    points: destinations.value.map((dest) => `${dest.id}:${dest.order}:${dest.coordinates.join(',')}`).join('|')
  }),
  () => {
    if (destinations.value.length > 0) {
      scheduleAutoFit()
    } else {
      cancelAutoFitFrame()
    }
  },
  { flush: 'post' }
)

watch(
  showRouteLine,
  (visible) => {
    mapRef.value?.setRouteLineVisible?.(visible)
  },
  { immediate: true }
)

function loadPresetRoute() {
  // 默认加载“欧洲自由行”示例
  tripStore.loadPresetRoute('europe-free')
  if (mapRef.value) {
    mapRef.value.updateMap(false)
    // 自动把路线放到画面里，并避开左侧挡板
    scheduleAutoFit()
  }
  ElMessage.success('已加载示例：欧洲自由行')
}

function clearRoute() {
  ElMessageBox.confirm('确定要清空所有目的地吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    tripStore.clearPlanningState()
    if (mapRef.value) {
      mapRef.value.updateMap()
    }
    ElMessage.success('已清空路线')
  }).catch(() => {})
}

function saveRoute() {
  if (destinations.value.length === 0) {
    ElMessage.warning('请先添加目的地')
    return
  }
  
  ElMessageBox.prompt('请输入路线名称', '保存路线', {
    confirmButtonText: '保存',
    cancelButtonText: '取消',
    inputValue: currentRoute.value?.name || `我的旅行路线_${new Date().toLocaleDateString()}`,
    inputValidator: (value: string) => {
      if (!value || value.trim() === '') {
        return '路线名称不能为空'
      }
      return true
    }
  }).then(({ value }: { value: string }) => {
    const route = {
      id: currentRoute.value?.id || Date.now().toString(),
      name: value,
      destinations: destinations.value,
      totalDistance: 0,
      estimatedDays: destinations.value.length
    }
    
    tripStore.setRoute(route)
    tripStore.saveRouteToList(route)
    ElMessage.success('路线已保存')
  }).catch(() => {})
}



function removeDestination(id: string) {
  tripStore.removeDestination(id)
  
  // 更新顺序
  tripStore.destinations.forEach((dest, index) => {
    dest.order = index + 1
  })
  
  // 更新路线
  if (tripStore.destinations.length > 0) {
    const route = {
      id: 'custom-route',
      name: '我的旅行路线',
      destinations: tripStore.destinations,
      totalDistance: 0,
      estimatedDays: tripStore.destinations.length
    }
    tripStore.setRoute(route)
  } else {
    tripStore.currentRoute = null
  }

  if (mapRef.value) {
    mapRef.value.updateMap()
    if (tripStore.destinations.length > 0) {
      scheduleAutoFit()
    }
  }
  ElMessage.success('目的地已删除')
}

function editDestination(dest: Destination) {
  const map = mapRef.value
  if (!map) return

  const formProps = {
    id: dest.id,
    name: dest.name,
    description: dest.description,
    image: dest.image,
    order: dest.order,
    date:
      dest.date === undefined
        ? undefined
        : dest.date instanceof Date
          ? dest.date.toISOString().split('T')[0]
          : String(dest.date)
  }

  map.openPointForm(dest.coordinates, formProps, (data: any) => {
    tripStore.updateDestination(dest.id, {
      name: data.name,
      description: data.description,
      coordinates: data.coordinates,
      date: data.date,
      image: data.image
    })
    map.updateMap(true)
    ;(ElMessage as any)({ type: 'success', message: '点信息已更新', duration: 1200 })
  })
}

function moveDestination(index: number, direction: 'up' | 'down') {
  const dests = [...tripStore.destinations]
  if (direction === 'up' && index > 0) {
    [dests[index - 1], dests[index]] = [dests[index], dests[index - 1]]
  } else if (direction === 'down' && index < dests.length - 1) {
    [dests[index], dests[index + 1]] = [dests[index + 1], dests[index]]
  }
  
  // 更新顺序
  dests.forEach((dest, i) => {
    dest.order = i + 1
  })
  
  tripStore.updateDestinationOrder(dests)
  
  // 更新路线
  const route = {
    id: 'custom-route',
    name: '我的旅行路线',
    destinations: tripStore.destinations,
    totalDistance: 0,
    estimatedDays: tripStore.destinations.length
  }
  tripStore.setRoute(route)

  if (mapRef.value) {
    mapRef.value.updateMap()
  }
}



function toggleAddPointMode() {
  isAddingPoint.value = !isAddingPoint.value
  if (mapRef.value) {
    mapRef.value.setMapSelecting(isAddingPoint.value)
    // 进入添加点模式时禁用平移手形
    mapRef.value.setPanMode(false)
    if (isAddingPoint.value) {
      mapRef.value.onMapClick((coords: [number, number]) => {
        // 点击地图后直接在地图上弹出表单
        mapRef.value?.openPointForm(coords, {}, (data: any) => {
          // 添加目的地
          const destination: Destination = {
            id: Date.now().toString(),
            name: data.name || '未命名目的地',
            description: data.description || '',
            coordinates: data.coordinates,
            date: data.date || new Date().toISOString(),
            image: data.image || undefined,
            order: destinations.value.length + 1
          }

          tripStore.addDestination(destination)
          
          // 更新路线
          const route = {
            id: 'custom-route',
            name: '我的旅行路线',
            destinations: tripStore.destinations,
            totalDistance: 0,
            estimatedDays: tripStore.destinations.length
          }
          tripStore.setRoute(route)

          if (mapRef.value) {
            mapRef.value.updateMap()
          }

          ElMessage.success('点已添加')

          // 重置选择状态
          isAddingPoint.value = false
          const map = mapRef.value
          if (map) {
            map.setMapSelecting(false)
          }
        })
      })
      ElMessage.info('点击地图添加点')
    } else {
      const map = mapRef.value
      if (map) {
        map.setMapSelecting(false)
        // 退出添加点后恢复平移（手形）为默认关闭
        map.setPanMode(false)
      }
    }
  }
}

function panMode() {
  isAddingPoint.value = false
  const map = mapRef.value
  if (map) {
    map.setMapSelecting(false)
    // 启用平移手形光标
    map.setPanMode(true)
  }
  ElMessage.info('地图平移模式')
}

function zoomIn() {
  if (mapRef.value) {
    mapRef.value.zoomIn()
  }
}

function zoomOut() {
  if (mapRef.value) {
    mapRef.value.zoomOut()
  }
}

function fitBounds() {
  if (!mapRef.value || destinations.value.length === 0) return
  // 点击“适应”应当强制生效：先停掉任何自动 fit / 高亮，再直接 fit
  cancelAutoFitFrame()
  selectedDay.value = null
  mapRef.value.setHighlightedDay?.(null)
  fitBoundsAvoidSidebar()
}

// 处理POI选择
function handlePOISelect(destination: Destination) {
  // 目的地已经由POISearch组件创建并添加到store中
  // 这里只需要更新路线信息和地图显示
  
  // 更新路线
  const route = {
    id: currentRoute.value?.id || 'custom-route',
    name: currentRoute.value?.name || '我的旅行路线',
    destinations: tripStore.destinations,
    totalDistance: 0,
    estimatedDays: tripStore.destinations.length
  }
  tripStore.setRoute(route)
  
  // 确保地图更新显示新的目的地，并飞向新点
  const map = mapRef.value
  if (map) {
    map.updateMap()
    const [lng, lat] = destination.coordinates
    map.flyToLocation(lng, lat, { offset: [Math.round(getSidebarLeftPaddingPx() / 2), 0] })
  }

  ElMessage.success(`已添加目的地：${destination.name}`)
}

onMounted(() => {
  // 确保地图正确初始化
  nextTick(() => {
    const map = mapRef.value
    if (!map) return
        map.onViewChange((center: [number, number]) => {
          mapCenter.value = center
        })
        map.updateSize()
        map.updateMap(destinations.value.length === 0)
        // 进入页面时如果已经有路线/点，自动加载并居中（避开左侧栏）
    map.onReady?.(() => {
      map.updateSize()
      map.updateMap(destinations.value.length === 0)
      map.setRouteLineVisible?.(showRouteLine.value)
      if (destinations.value.length > 0) {
        scheduleAutoFit()
      }
    })
        // 注册点击已有要素（点）以弹出编辑表单
        map.onFeatureClick((props: any) => {
          if (!props || !props.id) return
          // props.coordinates 是 lon/lat
          // 点击点先居中（避开左侧栏），再弹窗编辑
          map.flyToLocation(props.coordinates[0], props.coordinates[1], {
            offset: [Math.round(getSidebarLeftPaddingPx() / 2), 0],
            zoom: 14
          })
          map.openPointForm(props.coordinates, props, (data: any) => {
            // 将编辑结果更新到 store
            tripStore.updateDestination(props.id, {
              name: data.name,
              description: data.description,
              coordinates: data.coordinates,
              date: data.date,
              image: data.image
            })
            // 刷新地图并保持当前视图
            map.updateMap(true)
            ;(ElMessage as any)({ type: 'success', message: '点信息已更新', duration: 1200 })
          })
        })
  })
})

onBeforeUnmount(() => {
  cancelAutoFitFrame()
})
</script>

<style scoped>
.map-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  position: relative;
  background: #F5F5F5;
  overflow: hidden;
}

.top-toolbar {
  position: absolute;
  top: 20px;
  right: 220px; /* 距离右侧520px，进一步右移以避免挡住路线规划框 */
  transform: none; /* 移除居中转换 */
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  padding: 8px 20px;
  z-index: 100;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.search-container {
  flex: 1;
  min-width: 300px;
  max-width: 400px;
}

.toolbar-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 4px;
  color: #666;
  transition: all 0.2s;
  font-size: 14px;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.7);
}

.icon-text {
  font-size: 16px;
  font-weight: bold;
  line-height: 1;
}

.toolbar-item:hover {
  background: #F0F0F0;
  color: #333;
  border-color: #E0E0E0;
}

.toolbar-item.active {
  background: #E8E8E8;
  color: #333;
  border-color: #D0D0D0;
}

.toolbar-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.map-content-wrapper {
  flex: 1;
  position: relative;
  min-height: 0;
  overflow: hidden;
}

.map-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
}

.sidebar {
  position: absolute;
  top: 0;
  left: 40px; /* 增加左边距，避免遮挡地图控件 */
  width: 410px;
  z-index: 2;
  border-radius: 8px;
  background: #FFFFFF;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  max-height: calc(100vh - 120px); /* 让侧边栏“长一点点” */
  margin: 20px;
  display: flex;
  flex-direction: column;
}

.sidebar-content {
  flex: 1;
  background: #FFFFFF;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.header {
  padding-bottom: 12px;
  border-bottom: 1px solid #E0E0E0;
}

.day-legend {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 10px;
}

.day-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid #EAEAEA;
  border-radius: 999px;
  background: #FAFAFA;
  cursor: pointer;
  user-select: none;
}

.day-legend-item.active {
  border-color: #D0D0D0;
  background: #F2F2F2;
}

.day-legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid #FFFFFF;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}

.day-legend-text {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header span {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.header-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.route-line-toggle {
  margin-right: 6px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.destination-list {
  flex: 1;
  min-height: 400px;
  overflow-y: auto;
}

.destination-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  margin-bottom: 12px;
  background: #FFFFFF;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #E0E0E0;
}

.destination-item.reorder-mode {
  cursor: grab;
  border-style: dashed;
}

.destination-item.reorder-mode.dragging {
  opacity: 0.65;
}

.destination-order {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #E0E0E0;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
}

.destination-info {
  flex: 1;
}

.destination-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.coordinate-hint {
  margin-top: 8px;
  display: flex;
  gap: 12px;
}

.image-uploader {
  width: 100%;
}

.image-uploader :deep(.el-upload) {
  border: 1px dashed #D0D0D0;
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s;
  width: 100%;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FAFAFA;
}

.image-uploader :deep(.el-upload:hover) {
  border-color: #999;
}

.image-uploader-icon {
  font-size: 24px;
  color: #999;
}

.uploaded-image {
  width: 100%;
  height: 120px;
  object-fit: cover;
  display: block;
}

.image-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #999;
  text-align: center;
}

.destination-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
  color: #333;
}

.destination-day-tag {
  display: inline-block;
  margin-bottom: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #F5F5F5;
  border: 1px solid #E6E6E6;
  font-size: 12px;
  color: #666;
}

.destination-desc {
  font-size: 12px;
  color: #606266;
  line-height: 1.5;
  margin-top: 4px;
}

.destination-image-preview {
  margin-top: 8px;
  border-radius: 4px;
  overflow: hidden;
  max-width: 200px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.preview-image {
  width: 100%;
  height: 100px;
  object-fit: cover;
  border-radius: 4px;
  display: block;
}


.destination-date {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #666;
  margin: 4px 0;
}

.destination-image-preview {
  margin-top: 8px;
  border-radius: 4px;
  overflow: hidden;
  max-width: 200px;
}

.destination-image-preview img {
  width: 100%;
  height: auto;
  max-height: 100px;
  object-fit: cover;
  display: block;
}

.route-info {
  margin-top: 12px;
  padding: 12px;
  background: #F5F5F5;
  border-radius: 6px;
  border: 1px solid #E0E0E0;
  font-size: 14px;
}

.route-info h3 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 15px;
}

.route-info p {
  margin: 4px 0;
  color: #666;
}
</style>

