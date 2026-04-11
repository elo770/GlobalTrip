import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore'
import { getFirestoreDb } from './firebase'
import type { BudgetItem, Route } from '@/types'

const TRIPS = 'trips'
const BUDGET = 'budget_items'

function toPlain<T>(obj: T): Record<string, unknown> {
  return JSON.parse(JSON.stringify(obj)) as Record<string, unknown>
}

export async function fsListTrips(): Promise<Route[]> {
  const snap = await getDocs(collection(getFirestoreDb(), TRIPS))
  return snap.docs.map((d) => d.data() as Route)
}

export async function fsSaveTrip(route: Route): Promise<void> {
  await setDoc(doc(getFirestoreDb(), TRIPS, route.id), toPlain(route))
}

export async function fsDeleteTrip(id: string): Promise<void> {
  await deleteDoc(doc(getFirestoreDb(), TRIPS, id))
}

export async function fsListBudgetItems(): Promise<BudgetItem[]> {
  const snap = await getDocs(collection(getFirestoreDb(), BUDGET))
  return snap.docs.map((d) => d.data() as BudgetItem)
}

export async function fsSaveBudgetItem(item: BudgetItem): Promise<void> {
  await setDoc(doc(getFirestoreDb(), BUDGET, item.id), toPlain(item))
}

export async function fsDeleteBudgetItem(id: string): Promise<void> {
  await deleteDoc(doc(getFirestoreDb(), BUDGET, id))
}
