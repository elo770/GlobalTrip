// 目的地类型
export interface Destination {
  id: string
  name: string
  description?: string
  coordinates: [number, number] // [经度, 纬度]
  highlight?: string
  order: number
  date?: Date | string
  image?: string
}

// 路线类型
export interface Route {
  id: string
  name: string
  destinations: Destination[]
  totalDistance: number // 总距离（公里）
  estimatedDays: number
}

// 日程安排
export interface DaySchedule {
  day: number
  date: Date
  city: string
  activities: string[]
  accommodation: string
  notes?: string
}

// 预算项目
export interface BudgetItem {
  id: string
  day: number
  type: '交通' | '住宿' | '餐饮' | '景点' | '购物' | '其他'
  description: string
  amount: number
  currency?: string
}

