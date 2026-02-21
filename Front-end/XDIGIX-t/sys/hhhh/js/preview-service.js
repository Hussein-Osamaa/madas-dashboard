/**
 * Preview Service - Handles temporary preview functionality
 * Creates 24-hour expiring preview links and manages preview data
 */

class PreviewService {
    constructor(bridgeService) {
        this.bridgeService = bridgeService;
        this.currentPreviewId = null;
        this.previewWindow = null;
        this.previewData = null;
    }

    /**
     * Create a temporary preview link
     */
    async createPreview(siteData) {
        if (!this.bridgeService.isAuthenticated()) {
            throw new Error('User must be authenticated to create preview');
        }

        try {
            // Get current site ID or create a temporary one
            const siteId = this.bridgeService.currentSiteId || 'temp-' + Date.now();
            
            // Create preview link
            const previewResult = await this.bridgeService.createPreviewLink(siteId, siteData);
            
            this.currentPreviewId = previewResult.previewId;
            this.previewData = {
                siteId: siteId,
                siteData: siteData,
                previewUrl: previewResult.previewUrl,
                expiresAt: previewResult.expiresAt,
            };

            return previewResult;
        } catch (error) {
            console.error('Error creating preview:', error);
            throw error;
        }
    }

    /**
     * Open preview in new window
     */
    async openPreview(siteData) {
        try {
            // Create preview if not exists
            if (!this.currentPreviewId) {
                await this.createPreview(siteData);
            }

            // Open preview in new window
            this.previewWindow = window.open(
                this.previewData.previewUrl,
                'preview',
                'width=1200,height=800,scrollbars=yes,resizable=yes'
            );

            // Focus the preview window
            if (this.previewWindow) {
                this.previewWindow.focus();
            }

            return this.previewData;
        } catch (error) {
            console.error('Error opening preview:', error);
            throw error;
        }
    }

    /**
     * Update existing preview with new data
     */
    async updatePreview(siteData) {
        if (!this.currentPreviewId) {
            return await this.createPreview(siteData);
        }

        try {
            // Update the preview data in Firestore
            await this.bridgeService.db
                .collection('preview_links')
                .doc(this.currentPreviewId)
                .update({
                    siteData: siteData,
                    updatedAt: this.bridgeService.firebase.firestore.FieldValue.serverTimestamp(),
                });

            this.previewData.siteData = siteData;

            // Refresh preview window if open
            if (this.previewWindow && !this.previewWindow.closed) {
                this.previewWindow.location.reload();
            }

            return this.previewData;
        } catch (error) {
            console.error('Error updating preview:', error);
            throw error;
        }
    }

    /**
     * Close preview window
     */
    closePreview() {
        if (this.previewWindow && !this.previewWindow.closed) {
            this.previewWindow.close();
            this.previewWindow = null;
        }
    }

    /**
     * Get preview URL
     */
    getPreviewUrl() {
        return this.previewData ? this.previewData.previewUrl : null;
    }

    /**
     * Check if preview is active
     */
    isPreviewActive() {
        return this.currentPreviewId !== null && this.previewData !== null;
    }

    /**
     * Get preview expiration time
     */
    getPreviewExpiration() {
        return this.previewData ? this.previewData.expiresAt : null;
    }

    /**
     * Check if preview is expired
     */
    isPreviewExpired() {
        if (!this.previewData) return true;
        return new Date() > new Date(this.previewData.expiresAt);
    }

    /**
     * Auto-save preview data
     */
    startAutoSave(intervalMs = 30000) { // 30 seconds
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }

        this.autoSaveInterval = setInterval(async () => {
            try {
                if (this.isPreviewActive() && !this.isPreviewExpired()) {
                    const siteData = this.bridgeService.getSiteDataFromBuilder();
                    await this.updatePreview(siteData);
                    console.log('Preview auto-saved');
                }
            } catch (error) {
                console.error('Auto-save preview error:', error);
            }
        }, intervalMs);
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
     * Clean up expired previews
     */
    async cleanupExpiredPreviews() {
        try {
            const now = new Date();
            const expiredPreviews = await this.bridgeService.db
                .collection('preview_links')
                .where('expiresAt', '<', now)
                .get();

            const batch = this.bridgeService.db.batch();
            expiredPreviews.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            console.log(`Cleaned up ${expiredPreviews.docs.length} expired previews`);
        } catch (error) {
            console.error('Error cleaning up expired previews:', error);
        }
    }

    /**
     * Get preview status for UI
     */
    getPreviewStatus() {
        if (!this.isPreviewActive()) {
            return {
                status: 'inactive',
                message: 'No preview active',
                canPreview: true,
            };
        }

        if (this.isPreviewExpired()) {
            return {
                status: 'expired',
                message: 'Preview expired',
                canPreview: true,
            };
        }

        const expiresAt = new Date(this.previewData.expiresAt);
        const timeLeft = expiresAt - new Date();
        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

        return {
            status: 'active',
            message: `Preview active (expires in ${hoursLeft}h ${minutesLeft}m)`,
            canPreview: true,
            previewUrl: this.previewData.previewUrl,
            expiresAt: this.previewData.expiresAt,
        };
    }

    /**
     * Show preview status in UI
     */
    updatePreviewStatusUI() {
        const status = this.getPreviewStatus();
        const statusElement = document.getElementById('preview-status');
        
        if (statusElement) {
            statusElement.textContent = status.message;
            statusElement.className = `preview-status preview-status-${status.status}`;
        }

        // Update preview button
        const previewButton = document.getElementById('preview-btn');
        if (previewButton) {
            if (status.status === 'active') {
                previewButton.textContent = 'Update Preview';
                previewButton.classList.add('preview-active');
            } else {
                previewButton.textContent = 'Preview';
                previewButton.classList.remove('preview-active');
            }
        }
    }

    /**
     * Initialize preview service
     */
    initialize() {
        // Update status every minute
        setInterval(() => {
            this.updatePreviewStatusUI();
        }, 60000);

        // Clean up expired previews every hour
        setInterval(() => {
            this.cleanupExpiredPreviews();
        }, 3600000);

        // Initial status update
        this.updatePreviewStatusUI();
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PreviewService;
}
