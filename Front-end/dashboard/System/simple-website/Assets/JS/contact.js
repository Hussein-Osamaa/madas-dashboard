// Contact form functionality
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(contactForm);
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                company: formData.get('company'),
                subject: formData.get('subject'),
                message: formData.get('message')
            };
            
            // Show loading state
            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            submitButton.innerHTML = `
                <svg class="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
            `;
            submitButton.disabled = true;
            
            // Simulate form submission (replace with actual API call)
            setTimeout(() => {
                // Show success message
                showNotification('Message sent successfully! We\'ll get back to you soon.', 'success');
                
                // Reset form
                contactForm.reset();
                
                // Reset button
                submitButton.innerHTML = originalText;
                submitButton.disabled = false;
                
                // Log form data (for development)
                console.log('Form submitted:', data);
                
            }, 2000);
        });
    }
    
    // Notification system
    function showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    ${type === 'success' ? 
                        '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>' :
                        '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
                    }
                </div>
                <div class="notification-message">${message}</div>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `;
        
        // Add notification styles
        const notificationStyles = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                padding: 1rem;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                animation: slideIn 0.3s ease-out;
            }
            
            .notification-success {
                border-color: rgba(34, 197, 94, 0.3);
                background: rgba(34, 197, 94, 0.1);
            }
            
            .notification-error {
                border-color: rgba(239, 68, 68, 0.3);
                background: rgba(239, 68, 68, 0.1);
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }
            
            .notification-icon {
                width: 24px;
                height: 24px;
                flex-shrink: 0;
            }
            
            .notification-icon svg {
                width: 100%;
                height: 100%;
            }
            
            .notification-success .notification-icon {
                color: #22c55e;
            }
            
            .notification-error .notification-icon {
                color: #ef4444;
            }
            
            .notification-message {
                flex: 1;
                color: white;
                font-weight: 500;
            }
            
            .notification-close {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.6);
                cursor: pointer;
                padding: 0.25rem;
                border-radius: 4px;
                transition: all 0.2s ease;
            }
            
            .notification-close:hover {
                color: white;
                background: rgba(255, 255, 255, 0.1);
            }
            
            .notification-close svg {
                width: 16px;
                height: 16px;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            .animate-spin {
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                from {
                    transform: rotate(0deg);
                }
                to {
                    transform: rotate(360deg);
                }
            }
        `;
        
        // Add styles if not already added
        if (!document.querySelector('#notification-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'notification-styles';
            styleSheet.textContent = notificationStyles;
            document.head.appendChild(styleSheet);
        }
        
        // Add notification to page
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);
    }
    
    // Form validation
    const formInputs = document.querySelectorAll('.form-input, .form-select, .form-textarea');
    
    formInputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
        
        input.addEventListener('input', function() {
            if (this.classList.contains('error')) {
                validateField(this);
            }
        });
    });
    
    function validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';
        
        // Remove existing error styling
        field.classList.remove('error');
        const existingError = field.parentElement.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Required field validation
        if (field.hasAttribute('required') && !value) {
            isValid = false;
            errorMessage = 'This field is required';
        }
        
        // Email validation
        if (field.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid email address';
            }
        }
        
        // Show error if invalid
        if (!isValid) {
            field.classList.add('error');
            const errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            errorElement.textContent = errorMessage;
            field.parentElement.appendChild(errorElement);
        }
        
        return isValid;
    }
    
    // Add error styles
    const errorStyles = `
        .form-input.error,
        .form-select.error,
        .form-textarea.error {
            border-color: #ef4444;
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }
        
        .field-error {
            color: #ef4444;
            font-size: 0.875rem;
            margin-top: 0.25rem;
        }
    `;
    
    if (!document.querySelector('#form-error-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'form-error-styles';
        styleSheet.textContent = errorStyles;
        document.head.appendChild(styleSheet);
    }
    
    console.log('📧 Contact form functionality loaded');
});





