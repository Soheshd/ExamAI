import { saveLocalRecording } from './indexedDb';

/**
 * Recording Provider Interface / Implementation for Local Browser Storage (IndexedDB).
 */
export class LocalStorageProvider {
  /**
   * Stores the WebM recording locally in the browser's IndexedDB.
   * @param {string} studentId 
   * @param {string} examId 
   * @param {Blob} videoBlob 
   * @returns {Promise<string>} Local Blob URL
   */
  async upload(studentId, examId, videoBlob) {
    try {
      await saveLocalRecording(studentId, examId, videoBlob);
      console.log('ExamAI [LocalStorageProvider]: Saved recording to IndexedDB.');
      if (typeof window !== 'undefined') {
        return URL.createObjectURL(videoBlob);
      }
      return 'local-blob-url';
    } catch (err) {
      console.error('ExamAI [LocalStorageProvider]: Failed to save to IndexedDB:', err);
      if (typeof window !== 'undefined') {
        return URL.createObjectURL(videoBlob);
      }
      return '';
    }
  }
}

/**
 * Recording Provider Interface / Implementation for Firebase Storage.
 */
export class FirebaseStorageProvider {
  constructor(firebaseApp) {
    this.firebaseApp = firebaseApp;
  }

  /**
   * Uploads the WebM recording to Firebase Cloud Storage.
   * @param {string} studentId 
   * @param {string} examId 
   * @param {Blob} videoBlob 
   * @returns {Promise<string>} Download URL
   */
  async upload(studentId, examId, videoBlob) {
    const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
    const storage = getStorage(this.firebaseApp);
    const fileRef = ref(storage, `recordings/${studentId}_${examId}.webm`);
    await uploadBytes(fileRef, videoBlob);
    return await getDownloadURL(fileRef);
  }
}

/**
 * Factory function to retrieve the configured RecordingProvider.
 * @param {object} firebaseApp 
 * @returns {LocalStorageProvider|FirebaseStorageProvider}
 */
export function getRecordingProvider(firebaseApp) {
  const isStorageAvailable = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_AVAILABLE !== 'false';
  
  if (isStorageAvailable && firebaseApp) {
    console.log('ExamAI: Initializing FirebaseStorageProvider.');
    return new FirebaseStorageProvider(firebaseApp);
  } else {
    console.log('ExamAI: Initializing LocalStorageProvider (Fallback Mode).');
    return new LocalStorageProvider();
  }
}
