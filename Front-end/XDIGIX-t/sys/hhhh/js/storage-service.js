/**
 * Storage Service - Handles efficient data storage with Firebase integration
 * Replaces localStorage for large data to avoid quota exceeded errors
 */

class StorageService {
    constructor(bridgeService) {
        this.bridgeService = bridgeService;
        this.localStorageKeys = new Set();
        this.maxLocalStorageSize = 1024 * 1024; // 1MB limit for localStorage
        this.compressionEnabled = true;
    }

    /**
     * Save data with automatic storage optimization
     */
    async save(key, data) {
        try {
            const serializedData = JSON.stringify(data);
            const dataSize = new Blob([serializedData]).size;

            console.log(`Saving ${key}: ${dataSize} bytes`);

            // If data is small enough, use localStorage
            if (dataSize < this.maxLocalStorageSize) {
                this.setLocalStorage(key, serializedData);
                return { success: true, method: 'localStorage' };
            }

            // For large data, use Firebase
            if (this.bridgeService && this.bridgeService.isAuthenticated()) {
                return await this.saveToFirebase(key, data);
            }

            // Fallback: compress and try localStorage
            const compressed = this.compressData(data);
            const compressedSize = new Blob([compressed]).size;

            if (compressedSize < this.maxLocalStorageSize) {
                this.setLocalStorage(key, compressed);
                return { success: true, method: 'localStorage-compressed' };
            }

            // If still too large, throw error
            throw new Error(`Data too large for storage: ${dataSize} bytes`);
        } catch (error) {
            console.error(`Error saving ${key}:`, error);
            throw error;
        }
    }

    /**
     * Load data with automatic storage detection
     */
    async load(key) {
        try {
            // Try localStorage first
            const localData = this.getLocalStorage(key);
            if (localData) {
                // Check if it's compressed
                if (this.isCompressed(localData)) {
                    return this.decompressData(localData);
                }
                return JSON.parse(localData);
            }

            // Try Firebase if authenticated
            if (this.bridgeService && this.bridgeService.isAuthenticated()) {
                return await this.loadFromFirebase(key);
            }

            return null;
        } catch (error) {
            console.error(`Error loading ${key}:`, error);
            return null;
        }
    }

    /**
     * Remove data from all storage methods
     */
    async remove(key) {
        try {
            // Remove from localStorage
            this.removeLocalStorage(key);

            // Remove from Firebase if authenticated
            if (this.bridgeService && this.bridgeService.isAuthenticated()) {
                await this.removeFromFirebase(key);
            }

            return { success: true };
        } catch (error) {
            console.error(`Error removing ${key}:`, error);
            throw error;
        }
    }

