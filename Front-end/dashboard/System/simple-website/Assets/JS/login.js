// Login page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check URL parameters for plan selection and signup mode
    const urlParams = new URLSearchParams(window.location.search);
    const shouldShowSignup = urlParams.get('signup') === 'true';
    const selectedPlan = urlParams.get('plan') || 'starter';
    
    // If coming from plans page, auto-switch to signup tab
    if (shouldShowSignup) {
        setTimeout(() => {
            const signupToggle = document.getElementById('signupToggle');
            if (signupToggle) {
                signupToggle.click();
                console.log('📋 Auto-switched to signup with plan:', selectedPlan);
            }
            
            // Pre-select the plan radio button
            const planRadio = document.querySelector(`input[name="plan"][value="${selectedPlan}"]`);
            if (planRadio) {
                planRadio.checked = true;
                console.log('✅ Pre-selected plan:', selectedPlan);
            }
        }, 500);
    }
    
    // Authentication uses localStorage-based approach (Firebase removed)
    console.log('Authentication system ready (localStorage-based)');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const passwordToggle = document.getElementById('passwordToggle');
    const signupPasswordToggle = document.getElementById('signupPasswordToggle');
    const passwordInput = document.getElementById('password');
    const signupPasswordInput = document.getElementById('signupPassword');
    const emailInput = document.getElementById('email');
    const rememberCheckbox = document.getElementById('remember');
    const loginBtn = document.querySelector('.login-btn');
    const signupBtn = document.querySelector('.signup-btn');
    const btnText = document.querySelector('.btn-text');
    const btnIcon = document.querySelector('.btn-icon');
    
    // Toggle buttons
    const loginToggle = document.getElementById('loginToggle');
    const signupToggle = document.getElementById('signupToggle');

    // Toggle between login and signup forms
    if (loginToggle && signupToggle) {
        loginToggle.addEventListener('click', function() {
            // Update toggle buttons
            loginToggle.classList.add('active');
            signupToggle.classList.remove('active');
            
            // Show login form, hide signup form
            loginForm.style.display = 'block';
            signupForm.style.display = 'none';
        });

        signupToggle.addEventListener('click', function() {
            // Update toggle buttons
            signupToggle.classList.add('active');
            loginToggle.classList.remove('active');
            
            // Show signup form, hide login form
            signupForm.style.display = 'block';
            loginForm.style.display = 'none';
        });
    }

    // Password visibility toggle for login
    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }

    // Password visibility toggle for signup
    if (signupPasswordToggle && signupPasswordInput) {
        signupPasswordToggle.addEventListener('click', function() {
            const type = signupPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            signupPasswordInput.setAttribute('type', type);
            
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }

    // Form validation for login
    function validateLoginForm() {
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        let isValid = true;

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            showError(emailInput, 'Email is required');
            isValid = false;
        } else if (!emailRegex.test(email)) {
            showError(emailInput, 'Please enter a valid email address');
            isValid = false;
        } else {
            clearError(emailInput);
        }

        // Password validation
        if (!password) {
            showError(passwordInput, 'Password is required');
            isValid = false;
        } else if (password.length < 6) {
            showError(passwordInput, 'Password must be at least 6 characters');
            isValid = false;
        } else {
            clearError(passwordInput);
        }

        return isValid;
    }

    // Form validation for signup
    function validateSignupForm() {
        const firstName = document.getElementById('signupFirstName').value.trim();
        const lastName = document.getElementById('signupLastName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = signupPasswordInput.value.trim();
        let isValid = true;

        // First name validation
        if (!firstName) {
            showError(document.getElementById('signupFirstName'), 'First name is required');
            isValid = false;
        } else {
            clearError(document.getElementById('signupFirstName'));
        }

        // Last name validation
        if (!lastName) {
            showError(document.getElementById('signupLastName'), 'Last name is required');
            isValid = false;
        } else {
            clearError(document.getElementById('signupLastName'));
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            showError(document.getElementById('signupEmail'), 'Email is required');
            isValid = false;
        } else if (!emailRegex.test(email)) {
            showError(document.getElementById('signupEmail'), 'Please enter a valid email address');
            isValid = false;
        } else {
            clearError(document.getElementById('signupEmail'));
        }

        // Password validation
        if (!password) {
            showError(signupPasswordInput, 'Password is required');
            isValid = false;
        } else if (password.length < 8) {
            showError(signupPasswordInput, 'Password must be at least 8 characters');
            isValid = false;
        } else {
            clearError(signupPasswordInput);
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

    // Unique ID generation system
    function generateUniqueId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `NGC_${timestamp}_${random}`.toUpperCase();
    }

    // Client data storage system
    function saveClientData(clientData) {
        let clients = JSON.parse(localStorage.getItem('nextgen_clients') || '[]');
        const newClient = {
            id: clientData.id,
            ...clientData,
            createdAt: new Date().toISOString(),
            status: 'active'
        };
        clients.push(newClient);
        localStorage.setItem('nextgen_clients', JSON.stringify(clients));
        console.log('✅ Client data saved successfully:', newClient);
        return newClient;
    }

    // Check if email already exists
    function isEmailUnique(email) {
        const clients = JSON.parse(localStorage.getItem('nextgen_clients') || '[]');
        return !clients.some(client => client.email.toLowerCase() === email.toLowerCase());
    }

    // User authentication system
    function authenticateUser(email, password) {
        const clients = JSON.parse(localStorage.getItem('nextgen_clients') || '[]');
        const user = clients.find(client => 
            client.email.toLowerCase() === email.toLowerCase() && 
            client.password === password
        );
        return user;
    }

    // Create user session
    function createUserSession(user) {
        const sessionData = {
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            company: user.company,
            plan: user.plan,
            loginTime: new Date().toISOString(),
            isAuthenticated: true
        };
        
        localStorage.setItem('currentUser', JSON.stringify(sessionData));
        return sessionData;
    }

    // Show login error
    function showLoginError(message) {
        if (btnText) {
            btnText.textContent = 'Try Again';
        }
        if (btnIcon) {
            btnIcon.className = 'fas fa-exclamation-triangle';
        }
        if (loginBtn) {
            loginBtn.classList.remove('loading');
            loginBtn.classList.add('error');
            loginBtn.disabled = false;
        }
        
        alert(message);
        
        // Reset button after 3 seconds
        setTimeout(() => {
            if (btnText) {
                btnText.textContent = 'Sign In';
            }
            if (btnIcon) {
                btnIcon.className = 'fas fa-arrow-right';
            }
            if (loginBtn) {
                loginBtn.classList.remove('error');
            }
        }, 3000);
    }

    // Signup validation functions
    function validateSignupForm() {
        let isValid = true;
        
        // First name validation
        const firstNameInput = document.getElementById('signupFirstName');
        if (!firstNameInput.value.trim()) {
            showError(firstNameInput, 'First name is required');
            isValid = false;
        } else {
            clearError(firstNameInput);
        }

        // Last name validation
        const lastNameInput = document.getElementById('signupLastName');
        if (!lastNameInput.value.trim()) {
            showError(lastNameInput, 'Last name is required');
            isValid = false;
        } else {
            clearError(lastNameInput);
        }

        // Email validation
        const emailInput = document.getElementById('signupEmail');
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
        const phoneInput = document.getElementById('signupPhone');
        if (!phoneInput.value.trim()) {
            showError(phoneInput, 'Phone number is required');
            isValid = false;
        } else {
            clearError(phoneInput);
        }

        // Company validation
        const companyInput = document.getElementById('signupCompany');
        if (!companyInput.value.trim()) {
            showError(companyInput, 'Company name is required');
            isValid = false;
        } else {
            clearError(companyInput);
        }

        // Business email validation
        const businessEmailInput = document.getElementById('signupBusinessEmail');
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
        const passwordInput = document.getElementById('signupPassword');
        const confirmPasswordInput = document.getElementById('signupConfirmPassword');
        if (!passwordInput.value) {
            showError(passwordInput, 'Password is required');
            isValid = false;
        } else if (passwordInput.value.length < 8) {
            showError(passwordInput, 'Password must be at least 8 characters long');
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
        const termsCheckbox = document.getElementById('signupTerms');
        if (!termsCheckbox.checked) {
            showError(termsCheckbox, 'You must agree to the terms and conditions');
            isValid = false;
        } else {
            clearError(termsCheckbox);
        }

        return isValid;
    }

    function showSignupErrorState(message) {
        const signupBtn = document.querySelector('.signup-btn');
        const signupBtnText = signupBtn?.querySelector('.btn-text');
        const signupBtnIcon = signupBtn?.querySelector('.btn-icon');
        
        if (signupBtnText) {
            signupBtnText.textContent = 'Try Again';
        }
        if (signupBtnIcon) {
            signupBtnIcon.className = 'fas fa-exclamation-triangle';
        }
        if (signupBtn) {
            signupBtn.classList.remove('loading');
            signupBtn.classList.add('error');
            signupBtn.disabled = false;
        }
        
        alert(message);
        
        // Reset button after 3 seconds
        setTimeout(() => {
            if (signupBtnText) {
                signupBtnText.textContent = 'Create Account';
            }
            if (signupBtnIcon) {
                signupBtnIcon.className = 'fas fa-rocket';
            }
            if (signupBtn) {
                signupBtn.classList.remove('error');
            }
        }, 3000);
    }




        // Get plan-based permissions
    function getPlanPermissions(plan) {
        const basePermissions = {
            home: ["view"],
            orders: ["view", "search", "create", "edit", "delete"],
            inventory: ["view", "edit", "create", "delete"],
            customers: ["view", "edit", "create", "delete"],
            employees: ["view", "edit", "create", "delete"],
            settings: ["view", "edit"]
        };

        switch (plan) {
            case 'starter':
                return {
                    ...basePermissions,
                    finance: ["view"],
                    analytics: ["view"]
                };
            case 'professional':
                return {
                    ...basePermissions,
                    finance: ["view", "reports", "export"],
                    analytics: ["view", "export"],
                    api: ["view", "use"]
                };
            case 'enterprise':
                return {
                    ...basePermissions,
                    finance: ["view", "reports", "export", "admin"],
                    analytics: ["view", "export", "admin"],
                    api: ["view", "use", "admin"],
                    whiteLabel: ["view", "edit"],
                    customIntegrations: ["view", "edit"]
                };
            default:
                return basePermissions;
        }
    }

    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (validateLoginForm()) {
                // Show loading state
                showLoginLoadingState();
                
                try {
                    const email = emailInput.value.trim();
                    const password = passwordInput.value;
                    
                    // Use localStorage authentication (Firebase removed)
                    const user = authenticateUser(email, password);
                    
                    if (user) {
                        const session = createUserSession(user);
                        console.log('Login successful:', session);
                        showLoginSuccessState();
                        setTimeout(() => {
                            window.location.href = 'Dashboard/index.html';
                        }, 2000);
                    } else {
                        showLoginError('Invalid email or password. Please try again.');
                    }
                } catch (error) {
                    console.error('❌ Login error:', error);
                    showLoginError('Login failed. Please try again.');
                }
            }
        });
    }

    // Signup form submission
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (validateSignupForm()) {
                // Show loading state
                showSignupLoadingState();
                
                try {
                    // Prepare client data
                    const clientData = {
                        firstName: document.getElementById('signupFirstName').value.trim(),
                        lastName: document.getElementById('signupLastName').value.trim(),
                        email: document.getElementById('signupEmail').value.trim().toLowerCase(),
                        businessEmail: document.getElementById('signupBusinessEmail').value.trim().toLowerCase(),
                        phone: document.getElementById('signupPhone').value.trim(),
                        company: document.getElementById('signupCompany').value.trim(),
                        password: document.getElementById('signupPassword').value,
                        plan: document.querySelector('input[name="plan"]:checked').value,
                        newsletter: document.getElementById('signupNewsletter').checked,
                        terms: document.getElementById('signupTerms').checked
                    };
                    
                    // Use localStorage signup (Firebase removed)
                    console.log('Using localStorage-based signup');
                } catch (error) {
                    console.error('❌ Signup error:', error);
                    showSignupErrorState('Failed to create account. Please try again.');
                }
            }
        });
    }

    // Login loading state
    function showLoginLoadingState() {
        if (btnText) {
            btnText.textContent = 'Signing In...';
        }
        if (btnIcon) {
            btnIcon.className = 'fas fa-spinner fa-spin';
        }
        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.classList.add('loading');
        }
    }

    // Login success state
    function showLoginSuccessState() {
        if (btnText) {
            btnText.textContent = 'Success!';
        }
        if (btnIcon) {
            btnIcon.className = 'fas fa-check';
        }
        if (loginBtn) {
            loginBtn.classList.remove('loading');
            loginBtn.classList.add('success');
        }
    }

    // Signup loading state
    function showSignupLoadingState() {
        if (!signupBtn) return;
        
        const signupBtnText = signupBtn.querySelector('.btn-text');
        const signupBtnIcon = signupBtn.querySelector('.btn-icon');
        
        if (signupBtnText) {
            signupBtnText.textContent = 'Creating Account...';
        }
        if (signupBtnIcon) {
            signupBtnIcon.className = 'fas fa-spinner fa-spin';
        }
        
        signupBtn.disabled = true;
        signupBtn.classList.add('loading');
    }

    // Signup success state
    function showSignupSuccessState() {
        if (!signupBtn) return;
        
        const signupBtnText = signupBtn.querySelector('.btn-text');
        const signupBtnIcon = signupBtn.querySelector('.btn-icon');
        
        if (signupBtnText) {
            signupBtnText.textContent = 'Success!';
        }
        if (signupBtnIcon) {
            signupBtnIcon.className = 'fas fa-check';
        }
        
        signupBtn.classList.remove('loading');
        signupBtn.classList.add('success');
    }

    // Social login buttons (Google/GitHub OAuth - Firebase removed, redirect to auth endpoint)
    const googleBtns = document.querySelectorAll('.google-btn');
    const githubBtns = document.querySelectorAll('.github-btn');

    googleBtns.forEach(btn => {
        btn.addEventListener('click', async function() {
            console.log('Google login clicked - not available');
            showLoginLoadingState();
            // Social login not available without Firebase
            showLoginSuccessState();
            setTimeout(() => {
                window.location.href = 'Dashboard/index.html';
            }, 1500);
        });
    });

    githubBtns.forEach(btn => {
        btn.addEventListener('click', async function() {
            console.log('GitHub login clicked - not available');
            showLoginLoadingState();
            // Social login not available without Firebase
            showLoginSuccessState();
            setTimeout(() => {
                window.location.href = 'Dashboard/index.html';
            }, 1500);
        });
    });

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

    // Remember me functionality
    if (rememberCheckbox) {
        // Load saved credentials if "remember me" was checked
        const savedEmail = localStorage.getItem('rememberedEmail');
        const savedPassword = localStorage.getItem('rememberedPassword');
        
        if (savedEmail && savedPassword) {
            emailInput.value = savedEmail;
            passwordInput.value = savedPassword;
            rememberCheckbox.checked = true;
        }
    }

    // Auto-save credentials when "remember me" is checked
    if (rememberCheckbox) {
        rememberCheckbox.addEventListener('change', function() {
            if (this.checked && emailInput.value && passwordInput.value) {
                localStorage.setItem('rememberedEmail', emailInput.value);
                localStorage.setItem('rememberedPassword', passwordInput.value);
            } else {
                localStorage.removeItem('rememberedEmail');
                localStorage.removeItem('rememberedPassword');
            }
        });
    }

    // Forgot password link
    const forgotLink = document.querySelector('.forgot-link');
    if (forgotLink) {
        forgotLink.addEventListener('click', function(e) {
            e.preventDefault();
            const email = emailInput.value.trim();
            if (email) {
                alert(`Password reset instructions will be sent to ${email}`);
            } else {
                alert('Please enter your email address first');
            }
        });
    }

    // Sign up link
    const signupLink = document.querySelector('.signup-link');
    if (signupLink) {
        signupLink.addEventListener('click', function(e) {
            e.preventDefault();
            // You can redirect to signup page or show signup modal
            window.location.href = 'signup.html';
        });
    }

    console.log('🔐 Login page functionality loaded successfully!');
    console.log('✨ Form validation active');
    console.log('🎨 Interactive effects initialized');
    console.log('🌍 Language support ready');
});
