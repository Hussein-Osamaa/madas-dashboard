/**
 * Site Manager - Handles site data management and builder integration
 * Manages the connection between the HTML builder and Firebase data
 */

class SiteManager {
    constructor(bridgeService) {
        this.bridgeService = bridgeService;
        this.currentSite = null;
        this.isDirty = false;
        this.autoSaveInterval = null;
        this.autoSaveEnabled = true;
        this.autoSaveIntervalMs = 30000; // 30 seconds
    }

    /**
     * Initialize site manager
     */
    initialize() {
        // Set up auto-save
        this.startAutoSave();
        
        // Set up beforeunload warning
        window.addEventListener('beforeunload', (e) => {
            if (this.isDirty) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        });

        // Set up builder data change detection
        this.setupDataChangeDetection();
    }

    /**
     * Create a new site
     */
    async createNewSite(siteName = 'Untitled Site') {
        try {
            const siteData = {
                name: siteName,
                description: 'A new website created with our builder',
                draftData: this.getDefaultSiteData(),
            };

            const newSite = await this.bridgeService.createSite(siteData);
            this.currentSite = newSite;
            this.isDirty = false;

            // Load the new site into the builder
            this.loadSiteIntoBuilder(newSite);

            return newSite;
        } catch (error) {
            console.error('Error creating new site:', error);
            throw error;
        }
    }

    /**
     * Load an existing site
     */
    async loadSite(siteId) {
        try {
            const site = await this.bridgeService.loadSite(siteId);
            this.currentSite = site;
            this.isDirty = false;

            // Load the site into the builder
            this.loadSiteIntoBuilder(site);

            return site;
        } catch (error) {
            console.error('Error loading site:', error);
            throw error;
        }
    }

    /**
     * Save current site data
     */
    async saveSite() {
        if (!this.currentSite) {
            throw new Error('No site loaded');
        }

        try {
            const siteData = this.getSiteDataFromBuilder();
            
            await this.bridgeService.saveSiteDraft(this.currentSite.id, siteData);
            
            this.isDirty = false;
            this.updateSaveStatus('Saved');
            
            return { success: true };
        } catch (error) {
            console.error('Error saving site:', error);
            this.updateSaveStatus('Save failed');
            throw error;
        }
    }

    /**
     * Auto-save site data
     */
    async autoSave() {
        if (!this.currentSite || !this.isDirty || !this.autoSaveEnabled) {
            return;
        }

        try {
            const siteData = this.getSiteDataFromBuilder();
            await this.bridgeService.saveSiteDraft(this.currentSite.id, siteData);
            this.isDirty = false;
            this.updateSaveStatus('Auto-saved');
        } catch (error) {
            console.error('Auto-save error:', error);
            this.updateSaveStatus('Auto-save failed');
        }
    }

