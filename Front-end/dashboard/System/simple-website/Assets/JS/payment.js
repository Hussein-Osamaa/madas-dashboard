// Payment Form Functionality
document.addEventListener('DOMContentLoaded', function() {
    const paymentForm = document.getElementById('paymentForm');
    const paymentButton = document.getElementById('paymentButton');
    const buttonText = paymentButton.querySelector('.button-text');
    const buttonLoading = paymentButton.querySelector('.button-loading');
    
    // PayPal elements
    const paypalSection = document.getElementById('paypalSection');
    const paypalButton = document.getElementById('paypalButton');
    const paymentTabs = document.querySelectorAll('.payment-tab');
    const switchToCardLink = document.querySelector('.switch-to-card');
    
    // Form elements
    const cardNumber = document.getElementById('cardNumber');
    const expiryDate = document.getElementById('expiryDate');
    const cvv = document.getElementById('cvv');
    const cardholderName = document.getElementById('cardholderName');
    const billingAddress = document.getElementById('billingAddress');
    const city = document.getElementById('city');
    const zipCode = document.getElementById('zipCode');
    const country = document.getElementById('country');
    const termsAccepted = document.getElementById('termsAccepted');

    // Card number formatting
    cardNumber.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
        let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
        if (formattedValue.length > 19) {
            formattedValue = formattedValue.substr(0, 19);
        }
        e.target.value = formattedValue;
        
        // Update card icons based on card type
        updateCardIcons(value);
    });

    // Expiry date formatting
    expiryDate.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }
        e.target.value = value;
    });

    // CVV formatting
    cvv.addEventListener('input', function(e) {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });

    // ZIP code formatting
    zipCode.addEventListener('input', function(e) {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });

    // Cardholder name formatting
    cardholderName.addEventListener('input', function(e) {
        e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
    });

    // Update card icons based on card number
    function updateCardIcons(cardNumber) {
        const cardIcons = document.querySelectorAll('.card-icons i');
        cardIcons.forEach(icon => icon.style.opacity = '0.3');
        
        if (cardNumber.startsWith('4')) {
            // Visa
            cardIcons[0].style.opacity = '1';
        } else if (cardNumber.startsWith('5') || cardNumber.startsWith('2')) {
            // Mastercard
            cardIcons[1].style.opacity = '1';
        } else if (cardNumber.startsWith('3')) {
            // American Express
            cardIcons[2].style.opacity = '1';
        }
    }

    // Form validation
    function validateForm() {
        let isValid = true;
        const errors = [];

        // Card number validation
        const cardNumberValue = cardNumber.value.replace(/\s/g, '');
        if (!cardNumberValue || cardNumberValue.length < 13) {
            showFieldError(cardNumber, 'Please enter a valid card number');
            isValid = false;
        } else if (!luhnCheck(cardNumberValue)) {
            showFieldError(cardNumber, 'Invalid card number');
            isValid = false;
        } else {
            clearFieldError(cardNumber);
        }

        // Expiry date validation
        const expiryValue = expiryDate.value;
        if (!expiryValue || !/^\d{2}\/\d{2}$/.test(expiryValue)) {
            showFieldError(expiryDate, 'Please enter a valid expiry date (MM/YY)');
            isValid = false;
        } else {
            const [month, year] = expiryValue.split('/');
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear() % 100;
            const currentMonth = currentDate.getMonth() + 1;
            
            if (parseInt(month) < 1 || parseInt(month) > 12) {
                showFieldError(expiryDate, 'Invalid month');
                isValid = false;
            } else if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
                showFieldError(expiryDate, 'Card has expired');
                isValid = false;
            } else {
                clearFieldError(expiryDate);
            }
        }

        // CVV validation
        const cvvValue = cvv.value;
        if (!cvvValue || cvvValue.length < 3) {
            showFieldError(cvv, 'Please enter a valid CVV');
            isValid = false;
        } else {
            clearFieldError(cvv);
        }

        // Cardholder name validation
        if (!cardholderName.value.trim()) {
            showFieldError(cardholderName, 'Please enter cardholder name');
            isValid = false;
        } else {
            clearFieldError(cardholderName);
        }

        // Billing address validation
        if (!billingAddress.value.trim()) {
            showFieldError(billingAddress, 'Please enter billing address');
            isValid = false;
        } else {
            clearFieldError(billingAddress);
        }

        // City validation
        if (!city.value.trim()) {
            showFieldError(city, 'Please enter city');
            isValid = false;
        } else {
            clearFieldError(city);
        }

        // ZIP code validation
        if (!zipCode.value.trim()) {
            showFieldError(zipCode, 'Please enter ZIP code');
            isValid = false;
        } else {
            clearFieldError(zipCode);
        }

        // Country validation
        if (!country.value) {
            showFieldError(country, 'Please select country');
            isValid = false;
        } else {
            clearFieldError(country);
        }

        // Terms validation
        if (!termsAccepted.checked) {
            showFieldError(termsAccepted, 'Please accept the terms and conditions');
            isValid = false;
        } else {
            clearFieldError(termsAccepted);
        }

        return isValid;
    }

    // Luhn algorithm for card validation
    function luhnCheck(cardNumber) {
        let sum = 0;
        let isEven = false;
        
        for (let i = cardNumber.length - 1; i >= 0; i--) {
            let digit = parseInt(cardNumber[i]);
            
            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            
            sum += digit;
            isEven = !isEven;
        }
        
        return sum % 10 === 0;
    }

    // Show field error
    function showFieldError(field, message) {
        clearFieldError(field);
        field.style.borderColor = '#ef4444';
        field.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        errorDiv.style.color = '#ef4444';
        errorDiv.style.fontSize = '0.8rem';
        errorDiv.style.marginTop = '0.5rem';
        
        field.parentNode.appendChild(errorDiv);
    }

    // Clear field error
    function clearFieldError(field) {
        field.style.borderColor = '';
        field.style.boxShadow = '';
        
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }

    // Form submission
    paymentForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        // Show loading state
        paymentButton.disabled = true;
        buttonText.style.display = 'none';
        buttonLoading.style.display = 'flex';
        
        // Simulate payment processing
        setTimeout(() => {
            // Simulate successful payment
            showPaymentSuccess();
        }, 3000);
    });

    // Show payment success
    function showPaymentSuccess() {
        // Create success modal
        const successModal = document.createElement('div');
        successModal.className = 'payment-success-modal';
        successModal.innerHTML = `
            <div class="success-content">
                <div class="success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h2>Payment Successful!</h2>
                <p>Your subscription has been activated successfully.</p>
                <div class="success-details">
                    <p><strong>Transaction ID:</strong> TXN-${Date.now()}</p>
                    <p><strong>Amount:</strong> $29.99/month</p>
                    <p><strong>Plan:</strong> Pro Plan</p>
                </div>
                <div class="success-actions">
                    <button class="success-button primary" onclick="window.location.href='index.html'">
                        Go to Dashboard
                    </button>
                    <button class="success-button secondary" onclick="window.location.href='plans.html'">
                        View Plans
                    </button>
                </div>
            </div>
        `;
        
        // Add modal styles
        const modalStyles = `
            .payment-success-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(10px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }
            
            .success-content {
                background: var(--glass-bg);
                backdrop-filter: blur(25px);
                border: 1px solid var(--glass-border);
                border-radius: 20px;
                padding: 3rem;
                text-align: center;
                max-width: 500px;
                width: 90%;
                box-shadow: var(--shadow-glass);
                animation: slideUp 0.3s ease;
            }
            
            .success-icon {
                font-size: 4rem;
                color: var(--accent-emerald);
                margin-bottom: 1.5rem;
                animation: bounce 0.6s ease;
            }
            
            .success-content h2 {
                font-size: 2rem;
                font-weight: 700;
                color: var(--text-primary);
                margin-bottom: 1rem;
                background: linear-gradient(135deg, var(--primary-cyan), var(--primary-purple));
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .success-content p {
                color: var(--text-secondary);
                margin-bottom: 1.5rem;
            }
            
            .success-details {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 12px;
                padding: 1.5rem;
                margin: 2rem 0;
                text-align: left;
            }
            
            .success-details p {
                margin-bottom: 0.5rem;
                color: var(--text-secondary);
            }
            
            .success-actions {
                display: flex;
                gap: 1rem;
                justify-content: center;
                margin-top: 2rem;
            }
            
            .success-button {
                padding: 1rem 2rem;
                border: none;
                border-radius: 12px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .success-button.primary {
                background: linear-gradient(135deg, var(--primary-cyan), var(--primary-purple));
                color: white;
            }
            
            .success-button.secondary {
                background: rgba(255, 255, 255, 0.1);
                color: var(--text-primary);
                border: 1px solid var(--glass-border);
            }
            
            .success-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 30px rgba(0, 212, 255, 0.3);
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideUp {
                from { transform: translateY(50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-10px); }
                60% { transform: translateY(-5px); }
            }
            
            @media (max-width: 768px) {
                .success-content {
                    padding: 2rem;
                    margin: 1rem;
                }
                
                .success-actions {
                    flex-direction: column;
                }
                
                .success-button {
                    width: 100%;
                }
            }
        `;
        
        // Add styles to head
        const styleSheet = document.createElement('style');
        styleSheet.textContent = modalStyles;
        document.head.appendChild(styleSheet);
        
        // Add modal to body
        document.body.appendChild(successModal);
        
        // Reset button state
        paymentButton.disabled = false;
        buttonText.style.display = 'block';
        buttonLoading.style.display = 'none';
        
        console.log('✅ Payment processed successfully!');
    }

    // Real-time validation
    const formInputs = [cardNumber, expiryDate, cvv, cardholderName, billingAddress, city, zipCode, country];
    
    formInputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.value.trim()) {
                clearFieldError(this);
            }
        });
    });

    // Terms checkbox validation
    termsAccepted.addEventListener('change', function() {
        if (this.checked) {
            clearFieldError(this);
        }
    });

    // Payment method switching
    paymentTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const method = this.getAttribute('data-method');
            
            // Update tab states
            paymentTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Show/hide appropriate sections
            if (method === 'card') {
                paymentForm.style.display = 'flex';
                paypalSection.style.display = 'none';
            } else if (method === 'paypal') {
                paymentForm.style.display = 'none';
                paypalSection.style.display = 'block';
            }
        });
    });

    // Switch to card link
    switchToCardLink.addEventListener('click', function(e) {
        e.preventDefault();
        paymentTabs[0].click(); // Click the credit card tab
    });

    // PayPal payment processing
    paypalButton.addEventListener('click', function() {
        // Show loading state
        paypalButton.disabled = true;
        paypalButton.innerHTML = `
            <div class="paypal-button-content">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Processing...</span>
            </div>
        `;
        
        // Simulate PayPal payment processing
        setTimeout(() => {
            // Simulate successful PayPal payment
            showPayPalSuccess();
        }, 3000);
    });

    // Show PayPal success
    function showPayPalSuccess() {
        // Create success modal
        const successModal = document.createElement('div');
        successModal.className = 'payment-success-modal';
        successModal.innerHTML = `
            <div class="success-content">
                <div class="success-icon">
                    <i class="fab fa-paypal"></i>
                </div>
                <h2>PayPal Payment Successful!</h2>
                <p>Your subscription has been activated successfully via PayPal.</p>
                <div class="success-details">
                    <p><strong>Payment Method:</strong> PayPal</p>
                    <p><strong>Transaction ID:</strong> PP-${Date.now()}</p>
                    <p><strong>Amount:</strong> $29.99/month</p>
                    <p><strong>Plan:</strong> Pro Plan</p>
                </div>
                <div class="success-actions">
                    <button class="success-button primary" onclick="window.location.href='index.html'">
                        Go to Dashboard
                    </button>
                    <button class="success-button secondary" onclick="window.location.href='plans.html'">
                        View Plans
                    </button>
                </div>
            </div>
        `;
        
        // Add modal styles (reuse existing styles)
        const modalStyles = `
            .payment-success-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(10px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }
            
            .success-content {
                background: var(--glass-bg);
                backdrop-filter: blur(25px);
                border: 1px solid var(--glass-border);
                border-radius: 20px;
                padding: 3rem;
                text-align: center;
                max-width: 500px;
                width: 90%;
                box-shadow: var(--shadow-glass);
                animation: slideUp 0.3s ease;
            }
            
            .success-icon {
                font-size: 4rem;
                color: #0070ba;
                margin-bottom: 1.5rem;
                animation: bounce 0.6s ease;
            }
            
            .success-content h2 {
                font-size: 2rem;
                font-weight: 700;
                color: var(--text-primary);
                margin-bottom: 1rem;
                background: linear-gradient(135deg, #0070ba, #003087);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .success-content p {
                color: var(--text-secondary);
                margin-bottom: 1.5rem;
            }
            
            .success-details {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 12px;
                padding: 1.5rem;
                margin: 2rem 0;
                text-align: left;
            }
            
            .success-details p {
                margin-bottom: 0.5rem;
                color: var(--text-secondary);
            }
            
            .success-actions {
                display: flex;
                gap: 1rem;
                justify-content: center;
                margin-top: 2rem;
            }
            
            .success-button {
                padding: 1rem 2rem;
                border: none;
                border-radius: 12px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .success-button.primary {
                background: linear-gradient(135deg, #0070ba, #003087);
                color: white;
            }
            
            .success-button.secondary {
                background: rgba(255, 255, 255, 0.1);
                color: var(--text-primary);
                border: 1px solid var(--glass-border);
            }
            
            .success-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 30px rgba(0, 112, 186, 0.3);
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideUp {
                from { transform: translateY(50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-10px); }
                60% { transform: translateY(-5px); }
            }
            
            @media (max-width: 768px) {
                .success-content {
                    padding: 2rem;
                    margin: 1rem;
                }
                
                .success-actions {
                    flex-direction: column;
                }
                
                .success-button {
                    width: 100%;
                }
            }
        `;
        
        // Add styles to head
        const styleSheet = document.createElement('style');
        styleSheet.textContent = modalStyles;
        document.head.appendChild(styleSheet);
        
        // Add modal to body
        document.body.appendChild(successModal);
        
        // Reset PayPal button state
        paypalButton.disabled = false;
        paypalButton.innerHTML = `
            <div class="paypal-button-content">
                <i class="fab fa-paypal"></i>
                <span>Pay with PayPal</span>
            </div>
        `;
        
        console.log('✅ PayPal payment processed successfully!');
    }

    console.log('💳 Payment form initialized successfully!');
    console.log('💙 PayPal integration ready!');
});
