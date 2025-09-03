// Simple IndexedDB helper for storing recent CV files
// Stores up to MAX_CVS records with metadata and the Blob itself

const DB_NAME = 'cv-store';
const DB_VERSION = 2;
const STORE = 'files';
const MAX_CVS = 5;
const FALLBACK_KEY = 'cv-store-session-v1';
const DEFAULT_TYPE = 'application/octet-stream';

export type CVMeta = {
  id: number;
  name: string;
  size: number;
  type: string;
  addedAt: number; // epoch ms
};

type CVRecord = CVMeta & { blob: Blob };

// --- Simple sessionStorage fallback (for environments where IDB is blocked) ---
type CVSession = CVMeta & { dataUrl: string };

function ssGet(): CVSession[] {
  try {
    const raw = sessionStorage.getItem(FALLBACK_KEY);
    return raw ? (JSON.parse(raw) as CVSession[]) : [];
  } catch {
    return [];
  }
}
function ssSet(arr: CVSession[]) {
  try { sessionStorage.setItem(FALLBACK_KEY, JSON.stringify(arr)); } catch {}
}
function byAddedDesc<T extends { addedAt: number }>(a: T, b: T) { return b.addedAt - a.addedAt; }
async function fileToDataURL(file: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => resolve(String(fr.result));
    fr.readAsDataURL(file);
  });
}
async function saveCVFallback(file: File): Promise<number> {
  const list = ssGet();
  const now = Date.now();
  const existing = list.find(x => x.name === file.name && x.size === file.size);
  const id = existing?.id || (now + Math.floor(Math.random() * 1000));
  const dataUrl = await fileToDataURL(file);
  if (existing) {
    existing.addedAt = now;
    existing.type = file.type || DEFAULT_TYPE;
    existing.dataUrl = dataUrl;
  } else {
    list.push({ id, name: file.name, size: file.size, type: file.type || DEFAULT_TYPE, addedAt: now, dataUrl });
  }
  list.sort(byAddedDesc);
  while (list.length > MAX_CVS) list.pop();
  ssSet(list);
  return id;
}
async function listCVsFallback(): Promise<CVMeta[]> {
  const list = ssGet().slice().sort(byAddedDesc);
  return list.map(({ id, name, size, type, addedAt }) => ({ id, name, size, type, addedAt }));
}
async function getCVFileFallback(id: number): Promise<File | null> {
  const rec = ssGet().find(x => x.id === id);
  if (!rec) return null;
  const resp = await fetch(rec.dataUrl);
  const blob = await resp.blob();
  try {
    return new File([blob], rec.name, { type: rec.type, lastModified: rec.addedAt });
  } catch {
    return new File([blob], rec.name);
  }
}
async function removeCVFallback(id: number): Promise<void> {
  const list = ssGet().filter(x => x.id !== id);
  ssSet(list);
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof indexedDB === 'undefined') {
        return reject(new Error('indexedDB not available'));
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const os = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e as any);
    }
  });
}

async function getAll(db: IDBDatabase): Promise<CVRecord[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const os = tx.objectStore(STORE);
    const req = os.getAll();
    req.onsuccess = () => resolve(req.result as CVRecord[]);
    req.onerror = () => reject(req.error);
  });
}

async function put(db: IDBDatabase, rec: Omit<CVRecord, 'id'> & Partial<Pick<CVRecord, 'id'>>): Promise<number> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const os = tx.objectStore(STORE);
    const req = os.put(rec);
    let id: number | null = null;
    req.onsuccess = () => { id = req.result as number; };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => resolve(id as number);
    tx.onerror = () => reject((tx as any).error || new Error('idb tx error'));
    tx.onabort = () => reject((tx as any).error || new Error('idb tx aborted'));
  });
}

async function del(db: IDBDatabase, id: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const os = tx.objectStore(STORE);
    const req = os.delete(id);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject((tx as any).error || new Error('idb tx error'));
    tx.onabort = () => reject((tx as any).error || new Error('idb tx aborted'));
  });
}

async function getById(db: IDBDatabase, id: number): Promise<CVRecord | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const os = tx.objectStore(STORE);
    const req = os.get(id);
    req.onsuccess = () => resolve(req.result as CVRecord | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function saveCV(file: File): Promise<number> {
  try {
    const db = await openDB();
    const rec: Omit<CVRecord, 'id'> = {
      name: file.name,
      size: file.size,
      type: file.type || DEFAULT_TYPE,
      addedAt: Date.now(),
      // Store a plain Blob (not File) for broader IDB compatibility
      blob: file.slice(0, file.size, file.type || DEFAULT_TYPE),
    };
    const id = await put(db, rec);
    // prune to MAX_CVS by addedAt desc
    const all = await getAll(db);
    const sorted = all.sort(byAddedDesc);
    const extras = sorted.slice(MAX_CVS);
    await Promise.all(extras.map(x => del(db, x.id)));
    return id;
  } catch {
    return await saveCVFallback(file);
  }
}

export async function listCVs(): Promise<CVMeta[]> {
  try {
    const db = await openDB();
    const all = await getAll(db);
    const metas = all.map(({ id, name, size, type, addedAt }) => ({ id, name, size, type, addedAt }));
    metas.sort(byAddedDesc);
    return metas;
  } catch {
    return await listCVsFallback();
  }
}

export async function getCVFile(id: number): Promise<File | null> {
  try {
    const db = await openDB();
    const rec = await getById(db, id);
    if (!rec) return null;
    // Construct a File from the stored Blob (modern browsers)
    return new File([rec.blob], rec.name, { type: rec.type, lastModified: rec.addedAt });
  } catch {
    return await getCVFileFallback(id);
  }
}

export async function removeCV(id: number): Promise<void> {
  try {
    const db = await openDB();
    await del(db, id);
  } catch {
    await removeCVFallback(id);
  }
}
