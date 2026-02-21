// Modal Manager for Mobile App
// Handles modal state, animations, and user interactions

export class ModalManager {
    constructor(app) {
        this.app = app;
        this.activeModals = new Set();
        this.modalStack = [];
        this.maxModalStack = 5;
        
        this.initialize();
    }
    
    initialize() {
        console.log('🪟 Initializing Modal Manager...');
        
        // Setup modal event listeners
        this.setupEventListeners();
        
        // Initialize modal states
        this.initializeModalStates();
        
        console.log('✅ Modal Manager initialized');
    }
    
    setupEventListeners() {
        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModals.size > 0) {
                this.closeTopModal();
            }
        });
        
        // Handle modal overlay clicks
        this.app.elements.modalOverlay?.addEventListener('click', (e) => {
            if (e.target === this.app.elements.modalOverlay) {
                this.closeTopModal();
            }
        });
        
        // Handle back button for modals
        window.addEventListener('popstate', (e) => {
            if (this.activeModals.size > 0) {
                e.preventDefault();
                this.closeTopModal();
            }
        });
    }
    
    initializeModalStates() {
        // Initialize all modals as hidden
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.add('hidden');
        });
        
        // Hide overlay
        if (this.app.elements.modalOverlay) {
            this.app.elements.modalOverlay.classList.add('hidden');
        }
    }
    
    // Modal management
    openModal(modalId, options = {}) {
        try {
            console.log(`🪟 Opening modal: ${modalId}`);
            
            const modal = document.getElementById(modalId);
            if (!modal) {
                console.error(`❌ Modal not found: ${modalId}`);
                return false;
            }
            
            // Check if already open
            if (this.activeModals.has(modalId)) {
                console.log(`⚠️ Modal already open: ${modalId}`);
                return true;
            }
            
            // Add to active modals
            this.activeModals.add(modalId);
            this.modalStack.push(modalId);
            
            // Limit stack size
            if (this.modalStack.length > this.maxModalStack) {
                const removedModal = this.modalStack.shift();
                this.activeModals.delete(removedModal);
            }
            
            // Show modal
            modal.classList.remove('hidden');
            
            // Show overlay if this is the first modal
            if (this.activeModals.size === 1) {
                this.showOverlay();
            }
            
            // Add modal-specific classes
            if (options.fullscreen) {
                modal.classList.add('modal-fullscreen');
            }
            if (options.large) {
                modal.classList.add('modal-large');
            }
            if (options.small) {
                modal.classList.add('modal-small');
            }
            
            // Focus management
            this.manageFocus(modal, 'open');
            
            // Animation
            this.animateModal(modal, 'in');
            
            // Custom modal initialization
            this.initializeModal(modalId, options.data);
            
            // Update URL for deep linking
            if (options.updateURL !== false) {
                this.updateURL(modalId);
            }
            
            console.log(`✅ Modal opened: ${modalId}`);
            return true;
            
        } catch (error) {
            console.error(`❌ Failed to open modal ${modalId}:`, error);
            return false;
        }
    }
    
    closeModal(modalId, options = {}) {
        try {
            console.log(`🪟 Closing modal: ${modalId}`);
            
            const modal = document.getElementById(modalId);
            if (!modal) {
                console.error(`❌ Modal not found: ${modalId}`);
                return false;
            }
            
            // Check if modal is open
            if (!this.activeModals.has(modalId)) {
                console.log(`⚠️ Modal not open: ${modalId}`);
                return false;
            }
            
            // Remove from active modals
            this.activeModals.delete(modalId);
            
            // Remove from stack
            const stackIndex = this.modalStack.indexOf(modalId);
            if (stackIndex > -1) {
                this.modalStack.splice(stackIndex, 1);
            }
            
            // Animation
            this.animateModal(modal, 'out').then(() => {
                // Hide modal
                modal.classList.add('hidden');
                
                // Remove modal-specific classes
                modal.classList.remove('modal-fullscreen', 'modal-large', 'modal-small');
                
                // Hide overlay if no more modals
                if (this.activeModals.size === 0) {
                    this.hideOverlay();
                }
                
                // Focus management
                this.manageFocus(modal, 'close');
                
                // Custom modal cleanup
                this.cleanupModal(modalId);
                
                // Update URL
                if (options.updateURL !== false) {
                    this.updateURL(null);
                }
                
                console.log(`✅ Modal closed: ${modalId}`);
            });
            
            return true;
            
        } catch (error) {
            console.error(`❌ Failed to close modal ${modalId}:`, error);
            return false;
        }
    }
    
    closeTopModal() {
        if (this.modalStack.length > 0) {
            const topModal = this.modalStack[this.modalStack.length - 1];
            this.closeModal(topModal);
        }
    }
    
    closeAllModals() {
        console.log('🪟 Closing all modals');
        
        const modalsToClose = [...this.activeModals];
        modalsToClose.forEach(modalId => {
            this.closeModal(modalId);
        });
        
        this.activeModals.clear();
        this.modalStack = [];
    }
    
    // Modal animations
    animateModal(modal, direction) {
        return new Promise((resolve) => {
            const isIn = direction === 'in';
            const animationClass = isIn ? 'modal-slide-in' : 'modal-slide-out';
            
            modal.classList.add(animationClass);
            
            const handleAnimationEnd = () => {
                modal.classList.remove(animationClass);
                modal.removeEventListener('animationend', handleAnimationEnd);
                resolve();
            };
            
            modal.addEventListener('animationend', handleAnimationEnd);
            
            // Fallback timeout
            setTimeout(resolve, 300);
        });
    }
    
    // Focus management
    manageFocus(modal, action) {
        try {
            if (action === 'open') {
                // Focus first focusable element
                const focusableElements = modal.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                
                if (focusableElements.length > 0) {
                    focusableElements[0].focus();
                } else {
                    modal.focus();
                }
                
                // Trap focus within modal
                this.trapFocus(modal);
                
            } else if (action === 'close') {
                // Return focus to trigger element
                const triggerElement = document.activeElement;
                if (triggerElement && triggerElement !== document.body) {
                    triggerElement.focus();
                }
            }
            
        } catch (error) {
            console.error('❌ Focus management failed:', error);
        }
    }
    
    trapFocus(modal) {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        const handleKeyDown = (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };
        
        modal.addEventListener('keydown', handleKeyDown);
        
        // Store cleanup function
        modal._focusTrapCleanup = () => {
            modal.removeEventListener('keydown', handleKeyDown);
        };
    }
    
    // Overlay management
    showOverlay() {
        if (this.app.elements.modalOverlay) {
            this.app.elements.modalOverlay.classList.remove('hidden');
            this.animateOverlay('in');
        }
    }
    
    hideOverlay() {
        if (this.app.elements.modalOverlay) {
            this.animateOverlay('out').then(() => {
                this.app.elements.modalOverlay.classList.add('hidden');
            });
        }
    }
    
    animateOverlay(direction) {
        return new Promise((resolve) => {
            if (!this.app.elements.modalOverlay) {
                resolve();
                return;
            }
            
            const isIn = direction === 'in';
            const animationClass = isIn ? 'overlay-fade-in' : 'overlay-fade-out';
            
            this.app.elements.modalOverlay.classList.add(animationClass);
            
            const handleAnimationEnd = () => {
                this.app.elements.modalOverlay.classList.remove(animationClass);
                this.app.elements.modalOverlay.removeEventListener('animationend', handleAnimationEnd);
                resolve();
            };
            
            this.app.elements.modalOverlay.addEventListener('animationend', handleAnimationEnd);
            
            // Fallback timeout
            setTimeout(resolve, 200);
        });
    }
    
    // Custom modal initialization
    initializeModal(modalId, data = {}) {
        // Profile modal
        if (modalId === 'profile-modal') {
            this.initializeProfileModal(data);
        }
        
        // Notifications modal
        else if (modalId === 'notifications-modal') {
            this.initializeNotificationsModal(data);
        }
        
        // Custom modal callbacks
        const modalElement = document.getElementById(modalId);
        if (modalElement && modalElement._onOpen) {
            modalElement._onOpen(data);
        }
    }
    
    initializeProfileModal(data) {
        // Profile modal is already initialized in the main app
        // This is a placeholder for additional profile modal logic
    }
    
    initializeNotificationsModal(data) {
        // Load notifications
        if (this.app.loadNotifications) {
            this.app.loadNotifications();
        }
    }
    
    cleanupModal(modalId) {
        // Custom cleanup for specific modals
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            // Remove focus trap
            if (modalElement._focusTrapCleanup) {
                modalElement._focusTrapCleanup();
            }
            
            // Custom cleanup callback
            if (modalElement._onClose) {
                modalElement._onClose();
            }
        }
    }
    
    // URL management
    updateURL(modalId) {
        try {
            const url = new URL(window.location);
            
            if (modalId) {
                url.searchParams.set('modal', modalId);
            } else {
                url.searchParams.delete('modal');
            }
            
            window.history.replaceState({}, '', url);
            
        } catch (error) {
            console.error('❌ Failed to update URL:', error);
        }
    }
    
    // Modal utilities
    getActiveModals() {
        return Array.from(this.activeModals);
    }
    
    isModalOpen(modalId) {
        return this.activeModals.has(modalId);
    }
    
    getModalStack() {
        return [...this.modalStack];
    }
    
    // Predefined modal methods
    showProfileModal(data = {}) {
        return this.openModal('profile-modal', { data });
    }
    
    hideProfileModal() {
        return this.closeModal('profile-modal');
    }
    
    showNotificationsModal(data = {}) {
        return this.openModal('notifications-modal', { data });
    }
    
    hideNotificationsModal() {
        return this.closeModal('notifications-modal');
    }
    
    // Custom modal creation
    createModal(config) {
        const {
            id,
            title,
            content,
            actions = [],
            options = {}
        } = config;
        
        // Create modal element
        const modal = document.createElement('div');
        modal.id = id;
        modal.className = 'modal hidden';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="close-modal" data-modal="${id}">
                        <span class="material-icons">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                ${actions.length > 0 ? `
                    <div class="modal-footer">
                        ${actions.map(action => `
                            <button class="modal-action-btn ${action.class || ''}" data-action="${action.id}">
                                ${action.label}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        
        // Add to DOM
        document.body.appendChild(modal);
        
        // Setup event listeners
        const closeBtn = modal.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeModal(id);
            });
        }
        
        // Setup action buttons
        actions.forEach(action => {
            const actionBtn = modal.querySelector(`[data-action="${action.id}"]`);
            if (actionBtn && action.handler) {
                actionBtn.addEventListener('click', action.handler);
            }
        });
        
        // Setup custom callbacks
        if (options.onOpen) {
            modal._onOpen = options.onOpen;
        }
        
        if (options.onClose) {
            modal._onClose = options.onClose;
        }
        
        return modal;
    }
    
    // Confirmation modal
    showConfirmation(title, message, onConfirm, onCancel = null) {
        const modalId = 'confirmation-modal';
        
        // Remove existing confirmation modal
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = this.createModal({
            id: modalId,
            title,
            content: `<p>${message}</p>`,
            actions: [
                {
                    id: 'cancel',
                    label: 'Cancel',
                    class: 'secondary',
                    handler: () => {
                        this.closeModal(modalId);
                        if (onCancel) onCancel();
                    }
                },
                {
                    id: 'confirm',
                    label: 'Confirm',
                    class: 'primary',
                    handler: () => {
                        this.closeModal(modalId);
                        if (onConfirm) onConfirm();
                    }
                }
            ]
        });
        
        this.openModal(modalId);
        return modal;
    }
    
    // Alert modal
    showAlert(title, message, onOk = null) {
        const modalId = 'alert-modal';
        
        // Remove existing alert modal
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = this.createModal({
            id: modalId,
            title,
            content: `<p>${message}</p>`,
            actions: [
                {
                    id: 'ok',
                    label: 'OK',
                    class: 'primary',
                    handler: () => {
                        this.closeModal(modalId);
                        if (onOk) onOk();
                    }
                }
            ]
        });
        
        this.openModal(modalId);
        return modal;
    }
    
    // Loading modal
    showLoading(title = 'Loading...', message = 'Please wait') {
        const modalId = 'loading-modal';
        
        // Remove existing loading modal
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = this.createModal({
            id: modalId,
            title,
            content: `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <p>${message}</p>
                </div>
            `,
            actions: [],
            options: {
                onOpen: () => {
                    // Prevent closing loading modal
                    const closeBtn = modal.querySelector('.close-modal');
                    if (closeBtn) {
                        closeBtn.style.display = 'none';
                    }
                }
            }
        });
        
        this.openModal(modalId, { updateURL: false });
        return modal;
    }
    
    hideLoading() {
        this.closeModal('loading-modal', { updateURL: false });
    }
}
