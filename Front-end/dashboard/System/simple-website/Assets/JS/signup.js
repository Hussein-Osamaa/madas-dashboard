// Signup page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Unique ID generation system
    function generateUniqueId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `NGC_${timestamp}_${random}`.toUpperCase();
    }

    // Client data storage system
    function saveClientData(clientData) {
        // Get existing clients from localStorage or initialize empty array
        let clients = JSON.parse(localStorage.getItem('nextgen_clients') || '[]');
        
        // Add new client with unique ID
        const newClient = {
            id: clientData.id,
            ...clientData,
            createdAt: new Date().toISOString(),
            status: 'active'
        };
        
        clients.push(newClient);
        
        // Save updated clients array
        localStorage.setItem('nextgen_clients', JSON.stringify(clients));
        
        console.log('✅ Client data saved successfully:', newClient);
        return newClient;
    }

    // Check if email already exists
    function isEmailUnique(email) {
        const clients = JSON.parse(localStorage.getItem('nextgen_clients') || '[]');
        return !clients.some(client => client.email.toLowerCase() === email.toLowerCase());
    }
    const signupForm = document.getElementById('signupForm');
    const passwordToggle = document.getElementById('passwordToggle');
    const confirmPasswordToggle = document.getElementById('confirmPasswordToggle');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    const companyInput = document.getElementById('company');
    const businessEmailInput = document.getElementById('businessEmail');
    const termsCheckbox = document.getElementById('terms');
    const newsletterCheckbox = document.getElementById('newsletter');
    const signupBtn = document.querySelector('.signup-btn');
    const btnText = document.querySelector('.btn-text');
    const btnIcon = document.querySelector('.btn-icon');
    const passwordStrength = document.getElementById('passwordStrength');
    const strengthFill = document.querySelector('.strength-fill');
    const strengthText = document.querySelector('.strength-text');

    // Password visibility toggles
    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }

    if (confirmPasswordToggle && confirmPasswordInput) {
        confirmPasswordToggle.addEventListener('click', function() {
            const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            confirmPasswordInput.setAttribute('type', type);
            
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }

    // Password strength indicator
    if (passwordInput && passwordStrength) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            const strength = calculatePasswordStrength(password);
            updatePasswordStrength(strength);
        });
    }

    function calculatePasswordStrength(password) {
        let score = 0;
        const checks = {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            numbers: /\d/.test(password),
            symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        Object.values(checks).forEach(check => {
            if (check) score += 20;
        });

        return {
            score: score,
            checks: checks
        };
    }

    function updatePasswordStrength(strength) {
        const { score, checks } = strength;
        
        // Update strength bar
        strengthFill.style.width = score + '%';
        
        // Update colors and text
        if (score < 40) {
            strengthFill.style.background = '#ef4444';
            strengthText.textContent = 'Weak';
        } else if (score < 70) {
            strengthFill.style.background = '#f59e0b';
            strengthText.textContent = 'Medium';
        } else if (score < 90) {
            strengthFill.style.background = '#10b981';
            strengthText.textContent = 'Strong';
        } else {
            strengthFill.style.background = '#059669';
            strengthText.textContent = 'Very Strong';
        }
    }

    // Form validation
    function validateForm() {
        let isValid = true;

        // First name validation
        if (!firstNameInput.value.trim()) {
            showError(firstNameInput, 'First name is required');
            isValid = false;
        } else {
            clearError(firstNameInput);
        }

        // Last name validation
        if (!lastNameInput.value.trim()) {
            showError(lastNameInput, 'Last name is required');
            isValid = false;
        } else {
            clearError(lastNameInput);
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailInput.value.trim()) {
            showError(emailInput, 'Email is required');
            isValid = false;
        } else if (!emailRegex.test(emailInput.value)) {
            showError(emailInput, 'Please enter a valid email address');
            isValid = false;
        } else if (!isEmailUnique(emailInput.value)) {
            showError(emailInput, 'This email is already registered. Please use a different email or try logging in.');
            isValid = false;
        } else {
            clearError(emailInput);
        }

        // Phone validation
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneInput.value.trim()) {
            showError(phoneInput, 'Phone number is required');
            isValid = false;
        } else if (!phoneRegex.test(phoneInput.value.replace(/[\s\-\(\)]/g, ''))) {
            showError(phoneInput, 'Please enter a valid phone number');
            isValid = false;
        } else {
            clearError(phoneInput);
        }

        // Company validation
        if (!companyInput.value.trim()) {
            showError(companyInput, 'Company name is required');
            isValid = false;
        } else {
            clearError(companyInput);
        }

        // Business email validation
        const businessEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!businessEmailInput.value.trim()) {
            showError(businessEmailInput, 'Business main email is required');
            isValid = false;
        } else if (!businessEmailRegex.test(businessEmailInput.value)) {
            showError(businessEmailInput, 'Please enter a valid business email address');
            isValid = false;
        } else if (businessEmailInput.value.toLowerCase() === emailInput.value.toLowerCase()) {
            showError(businessEmailInput, 'Business email must be different from your personal email');
            isValid = false;
        } else {
            clearError(businessEmailInput);
        }

        // Password validation
        if (!passwordInput.value) {
            showError(passwordInput, 'Password is required');
            isValid = false;
        } else if (passwordInput.value.length < 8) {
            showError(passwordInput, 'Password must be at least 8 characters');
            isValid = false;
        } else {
            clearError(passwordInput);
        }

        // Confirm password validation
        if (!confirmPasswordInput.value) {
            showError(confirmPasswordInput, 'Please confirm your password');
            isValid = false;
        } else if (passwordInput.value !== confirmPasswordInput.value) {
            showError(confirmPasswordInput, 'Passwords do not match');
            isValid = false;
        } else {
            clearError(confirmPasswordInput);
        }

        // Terms validation
        if (!termsCheckbox.checked) {
            showError(termsCheckbox, 'You must agree to the terms and conditions');
            isValid = false;
        } else {
            clearError(termsCheckbox);
        }

        return isValid;
    }

    // Show error message
    function showError(input, message) {
        clearError(input);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        input.parentNode.appendChild(errorDiv);
        input.classList.add('error');
    }

    // Clear error message
    function clearError(input) {
        const errorDiv = input.parentNode.querySelector('.error-message');
        if (errorDiv) {
            errorDiv.remove();
        }
        input.classList.remove('error');
    }

    // Form submission
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (validateForm()) {
                // Show loading state
                showLoadingState();
                
                // Generate unique ID for the new client
                const uniqueId = generateUniqueId();
                
                // Prepare client data
                const clientData = {
                    id: uniqueId,
                    firstName: firstNameInput.value.trim(),
                    lastName: lastNameInput.value.trim(),
                    email: emailInput.value.trim().toLowerCase(),
                    businessEmail: businessEmailInput.value.trim().toLowerCase(),
                    phone: phoneInput.value.trim(),
                    company: companyInput.value.trim(),
                    password: passwordInput.value, // In production, this should be hashed
                    plan: document.querySelector('input[name="plan"]:checked').value,
                    newsletter: newsletterCheckbox.checked,
                    terms: termsCheckbox.checked
                };
                
                // Simulate signup process
                setTimeout(() => {
                    try {
                        // Save client data with unique ID
                        const savedClient = saveClientData(clientData);
                        
                        console.log('🎉 New client registered successfully!');
                        console.log('🆔 Client ID:', savedClient.id);
                        console.log('📧 Email:', savedClient.email);
                        console.log('🏢 Company:', savedClient.company);
                        console.log('📋 Plan:', savedClient.plan);
                        
                        // Show success message with client ID
                        showSuccessState(savedClient.id);
                        
                        // Redirect to dashboard or login page
                        setTimeout(() => {
                            window.location.href = 'login.html';
                        }, 3000);
                        
                    } catch (error) {
                        console.error('❌ Error saving client data:', error);
                        showErrorState('Failed to create account. Please try again.');
                    }
                    
                }, 3000);
            }
        });
    }

    // Loading state
    function showLoadingState() {
        btnText.textContent = 'Creating Account...';
        btnIcon.className = 'fas fa-spinner fa-spin';
        signupBtn.disabled = true;
        signupBtn.classList.add('loading');
    }

    // Success state
    function showSuccessState(clientId) {
        btnText.textContent = 'Account Created!';
        btnIcon.className = 'fas fa-check';
        signupBtn.classList.remove('loading');
        signupBtn.classList.add('success');
        
        // Show client ID in console and could be displayed to user
        console.log('🎉 Your unique client ID is:', clientId);
        
        // Optional: Display client ID to user (uncomment if you want to show it)
        // alert(`Account created successfully!\nYour Client ID: ${clientId}\nPlease save this ID for future reference.`);
    }

    // Error state
    function showErrorState(message) {
        btnText.textContent = 'Try Again';
        btnIcon.className = 'fas fa-exclamation-triangle';
        signupBtn.classList.remove('loading');
        signupBtn.classList.add('error');
        signupBtn.disabled = false;
        
        // Show error message
        alert(message);
        
        // Reset button after 3 seconds
        setTimeout(() => {
            btnText.textContent = 'Create Account';
            btnIcon.className = 'fas fa-rocket';
            signupBtn.classList.remove('error');
        }, 3000);
    }

    // Social signup buttons
    const googleBtn = document.querySelector('.google-btn');
    const githubBtn = document.querySelector('.github-btn');
    const linkedinBtn = document.querySelector('.linkedin-btn');

    if (googleBtn) {
        googleBtn.addEventListener('click', function() {
            console.log('Google signup clicked');
            showLoadingState();
            setTimeout(() => {
                showSuccessState();
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            }, 2000);
        });
    }

    if (githubBtn) {
        githubBtn.addEventListener('click', function() {
            console.log('GitHub signup clicked');
            showLoadingState();
            setTimeout(() => {
                showSuccessState();
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            }, 2000);
        });
    }

    if (linkedinBtn) {
        linkedinBtn.addEventListener('click', function() {
            console.log('LinkedIn signup clicked');
            showLoadingState();
            setTimeout(() => {
                showSuccessState();
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            }, 2000);
        });
    }

    // Input focus effects
    const formInputs = document.querySelectorAll('.form-input');
    formInputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentNode.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            if (!this.value) {
                this.parentNode.classList.remove('focused');
            }
        });
    });

    // Plan selection effects
    const planOptions = document.querySelectorAll('.plan-option');
    planOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove active class from all options
            planOptions.forEach(opt => opt.classList.remove('selected'));
            // Add active class to clicked option
            this.classList.add('selected');
        });
    });

    // Terms and privacy policy links
    const termsLinks = document.querySelectorAll('.terms-link');
    termsLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const linkText = this.textContent;
            alert(`${linkText} - This would open the terms/privacy policy page`);
        });
    });

    // Login link
    const loginLink = document.querySelector('.login-link');
    if (loginLink) {
        loginLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'login.html';
        });
    }

    // Real-time validation
    const requiredInputs = [firstNameInput, lastNameInput, emailInput, phoneInput, companyInput];
    requiredInputs.forEach(input => {
        if (input) {
            input.addEventListener('blur', function() {
                if (this.value.trim()) {
                    clearError(this);
                }
            });
        }
    });

    // Email format validation on blur
    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (this.value && !emailRegex.test(this.value)) {
                showError(this, 'Please enter a valid email address');
            } else if (this.value && emailRegex.test(this.value) && !isEmailUnique(this.value)) {
                showError(this, 'This email is already registered. Please use a different email or try logging in.');
            } else if (this.value && emailRegex.test(this.value) && isEmailUnique(this.value)) {
                clearError(this);
            }
        });
    }

    // Phone format validation on blur
    if (phoneInput) {
        phoneInput.addEventListener('blur', function() {
            const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
            if (this.value && !phoneRegex.test(this.value.replace(/[\s\-\(\)]/g, ''))) {
                showError(this, 'Please enter a valid phone number');
            }
        });
    }

    // Password confirmation validation
    if (confirmPasswordInput && passwordInput) {
        confirmPasswordInput.addEventListener('input', function() {
            if (this.value && this.value !== passwordInput.value) {
                showError(this, 'Passwords do not match');
            } else if (this.value && this.value === passwordInput.value) {
                clearError(this);
            }
        });
    }

    // Admin function to view all registered clients (for debugging)
    function viewAllClients() {
        const clients = JSON.parse(localStorage.getItem('nextgen_clients') || '[]');
        console.log('📊 All registered clients:', clients);
        console.log('👥 Total clients:', clients.length);
        return clients;
    }

    // Make viewAllClients available globally for debugging
    window.viewAllClients = viewAllClients;

    console.log('🚀 Signup page functionality loaded successfully!');
    console.log('✨ Form validation active');
    console.log('🎨 Interactive effects initialized');
    console.log('🌍 Language support ready');
    console.log('🔐 Password strength indicator active');
    console.log('🆔 Unique ID generation system active');
    console.log('💾 Client data storage system active');
    console.log('🔍 Email uniqueness validation active');
    console.log('💡 Use viewAllClients() in console to see all registered clients');
});

