/**
 * Site Manager - Handles website management and configuration
 */
class SiteManager {
    constructor(bridgeService) {
        this.bridge = bridgeService;
        this.currentSite = null;
        this.sites = [];
        this.init();
    }

    init() {
        console.log('🌐 Initializing Site Manager...');
        
        // Load existing sites
        this.loadSites();
        
        // Listen for site changes
        this.bridge.on('siteChanged', this.handleSiteChange.bind(this));
        
        console.log('✅ Site Manager initialized');
    }

    async loadSites() {
        try {
            // Try to load from Firebase first
            if (this.bridge.firebase) {
                const result = await this.bridge.loadFromFirebase('sites', 'list');
                if (result.success && result.data) {
                    this.sites = result.data.sites || [];
                    this.bridge.emit('sitesLoaded', this.sites);
                    return { success: true, source: 'firebase' };
                }
            }

            // Fallback to localStorage
            const localResult = this.bridge.loadFromLocalStorage('sites-list');
            if (localResult.success) {
                this.sites = localResult.data || [];
                this.bridge.emit('sitesLoaded', this.sites);
                return { success: true, source: 'localStorage' };
            }

            return { success: false, error: 'No sites found' };
        } catch (error) {
            console.error('❌ Error loading sites:', error);
            return { success: false, error: error.message };
        }
    }

    async createSite(siteData) {
        try {
            const site = {
                id: this.bridge.generateId(),
                name: siteData.name || 'Untitled Site',
                domain: siteData.domain || '',
                description: siteData.description || '',
                status: 'draft',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                settings: {
                    theme: {
                        primaryColor: '#2563eb',
                        secondaryColor: '#1e40af',
                        backgroundColor: '#ffffff',
                        textColor: '#1f293b'
                    },
                    seo: {
                        title: siteData.name || 'Untitled Site',
                        description: siteData.description || '',
                        keywords: []
                    },
                    analytics: {
                        enabled: false,
                        trackingId: ''
                    }
                },
                sections: [],
                pages: ['home']
            };

            this.sites.push(site);
            this.currentSite = site;

            // Save to storage
            await this.saveSites();

            // Set as current site in bridge
            this.bridge.setData('currentSite', site);
            this.bridge.setData('sections', site.sections);
            this.bridge.setData('theme', site.settings.theme);

            this.bridge.emit('siteCreated', site);
            console.log('✅ Site created successfully');
            return { success: true, site };
        } catch (error) {
            console.error('❌ Error creating site:', error);
            return { success: false, error: error.message };
        }
    }

