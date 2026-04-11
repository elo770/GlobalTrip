<template>
  <div id="map" class="map">
    <!-- 点信息表单弹窗 -->
    <div v-if="showPointForm" class="point-form-overlay" @click.self="closePointForm">
      <div class="point-form-container">
        <div class="point-form-header">
          <h3>{{ isEditing ? '编辑点信息' : '添加点信息' }}</h3>
          <button class="close-btn" @click="closePointForm">×</button>
        </div>
        <div class="point-form-content">
          <div class="form-item">
            <label>点名称:</label>
            <input v-model="pointFormData.name" type="text" placeholder="请输入点名称" required>
          </div>
          <div class="form-item">
            <label>描述:</label>
            <textarea v-model="pointFormData.description" placeholder="请输入描述（可选）"></textarea>
          </div>
          <div class="form-item">
            <label>日期:</label>
            <input v-model="pointFormData.date" type="date" placeholder="选择日期">
          </div>
          <div class="form-item">
            <label>图片:</label>
            <div class="image-upload-container">
              <div v-if="pointFormData.image" class="image-preview-small">
                <img :src="pointFormData.image" alt="预览图片" class="preview-img-small" />
                <button class="remove-img-btn" @click.stop="removeImage">×</button>
              </div>
              <input 
                type="file" 
                accept="image/*" 
                @change="handleImageUpload" 
                class="image-upload-input"
              >
              <div class="upload-tip-small">点击上传图片（可选）</div>
            </div>
          </div>
        </div>
        <div class="point-form-footer">
          <button class="cancel-btn" @click="closePointForm">取消</button>
          <button class="save-btn" @click="savePointForm">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Map, View } from 'ol'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Style, Stroke, Circle as CircleStyle, Fill, Text } from 'ol/style'
import { Point, LineString } from 'ol/geom'
import Feature from 'ol/Feature'
import { fromLonLat, toLonLat } from 'ol/proj'
import { useTripStore } from '@/store/trip'

const tripStore = useTripStore()
let map: Map | null = null
let vectorSource: VectorSource | null = null
let vectorLayer: VectorLayer<VectorSource> | null = null
let mapClickHandler: ((coords: [number, number]) => void) | null = null
let isSelecting = false
let featureClickHandler: ((props: any) => void) | null = null
let panEnabled = false
let pointerDownHandler: ((ev: PointerEvent) => void) | null = null
let pointerUpHandler: ((ev: PointerEvent) => void) | null = null

// 表单相关状态
const showPointForm = ref(false)
const isEditing = ref(false)
const pointFormData = ref({
  name: '',
  description: '',
  coordinates: [0, 0] as [number, number],
  date: new Date().toISOString().split('T')[0], // 默认今天
  image: ''
})
let pointFormCallback: ((data: any) => void) | null = null

onMounted(() => {
  // 延迟初始化，确保容器已渲染
  setTimeout(() => {
    initMap()
    updateMap()
    // 确保地图大小正确
    setTimeout(() => {
      // 使用新的引用避免 TypeScript 警告
      const m = map
      if (m) {
        m.updateSize()
      }
    }, 100)
  }, 100)
})

function initMap() {
  vectorSource = new VectorSource()
  vectorLayer = new VectorLayer({
    source: vectorSource,
    style: (feature) => {
      const geometry = feature.getGeometry()
      if (geometry instanceof Point) {
        const order = feature.get('order')
        return new Style({
          image: new CircleStyle({
            radius: 10,
            fill: new Fill({
              color: '#999'
            }),
            stroke: new Stroke({
              color: '#FFFFFF',
              width: 2
            })
          }),
          text: new Text({
            text: order?.toString() || '',
            fill: new Fill({ color: '#FFFFFF' }),
            font: 'bold 12px sans-serif'
          })
        })
      } else if (geometry instanceof LineString) {
        return new Style({
          stroke: new Stroke({
            color: '#666',
            width: 3
          })
        })
      }
      return undefined
    }
  })

  map = new Map({
    target: 'map',
    layers: [
      new TileLayer({
        source: new OSM()
      }),
      vectorLayer
    ],
    view: new View({
      center: fromLonLat([114.057868, 22.543099]), // 默认中心：深圳
      zoom: 5,
      constrainResolution: true // 限制缩放级别为整数
    })
  })
  // 为避免 TypeScript 报错（map 可能为 null），在本作用域使用非空局部变量 m
  const m = map as Map

  // 添加地图点击事件
  m.on('click', (event) => {
    // 调试日志，确认点击与选择状态
    // eslint-disable-next-line no-console
    console.debug('[MapComponent] map click, isSelecting=', isSelecting, 'hasHandler=', !!mapClickHandler)
    if (isSelecting && mapClickHandler) {
      const coords = toLonLat(event.coordinate) as [number, number]
      mapClickHandler(coords)
    }
  })

  // 添加要素点击事件
  m.on('singleclick', (event) => {
    if (!isSelecting && featureClickHandler) {
      m.forEachFeatureAtPixel(event.pixel, (feature) => {
        const geometry = feature.getGeometry()
        if (geometry instanceof Point) {
          const coords = toLonLat(geometry.getCoordinates()) as [number, number]
          const props = {
            id: feature.get('id'),
            name: feature.get('name'),
            description: feature.get('description'),
            coordinates: coords,
            order: feature.get('order')
          }
          featureClickHandler?.(props)
        }
        return true
      })
    }
  })
}

