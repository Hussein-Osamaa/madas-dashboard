/**
 * Storage Service - Handles data persistence and management
 * Saves to /api/sites/:siteId (backend) when siteId + token are available.
 * Falls back to localStorage.
 */

function getSiteId() {
    return new URLSearchParams(window.location.search).get('siteId') || '';
}
function getJwt() {
    return localStorage.getItem('backend_access_token') || localStorage.getItem('warehouse_access_token') || '';
}
function getApiBase() {
    return 'https://xdigix-os-production.up.railway.app';
}

class StorageService {
    constructor(bridgeService) {
        this.bridge = bridgeService;
        this.storageKey = 'professional-builder-data';
        this.autosaveInterval = null;
        this.siteId = getSiteId();
        this.init();
    }

    init() {
        console.log('💾 Initializing Storage Service...');
        
        // Setup autosave if enabled
        if (this.bridge.getData('settings')?.autosave) {
            this.startAutosave();
        }
        
        // Listen for data changes
        this.bridge.on('dataChanged', this.handleDataChange.bind(this));
        
        console.log('✅ Storage Service initialized');
    }

    startAutosave() {
        if (this.autosaveInterval) {
            clearInterval(this.autosaveInterval);
        }
        
        this.autosaveInterval = setInterval(() => {
            this.saveCurrentState();
        }, 30000); // Autosave every 30 seconds
    }

    stopAutosave() {
        if (this.autosaveInterval) {
            clearInterval(this.autosaveInterval);
            this.autosaveInterval = null;
        }
    }

    handleDataChange(event) {
        // Debounced save when data changes
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        this.saveTimeout = setTimeout(() => {
            this.saveCurrentState();
        }, 2000); // Save 2 seconds after last change
    }