    async updateSite(siteId, updates) {
        try {
            const siteIndex = this.sites.findIndex(site => site.id === siteId);
            if (siteIndex === -1) {
                return { success: false, error: 'Site not found' };
            }

            // Update site data
            this.sites[siteIndex] = {
                ...this.sites[siteIndex],
                ...updates,
                updatedAt: new Date().toISOString()
            };

            // If this is the current site, update bridge data
            if (this.currentSite && this.currentSite.id === siteId) {
                this.currentSite = this.sites[siteIndex];
                this.bridge.setData('currentSite', this.currentSite);
                
                if (updates.sections) {
                    this.bridge.setData('sections', updates.sections);
                }
                if (updates.settings && updates.settings.theme) {
                    this.bridge.setData('theme', updates.settings.theme);
                }
            }

            // Save to storage
            await this.saveSites();

            this.bridge.emit('siteUpdated', this.sites[siteIndex]);
            console.log('✅ Site updated successfully');
            return { success: true, site: this.sites[siteIndex] };
        } catch (error) {
            console.error('❌ Error updating site:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteSite(siteId) {
        try {
            const siteIndex = this.sites.findIndex(site => site.id === siteId);
            if (siteIndex === -1) {
                return { success: false, error: 'Site not found' };
            }

            const deletedSite = this.sites.splice(siteIndex, 1)[0];

            // If this was the current site, clear it
            if (this.currentSite && this.currentSite.id === siteId) {
                this.currentSite = null;
                this.bridge.setData('currentSite', null);
                this.bridge.setData('sections', []);
            }

            // Save to storage
            await this.saveSites();

            this.bridge.emit('siteDeleted', deletedSite);
            console.log('✅ Site deleted successfully');
            return { success: true, site: deletedSite };
        } catch (error) {
            console.error('❌ Error deleting site:', error);
            return { success: false, error: error.message };
        }
    }

    async loadSite(siteId) {
        try {
            const site = this.sites.find(s => s.id === siteId);
            if (!site) {
                return { success: false, error: 'Site not found' };
            }

            this.currentSite = site;

            // Update bridge data
            this.bridge.setData('currentSite', site);
            this.bridge.setData('sections', site.sections);
            this.bridge.setData('theme', site.settings.theme);

            this.bridge.emit('siteLoaded', site);
            console.log('✅ Site loaded successfully');
            return { success: true, site };
        } catch (error) {
            console.error('❌ Error loading site:', error);
            return { success: false, error: error.message };
        }
    }

    async saveSites() {
        try {
            const sitesData = {
                sites: this.sites,
                lastUpdated: new Date().toISOString()
            };

            // Save to localStorage
            this.bridge.saveToLocalStorage('sites-list', sitesData);

            // Save to Firebase if available
            if (this.bridge.firebase) {
                await this.bridge.saveToFirebase('sites', 'list', sitesData);
            }

            return { success: true };
        } catch (error) {
            console.error('❌ Error saving sites:', error);
            return { success: false, error: error.message };
        }
    }

    async publishSite(siteId, options = {}) {
        try {
            const site = this.sites.find(s => s.id === siteId);
            if (!site) {
                return { success: false, error: 'Site not found' };
            }

            // Update site status
            await this.updateSite(siteId, {
                status: 'published',
                publishedAt: new Date().toISOString(),
                publishedUrl: options.url || `https://${site.domain || 'example.com'}`
            });

            // Generate publish data
            const publishData = {
                siteId: siteId,
                html: this.generateSiteHTML(site),
                css: this.generateSiteCSS(site),
                js: this.generateSiteJS(site),
                assets: this.collectSiteAssets(site),
                metadata: {
                    publishedAt: new Date().toISOString(),
                    version: '1.0.0'
                }
            };

            // Save publish data
            if (this.bridge.firebase) {
                await this.bridge.saveToFirebase('published-sites', siteId, publishData);
            }

            this.bridge.emit('sitePublished', { site, publishData });
            console.log('✅ Site published successfully');
            return { success: true, publishData };
        } catch (error) {
            console.error('❌ Error publishing site:', error);
            return { success: false, error: error.message };
        }
    }

    generateSiteHTML(site) {
        const sections = site.sections || [];
        const theme = site.settings.theme || {};
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${site.settings.seo.title || site.name}</title>
    <meta name="description" content="${site.settings.seo.description || ''}">
    <meta name="keywords" content="${site.settings.seo.keywords.join(', ') || ''}">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary-color: ${theme.primaryColor || '#2563eb'};
            --secondary-color: ${theme.secondaryColor || '#1e40af'};
            --background-color: ${theme.backgroundColor || '#ffffff'};
            --text-color: ${theme.textColor || '#1f293b'};
        }
        
        body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background-color: var(--background-color);
            color: var(--text-color);
            line-height: 1.6;
        }
    </style>
</head>
<body>
    ${sections.map(section => `
    <div class="section" style="${section.styles || ''}">
        ${section.content || ''}
    </div>`).join('\n')}
</body>
</html>`;
    }

    generateSiteCSS(site) {
        const theme = site.settings.theme || {};
        return `
:root {
    --primary-color: ${theme.primaryColor || '#2563eb'};
    --secondary-color: ${theme.secondaryColor || '#1e40af'};
    --background-color: ${theme.backgroundColor || '#ffffff'};
    --text-color: ${theme.textColor || '#1f293b'};
}

body {
    margin: 0;
    padding: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background-color: var(--background-color);
    color: var(--text-color);
    line-height: 1.6;
}

.section {
    min-height: 200px;
    padding: 40px 20px;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

@media (max-width: 768px) {
    .section {
        padding: 20px 10px;
    }
    
    .container {
        padding: 0 10px;
    }
}`;
    }

    generateSiteJS(site) {
        return `
// Site JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize site functionality
    console.log('Site loaded successfully');
    
    // Add any custom JavaScript here
});
`;
    }

    collectSiteAssets(site) {
        const assets = [];
        const sections = site.sections || [];
        
        sections.forEach(section => {
            if (section.assets) {
                assets.push(...section.assets);
            }
        });
        
        return assets;
    }

    getCurrentSite() {
        return this.currentSite;
    }

    getAllSites() {
        return this.sites;
    }

    handleSiteChange(event) {
        // Handle site changes from bridge
        if (event.data && event.data.sections) {
            this.updateSite(this.currentSite.id, { sections: event.data.sections });
        }
    }

    async duplicateSite(siteId) {
        try {
            const originalSite = this.sites.find(s => s.id === siteId);
            if (!originalSite) {
                return { success: false, error: 'Site not found' };
            }

            const duplicatedSite = {
                ...originalSite,
                id: this.bridge.generateId(),
                name: `${originalSite.name} (Copy)`,
                status: 'draft',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            this.sites.push(duplicatedSite);
            await this.saveSites();

            this.bridge.emit('siteDuplicated', duplicatedSite);
            console.log('✅ Site duplicated successfully');
            return { success: true, site: duplicatedSite };
        } catch (error) {
            console.error('❌ Error duplicating site:', error);
            return { success: false, error: error.message };
        }
    }
}

// Make SiteManager available globally
window.SiteManager = SiteManager;
