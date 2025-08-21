// Simple IndexedDB helper for storing recent CV files
// Stores up to MAX_CVS records with metadata and the Blob itself

const DB_NAME = 'cv-store';
const DB_VERSION = 1;
const STORE = 'files';
const MAX_CVS = 5;

export type CVMeta = {
  id: number;
  name: string;
  size: number;
  type: string;
  addedAt: number; // epoch ms
};

type CVRecord = CVMeta & { blob: Blob };

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        os.createIndex('addedAt', 'addedAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
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
    const req = os.put(rec as any);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

async function del(db: IDBDatabase, id: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const os = tx.objectStore(STORE);
    const req = os.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
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
  const db = await openDB();
  const rec: Omit<CVRecord, 'id'> = {
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
    addedAt: Date.now(),
    blob: file,
  } as any;
  const id = await put(db, rec);

  // prune to MAX_CVS by addedAt desc
  const all = await getAll(db);
  const sorted = all.sort((a, b) => b.addedAt - a.addedAt);
  const extras = sorted.slice(MAX_CVS);
  await Promise.all(extras.map(x => del(db, x.id)));

  return id;
}

export async function listCVs(): Promise<CVMeta[]> {
  const db = await openDB();
  const all = await getAll(db);
  const metas = all.map(({ id, name, size, type, addedAt }) => ({ id, name, size, type, addedAt }));
  metas.sort((a, b) => b.addedAt - a.addedAt);
  return metas;
}

export async function getCVFile(id: number): Promise<File | null> {
  const db = await openDB();
  const rec = await getById(db, id);
  if (!rec) return null;
  try {
    // Construct a File from the stored Blob
    return new File([rec.blob], rec.name, { type: rec.type, lastModified: rec.addedAt });
  } catch {
    // Fallback to Blob if File constructor not available
    return new File([rec.blob], rec.name);
  }
}

export async function removeCV(id: number): Promise<void> {
  const db = await openDB();
  await del(db, id);
}
