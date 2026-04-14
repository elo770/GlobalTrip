import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'

const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID

const config: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  ...(measurementId ? { measurementId } : {})
}

export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.projectId && config.appId)
}

let app: FirebaseApp | null = null
let db: Firestore | null = null

export function getFirestoreDb(): Firestore {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase 未配置：请在 .env 中填写 VITE_FIREBASE_* 变量')
  }
  if (!app) {
    app = initializeApp(config)
    db = getFirestore(app)
  }
  if (!db) {
    throw new Error('Firestore 初始化失败')
  }
  return db
}
