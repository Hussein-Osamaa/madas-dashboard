/**
 * Dark Mode Toggle Script
 * Handles dark mode functionality across all dashboard pages
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🌙 Dark mode script loaded');
    const darkToggle = document.getElementById('darkToggle');
    const darkIcon = document.getElementById('darkToggleIcon');
    
    if (!darkToggle || !darkIcon) {
        console.error('❌ Dark mode toggle elements not found');
        console.log('darkToggle:', darkToggle);
        console.log('darkIcon:', darkIcon);
        return;
    }
    
    console.log('✅ Dark mode toggle elements found');
    
    function setDarkMode(on) {
        console.log('🌙 Setting dark mode to:', on);
        document.body.classList.toggle('dark-mode', on);
        localStorage.setItem('dark-mode', on ? '1' : '0');
        console.log('🌙 Dark mode class applied:', document.body.classList.contains('dark-mode'));
        
        // Update icon based on mode
        if (on) {
            // Moon icon for dark mode
            darkIcon.innerHTML = '<path d="M21.64 13.64A9 9 0 1 1 10.36 2.36a7 7 0 1 0 11.28 11.28z"/>';
            console.log('🌙 Icon set to moon (dark mode)');
        } else {
            // Sun icon for light mode - simple and reliable
            darkIcon.innerHTML = '<path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"/>';
            console.log('☀️ Icon set to sun (light mode)');
        }
    }
    
    // Add click event listener
    darkToggle.addEventListener('click', () => {
        console.log('🌙 Dark mode toggle clicked');
        const isDarkMode = document.body.classList.contains('dark-mode');
        console.log('Current dark mode state:', isDarkMode);
        setDarkMode(!isDarkMode);
    });
    
    // Initialize dark mode from localStorage
    const savedMode = localStorage.getItem('dark-mode');
    console.log('🌙 Saved dark mode from localStorage:', savedMode);
    if (savedMode === '1') {
        console.log('🌙 Initializing dark mode from localStorage');
        setDarkMode(true);
    } else {
        console.log('☀️ Initializing light mode');
        setDarkMode(false);
    }
    
    // Make setDarkMode available globally for other scripts
    window.setDarkMode = setDarkMode;
});
