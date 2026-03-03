// Simple JavaScript for the futuristic website

document.addEventListener('DOMContentLoaded', function() {
    // Handle navigation links
    const navLinks = document.querySelectorAll('a[href^="#"], a[href$=".html"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Handle internal page links - allow normal navigation
            if (href.endsWith('.html')) {
                // Let the browser handle the navigation
                return;
            }
            
            // Handle anchor links for smooth scrolling
            if (href.startsWith('#')) {
                e.preventDefault();
                
                const targetId = href;
                const targetSection = document.querySelector(targetId);
                
                if (targetSection) {
                    targetSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    // Add active class to navigation links based on scroll position
    const sections = document.querySelectorAll('section[id]');
    const navLinksArray = Array.from(navLinks);

    function updateActiveNavLink() {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (window.pageYOffset >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });

        navLinksArray.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    }

    // Update active nav link on scroll
    window.addEventListener('scroll', updateActiveNavLink);

    // Add parallax effect to floating elements
    const floatingElements = document.querySelectorAll('.floating-element');
    
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        
        floatingElements.forEach((element, index) => {
            const speed = (index + 1) * 0.3;
            element.style.transform = `translateY(${rate * speed}px)`;
        });
    });

    // Add hover effects to glass cards
    const glassCards = document.querySelectorAll('.glass-card');
    
    glassCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Add typing effect to hero title
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        // Wait for language initialization to complete
        const startTypewriter = () => {
            // Check if language is initialized
            if (!window.languageInitialized) {
                console.log('⏳ Waiting for language initialization...');
                setTimeout(startTypewriter, 100);
                return;
            }
            
            // Get the current language
            const currentLang = document.documentElement.getAttribute('lang') || 'en';
            const text = heroTitle.getAttribute(`data-${currentLang}`) || heroTitle.getAttribute('data-en');
            
            // Debug logging
            console.log('🎬 Starting typewriter - Language:', currentLang);
            console.log('🎬 Typewriter - Text to display:', text);
            console.log('🎬 Typewriter - Text length:', text.length);
            
            // Clear any existing content
            heroTitle.innerHTML = '';
            
            let i = 0;
            const typeWriter = () => {
                if (i < text.length) {
                    // Use innerHTML for proper Arabic text rendering
                    heroTitle.innerHTML = text.substring(0, i + 1);
                    i++;
                    setTimeout(typeWriter, currentLang === 'ar' ? 150 : 100); // Slower for Arabic
                }
            };
            
            // Start typing effect
            typeWriter();
        };
        
        // Start typing effect after a delay to ensure everything is ready
        setTimeout(startTypewriter, 500);
    }

    // Add glow effect to buttons on hover
    const buttons = document.querySelectorAll('.glass-button');
    
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.boxShadow = '0 0 30px rgba(0, 245, 255, 0.5)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.boxShadow = 'var(--shadow-glass)';
        });
    });

    // Add intersection observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe all glass cards for fade-in effect
    glassCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });

    // Add click effect to buttons
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Create ripple effect
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });

    // Add CSS for ripple effect
    const style = document.createElement('style');
    style.textContent = `
        .glass-button {
            position: relative;
            overflow: hidden;
        }
        
        .ripple {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            transform: scale(0);
            animation: ripple-animation 0.6s linear;
            pointer-events: none;
        }
        
        @keyframes ripple-animation {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    // Performance optimization - detect low-end devices
    const isLowEndDevice = navigator.hardwareConcurrency <= 2 || 
                          /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Enhanced Background Effects (reduced on low-end devices)
    if (!isLowEndDevice) {
        initParticleSystem();
        initGeometricShapes();
        initCursorTrail();
        initMouseInteractions();
    } else {
        // Minimal effects for low-end devices
        initMinimalEffects();
    }
    
    initMobileNavigation();
    initLanguageToggle();
    initIconFallback();

    console.log('🚀 Next Gen Coders website loaded successfully!');
    console.log('✨ Futuristic liquid glass design active');
    console.log('🎨 All animations and effects initialized');
    console.log('🌟 Enhanced background effects loaded');
    console.log('🌍 Language toggle ready');
});

// Optimized Particle System
function initParticleSystem() {
    const particleSystem = document.getElementById('particleSystem');
    const particleCount = 20; // Reduced from 50 to 20
    
    for (let i = 0; i < particleCount; i++) {
        createParticle(particleSystem);
    }
    
    // Reduced frequency of particle creation
    setInterval(() => {
        if (particleSystem.children.length < particleCount) {
            createParticle(particleSystem);
        }
    }, 4000); // Increased from 2000ms to 4000ms
}

function createParticle(container) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Random size between 2-8px
    const size = Math.random() * 6 + 2;
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    
    // Random starting position
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 20 + 's';
    particle.style.animationDuration = (Math.random() * 10 + 15) + 's';
    
    container.appendChild(particle);
    
    // Remove particle after animation
    setTimeout(() => {
        if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
        }
    }, 25000);
}

// Optimized Geometric Shapes
function initGeometricShapes() {
    const shapesContainer = document.getElementById('geometricShapes');
    const shapeTypes = ['triangle', 'square', 'circle'];
    const shapeCount = 8; // Reduced from 15 to 8
    
    for (let i = 0; i < shapeCount; i++) {
        createGeometricShape(shapesContainer, shapeTypes);
    }
}

function createGeometricShape(container, shapeTypes) {
    const shape = document.createElement('div');
    const shapeType = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
    
    shape.className = `geometric-shape ${shapeType}`;
    
    // Random position
    shape.style.left = Math.random() * 100 + '%';
    shape.style.top = Math.random() * 100 + '%';
    
    // Random animation delay and duration
    shape.style.animationDelay = Math.random() * 25 + 's';
    shape.style.animationDuration = (Math.random() * 10 + 20) + 's';
    
    // Random opacity
    shape.style.opacity = Math.random() * 0.5 + 0.2;
    
    container.appendChild(shape);
}

// Optimized Cursor Trail Effect
function initCursorTrail() {
    let mouseX = 0, mouseY = 0;
    let trailElements = [];
    const maxTrailLength = 5; // Reduced from 10 to 5
    let lastTrailTime = 0;
    const trailInterval = 50; // Only create trail every 50ms
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        const now = Date.now();
        if (now - lastTrailTime > trailInterval) {
            createTrailElement(mouseX, mouseY);
            lastTrailTime = now;
        }
    }, { passive: true });
    
    function createTrailElement(x, y) {
        const trail = document.createElement('div');
        trail.className = 'cursor-trail';
        trail.style.left = x + 'px';
        trail.style.top = y + 'px';
        
        document.body.appendChild(trail);
        trailElements.push(trail);
        
        // Limit trail length
        if (trailElements.length > maxTrailLength) {
            const oldTrail = trailElements.shift();
            if (oldTrail.parentNode) {
                oldTrail.parentNode.removeChild(oldTrail);
            }
        }
        
        // Remove trail element after animation
        setTimeout(() => {
            if (trail.parentNode) {
                trail.parentNode.removeChild(trail);
            }
            const index = trailElements.indexOf(trail);
            if (index > -1) {
                trailElements.splice(index, 1);
            }
        }, 500);
    }
}

// Optimized Mouse Interactions with Debouncing
function initMouseInteractions() {
    let mouseTimeout;
    let animationFrame;
    
    // Debounced mouse move handler
    function handleMouseMove(e) {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
        
        animationFrame = requestAnimationFrame(() => {
            // Add glow effect to nearby elements
            const elements = document.querySelectorAll('.glass-card, .glass-button');
            elements.forEach(element => {
                const rect = element.getBoundingClientRect();
                const distance = Math.sqrt(
                    Math.pow(e.clientX - (rect.left + rect.width / 2), 2) +
                    Math.pow(e.clientY - (rect.top + rect.height / 2), 2)
                );
                
                if (distance < 150) {
                    const intensity = Math.max(0, 1 - distance / 150);
                    element.style.filter = `brightness(${1 + intensity * 0.15})`;
                    element.style.transform = `scale(${1 + intensity * 0.03})`;
                } else {
                    element.style.filter = 'brightness(1)';
                    element.style.transform = 'scale(1)';
                }
            });
        });
        
        clearTimeout(mouseTimeout);
        mouseTimeout = setTimeout(() => {
            // Reset all element effects
            const elements = document.querySelectorAll('.glass-card, .glass-button');
            elements.forEach(element => {
                element.style.filter = 'brightness(1)';
                element.style.transform = 'scale(1)';
            });
        }, 1500); // Increased timeout
    }
    
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    // Add mouse leave effect
    document.addEventListener('mouseleave', () => {
        const elements = document.querySelectorAll('.glass-card, .glass-button');
        elements.forEach(element => {
            element.style.filter = 'brightness(1)';
            element.style.transform = 'scale(1)';
        });
    });
}

// Enhanced floating elements with physics
function enhanceFloatingElements() {
    const floatingElements = document.querySelectorAll('.floating-element');
    
    floatingElements.forEach((element, index) => {
        // Add random initial position variations
        const randomX = (Math.random() - 0.5) * 100;
        const randomY = (Math.random() - 0.5) * 100;
        element.style.transform = `translate(${randomX}px, ${randomY}px)`;
        
        // Add mouse interaction
        element.addEventListener('mouseenter', () => {
            element.style.transform += ' scale(1.1)';
            element.style.filter = 'brightness(1.2)';
        });
        
        element.addEventListener('mouseleave', () => {
            element.style.transform = element.style.transform.replace(' scale(1.1)', '');
            element.style.filter = 'brightness(1)';
        });
    });
}

// Mobile Navigation
function initMobileNavigation() {
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
        
        // Close mobile menu when clicking on a link
        const navLinkElements = navLinks.querySelectorAll('.nav-link');
        navLinkElements.forEach(link => {
            link.addEventListener('click', () => {
                navToggle.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
                navToggle.classList.remove('active');
                navLinks.classList.remove('active');
            }
        });
        
        // Close mobile menu on window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                navToggle.classList.remove('active');
                navLinks.classList.remove('active');
            }
        });
    }
}

// Minimal effects for low-end devices
function initMinimalEffects() {
    // Only basic floating elements, no particles or complex animations
    setTimeout(enhanceFloatingElements, 1000);
    
    // Disable heavy CSS animations
    document.documentElement.style.setProperty('--animation-duration', '0.1s');
    
    console.log('🔧 Minimal effects mode enabled for better performance');
}

// Dark Mode Toggle Functionality
function initDarkModeToggle() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const themeIcon = document.getElementById('themeIcon');
    
    if (!darkModeToggle || !themeIcon) return;
    
    // Check for saved theme preference or default to dark mode
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(themeIcon, currentTheme);
    
    darkModeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        // Add rotation animation
        darkModeToggle.classList.add('rotating');
        
        // Update theme
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Update icon
        updateThemeIcon(themeIcon, newTheme);
        
        // Remove animation class after animation completes
        setTimeout(() => {
            darkModeToggle.classList.remove('rotating');
        }, 600);
        
        console.log(`🌙 Theme switched to: ${newTheme} mode`);
    });
}

function updateThemeIcon(icon, theme) {
    if (theme === 'dark') {
        // Moon icon for dark mode
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>';
    } else {
        // Sun icon for light mode
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>';
    }
}


// Language Toggle Functionality
function initLanguageToggle() {
    const languageToggle = document.getElementById('languageToggle');
    const langText = document.querySelector('.lang-text');
    
    if (!languageToggle || !langText) return;
    
    // Check for saved language preference or default to English
    const currentLang = localStorage.getItem('language') || 'en';
    console.log(`🌐 Initializing language: ${currentLang}`);
    
    // Set language attributes immediately
    document.documentElement.setAttribute('lang', currentLang);
    document.documentElement.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');
    
    // Update content but skip typewriter for initial load
    updateLanguageContent(currentLang, true);
    updateLanguageToggle(langText, currentLang);
    
    // Signal that language initialization is complete
    window.languageInitialized = true;
    
    languageToggle.addEventListener('click', () => {
        const currentLang = document.documentElement.getAttribute('lang');
        const newLang = currentLang === 'en' ? 'ar' : 'en';
        
        console.log(`🔄 Switching from ${currentLang} to ${newLang}`);
        
        // Add rotation animation
        languageToggle.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            languageToggle.style.transform = '';
        }, 300);
        
        // Update language
        document.documentElement.setAttribute('lang', newLang);
        document.documentElement.setAttribute('dir', newLang === 'ar' ? 'rtl' : 'ltr');
        localStorage.setItem('language', newLang);
        
        // Update content with delay to prevent conflicts
        setTimeout(() => {
            updateLanguageContent(newLang, false);
            updateLanguageToggle(langText, newLang);
        }, 100);
        
        console.log(`🌍 Language switched to: ${newLang === 'en' ? 'English' : 'Arabic'}`);
    });
}

function updateLanguageContent(lang, isInitialLoad = false) {
    console.log(`📝 Updating content to language: ${lang} (Initial load: ${isInitialLoad})`);
    
    // Update all elements with data-en and data-ar attributes
    const elements = document.querySelectorAll('[data-en][data-ar]');
    elements.forEach(element => {
        const text = element.getAttribute(`data-${lang}`);
        if (text) {
            // Special handling for hero title
            if (element.classList.contains('hero-title')) {
                if (isInitialLoad) {
                    // For initial load, just set the text without typewriter effect
                    // The typewriter will be handled separately after language initialization
                    console.log(`🎯 Setting initial text for hero title: "${text}"`);
                    element.textContent = text;
                } else {
                    // For language switching, restart typewriter effect
                    console.log(`🎯 Restarting typewriter for hero title with text: "${text}"`);
                    
                    // Clear existing content
                    element.innerHTML = '';
                    
                    let i = 0;
                    const typeWriter = () => {
                        if (i < text.length) {
                            element.innerHTML = text.substring(0, i + 1);
                            i++;
                            setTimeout(typeWriter, lang === 'ar' ? 150 : 100);
                        }
                    };
                    
                    // Start typing effect with a small delay for language switching
                    setTimeout(typeWriter, 50);
                }
            } else {
                element.textContent = text;
            }
        }
    });
    
    // Update page title
    const titles = {
        en: 'Next Gen Coders - Futuristic Web Development Platform',
        ar: 'مطورو الجيل القادم - منصة تطوير ويب مستقبلية'
    };
    document.title = titles[lang];
}

function updateLanguageToggle(langText, lang) {
    const texts = {
        en: 'EN',
        ar: 'عربي'
    };
    langText.textContent = texts[lang];
}

// Initialize enhanced effects when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(enhanceFloatingElements, 1000);
});

// Icon Fallback Functionality
function initIconFallback() {
    // Check if Font Awesome is loaded
    const checkFontAwesome = () => {
        const testIcon = document.createElement('i');
        testIcon.className = 'fas fa-globe';
        testIcon.style.position = 'absolute';
        testIcon.style.visibility = 'hidden';
        testIcon.style.fontSize = '16px';
        document.body.appendChild(testIcon);
        
        const computedStyle = window.getComputedStyle(testIcon);
        const fontFamily = computedStyle.getPropertyValue('font-family');
        
        document.body.removeChild(testIcon);
        
        // If Font Awesome is not loaded, show SVG fallback
        if (!fontFamily.includes('Font Awesome')) {
            console.log('⚠️ Font Awesome not detected, using SVG fallback');
            const languageToggles = document.querySelectorAll('.language-toggle');
            languageToggles.forEach(toggle => {
                const faIcon = toggle.querySelector('.language-icon');
                const svgIcon = toggle.querySelector('.language-icon-svg');
                
                if (faIcon) faIcon.style.display = 'none';
                if (svgIcon) svgIcon.style.display = 'inline-block';
            });
        } else {
            console.log('✅ Font Awesome loaded successfully');
        }
    };
    
    // Check after a short delay to ensure Font Awesome has time to load
    setTimeout(checkFontAwesome, 1000);
}