    async saveCurrentState() {
        try {
            const currentData = {
                sections: this.bridge.getData('sections') || [],
                pages: this.bridge.getData('pages') || [],
                theme: this.bridge.getData('theme') || {},
                settings: this.bridge.getData('settings') || {},
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            };

            // Save to localStorage (instant, always)
            this.bridge.saveToLocalStorage(this.storageKey, currentData);

            // Save to backend if siteId + token available
            const siteId = this.siteId || getSiteId();
            const token = getJwt();
            if (siteId && token) {
                try {
                    const res = await fetch(`${getApiBase()}/api/sites/${siteId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({
                            sections: currentData.sections,
                            pages: currentData.pages,
                            settings: {
                                theme: currentData.theme,
                                ...currentData.settings,
                            },
                        }),
                    });
                    if (res.ok) {
                        console.log('✅ Site saved to backend');
                    } else {
                        console.warn('⚠️ Backend save failed, localStorage only');
                    }
                } catch (netErr) {
                    console.warn('⚠️ Backend unreachable, localStorage only:', netErr);
                }
            }

            this.bridge.emit('dataSaved', { success: true, data: currentData });
            return { success: true };
        } catch (error) {
            console.error('❌ Error saving current state:', error);
            this.bridge.emit('saveError', error);
            return { success: false, error: error.message };
        }
    }

    async loadSavedState() {
        try {
            // Try to load from remote storage first
            // Remote storage not configured
            }

            // Fallback to localStorage
            let localResult;
            if (this.bridge && typeof this.bridge.loadFromLocalStorage === 'function') {
                localResult = this.bridge.loadFromLocalStorage(this.storageKey);
            } else {
                // Direct localStorage fallback
                console.warn('Bridge service loadFromLocalStorage not available, using direct localStorage');
                const data = localStorage.getItem(this.storageKey);
                localResult = data ? { success: true, data: JSON.parse(data) } : { success: false, error: 'No data found' };
            }
            
            if (localResult.success) {
                this.restoreData(localResult.data);
                console.log('✅ Data loaded from localStorage');
                return { success: true, source: 'localStorage' };
            }

            return { success: false, error: 'No saved data found' };
        } catch (error) {
            console.error('❌ Error loading saved state:', error);
            return { success: false, error: error.message };
        }
    }

    restoreData(data) {
        if (data.sections) {
            this.bridge.setData('sections', data.sections);
        }
        if (data.theme) {
            this.bridge.setData('theme', data.theme);
        }
        if (data.settings) {
            this.bridge.setData('settings', data.settings);
        }
        
        this.bridge.emit('dataRestored', data);
    }

    async exportData(format = 'json') {
        try {
            const data = {
                sections: this.bridge.getData('sections') || [],
                theme: this.bridge.getData('theme') || {},
                settings: this.bridge.getData('settings') || {},
                metadata: {
                    exportedAt: new Date().toISOString(),
                    version: '1.0.0',
                    format: format
                }
            };

            if (format === 'json') {
                return {
                    success: true,
                    data: JSON.stringify(data, null, 2),
                    filename: `website-export-${Date.now()}.json`
                };
            } else if (format === 'html') {
                const html = this.generateHTML(data);
                return {
                    success: true,
                    data: html,
                    filename: `website-export-${Date.now()}.html`
                };
            }

            return { success: false, error: 'Unsupported format' };
        } catch (error) {
            console.error('❌ Error exporting data:', error);
            return { success: false, error: error.message };
        }
    }

    generateHTML(data) {
        // Generate HTML from the website data
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Website</title>
    <style>
        body { margin: 0; font-family: Arial, sans-serif; }
        .section { min-height: 200px; padding: 20px; }
    </style>
</head>
<body>`;

        data.sections.forEach(section => {
            html += `\n    <div class="section" style="${section.styles || ''}">`;
            html += `\n        ${section.content || ''}`;
            html += `\n    </div>`;
        });

        html += `\n</body>\n</html>`;
        return html;
    }

    async importData(data, format = 'json') {
        try {
            let parsedData;
            
            if (format === 'json') {
                parsedData = typeof data === 'string' ? JSON.parse(data) : data;
            } else {
                return { success: false, error: 'Unsupported import format' };
            }

            // Validate data structure
            if (!this.validateData(parsedData)) {
                return { success: false, error: 'Invalid data structure' };
            }

            // Restore the data
            this.restoreData(parsedData);
            
            // Save the imported data
            await this.saveCurrentState();
            
            this.bridge.emit('dataImported', parsedData);
            return { success: true };
        } catch (error) {
            console.error('❌ Error importing data:', error);
            return { success: false, error: error.message };
        }
    }

    validateData(data) {
        // Basic validation of data structure
        return data && 
               (Array.isArray(data.sections) || data.sections === undefined) &&
               (typeof data.theme === 'object' || data.theme === undefined) &&
               (typeof data.settings === 'object' || data.settings === undefined);
    }

    migrateLocalStorageData() {
        // Migrate old localStorage data to new format
        try {
            const oldData = localStorage.getItem('website-builder-data');
            if (oldData) {
                const parsedOldData = JSON.parse(oldData);
                const newData = this.convertToNewFormat(parsedOldData);
                
                this.bridge.saveToLocalStorage(this.storageKey, newData);
                localStorage.removeItem('website-builder-data');
                
                console.log('✅ Migrated old localStorage data');
            }
        } catch (error) {
            console.warn('⚠️ Error migrating localStorage data:', error);
        }
    }

    convertToNewFormat(oldData) {
        // Convert old data format to new format
        return {
            sections: oldData.sections || [],
            theme: oldData.theme || {},
            settings: oldData.settings || {},
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        };
    }

    clearAllData() {
        try {
            // Clear localStorage
            localStorage.removeItem(this.storageKey);
            
                        if (false) {                 this.bridge.saveToRemote('websites', 'current', {});
            }
            
            // Reset bridge data
            this.bridge.setData('sections', []);
            this.bridge.setData('currentSection', null);
            this.bridge.setData('selectedElements', []);
            
            this.bridge.emit('dataCleared');
            return { success: true };
        } catch (error) {
            console.error('❌ Error clearing data:', error);
            return { success: false, error: error.message };
        }
    }

    // Direct localStorage methods for compatibility
    loadFromLocalStorage(key) {
        try {
            console.log('StorageService: Loading from localStorage with key:', key);
            const data = localStorage.getItem(key);
            if (data) {
                const parsedData = JSON.parse(data);
                console.log('StorageService: Data loaded successfully:', parsedData);
                return { success: true, data: parsedData };
            } else {
                console.log('StorageService: No data found for key:', key);
                return { success: false, error: 'No data found' };
            }
        } catch (error) {
            console.error('StorageService: Error loading from localStorage:', error);
            return { success: false, error: error.message };
        }
    }

    saveToLocalStorage(key, data) {
        try {
            console.log('StorageService: Saving to localStorage with key:', key);
            localStorage.setItem(key, JSON.stringify(data));
            console.log('StorageService: Data saved successfully');
            return { success: true };
        } catch (error) {
            console.error('StorageService: Error saving to localStorage:', error);
            return { success: false, error: error.message };
        }
    }
}

// Make StorageService available globally
window.StorageService = StorageService;
