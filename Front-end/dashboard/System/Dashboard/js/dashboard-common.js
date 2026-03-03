// Common Dashboard Scripts - Include this in all dashboard pages
(function() {
    'use strict';

    // Common dashboard functionality
    const DashboardCommon = {
        init: function() {
            this.setupLogout();
            this.setupNavigation();
            this.setupUserSession();
        },

        setupLogout: function() {
            // Include universal logout script
            const script = document.createElement('script');
            script.src = '../../Assets/JS/universal-logout.js';
            script.onload = function() {
                console.log('✅ Universal logout loaded');
            };
            document.head.appendChild(script);
        },

        setupNavigation: function() {
            // Add back to dashboard link if not on main dashboard
            if (!window.location.pathname.includes('/index.html')) {
                this.addBackToDashboardLink();
            }
        },

        addBackToDashboardLink: function() {
            // Find the sidebar or navigation area
            const sidebar = document.querySelector('#sidebar, .sidebar, nav');
            if (sidebar) {
                const backLink = document.createElement('a');
                backLink.href = '../index.html';
                backLink.className = 'sidebar-link flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-[var(--madas-light)] hover:text-[var(--madas-primary)] transition-all';
                backLink.innerHTML = `
                    <span class="material-icons">dashboard</span>
                    <span>Back to Dashboard</span>
                `;
                
                // Insert at the beginning of sidebar
                sidebar.insertBefore(backLink, sidebar.firstChild);
            }
        },

        setupUserSession: function() {
            // Include user session management
            const script = document.createElement('script');
            script.src = '../../Assets/JS/user-session.js';
            script.onload = function() {
                console.log('✅ User session management loaded');
            };
            document.head.appendChild(script);
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => DashboardCommon.init());
    } else {
        DashboardCommon.init();
    }

    // Make it globally available
    window.DashboardCommon = DashboardCommon;

})();
