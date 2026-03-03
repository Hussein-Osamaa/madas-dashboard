// Login page functionality with Firebase integration
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
    
    // Wait for Firebase to be available
    const checkFirebase = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore) {
            console.log('🔥 Firebase is ready');
            clearInterval(checkFirebase);
            initializeFirebaseAuth();
        }
    }, 100);

    // Timeout after 5 seconds
    setTimeout(() => {
        clearInterval(checkFirebase);
        console.log('⚠️ Firebase initialization timeout - using fallback');
        initializeFallbackAuth();
    }, 5000);

    // Initialize Firebase authentication
    function initializeFirebaseAuth() {
        console.log('🔐 Firebase authentication initialized');
        
        // Listen for auth state changes
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                console.log('👤 User authenticated:', user.email);
                // User is signed in
            } else {
                console.log('👤 User not authenticated');
                // User is signed out
            }
        });
    }

    // Initialize fallback authentication
    function initializeFallbackAuth() {
        console.log('🔄 Using fallback authentication');
        // Continue with existing localStorage-based authentication
    }
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

    // Firebase login function
    async function firebaseLogin(email, password) {
        try {
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            console.log('✅ Firebase login successful:', user.email);
            return user;
        } catch (error) {
            console.error('❌ Firebase login error:', error);
            throw error;
        }
    }

    // Firebase signup function
    async function firebaseSignup(userData) {
        try {
            console.log('🔄 Creating new business account...');
            console.log('📋 User Data:', {
                firstName: userData.firstName,
                lastName: userData.lastName,
                email: userData.email,
                company: userData.company,
                plan: userData.plan
            });
            
            // 1. Create Firebase Auth user
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(userData.email, userData.password);
            const user = userCredential.user;
            console.log('✅ Firebase Auth user created:', user.uid);
            
            // Update user profile
            await user.updateProfile({
                displayName: `${userData.firstName} ${userData.lastName}`
            });
            console.log('✅ User profile updated');

            // 2. Generate unique business ID
            const businessId = `business_${user.uid}_${Date.now()}`;
            console.log('🏢 Business ID:', businessId);

            // 3. Create business document
            await firebase.firestore().collection('businesses').doc(businessId).set({
                id: businessId,
                ownerUid: user.uid,
                ownerName: `${userData.firstName} ${userData.lastName}`,
                businessName: userData.company,
                businessEmail: userData.businessEmail,
                plan: userData.plan,
                staff: [user.uid], // Owner is first staff member
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'active'
            });
            console.log('✅ Business document created');

            // 4. Create user document (links user to business)
            await firebase.firestore().collection('users').doc(user.uid).set({
                uid: user.uid,
                firstName: userData.firstName,
                lastName: userData.lastName,
                email: userData.email,
                businessEmail: userData.businessEmail,
                phone: userData.phone,
                company: userData.company,
                businessId: businessId, // CRITICAL: Links user to business
                role: 'owner',
                plan: userData.plan,
                newsletter: userData.newsletter,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'active'
            });
            console.log('✅ User document created');

            // 5. Create staff document (owner has full access)
            const planPermissions = getPlanPermissions(userData.plan);
            await firebase.firestore().collection('staff').add({
                uid: user.uid,
                email: userData.email,
                name: `${userData.firstName} ${userData.lastName}`,
                businessId: businessId, // CRITICAL: Isolates staff to business
                role: 'owner',
                approved: true,
                status: 'active',
                permissions: planPermissions,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('✅ Staff document created (owner)');

            // 6. Create user session data
            const sessionData = {
                userId: user.uid,
                email: user.email,
                firstName: userData.firstName,
                lastName: userData.lastName,
                company: userData.company,
                businessEmail: userData.businessEmail,
                businessId: businessId,
                plan: userData.plan,
                role: 'owner',
                loginTime: new Date().toISOString(),
                isAuthenticated: true
            };
            
            // Store session data
            localStorage.setItem('currentUser', JSON.stringify(sessionData));
            localStorage.setItem('currentBusinessId', businessId);
            
            console.log('🎉 Complete business setup successful!');
            console.log('🆔 User ID:', user.uid);
            console.log('🏢 Business ID:', businessId);
            console.log('📧 Email:', user.email);
            console.log('🏢 Company:', userData.company);
            console.log('📋 Plan:', userData.plan);
            
            return { user, businessId, sessionData };
        } catch (error) {
            console.error('❌ Firebase signup error:', error);
            
            // Provide specific error messages
            let errorMessage = 'Signup failed. Please try again.';
            
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'An account with this email already exists. Please use a different email or try logging in.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Password is too weak. Please use at least 6 characters with a mix of letters and numbers.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Please enter a valid email address.';
            } else if (error.code === 'auth/operation-not-allowed') {
                errorMessage = 'Email/password accounts are not enabled. Please contact support.';
            } else if (error.message.includes('Firestore')) {
                errorMessage = 'Database error occurred. Please try again or contact support.';
            }
            
            throw new Error(errorMessage);
        }
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
                    
                    // Try Firebase authentication first
                    if (typeof firebase !== 'undefined' && firebase.auth) {
                        try {
                            const user = await firebaseLogin(email, password);
                            
                            // Get user data from Firestore
                            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                            const userData = userDoc.data();
                            
                            // Create user session
                            const session = {
                                userId: user.uid,
                                email: user.email,
                                firstName: userData?.firstName || '',
                                lastName: userData?.lastName || '',
                                company: userData?.company || '',
                                plan: userData?.plan || 'starter',
                                loginTime: new Date().toISOString(),
                                isAuthenticated: true
                            };
                            
                            localStorage.setItem('currentUser', JSON.stringify(session));
                            
                            console.log('✅ Firebase login successful:', session);
                            
                            // Show success state
                            showLoginSuccessState();
                            
                            // Redirect to Dashboard
                            setTimeout(() => {
                                window.location.href = 'Dashboard/index.html';
                            }, 2000);
                            
                        } catch (firebaseError) {
                            console.log('🔄 Firebase login failed, trying fallback authentication');
                            
                            // Fallback to localStorage authentication
                            const user = authenticateUser(email, password);
                            
                            if (user) {
                                const session = createUserSession(user);
                                console.log('✅ Fallback login successful:', session);
                                showLoginSuccessState();
                                setTimeout(() => {
                                    window.location.href = 'Dashboard/index.html';
                                }, 2000);
                            } else {
                                showLoginError('Invalid email or password. Please try again.');
                            }
                        }
                    } else {
                        // Use fallback authentication
                        const user = authenticateUser(email, password);
                        
                        if (user) {
                            const session = createUserSession(user);
                            console.log('✅ Fallback login successful:', session);
                            showLoginSuccessState();
                            setTimeout(() => {
                                window.location.href = 'Dashboard/index.html';
                            }, 2000);
                        } else {
                            showLoginError('Invalid email or password. Please try again.');
                        }
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
                    
                    // Try Firebase signup first
                    if (typeof firebase !== 'undefined' && firebase.auth) {
                        try {
                            const result = await firebaseSignup(clientData);
                            const { user, businessId, sessionData } = result;
                            
                            console.log('🎉 Firebase signup successful!');
                            console.log('🆔 User ID:', user.uid);
                            console.log('🏢 Business ID:', businessId);
                            console.log('📧 Email:', user.email);
                            console.log('🏢 Company:', clientData.company);
                            console.log('📋 Plan:', clientData.plan);
                            
                            // Show success state
                            showSignupSuccessState();
                            
                            // Show success message
                            const successMessage = document.createElement('div');
                            successMessage.className = 'success-message';
                            successMessage.innerHTML = `
                                <div class="success-content">
                                    <i class="fas fa-check-circle"></i>
                                    <h3>Account Created Successfully!</h3>
                                    <p>Welcome to ${clientData.company}! Your ${clientData.plan} plan is now active.</p>
                                    <p>Redirecting to your dashboard...</p>
                                </div>
                            `;
                            
                            // Add success message to page
                            const formContainer = signupForm.parentElement;
                            formContainer.appendChild(successMessage);
                            
                            // Redirect to Dashboard
                            setTimeout(() => {
                                window.location.href = 'Dashboard/index.html';
                            }, 3000);
                            
                        } catch (firebaseError) {
                            console.error('❌ Firebase signup failed:', firebaseError);
                            
                            // Show specific error message
                            const errorMessage = firebaseError.message || 'Signup failed. Please try again.';
                            showSignupError(errorMessage);
                            
                            // Don't fallback to localStorage for Firebase errors
                            // Let user fix the issue and try again
                        }
                    } else {
                        console.log('⚠️ Firebase not available, using fallback signup');
                        
                        // Use fallback signup
                        const uniqueId = generateUniqueId();
                        const fallbackData = {
                            id: uniqueId,
                            ...clientData
                        };
                        
                        const savedClient = saveClientData(fallbackData);
                        
                        console.log('🎉 Fallback signup successful!');
                        console.log('🆔 Client ID:', savedClient.id);
                        console.log('📧 Email:', savedClient.email);
                        console.log('🏢 Company:', savedClient.company);
                        console.log('📧 Business Email:', savedClient.businessEmail);
                        
                        // Show success state
                        showSignupSuccessState();
                        
                        // Redirect to Dashboard for business management
                        setTimeout(() => {
                            window.location.href = 'Dashboard/index.html';
                        }, 2000);
                    }
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

    // Firebase Google login
    async function firebaseGoogleLogin() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await firebase.auth().signInWithPopup(provider);
            const user = result.user;
            console.log('✅ Google login successful:', user.email);
            return user;
        } catch (error) {
            console.error('❌ Google login error:', error);
            throw error;
        }
    }

    // Firebase GitHub login
    async function firebaseGitHubLogin() {
        try {
            const provider = new firebase.auth.GithubAuthProvider();
            const result = await firebase.auth().signInWithPopup(provider);
            const user = result.user;
            console.log('✅ GitHub login successful:', user.email);
            return user;
        } catch (error) {
            console.error('❌ GitHub login error:', error);
            throw error;
        }
    }

    // Social login buttons
    const googleBtns = document.querySelectorAll('.google-btn');
    const githubBtns = document.querySelectorAll('.github-btn');

    googleBtns.forEach(btn => {
        btn.addEventListener('click', async function() {
            console.log('Google login clicked');
            showLoginLoadingState();
            
            try {
                if (typeof firebase !== 'undefined' && firebase.auth) {
                    const user = await firebaseGoogleLogin();
                    
                    // Create user session
                    const session = {
                        userId: user.uid,
                        email: user.email,
                        firstName: user.displayName?.split(' ')[0] || '',
                        lastName: user.displayName?.split(' ')[1] || '',
                        company: '',
                        plan: 'starter',
                        loginTime: new Date().toISOString(),
                        isAuthenticated: true
                    };
                    
                    localStorage.setItem('currentUser', JSON.stringify(session));
                    
                    showLoginSuccessState();
                    setTimeout(() => {
                        window.location.href = 'Dashboard/index.html';
                    }, 1500);
                } else {
                    // Fallback for when Firebase is not available
                    showLoginSuccessState();
                    setTimeout(() => {
                        window.location.href = 'Dashboard/index.html';
                    }, 1500);
                }
            } catch (error) {
                console.error('❌ Google login failed:', error);
                showLoginError('Google login failed. Please try again.');
            }
        });
    });

    githubBtns.forEach(btn => {
        btn.addEventListener('click', async function() {
            console.log('GitHub login clicked');
            showLoginLoadingState();
            
            try {
                if (typeof firebase !== 'undefined' && firebase.auth) {
                    const user = await firebaseGitHubLogin();
                    
                    // Create user session
                    const session = {
                        userId: user.uid,
                        email: user.email,
                        firstName: user.displayName?.split(' ')[0] || '',
                        lastName: user.displayName?.split(' ')[1] || '',
                        company: '',
                        plan: 'starter',
                        loginTime: new Date().toISOString(),
                        isAuthenticated: true
                    };
                    
                    localStorage.setItem('currentUser', JSON.stringify(session));
                    
                    showLoginSuccessState();
                    setTimeout(() => {
                        window.location.href = 'Dashboard/index.html';
                    }, 1500);
                } else {
                    // Fallback for when Firebase is not available
                    showLoginSuccessState();
                    setTimeout(() => {
                        window.location.href = 'Dashboard/index.html';
                    }, 1500);
                }
            } catch (error) {
                console.error('❌ GitHub login failed:', error);
                showLoginError('GitHub login failed. Please try again.');
            }
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
