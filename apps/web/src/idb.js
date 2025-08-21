// Simple IndexedDB helper for storing recent CV files
// Stores up to MAX_CVS records with metadata and the Blob itself
const DB_NAME = 'cv-store';
const DB_VERSION = 1;
const STORE = 'files';
const MAX_CVS = 5;
function openDB() {
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
async function getAll(db) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const os = tx.objectStore(STORE);
        const req = os.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
async function put(db, rec) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const os = tx.objectStore(STORE);
        const req = os.put(rec);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
async function del(db, id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const os = tx.objectStore(STORE);
        const req = os.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}
async function getById(db, id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const os = tx.objectStore(STORE);
        const req = os.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
export async function saveCV(file) {
    const db = await openDB();
    const rec = {
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        addedAt: Date.now(),
        blob: file,
    };
    const id = await put(db, rec);
    // prune to MAX_CVS by addedAt desc
    const all = await getAll(db);
    const sorted = all.sort((a, b) => b.addedAt - a.addedAt);
    const extras = sorted.slice(MAX_CVS);
    await Promise.all(extras.map(x => del(db, x.id)));
    return id;
}
export async function listCVs() {
    const db = await openDB();
    const all = await getAll(db);
    const metas = all.map(({ id, name, size, type, addedAt }) => ({ id, name, size, type, addedAt }));
    metas.sort((a, b) => b.addedAt - a.addedAt);
    return metas;
}
export async function getCVFile(id) {
    const db = await openDB();
    const rec = await getById(db, id);
    if (!rec)
        return null;
    try {
        // Construct a File from the stored Blob
        return new File([rec.blob], rec.name, { type: rec.type, lastModified: rec.addedAt });
    }
    catch {
        // Fallback to Blob if File constructor not available
        return new File([rec.blob], rec.name);
    }
}
export async function removeCV(id) {
    const db = await openDB();
    await del(db, id);
}
