import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Destination, Route, DaySchedule, BudgetItem } from '@/types'
import { isFirebaseConfigured } from '@/lib/firebase'
import {
  fsDeleteBudgetItem,
  fsDeleteTrip,
  fsListBudgetItems,
  fsListTrips,
  fsSaveBudgetItem,
  fsSaveTrip
} from '@/lib/firestoreSync'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`API ${response.status}: ${text}`)
  }

  return response.json() as Promise<T>
}

export const useTripStore = defineStore('trip', () => {
  // 目的地列表
  const destinations = ref<Destination[]>([])
  
  // 当前路线
  const currentRoute = ref<Route | null>(null)
  
  // 日程安排
  const schedule = ref<DaySchedule[]>([])
  
  // 预算项目
  const budgetItems = ref<BudgetItem[]>([])
  
  // 保存的路线列表
  const savedRoutes = ref<Route[]>([])
  
  // 计算属性
  const totalBudget = computed(() => {
    return budgetItems.value.reduce((sum, item) => sum + item.amount, 0)
  })
  
  const budgetByType = computed(() => {
    const map = new Map<string, number>()
    budgetItems.value.forEach(item => {
      const current = map.get(item.type) || 0
      map.set(item.type, current + item.amount)
    })
    return Object.fromEntries(map)
  })
  
  const budgetByDay = computed(() => {
    const map = new Map<number, number>()
    budgetItems.value.forEach(item => {
      const current = map.get(item.day) || 0
      map.set(item.day, current + item.amount)
    })
    return Object.fromEntries(map)
  })
  
  /** 根据目的地列表生成「一日一城」日程，与地图规划保持同步 */
  function regenerateScheduleFromDestinations(dests: Destination[]) {
    if (!dests.length) {
      schedule.value = []
      return
    }
    const base = dests[0]?.date ? new Date(dests[0].date as string) : new Date()
    if (!dests[0]?.date) {
      base.setHours(0, 0, 0, 0)
    }
    schedule.value = dests.map((dest, index) => {
      const dayDate = dest.date
        ? new Date(dest.date as string)
        : new Date(base.getTime() + index * 86400000)
      const lines: string[] = []
      if (dest.description) lines.push(`${dest.name}：${dest.description}`)
      else lines.push(`${dest.name}游览与城市探索`)
      if (dest.highlight) lines.push(`主题：${dest.highlight}`)
      else lines.push(`品味${dest.name}当地特色`)
      return {
        day: index + 1,
        date: dayDate,
        city: dest.name,
        activities: lines,
        accommodation: `${dest.name}住宿`,
        notes: dest.description || ''
      } satisfies DaySchedule
    })
  }

  // 添加目的地
  function addDestination(destination: Destination) {
    destinations.value.push(destination)
    regenerateScheduleFromDestinations(destinations.value)
  }

  // 删除目的地
  function removeDestination(id: string) {
    const index = destinations.value.findIndex(d => d.id === id)
    if (index > -1) {
      destinations.value.splice(index, 1)
    }
    regenerateScheduleFromDestinations(destinations.value)
  }

  // 更新目的地顺序
  function updateDestinationOrder(newOrder: Destination[]) {
    destinations.value = newOrder
    regenerateScheduleFromDestinations(destinations.value)
  }

  // 更新目的地信息
  function updateDestination(destinationOrId: Destination | string, partial?: Partial<Destination>) {
    if (typeof destinationOrId === 'string') {
      const idx = destinations.value.findIndex(d => d.id === destinationOrId)
      if (idx > -1 && partial) {
        destinations.value[idx] = { ...destinations.value[idx], ...partial }
      }
    } else {
      const index = destinations.value.findIndex(d => d.id === destinationOrId.id)
      if (index !== -1) {
        destinations.value[index] = destinationOrId
      }
    }
    regenerateScheduleFromDestinations(destinations.value)
  }

  // 设置当前路线；默认根据目的地重算日程，预设路线可 skip
  function setRoute(route: Route | null, opts?: { skipScheduleRegeneration?: boolean }) {
    currentRoute.value = route
    if (opts?.skipScheduleRegeneration) return
    if (route?.destinations?.length) {
      regenerateScheduleFromDestinations(route.destinations)
    } else {
      schedule.value = []
    }
  }

  function clearPlanningState() {
    destinations.value = []
    currentRoute.value = null
    schedule.value = []
  }
  
  // 添加日程
  function addSchedule(daySchedule: DaySchedule) {
    schedule.value.push(daySchedule)
    schedule.value.sort((a, b) => a.day - b.day)
  }
  
  // 更新日程
  function updateSchedule(day: number, daySchedule: Partial<DaySchedule>) {
    const index = schedule.value.findIndex(s => s.day === day)
    if (index > -1) {
      schedule.value[index] = { ...schedule.value[index], ...daySchedule }
    } else {
      schedule.value.push({ day, ...daySchedule } as DaySchedule)
      schedule.value.sort((a, b) => a.day - b.day)
    }
  }
  
  // 添加预算项
  async function addBudgetItem(item: BudgetItem) {
    budgetItems.value.push(item)
    try {
      if (isFirebaseConfigured()) {
        await fsSaveBudgetItem(item)
      } else {
        await apiRequest('/budget', {
          method: 'POST',
          body: JSON.stringify(item)
        })
      }
    } catch (error) {
      console.warn('Failed to sync budget item:', error)
    }
  }
  
  // 删除预算项
  async function removeBudgetItem(id: string) {
    const index = budgetItems.value.findIndex(item => item.id === id)
    if (index > -1) {
      budgetItems.value.splice(index, 1)
    }
    try {
      if (isFirebaseConfigured()) {
        await fsDeleteBudgetItem(id)
      } else {
        await apiRequest(`/budget/${id}`, { method: 'DELETE' })
      }
    } catch (error) {
      console.warn('Failed to delete budget item:', error)
    }
  }
  
  // 加载预设路线
  function loadPresetRoute(routeName: string) {
    if (routeName === 'reform-opening') {
      loadReformOpeningRoute()
    }
  }
  
  // 保存路线到列表
  async function saveRouteToList(route: Route) {
    const existingIndex = savedRoutes.value.findIndex(r => r.id === route.id)
    if (existingIndex > -1) {
      savedRoutes.value[existingIndex] = route
    } else {
      savedRoutes.value.push(route)
    }
    // 保存到 localStorage
    localStorage.setItem('savedRoutes', JSON.stringify(savedRoutes.value))

    try {
      if (isFirebaseConfigured()) {
        await fsSaveTrip(route)
      } else if (existingIndex > -1) {
        await apiRequest(`/trips/${route.id}`, {
          method: 'PUT',
          body: JSON.stringify(route)
        })
      } else {
        await apiRequest('/trips', {
          method: 'POST',
          body: JSON.stringify(route)
        })
      }
    } catch (error) {
      console.warn('Failed to sync route:', error)
    }
  }
  
  // 从列表加载路线
  function loadRouteFromList(routeId: string) {
    const route = savedRoutes.value.find(r => r.id === routeId)
    if (route) {
      destinations.value = route.destinations
      currentRoute.value = route
      // 生成日程
      schedule.value = route.destinations.map((dest, index) => ({
        day: index + 1,
        date: dest.date ? new Date(dest.date) : new Date(),
        city: dest.name,
        activities: [`${dest.name} - ${dest.highlight || '旅行目的地'}`],
        accommodation: `${dest.name}酒店`,
        notes: dest.description || ''
      }))
    }
  }
  
  // 删除路线
  async function deleteRoute(routeId: string) {
    const index = savedRoutes.value.findIndex(r => r.id === routeId)
    if (index > -1) {
      savedRoutes.value.splice(index, 1)
      localStorage.setItem('savedRoutes', JSON.stringify(savedRoutes.value))
    }
    try {
      if (isFirebaseConfigured()) {
        await fsDeleteTrip(routeId)
      } else {
        await apiRequest(`/trips/${routeId}`, { method: 'DELETE' })
      }
    } catch (error) {
      console.warn('Failed to delete route:', error)
    }
  }
  
  // 初始化时加载保存的路线
  function initSavedRoutes() {
    const saved = localStorage.getItem('savedRoutes')
    if (saved) {
      try {
        savedRoutes.value = JSON.parse(saved)
      } catch (e) {
        console.error('Failed to load saved routes', e)
      }
    }

    // 再尝试从后端同步，覆盖本地旧数据
    void syncFromServer()
  }

  async function syncFromServer() {
    try {
      if (isFirebaseConfigured()) {
        const [trips, items] = await Promise.all([fsListTrips(), fsListBudgetItems()])
        if (Array.isArray(trips)) {
          savedRoutes.value = trips
          localStorage.setItem('savedRoutes', JSON.stringify(savedRoutes.value))
        }
        if (Array.isArray(items)) {
          budgetItems.value = items
        }
        return
      }

      const [tripData, budgetData] = await Promise.all([
        apiRequest<{ trips?: Route[] }>('/trips'),
        apiRequest<{ items?: BudgetItem[] }>('/budget')
      ])

      if (Array.isArray(tripData.trips)) {
        savedRoutes.value = tripData.trips
        localStorage.setItem('savedRoutes', JSON.stringify(savedRoutes.value))
      }

      if (Array.isArray(budgetData.items)) {
        budgetItems.value = budgetData.items
      }
    } catch (error) {
      console.warn('Failed to fetch initial data:', error)
    }
  }
  
  // 初始化
  initSavedRoutes()
  
  // 加载改革开放路线
  function loadReformOpeningRoute() {
    // 设置开始日期：2026年2月5日
    const startDate = new Date('2026-02-05')
    
    const reformCities: Destination[] = [
      {
        id: '1',
        name: '深圳',
        description: '中国改革开放的起点与现代化先驱',
        coordinates: [114.0579, 22.5431],
        highlight: '改革开放窗口',
        order: 1,
        date: startDate.toISOString() // 深圳：2月5日开始
      },
      {
        id: '2',
        name: '东莞',
        description: '展示中国制造业的转型升级与智能化发展',
        coordinates: [113.7518, 23.0205],
        highlight: '世界工厂到智造之都',
        order: 2,
        date: new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString() // 东莞：2月7日开始
      },
      {
        id: '3',
        name: '广州',
        description: '中国最早对外开放的城市之一，是改革开放的重要桥头堡',
        coordinates: [113.3177, 23.1155],
        highlight: '千年商都与开放前沿',
        order: 3,
        date: new Date(startDate.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString() // 广州：2月9日开始
      },
      {
        id: '4',
        name: '上海',
        description: '中国最具国际化的城市之一，展示金融改革与开放成果',
        coordinates: [121.4906, 31.2363],
        highlight: '金融开放与国际都市',
        order: 4,
        date: new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString() // 上海：2月11日开始
      },
      {
        id: '5',
        name: '苏州',
        description: '传统与现代并存的江南名城，展示开放中国的文化自信',
        coordinates: [120.6301, 31.3178],
        highlight: '文化传承与现代融合',
        order: 5,
        date: new Date(startDate.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString() // 苏州：2月13日开始
      }
    ]
    
    destinations.value = reformCities
    
    // 生成路线
    const route: Route = {
      id: 'reform-opening',
      name: '改革开放主题旅游路线',
      destinations: reformCities,
      totalDistance: 2200,
      estimatedDays: 10 // 5个城市，每个城市2天，共10天
    }
    
    setRoute(route, { skipScheduleRegeneration: true })

    // 生成详细日程安排（每个城市两天）
    schedule.value = []
    
    // 第1天：深圳
    schedule.value.push({
      day: 1,
      date: new Date(startDate.getTime() + 0 * 24 * 60 * 60 * 1000),
      city: '深圳',
      activities: [
        '深圳改革开放展览馆：展示深圳从经济特区成立到全球创新之都的发展历程',
        '前海自贸区 ：中国数字经济与现代服务业的重要代表区域',
        '平安金融中心观景层：登高俯瞰深圳夜景，感受改革开放的现代都市魅力'
      ],
      accommodation: '深圳酒店',
      notes: '中国改革开放的起点与现代化先驱，展示从渔村到国际大都市的巨大转变'
    })
    
    // 第2天：深圳
    schedule.value.push({
      day: 2,
      date: new Date(startDate.getTime() + 1 * 24 * 60 * 60 * 1000),
      city: '深圳',
      activities: [
        '深圳湾公园：欣赏现代城市与自然和谐的典范',
        '华强北电子市场：体验中国科技创新与电子产业发展',
        '华侨城创意文化园：感受深圳的文化创意产业发展'
      ],
      accommodation: '深圳酒店',
      notes: '深圳第二天行程，深入了解这座创新城市的多元面貌'
    })
    
    // 第3天：东莞
    schedule.value.push({
      day: 3,
      date: new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000),
      city: '东莞',
      activities: [
        '松山湖科技园：参观现代化制造业与科技创新基地',
        '华为欧洲小镇：了解中国高科技企业的国际化发展',
        '东莞展览馆：了解东莞从制造业基地到智能制造转型'
      ],
      accommodation: '东莞酒店',
      notes: '世界工厂到智造之都的转型典范'
    })
    
    // 第4天：东莞
    schedule.value.push({
      day: 4,
      date: new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000),
      city: '东莞',
      activities: [
        '可园：参观岭南园林代表作品',
        '虎门炮台：了解中国近现代历史',
        '东莞茶山古村落：感受传统与现代交融的岭南文化'
      ],
      accommodation: '东莞酒店',
      notes: '东莞第二天行程，体验历史文化与现代发展'
    })
    
    // 第5天：广州
    schedule.value.push({
      day: 5,
      date: new Date(startDate.getTime() + 4 * 24 * 60 * 60 * 1000),
      city: '广州',
      activities: [
        '广州塔（小蛮腰）：登高俯瞰珠江两岸风光',
        '珠江夜游：欣赏广州夜景',
        '天河CBD：体验广州现代都市发展'
      ],
      accommodation: '广州酒店',
      notes: '千年商都与开放前沿'
    })
    
    // 第6天：广州
    schedule.value.push({
      day: 6,
      date: new Date(startDate.getTime() + 5 * 24 * 60 * 60 * 1000),
      city: '广州',
      activities: [
        '陈家祠：欣赏岭南建筑艺术精华',
        '沙面岛：感受中西文化交融的历史街区',
        '广东省博物馆：了解广东的历史与文化'
      ],
      accommodation: '广州酒店',
      notes: '广州第二天行程，深入了解岭南文化'
    })
    
    // 第7天：上海
    schedule.value.push({
      day: 7,
      date: new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000),
      city: '上海',
      activities: [
        '外滩：欣赏万国建筑博览群',
        '陆家嘴金融中心：参观上海地标建筑',
        '上海博物馆：了解上海的历史与文化'
      ],
      accommodation: '上海酒店',
      notes: '金融开放与国际都市'
    })
    
    // 第8天：上海
    schedule.value.push({
      day: 8,
      date: new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000),
      city: '上海',
      activities: [
        '田子坊：体验上海石库门建筑与现代创意产业',
        '新天地：感受上海传统与现代交融的时尚街区',
        '上海迪士尼乐园：享受欢乐时光'
      ],
      accommodation: '上海酒店',
      notes: '上海第二天行程，体验城市多元文化'
    })
    
    // 第9天：苏州
    schedule.value.push({
      day: 9,
      date: new Date(startDate.getTime() + 8 * 24 * 60 * 60 * 1000),
      city: '苏州',
      activities: [
        '拙政园：参观中国古典园林代表作',
        '苏州博物馆：欣赏贝聿铭设计的现代建筑与苏州传统元素融合',
        '平江路：漫步历史文化街区'
      ],
      accommodation: '苏州酒店',
      notes: '文化传承与现代融合'
    })
    
    // 第10天：苏州
    schedule.value.push({
      day: 10,
      date: new Date(startDate.getTime() + 9 * 24 * 60 * 60 * 1000),
      city: '苏州',
      activities: [
        '狮子林：欣赏太湖石假山艺术',
        '周庄古镇：感受江南水乡风情',
        '苏州工业园区：参观苏州现代化发展成果'
      ],
      accommodation: '苏州酒店',
      notes: '苏州第二天行程，体验古典园林与现代科技融合'
    })
    

  }
  
  return {
    destinations,
    currentRoute,
    schedule,
    budgetItems,
    savedRoutes,
    totalBudget,
    budgetByType,
    budgetByDay,
    addDestination,
    removeDestination,
    updateDestination,
    updateDestinationOrder,
    setRoute,
    clearPlanningState,
    regenerateScheduleFromDestinations,
    addSchedule,
    updateSchedule,
    addBudgetItem,
    removeBudgetItem,
    loadPresetRoute,
    saveRouteToList,
    loadRouteFromList,
    deleteRoute
  }
})