    /**
     * Start auto-save
     */
    startAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }

        this.autoSaveInterval = setInterval(() => {
            this.autoSave();
        }, this.autoSaveIntervalMs);
    }

    /**
     * Stop auto-save
     */
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    /**
     * Set up data change detection
     */
    setupDataChangeDetection() {
        // This will be called by the builder when data changes
        // The builder should call this method when any data is modified
        window.markSiteAsDirty = () => {
            this.isDirty = true;
            this.updateSaveStatus('Unsaved changes');
        };
    }

    /**
     * Get site data from builder
     */
    getSiteDataFromBuilder() {
        // This should be implemented by the HTML builder
        if (typeof window.getBuilderSiteData === 'function') {
            return window.getBuilderSiteData();
        }

        // Fallback: return current site data or default
        return this.currentSite ? this.currentSite.draftData : this.getDefaultSiteData();
    }

    /**
     * Load site data into builder
     */
    loadSiteIntoBuilder(site) {
        // This should be implemented by the HTML builder
        if (typeof window.loadBuilderSiteData === 'function') {
            window.loadBuilderSiteData(site.draftData);
        }

        // Update UI
        this.updateSiteInfo(site);
        this.updateSaveStatus('Loaded');
    }

    /**
     * Get default site data
     */
    getDefaultSiteData() {
        return {
            name: 'Untitled Site',
            description: '',
            sections: [
                {
                    type: 'navbar',
                    logoText: 'My Site',
                    menuItems: [
                        { text: 'Home', url: '#' },
                        { text: 'About', url: '#' },
                        { text: 'Contact', url: '#' }
                    ]
                },
                {
                    type: 'hero',
                    title: 'Welcome to My Site',
                    subtitle: 'This is a hero section',
                    buttonText: 'Get Started',
                    buttonUrl: '#'
                },
                {
                    type: 'content',
                    title: 'About Us',
                    content: 'This is a content section. You can edit this text and add more content.'
                },
                {
                    type: 'footer',
                    copyright: '© 2024 My Site. All rights reserved.'
                }
            ],
            theme: {
                primaryColor: '#2563eb',
                secondaryColor: '#1e40af',
                accentColor: '#3b82f6',
                textColor: '#1e293b',
                backgroundColor: '#ffffff',
                fontFamily: 'Inter, sans-serif'
            }
        };
    }

    /**
     * Update site info in UI
     */
    updateSiteInfo(site) {
        const siteNameElement = document.getElementById('site-name');
        if (siteNameElement) {
            siteNameElement.textContent = site.name;
        }

        const siteIdElement = document.getElementById('site-id');
        if (siteIdElement) {
            siteIdElement.textContent = site.id;
        }

        const siteStatusElement = document.getElementById('site-status');
        if (siteStatusElement) {
            siteStatusElement.textContent = site.status;
            siteStatusElement.className = `site-status site-status-${site.status}`;
        }
    }

    /**
     * Update save status in UI
     */
    updateSaveStatus(status) {
        const saveStatusElement = document.getElementById('save-status');
        if (saveStatusElement) {
            saveStatusElement.textContent = status;
            saveStatusElement.className = `save-status save-status-${status.toLowerCase().replace(' ', '-')}`;
        }
    }

    /**
     * Get current site
     */
    getCurrentSite() {
        return this.currentSite;
    }

    /**
     * Check if site has unsaved changes
     */
    hasUnsavedChanges() {
        return this.isDirty;
    }

    /**
     * Mark site as clean
     */
    markAsClean() {
        this.isDirty = false;
        this.updateSaveStatus('Saved');
    }

    /**
     * Get site list for user
     */
    async getUserSites() {
        try {
            return await this.bridgeService.getUserSites();
        } catch (error) {
            console.error('Error getting user sites:', error);
            throw error;
        }
    }

    /**
     * Delete current site
     */
    async deleteCurrentSite() {
        if (!this.currentSite) {
            throw new Error('No site loaded');
        }

        try {
            await this.bridgeService.db.collection('sites').doc(this.currentSite.id).delete();
            this.currentSite = null;
            this.isDirty = false;
            return { success: true };
        } catch (error) {
            console.error('Error deleting site:', error);
            throw error;
        }
    }

    /**
     * Duplicate current site
     */
    async duplicateCurrentSite(newName) {
        if (!this.currentSite) {
            throw new Error('No site loaded');
        }

        try {
            const siteData = {
                name: newName || `${this.currentSite.name} (Copy)`,
                description: this.currentSite.description,
                draftData: this.currentSite.draftData,
            };

            const newSite = await this.bridgeService.createSite(siteData);
            return newSite;
        } catch (error) {
            console.error('Error duplicating site:', error);
            throw error;
        }
    }

    /**
     * Export site data
     */
    exportSiteData() {
        if (!this.currentSite) {
            throw new Error('No site loaded');
        }

        const exportData = {
            ...this.currentSite,
            exportedAt: new Date().toISOString(),
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `${this.currentSite.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
        link.click();
    }

    /**
     * Import site data
     */
    async importSiteData(file) {
        try {
            const text = await file.text();
            const siteData = JSON.parse(text);
            
            // Validate the imported data
            if (!siteData.name || !siteData.draftData) {
                throw new Error('Invalid site data format');
            }

            // Create new site with imported data
            const newSite = await this.bridgeService.createSite({
                name: siteData.name + ' (Imported)',
                description: siteData.description || '',
                draftData: siteData.draftData,
            });

            this.currentSite = newSite;
            this.loadSiteIntoBuilder(newSite);

            return newSite;
        } catch (error) {
            console.error('Error importing site data:', error);
            throw error;
        }
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SiteManager;
}
