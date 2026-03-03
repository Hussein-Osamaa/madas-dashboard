// Mobile Interface for MADAS Dashboard
class MobileInterface {
    constructor() {
        this.isMobile = this.detectMobile();
        this.init();
    }

    init() {
        console.log('📱 Mobile Interface initialized');
        this.setupMobileFeatures();
        this.setupTouchGestures();
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }

    setupMobileFeatures() {
        if (this.isMobile) {
            document.body.classList.add('mobile-device');
            console.log('📱 Mobile device detected');
        }
        this.setupViewport();
        this.setupTouchInteractions();
    }

    setupViewport() {
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
        }
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    }

    setupTouchInteractions() {
        const buttons = document.querySelectorAll('button, .btn, [role="button"]');
        buttons.forEach(button => {
            button.style.minHeight = '44px';
            button.style.minWidth = '44px';
        });
    }

    setupTouchGestures() {
        let startX, startY, endX, endY;

        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });

        document.addEventListener('touchend', (e) => {
            endX = e.changedTouches[0].clientX;
            endY = e.changedTouches[0].clientY;
            
            const diffX = startX - endX;
            const diffY = startY - endY;
            
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                if (diffX > 0) {
                    this.handleSwipeLeft();
                } else {
                    this.handleSwipeRight();
                }
            }
        });
    }

    handleSwipeLeft() {
        console.log('👈 Swipe left detected');
        const sidebar = document.getElementById('sidebar');
        if (sidebar && !sidebar.classList.contains('-translate-x-full')) {
            sidebar.classList.add('-translate-x-full');
        }
    }

    handleSwipeRight() {
        console.log('👉 Swipe right detected');
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('-translate-x-full')) {
            sidebar.classList.remove('-translate-x-full');
        }
    }

    isMobileDevice() {
        return this.isMobile;
    }
}

// Initialize Mobile Interface
window.mobileInterface = new MobileInterface();
window.MobileInterface = MobileInterface;

console.log('✅ Mobile Interface loaded');