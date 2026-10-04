/**
 * Thin typed helpers over Firestore so pages read like the old data layer.
 *
 * NOTE: every query here uses only equality filters (`where ==`) so Firestore
 * never needs a composite index — sorting happens client-side (our data sets
 * are small by design).
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getAggregateFromServer,
  getDoc,
  getDocs,
  getCountFromServer,
  query,
  setDoc,
  sum,
  updateDoc,
  where,
  type QueryConstraint
} from 'firebase/firestore'
import { db } from './firebase'

// Re-export so pages can build queries from one import.
export { where }

type Row = Record<string, unknown>

function mapDoc<T>(snap: { id: string; data(): unknown }): T {
  return { id: snap.id, ...(snap.data() as Row) } as T
}

/** Fetch documents in a collection (optional where/limit constraints). */
export async function list<T>(name: string, ...constraints: QueryConstraint[]): Promise<T[]> {
  const snap = await getDocs(query(collection(db, name), ...constraints))
  return snap.docs.map((d) => mapDoc<T>(d))
}

/** Fetch a single document by id, or null when it does not exist. */
export async function row<T>(name: string, id: string): Promise<T | null> {
  const snap = await getDoc(doc(db, name, id))
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Row) } as T) : null
}

/** First document matching the constraints (e.g. a license-key lookup). */
export async function first<T>(name: string, ...constraints: QueryConstraint[]): Promise<T | null> {
  const rows = await list<T>(name, ...constraints)
  return rows[0] ?? null
}

/** Exact document count (respects security rules). */
export async function count(name: string, ...constraints: QueryConstraint[]): Promise<number> {
  const snap = await getCountFromServer(query(collection(db, name), ...constraints))
  return snap.data().count
}

/** Sum a numeric field across matching documents (server-side aggregation). */
export async function sumOf(name: string, field: string, ...constraints: QueryConstraint[]): Promise<number> {
  const snap = await getAggregateFromServer(query(collection(db, name), ...constraints), {
    [field]: sum(field)
  })
  return (snap.data()[field] as number) ?? 0
}

/** Insert a new document; returns its auto-generated id. */
export async function insert<T extends object>(name: string, data: T): Promise<string> {
  const ref = await addDoc(collection(db, name), data)
  return ref.id
}

/** Create/overwrite a document with a known id. */
export async function put<T extends object>(name: string, id: string, data: T): Promise<void> {
  await setDoc(doc(db, name, id), data)
}

/** Partial update of one document. */
export async function update<T extends object>(name: string, id: string, data: T): Promise<void> {
  await updateDoc(doc(db, name, id), data)
}

/** Delete one document. */
export async function remove(name: string, id: string): Promise<void> {
  await deleteDoc(doc(db, name, id))
}

/** ISO timestamp for created_at fields (client clock). */
export function nowIso(): string {
  return new Date().toISOString()
}

/** Newest-first sort for rows that carry a created_at string. */
export function newest<T extends { created_at?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
}
