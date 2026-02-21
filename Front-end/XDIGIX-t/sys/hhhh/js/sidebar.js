// Mobile sidebar toggle (burger menu) - shared across dashboard pages
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('menu-toggle');

    if (!sidebar || !toggleBtn) return;

    const closeSidebar = () => sidebar.classList.add('-translate-x-full');
    const openSidebar = () => sidebar.classList.remove('-translate-x-full');

    // Toggle on burger click
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('-translate-x-full');
    });

    // Close when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (
            window.innerWidth < 1024 &&
            !sidebar.contains(e.target) &&
            !toggleBtn.contains(e.target)
        ) {
            closeSidebar();
        }
    });

    // Ensure sidebar is visible on desktop resize
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024) {
            openSidebar();
        }
    });

    // Close after navigating via a sidebar link on mobile
    sidebar.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 1024) closeSidebar();
        });
    });
});


