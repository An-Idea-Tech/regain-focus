class SoundscapeDB {
  constructor() {
    this.dbName = 'regain-db';
    this.dbVersion = 1;
    this.storeName = 'custom-tracks';
    this.db = null;
  }

  init() {
    if (this.db) {
      return Promise.resolve();
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (e) => {
        console.error('SoundscapeDB: Error opening database', e);
        this.initPromise = null;
        reject(e);
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        console.log('SoundscapeDB: Opened successfully');
        this.requestPersistence();
        resolve();
      };

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
        console.log('SoundscapeDB: Database upgrade completed');
      };
    });

    return this.initPromise;
  }

  async requestPersistence() {
    if (navigator.storage && navigator.storage.persist) {
      try {
        const isPersisted = await navigator.storage.persisted();
        console.log(`SoundscapeDB: Storage already persisted? ${isPersisted}`);
        if (!isPersisted) {
          const granted = await navigator.storage.persist();
          console.log(`SoundscapeDB: Storage persistence request granted? ${granted}`);
        }
      } catch (err) {
        console.warn('SoundscapeDB: Persistence check failed', err);
      }
    }
  }

  getCustomTracks(userId = 'guest') {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result || [];
        // Support backward compatibility (if existing records have no userId)
        // Also support filtering by the logged-in user ID
        const filtered = results.map(track => ({
          ...track,
          userId: track.userId || 'guest',
          synced: track.synced !== undefined ? track.synced : false
        })).filter(track => track.userId === userId);
        resolve(filtered);
      };
      request.onerror = (e) => reject(e);
    });
  }

  // Gets ALL local records, including unsynced ones (useful for the Sync Coordinator)
  getAllLocalTracks() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result || [];
        resolve(results.map(track => ({
          ...track,
          userId: track.userId || 'guest',
          synced: track.synced !== undefined ? track.synced : false
        })));
      };
      request.onerror = (e) => reject(e);
    });
  }

  saveCustomTrack(track) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }
      // Ensure record has synchronization properties
      const trackToSave = {
        ...track,
        userId: track.userId || 'guest',
        synced: track.synced !== undefined ? track.synced : false,
        updatedAt: track.updatedAt || Date.now()
      };

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(trackToSave);

      request.onsuccess = () => resolve(trackToSave);
      request.onerror = (e) => reject(e);
    });
  }

  deleteCustomTrack(trackId) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(trackId);

      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e);
    });
  }
}

export const dbInstance = new SoundscapeDB();
export default dbInstance;
