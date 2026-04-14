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
    if (routeName === 'europe-free') return loadEuropeFreeRoute()
    if (routeName === 'jiangzhehu') return loadJiangZheHuRoute()
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
      // localStorage / 后端回来的数据可能存在坐标为 string 的情况，这会导致地图要素不渲染
      destinations.value = (route.destinations || [])
        .map((d, idx) => {
          const anyD = d as any
          const c0 = anyD?.coordinates?.[0]
          const c1 = anyD?.coordinates?.[1]
          const rawLng = c0 ?? anyD?.lng ?? anyD?.longitude
          const rawLat = c1 ?? anyD?.lat ?? anyD?.latitude
          let lng = Number(rawLng)
          let lat = Number(rawLat)

          // 兼容部分数据把 [lat, lng] 存进 coordinates 的情况
          if (Number.isFinite(lng) && Number.isFinite(lat)) {
            const looksLikeLatLng =
              Math.abs(lng) <= 90 && Math.abs(lat) > 90 && Math.abs(lat) <= 180
            if (looksLikeLatLng) {
              const tmp = lng
              lng = lat
              lat = tmp
            }
          }
          return {
            ...d,
            coordinates: [lng, lat] as [number, number],
            order: typeof d.order === 'number' ? d.order : idx + 1
          }
        })
        .filter((d) => Number.isFinite(d.coordinates[0]) && Number.isFinite(d.coordinates[1]))
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
  
  function loadEuropeFreeRoute() {
    const startDate = new Date('2026-06-01')

    const plan = [
      { id: 'e1', day: 1, within: 1, title: '抵达巴黎，酒店入住', location: '巴黎市区', lat: 48.8566, lng: 2.3522, description: '戴高乐机场接机，入住酒店' },
      { id: 'e2', day: 1, within: 2, title: '埃菲尔铁塔 & 战神广场', location: '战神广场', lat: 48.8584, lng: 2.2945, description: '登塔看巴黎全景，草坪野餐' },
      { id: 'e3', day: 1, within: 3, title: '塞纳河游船晚餐', location: '塞纳河', lat: 48.86, lng: 2.35, description: '夜游船+法式晚餐' },
      { id: 'e4', day: 2, within: 1, title: '卢浮宫', location: '巴黎1区', lat: 48.8606, lng: 2.3376, description: '参观蒙娜丽莎、维纳斯（3-4小时）' },
      { id: 'e5', day: 2, within: 2, title: '杜乐丽花园 & 协和广场', location: '卢浮宫旁', lat: 48.8639, lng: 2.3268, description: '花园散步，摩天轮' },
      { id: 'e6', day: 2, within: 3, title: '香榭丽舍大街 & 凯旋门', location: '巴黎8区', lat: 48.8738, lng: 2.295, description: '逛街，登凯旋门' },
      { id: 'e7', day: 3, within: 1, title: '巴黎 → 日内瓦（火车）', location: '巴黎里昂车站', lat: 48.844, lng: 2.373, description: 'TGV 3小时10分' },
      { id: 'e8', day: 3, within: 2, title: '日内瓦湖 & 大喷泉', location: '日内瓦', lat: 46.2044, lng: 6.1432, description: '湖边漫步，坐游船' },
      { id: 'e9', day: 3, within: 3, title: '联合国万国宫（外观）', location: '日内瓦', lat: 46.2264, lng: 6.1404, description: '断脚椅，拍照' },
      { id: 'e10', day: 3, within: 4, title: '火车前往因特拉肯', location: '日内瓦车站', lat: 46.2044, lng: 6.1432, description: '约2.5小时，入住因特拉肯' },
      { id: 'e11', day: 4, within: 1, title: '少女峰一日游', location: '因特拉肯', lat: 46.6863, lng: 7.8631, description: '齿轮小火车上少女峰（往返4小时）' },
      { id: 'e12', day: 4, within: 2, title: '因特拉肯小镇漫步', location: '因特拉肯', lat: 46.6863, lng: 7.8631, description: '何维克街，草地，滑翔伞' },
      { id: 'e13', day: 5, within: 1, title: '因特拉肯 → 佛罗伦萨', location: '因特拉肯东站', lat: 46.6863, lng: 7.8631, description: '火车约5小时（经Spiez-Milano）' },
      { id: 'e14', day: 5, within: 2, title: '米开朗基罗广场', location: '佛罗伦萨', lat: 43.7627, lng: 11.2649, description: '俯瞰全城，看日落' },
      { id: 'e15', day: 5, within: 3, title: '佛罗伦萨老桥', location: '阿诺河', lat: 43.768, lng: 11.2531, description: '夜景，金银首饰店' },
      { id: 'e16', day: 6, within: 1, title: '圣母百花大教堂', location: '佛罗伦萨', lat: 43.7731, lng: 11.2566, description: '穹顶登顶，乔托钟楼' },
      { id: 'e17', day: 6, within: 2, title: '乌菲兹美术馆', location: '佛罗伦萨', lat: 43.7688, lng: 11.2555, description: '波提切利《春》《维纳斯诞生》' },
      { id: 'e18', day: 6, within: 3, title: '领主广场 & 大卫复制品', location: '佛罗伦萨', lat: 43.7696, lng: 11.2558, description: '佣兵凉廊，喝咖啡' },
      { id: 'e19', day: 6, within: 4, title: '佛罗伦萨 → 罗马（火车）', location: '佛罗伦萨车站', lat: 43.7696, lng: 11.2558, description: '意铁1.5小时' },
      { id: 'e20', day: 7, within: 1, title: '罗马斗兽场 & 古罗马广场', location: '罗马', lat: 41.8902, lng: 12.4922, description: '上午斗兽场，下午古罗马遗迹' },
      { id: 'e21', day: 7, within: 2, title: '特雷维喷泉（许愿池）', location: '罗马', lat: 41.9009, lng: 12.4833, description: '投硬币许愿' },
      { id: 'e22', day: 7, within: 3, title: '西班牙广场 & 破船喷泉', location: '罗马', lat: 41.9057, lng: 12.4827, description: '西班牙阶梯，购物' },
      { id: 'e23', day: 7, within: 4, title: '返程前往机场', location: '罗马FCO', lat: 41.8003, lng: 12.2389, description: '傍晚航班' }
    ]

    const europe: Destination[] = plan
      .slice()
      .sort((a, b) => (a.day - b.day) || (a.within - b.within))
      .map((p, idx) => ({
        id: p.id,
        name: p.location,
        description: `${p.title}｜${p.description}`,
        coordinates: [p.lng, p.lat],
        highlight: p.title,
        order: idx + 1, // 全局顺序，用于路线连线
        day: p.day,
        withinDayOrder: p.within,
        date: new Date(startDate.getTime() + (p.day - 1) * 86400000).toISOString()
      }))

    destinations.value = europe

    const route: Route = {
      id: 'euro_2026_03',
      name: '欧洲轻松自由行（7天·示例）',
      destinations: europe,
      totalDistance: 0,
      estimatedDays: 7
    }

    budgetItems.value = [
      { id: 'b1', day: 1, type: '交通', amount: 6200, currency: 'CNY', description: '国内往返欧洲机票（经济舱）' },
      { id: 'b2', day: 1, type: '交通', amount: 1200, currency: 'CNY', description: '欧铁通票（3天，法瑞意）' },
      { id: 'b3', day: 1, type: '交通', amount: 500, currency: 'CNY', description: '市内交通（地铁、公交、船票）' },
      { id: 'b4', day: 1, type: '住宿', amount: 5600, currency: 'CNY', description: '6晚酒店/民宿（平均930/晚）' },
      { id: 'b5', day: 1, type: '餐饮', amount: 2100, currency: 'CNY', description: '每日300元，含3顿特色餐' },
      { id: 'b6', day: 1, type: '门票', amount: 1000, currency: 'CNY', description: '卢浮宫、铁塔、少女峰、斗兽场、乌菲兹' },
      { id: 'b7', day: 1, type: '购物', amount: 1500, currency: 'CNY', description: '纪念品、药妆、免税' },
      { id: 'b8', day: 1, type: '其他', amount: 400, currency: 'CNY', description: '签证保险、电话卡' }
    ]

    setRoute(route, { skipScheduleRegeneration: true })
    const byDay = new Map<number, typeof plan>()
    for (const p of plan) {
      const arr = byDay.get(p.day) || []
      arr.push(p)
      byDay.set(p.day, arr)
    }
    schedule.value = Array.from(byDay.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, items]) => ({
        day,
        date: new Date(startDate.getTime() + (day - 1) * 86400000),
        city: items[0]?.location || '',
        activities: [],
        accommodation: '',
        notes: items
          .slice()
          .sort((a, b) => a.within - b.within)
          .map((x) => `${x.within}. ${x.title}｜${x.description}`)
          .join('；')
      }))
  }

  function loadJiangZheHuRoute() {
    const startDate = new Date('2026-04-25')

    const plan = [
      { id: 'j1', day: 1, within: 1, title: '抵达上海，入住', location: '人民广场', lat: 31.2304, lng: 121.4737, description: '地铁便利' },
      { id: 'j2', day: 1, within: 2, title: '南京路步行街', location: '黄浦区', lat: 31.234, lng: 121.473, description: '逛吃' },
      { id: 'j3', day: 1, within: 3, title: '外滩夜景', location: '外滩', lat: 31.2381, lng: 121.4905, description: '万国建筑群' },
      { id: 'j4', day: 2, within: 1, title: '上海迪士尼', location: '浦东', lat: 31.1433, lng: 121.6622, description: '全天游玩' },
      { id: 'j5', day: 2, within: 2, title: '迪士尼烟花秀', location: '奇想花园', lat: 31.1433, lng: 121.6622, description: '晚上9点' },
      { id: 'j6', day: 3, within: 1, title: '豫园 & 城隍庙', location: '黄浦区', lat: 31.2289, lng: 121.4877, description: '园林+小吃' },
      { id: 'j7', day: 3, within: 2, title: '上海→苏州（高铁）', location: '上海虹桥', lat: 31.1952, lng: 121.3261, description: '30分钟' },
      { id: 'j8', day: 3, within: 3, title: '平江路历史街区', location: '苏州', lat: 31.3171, lng: 120.6272, description: '听评弹' },
      { id: 'j9', day: 4, within: 1, title: '拙政园', location: '苏州', lat: 31.3245, lng: 120.6258, description: '中国四大名园' },
      { id: 'j10', day: 4, within: 2, title: '苏州博物馆', location: '苏州', lat: 31.3245, lng: 120.6248, description: '贝聿铭设计' },
      { id: 'j11', day: 4, within: 3, title: '七里山塘街', location: '苏州', lat: 31.3111, lng: 120.6123, description: '傍晚红灯船' },
      { id: 'j12', day: 5, within: 1, title: '苏州→周庄', location: '苏州北站', lat: 31.331, lng: 120.616, description: '专线车1.5h' },
      { id: 'j13', day: 5, within: 2, title: '沈厅、张厅', location: '周庄', lat: 31.1155, lng: 120.8495, description: '明清古宅' },
      { id: 'j14', day: 5, within: 3, title: '双桥 & 摇橹船', location: '周庄', lat: 31.1155, lng: 120.8495, description: '夜游' },
      { id: 'j15', day: 6, within: 1, title: '周庄→杭州', location: '苏州北', lat: 31.331, lng: 120.616, description: '高铁1.5h' },
      { id: 'j16', day: 6, within: 2, title: '西湖白堤 & 断桥', location: '杭州', lat: 30.2734, lng: 120.1431, description: '漫步' },
      { id: 'j17', day: 6, within: 3, title: '雷峰塔', location: '杭州', lat: 30.2335, lng: 120.1454, description: '看全景' }
    ]

    const jzh: Destination[] = plan
      .slice()
      .sort((a, b) => (a.day - b.day) || (a.within - b.within))
      .map((p, idx) => ({
        id: p.id,
        name: p.location,
        description: `${p.title}｜${p.description}`,
        coordinates: [p.lng, p.lat],
        highlight: p.title,
        order: idx + 1,
        day: p.day,
        withinDayOrder: p.within,
        date: new Date(startDate.getTime() + (p.day - 1) * 86400000).toISOString()
      }))

    destinations.value = jzh

    const route: Route = {
      id: 'jzh_2026_02',
      name: '江浙沪旅游攻略（6天·示例）',
      destinations: jzh,
      totalDistance: 0,
      estimatedDays: 6
    }

    budgetItems.value = [
      { id: 'jb1', day: 1, type: '交通', amount: 680, currency: 'CNY', description: '往返大交通' },
      { id: 'jb2', day: 1, type: '交通', amount: 210, currency: 'CNY', description: '城际高铁' },
      { id: 'jb3', day: 1, type: '住宿', amount: 1400, currency: 'CNY', description: '5晚经济型酒店' },
      { id: 'jb4', day: 1, type: '餐饮', amount: 800, currency: 'CNY', description: '小吃+苏帮菜+杭帮菜' },
      { id: 'jb5', day: 1, type: '门票', amount: 610, currency: 'CNY', description: '迪士尼、拙政园、周庄、雷峰塔' },
      { id: 'jb6', day: 1, type: '购物', amount: 500, currency: 'CNY', description: '丝绸、糕点、龙井' },
      { id: 'jb7', day: 1, type: '其他', amount: 300, currency: 'CNY', description: '市内交通' }
    ]

    setRoute(route, { skipScheduleRegeneration: true })
    const byDay = new Map<number, typeof plan>()
    for (const p of plan) {
      const arr = byDay.get(p.day) || []
      arr.push(p)
      byDay.set(p.day, arr)
    }
    schedule.value = Array.from(byDay.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, items]) => ({
        day,
        date: new Date(startDate.getTime() + (day - 1) * 86400000),
        city: items[0]?.location || '',
        activities: [],
        accommodation: '',
        notes: items
          .slice()
          .sort((a, b) => a.within - b.within)
          .map((x) => `${x.within}. ${x.title}｜${x.description}`)
          .join('；')
      }))
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