function updateMap(keepView: boolean = true) {
  if (!vectorSource || !map) return

  // 保存当前视图状态
  const currentView = keepView ? {
    center: map.getView().getCenter(),
    zoom: map.getView().getZoom()
  } : null

  vectorSource.clear()
  const destinations = tripStore.destinations

  if (destinations.length === 0) return

  // 添加目的地标记
  const features: Feature[] = []
  const coordinates: number[][] = []

  destinations.forEach((dest) => {
    const coord = fromLonLat(dest.coordinates)
    coordinates.push(coord)

    const point = new Point(coord)
    const feature = new Feature({
      geometry: point,
      id: dest.id,
      name: dest.name,
      description: dest.description,
      date: dest.date,
      image: dest.image,
      order: dest.order
    })

    features.push(feature)
  })

  // 添加路线
  if (coordinates.length > 1) {
    const lineString = new LineString(coordinates)
    const routeFeature = new Feature({
      geometry: lineString
    })

    // 如果需要保持当前视图，恢复之前的视图状态
    if (currentView && currentView.zoom !== undefined && currentView.center) {
      map.getView().setCenter(currentView.center)
      map.getView().setZoom(currentView.zoom)
    }
    features.push(routeFeature)
  }

  vectorSource.addFeatures(features)

  // 只有在不需要保持当前视图时，才调整视图以显示所有目的地
  if (!keepView && coordinates.length > 0) {
    const extent = vectorSource.getExtent()
    if (extent && extent[0] !== Infinity) {
      map.getView().fit(extent, {
        padding: [50, 50, 50, 50],
        duration: 1000
      })
    }
  }
}

// 监听目的地变化
watch(
  () => tripStore.destinations,
  () => {
    updateMap()
  },
  { deep: true }
)

// 设置地图选择模式
function setMapSelecting(selecting: boolean) {
  isSelecting = selecting
  if (map) {
    // 添加点时显示十字光标；非选择状态下交由平移模式控制手形/抓取样式
    const viewport = map.getViewport() as HTMLElement
    viewport.style.cursor = selecting ? 'crosshair' : (panEnabled ? 'grab' : 'default')
  }
}

// 启用/禁用平移模式（手形/抓取光标）
function setPanMode(enable: boolean) {
  panEnabled = enable
  if (!map) return
  const viewport = map.getViewport()
  if (enable) {
    viewport.style.cursor = 'grab'
    // 当按下时显示 grabbing
    pointerDownHandler = () => { viewport.style.cursor = 'grabbing' }
    pointerUpHandler = () => { viewport.style.cursor = 'grab' }
    viewport.addEventListener('pointerdown', pointerDownHandler)
    viewport.addEventListener('pointerup', pointerUpHandler)
  } else {
    viewport.style.cursor = isSelecting ? 'crosshair' : 'default'
    if (pointerDownHandler) viewport.removeEventListener('pointerdown', pointerDownHandler)
    if (pointerUpHandler) viewport.removeEventListener('pointerup', pointerUpHandler)
    pointerDownHandler = null
    pointerUpHandler = null
  }
}

// 设置地图点击回调
function onMapClick(handler: (coords: [number, number]) => void) {
  mapClickHandler = handler
}

