import { Dish } from './types'

export interface ScanHistoryEntry {
  id: string
  thumbnail: string
  savedAt: number
  country: string
  cuisineLabel: string
  dishCount: number
  dishes: Dish[]
  dishImages: Record<string, string[]>
}

export type ScanHistorySummary = Omit<ScanHistoryEntry, 'dishes' | 'dishImages'>

const DB_NAME = 'pe-scan-history'
const DB_VERSION = 1
const STORE_NAME = 'scans'
const MAX_ENTRIES = 20

function openHistoryDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('savedAt', 'savedAt', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getAllScans(): Promise<ScanHistorySummary[]> {
  const db = await openHistoryDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.getAll()
    req.onsuccess = () => {
      const entries: ScanHistoryEntry[] = req.result
      entries.sort((a, b) => b.savedAt - a.savedAt)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      resolve(entries.map(({ dishes, dishImages, ...summary }) => summary))
    }
    req.onerror = () => reject(req.error)
  })
}

export async function getScan(id: string): Promise<ScanHistoryEntry | undefined> {
  const db = await openHistoryDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(id)
    req.onsuccess = () => resolve(req.result ?? undefined)
    req.onerror = () => reject(req.error)
  })
}

export async function putScan(entry: ScanHistoryEntry): Promise<void> {
  const db = await openHistoryDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put(entry)

    // Evict oldest if over limit
    const countReq = store.count()
    countReq.onsuccess = () => {
      if (countReq.result > MAX_ENTRIES) {
        const idx = store.index('savedAt')
        const cursor = idx.openCursor()
        let toDelete = countReq.result - MAX_ENTRIES
        cursor.onsuccess = () => {
          if (toDelete > 0 && cursor.result) {
            cursor.result.delete()
            toDelete--
            cursor.result.continue()
          }
        }
      }
    }

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function deleteScan(id: string): Promise<void> {
  const db = await openHistoryDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

const THUMB_WIDTH = 200
const THUMB_QUALITY = 0.6

export function generateThumbnail(base64: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const ratio = THUMB_WIDTH / img.width
      const width = THUMB_WIDTH
      const height = Math.round(img.height * ratio)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas not supported')); return }

      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', THUMB_QUALITY))
    }
    img.onerror = () => reject(new Error('Failed to load image for thumbnail'))
    img.src = base64
  })
}