    /**
     * Get all keys from localStorage
     */
    getAllKeys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && this.localStorageKeys.has(key)) {
                keys.push(key);
            }
        }
        return keys;
    }

    /**
     * Clear all data
     */
    async clear() {
        try {
            // Clear localStorage
            this.localStorageKeys.forEach(key => {
                localStorage.removeItem(key);
            });
            this.localStorageKeys.clear();

            // Clear Firebase data if authenticated
            if (this.bridgeService && this.bridgeService.isAuthenticated()) {
                await this.clearFirebaseData();
            }

            return { success: true };
        } catch (error) {
            console.error('Error clearing storage:', error);
            throw error;
        }
    }

    /**
     * Get storage usage statistics
     */
    getStorageStats() {
        let totalSize = 0;
        let itemCount = 0;

        this.localStorageKeys.forEach(key => {
            const data = localStorage.getItem(key);
            if (data) {
                totalSize += new Blob([data]).size;
                itemCount++;
            }
        });

        return {
            totalSize,
            itemCount,
            maxSize: this.maxLocalStorageSize,
            usagePercent: (totalSize / this.maxLocalStorageSize) * 100
        };
    }

    // Private methods

    setLocalStorage(key, value) {
        try {
            localStorage.setItem(key, value);
            this.localStorageKeys.add(key);
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                // Try to free up space
                this.cleanupLocalStorage();
                // Try again
                localStorage.setItem(key, value);
                this.localStorageKeys.add(key);
            } else {
                throw error;
            }
        }
    }

    getLocalStorage(key) {
        return localStorage.getItem(key);
    }

    removeLocalStorage(key) {
        localStorage.removeItem(key);
        this.localStorageKeys.delete(key);
    }

    async saveToFirebase(key, data) {
        if (!this.bridgeService.isAuthenticated()) {
            throw new Error('User must be authenticated to save to Firebase');
        }

        try {
            const userDataRef = this.bridgeService.db
                .collection('user_data')
                .doc(this.bridgeService.currentUser.uid)
                .collection('storage')
                .doc(key);

            await userDataRef.set({
                data: data,
                key: key,
                userId: this.bridgeService.currentUser.uid,
                savedAt: this.bridgeService.firebase.firestore.FieldValue.serverTimestamp(),
                size: new Blob([JSON.stringify(data)]).size
            });

            return { success: true, method: 'firebase' };
        } catch (error) {
            console.error('Error saving to Firebase:', error);
            throw error;
        }
    }

    async loadFromFirebase(key) {
        if (!this.bridgeService.isAuthenticated()) {
            throw new Error('User must be authenticated to load from Firebase');
        }

        try {
            const userDataRef = this.bridgeService.db
                .collection('user_data')
                .doc(this.bridgeService.currentUser.uid)
                .collection('storage')
                .doc(key);

            const doc = await userDataRef.get();
            if (doc.exists) {
                return doc.data().data;
            }
            return null;
        } catch (error) {
            console.error('Error loading from Firebase:', error);
            throw error;
        }
    }

    async removeFromFirebase(key) {
        if (!this.bridgeService.isAuthenticated()) {
            return;
        }

        try {
            const userDataRef = this.bridgeService.db
                .collection('user_data')
                .doc(this.bridgeService.currentUser.uid)
                .collection('storage')
                .doc(key);

            await userDataRef.delete();
        } catch (error) {
            console.error('Error removing from Firebase:', error);
        }
    }

    async clearFirebaseData() {
        if (!this.bridgeService.isAuthenticated()) {
            return;
        }

        try {
            const userDataRef = this.bridgeService.db
                .collection('user_data')
                .doc(this.bridgeService.currentUser.uid)
                .collection('storage');

            const snapshot = await userDataRef.get();
            const batch = this.bridgeService.db.batch();

            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
        } catch (error) {
            console.error('Error clearing Firebase data:', error);
        }
    }

    compressData(data) {
        if (!this.compressionEnabled) {
            return JSON.stringify(data);
        }

        try {
            // Simple compression: remove unnecessary whitespace and use shorter property names
            const compressed = JSON.stringify(data, null, 0);
            return 'COMPRESSED:' + compressed;
        } catch (error) {
            console.error('Compression error:', error);
            return JSON.stringify(data);
        }
    }

    decompressData(compressedData) {
        try {
            if (compressedData.startsWith('COMPRESSED:')) {
                return JSON.parse(compressedData.substring(11));
            }
            return JSON.parse(compressedData);
        } catch (error) {
            console.error('Decompression error:', error);
            return null;
        }
    }

    isCompressed(data) {
        return typeof data === 'string' && data.startsWith('COMPRESSED:');
    }

    cleanupLocalStorage() {
        // Remove old items to free up space
        const keys = Array.from(this.localStorageKeys);
        const stats = keys.map(key => ({
            key,
            size: new Blob([localStorage.getItem(key) || '']).size,
            lastAccess: localStorage.getItem(key + '_lastAccess') || 0
        }));

        // Sort by last access time (oldest first)
        stats.sort((a, b) => a.lastAccess - b.lastAccess);

        // Remove oldest items until we have enough space
        let freedSpace = 0;
        const targetFreeSpace = this.maxLocalStorageSize * 0.2; // Free up 20%

        for (const stat of stats) {
            if (freedSpace >= targetFreeSpace) break;

            this.removeLocalStorage(stat.key);
            localStorage.removeItem(stat.key + '_lastAccess');
            freedSpace += stat.size;
        }

        console.log(`Freed up ${freedSpace} bytes of localStorage space`);
    }

    /**
     * Migrate existing localStorage data to new storage system
     */
    async migrateLocalStorageData() {
        const keysToMigrate = ['savedThemes', 'firebase_themes'];
        
        for (const key of keysToMigrate) {
            try {
                const data = localStorage.getItem(key);
                if (data) {
                    const parsedData = JSON.parse(data);
                    await this.save(key, parsedData);
                    console.log(`Migrated ${key} to new storage system`);
                }
            } catch (error) {
                console.error(`Error migrating ${key}:`, error);
            }
        }
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageService;
}
