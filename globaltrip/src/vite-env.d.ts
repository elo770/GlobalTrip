/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'element-plus' {
  import type { App } from 'vue'
  
  export const ElMessage: {
    success: (message: string) => void
    warning: (message: string) => void
    error: (message: string) => void
    info: (message: string) => void
  }
  
  export const ElMessageBox: {
    confirm: (message: string, title: string, options?: any) => Promise<any>
    prompt: (message: string, title: string, options?: any) => Promise<{ value: string }>
  }
  
  const _default: {
    install(app: App): void
  }
  export default _default
}

declare module '@element-plus/icons-vue' {
  import type { DefineComponent } from 'vue'
  export const Star: DefineComponent
  export const Delete: DefineComponent
  export const Refresh: DefineComponent
  export const Location: DefineComponent
  export const House: DefineComponent
  export const Document: DefineComponent
  export const Plus: DefineComponent
  export const MapLocation: DefineComponent
  export const Calendar: DefineComponent
  export const Money: DefineComponent
  export const HomeFilled: DefineComponent
  export const CaretTop: DefineComponent
  export const CaretBottom: DefineComponent
  export const LocationFilled: DefineComponent
  export const Rank: DefineComponent
  export const Minus: DefineComponent
  export const FullScreen: DefineComponent
  const icons: Record<string, DefineComponent>
  export default icons
}

