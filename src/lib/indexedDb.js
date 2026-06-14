const DB_NAME = 'ExamAiLocalDB';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

function getDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is not available on server-side'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Saves a local WebM video recording to IndexedDB.
 * @param {string} userId 
 * @param {string} examId 
 * @param {Blob} blob 
 */
export async function saveLocalRecording(userId, examId, blob) {
  if (typeof window === 'undefined') return;
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const key = `examai_local_recording_${userId}_${examId}`;
    const request = store.put(blob, key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Gets a saved WebM video recording Blob from IndexedDB.
 * @param {string} userId 
 * @param {string} examId 
 * @returns {Promise<Blob|null>}
 */
export async function getLocalRecording(userId, examId) {
  if (typeof window === 'undefined') return null;
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const key = `examai_local_recording_${userId}_${examId}`;
    const request = store.get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * Deletes a saved WebM video recording from IndexedDB.
 * @param {string} userId 
 * @param {string} examId 
 */
export async function deleteLocalRecording(userId, examId) {
  if (typeof window === 'undefined') return;
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const key = `examai_local_recording_${userId}_${examId}`;
    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