// 设置要素点击回调
function onFeatureClick(handler: (props: any) => void) {
  featureClickHandler = handler
}

// 打开点信息表单
function openPointForm(coordinates: [number, number], props: any = {}, callback: (data: any) => void) {
  pointFormData.value = {
    name: props.name || '',
    description: props.description || '',
    coordinates: coordinates,
    date: props.date ? new Date(props.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    image: props.image || ''
  }
  isEditing.value = !!props.id
  pointFormCallback = callback
  showPointForm.value = true
}

// 关闭点信息表单
function closePointForm() {
  showPointForm.value = false
  // 重置表单
  pointFormData.value = {
    name: '',
    description: '',
    coordinates: [0, 0] as [number, number],
    date: new Date().toISOString().split('T')[0],
    image: ''
  }
  isEditing.value = false
  pointFormCallback = null
}

// 保存点信息表单
function savePointForm() {
  if (!pointFormData.value.name.trim()) {
    alert('请输入点名称')
    return
  }
  
  if (pointFormCallback) {
    pointFormCallback({
      ...pointFormData.value
    })
  }
  closePointForm()
}

function handleImageUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (file) {
    // 检查文件大小（5MB）
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过5MB')
      return
    }
    
    // 使用FileReader读取图片并转换为Base64
    const reader = new FileReader()
    reader.onload = (e) => {
      pointFormData.value.image = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
  
  // 重置文件输入
  input.value = ''
}

function removeImage() {
  pointFormData.value.image = ''
}

// 地图缩放
function zoomIn() {
  if (map) {
    const view = map.getView()
    const zoom = view.getZoom()
    if (zoom !== undefined) {
      view.setZoom(zoom + 1)
    }
  }
}

function zoomOut() {
  if (map) {
    const view = map.getView()
    const zoom = view.getZoom()
    if (zoom !== undefined) {
      view.setZoom(zoom - 1)
    }
  }
}

// 适应范围
function fitBounds() {
  if (!vectorSource || !map) return
  const destinations = tripStore.destinations
  if (destinations.length === 0) return

  const coordinates: number[][] = []
  destinations.forEach((dest) => {
    const coord = fromLonLat(dest.coordinates)
    coordinates.push(coord)
  })

  if (coordinates.length > 0) {
    const extent = vectorSource.getExtent()
    if (extent && extent[0] !== Infinity) {
      map.getView().fit(extent, {
        padding: [50, 50, 50, 50],
        duration: 1000
      })
    }
  }
}

// 更新地图大小
function updateSize() {
  if (map) {
    map.updateSize()
  }
}

// 暴露方法供父组件调用
defineExpose({
  updateMap,
  setMapSelecting,
  onMapClick,
  onFeatureClick,
  openPointForm,
  setPanMode,
  zoomIn,
  zoomOut,
  fitBounds,
  updateSize
})
</script>

<style scoped>
.map {
  width: 100%;
  height: 100%;
  min-height: 400px;
  position: relative;
}

.point-form-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.point-form-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  width: 80%;
  max-width: 320px;
  overflow: hidden;
}

.point-form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #e0e0e0;
}

.point-form-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #666;
}

.point-form-content {
  padding: 12px;
}

.form-item {
  margin-bottom: 12px;
}

.form-item label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.form-item input,
.form-item textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-item input[type="date"] {
  height: 36px;
}

.image-upload-container {
  margin-top: 5px;
}

.image-preview-small {
  width: 150px;
  height: 100px;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  margin-bottom: 10px;
}

.preview-img-small {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-img-btn {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-upload-input {
  margin-bottom: 5px;
}

.upload-tip-small {
  font-size: 12px;
  color: #666;
}

.form-item textarea {
  min-height: 80px;
  resize: vertical;
}

.point-form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid #e0e0e0;
  background-color: #f8f9fa;
}

.cancel-btn,
.save-btn {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  border: none;
  transition: all 0.3s;
}

.cancel-btn {
  background-color: #fff;
  color: #666;
  border: 1px solid #d0d0d0;
}

.cancel-btn:hover {
  background-color: #f5f5f5;
}

.save-btn {
  background-color: #409eff;
  color: white;
}

.save-btn:hover {
  background-color: #66b1ff;
}
</style>

