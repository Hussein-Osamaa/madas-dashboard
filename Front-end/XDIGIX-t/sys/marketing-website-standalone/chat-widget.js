/**
 * Live Chat Widget
 * Add this script to any page to enable the chat widget
 * Usage: <script src="chat-widget.js"></script> before closing </body> tag
 */

(function() {
    'use strict';
    
    // Chat Widget Styles
    const styles = `
        .chat-widget {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            font-family: 'Inter', sans-serif;
        }
        
        .chat-button {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, #6366F1, #EC4899);
            border: none;
            box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
            position: relative;
        }
        
        .chat-button:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 30px rgba(99, 102, 241, 0.5);
        }
        
        .chat-button i {
            color: white;
            font-size: 24px;
        }
        
        .chat-button .close-icon {
            display: none;
        }
        
        .chat-button.active .chat-icon {
            display: none;
        }
        
        .chat-button.active .close-icon {
            display: block;
        }
        
        .chat-badge {
            position: absolute;
            top: -5px;
            right: -5px;
            background: #EF4444;
            color: white;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            font-size: 12px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.1);
            }
        }
        
        .chat-window {
            position: absolute;
            bottom: 80px;
            right: 0;
            width: 380px;
            height: 550px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            display: none;
            flex-direction: column;
            animation: slideUp 0.3s ease-out;
        }
        
        .chat-window.active {
            display: flex;
        }
        
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .chat-header {
            background: linear-gradient(135deg, #6366F1, #EC4899);
            color: white;
            padding: 20px;
            border-radius: 16px 16px 0 0;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .chat-header-avatar {
            width: 45px;
            height: 45px;
            border-radius: 50%;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            color: #6366F1;
        }
        
        .chat-header-info h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
        }
        
        .chat-header-info p {
            margin: 0;
            font-size: 12px;
            opacity: 0.9;
        }
        
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: #F8FAFC;
        }
        
        .chat-message {
            margin-bottom: 15px;
            animation: fadeIn 0.3s;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .chat-message.bot {
            display: flex;
            gap: 10px;
        }
        
        .chat-message.bot .message-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: linear-gradient(135deg, #6366F1, #EC4899);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 14px;
            flex-shrink: 0;
        }
        
        .chat-message.bot .message-bubble {
            background: white;
            padding: 12px 16px;
            border-radius: 0 12px 12px 12px;
            max-width: 75%;
            color: #0F172A;
            font-size: 14px;
            line-height: 1.5;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .chat-message.user {
            display: flex;
            justify-content: flex-end;
        }
        
        .chat-message.user .message-bubble {
            background: linear-gradient(135deg, #6366F1, #EC4899);
            color: white;
            padding: 12px 16px;
            border-radius: 12px 0 12px 12px;
            max-width: 75%;
            font-size: 14px;
            line-height: 1.5;
        }
        
        .chat-quick-replies {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
        }
        
        .quick-reply-btn {
            background: white;
            border: 2px solid #E2E8F0;
            border-radius: 20px;
            padding: 8px 16px;
            font-size: 13px;
            color: #6366F1;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .quick-reply-btn:hover {
            background: #6366F1;
            color: white;
            border-color: #6366F1;
        }
        
        .chat-input-container {
            padding: 20px;
            background: white;
            border-top: 1px solid #E2E8F0;
            border-radius: 0 0 16px 16px;
        }
        
        .chat-input-wrapper {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        
        .chat-input {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid #E2E8F0;
            border-radius: 24px;
            font-size: 14px;
            font-family: 'Inter', sans-serif;
            outline: none;
            transition: border-color 0.2s;
        }
        
        .chat-input:focus {
            border-color: #6366F1;
        }
        
        .chat-send-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, #6366F1, #EC4899);
            border: none;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s;
        }
        
        .chat-send-btn:hover {
            transform: scale(1.1);
        }
        
        .chat-send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .typing-indicator {
            display: none;
            padding: 12px 16px;
            background: white;
            border-radius: 12px;
            width: fit-content;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .typing-indicator.active {
            display: block;
        }
        
        .typing-indicator span {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #6366F1;
            display: inline-block;
            margin: 0 2px;
            animation: typing 1.4s infinite;
        }
        
        .typing-indicator span:nth-child(2) {
            animation-delay: 0.2s;
        }
        
        .typing-indicator span:nth-child(3) {
            animation-delay: 0.4s;
        }
        
        @keyframes typing {
            0%, 60%, 100% {
                transform: translateY(0);
            }
            30% {
                transform: translateY(-10px);
            }
        }
        
        @media (max-width: 768px) {
            .chat-window {
                width: calc(100vw - 40px);
                height: calc(100vh - 100px);
                bottom: 80px;
                right: 20px;
                left: 20px;
            }
        }
    `;
    
    // Inject styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
    
    // Chat Widget HTML
    const chatHTML = `
        <div class="chat-widget">
            <button class="chat-button" id="chatButton">
                <i class="fas fa-comment-alt chat-icon"></i>
                <i class="fas fa-times close-icon"></i>
                <span class="chat-badge" id="chatBadge">1</span>
            </button>
            
            <div class="chat-window" id="chatWindow">
                <div class="chat-header">
                    <div class="chat-header-avatar">👋</div>
                    <div class="chat-header-info">
                        <h3>MADAS Support</h3>
                        <p>Online • Typically replies in minutes</p>
                    </div>
                </div>
                
                <div class="chat-messages" id="chatMessages">
                    <div class="chat-message bot">
                        <div class="message-avatar">🤖</div>
                        <div class="message-bubble">
                            Hi there! 👋 Welcome to MADAS! How can I help you today?
                            <div class="chat-quick-replies">
                                <button class="quick-reply-btn" data-reply="pricing">View Pricing</button>
                                <button class="quick-reply-btn" data-reply="features">See Features</button>
                                <button class="quick-reply-btn" data-reply="demo">Request Demo</button>
                                <button class="quick-reply-btn" data-reply="support">Get Support</button>
                            </div>
                        </div>
                    </div>
                    <div class="typing-indicator" id="typingIndicator">
                        <span></span><span></span><span></span>
                    </div>
                </div>
                
                <div class="chat-input-container">
                    <div class="chat-input-wrapper">
                        <input type="text" class="chat-input" id="chatInput" placeholder="Type your message...">
                        <button class="chat-send-btn" id="chatSendBtn">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Inject widget HTML
    document.body.insertAdjacentHTML('beforeend', chatHTML);
    
    // Chat functionality
    const chatButton = document.getElementById('chatButton');
    const chatWindow = document.getElementById('chatWindow');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    const chatBadge = document.getElementById('chatBadge');
    const typingIndicator = document.getElementById('typingIndicator');
    
    // Toggle chat window
    chatButton.addEventListener('click', () => {
        chatButton.classList.toggle('active');
        chatWindow.classList.toggle('active');
        chatBadge.style.display = 'none';
        if (chatWindow.classList.contains('active')) {
            chatInput.focus();
        }
    });
    
    // Auto-responses
    const responses = {
        'pricing': 'We have 3 plans: Basic ($29/mo), Professional ($79/mo), and Enterprise ($199/mo). Want to see detailed comparison?',
        'features': 'MADAS includes POS, Inventory Management, CRM, Analytics, Gamification, and 20+ more features! Check our features page for details.',
        'demo': 'Great! I can schedule a demo for you. Please email us at sales@madas.com or use the contact form.',
        'support': 'I\'m here to help! You can also email support@madas.com or call +1 (555) 123-4567.',
        'default': 'Thanks for your message! Our team will get back to you shortly. You can also email support@madas.com for immediate assistance.'
    };
    
    // Send message
    function sendMessage(message) {
        if (!message.trim()) return;
        
        // Add user message
        const userMessageHTML = `
            <div class="chat-message user">
                <div class="message-bubble">${message}</div>
            </div>
        `;
        chatMessages.insertAdjacentHTML('beforeend', userMessageHTML);
        chatInput.value = '';
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Show typing indicator
        typingIndicator.classList.add('active');
        
        // Simulate bot response
        setTimeout(() => {
            typingIndicator.classList.remove('active');
            const response = responses['default'];
            const botMessageHTML = `
                <div class="chat-message bot">
                    <div class="message-avatar">🤖</div>
                    <div class="message-bubble">${response}</div>
                </div>
            `;
            chatMessages.insertAdjacentHTML('beforeend', botMessageHTML);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 1500);
    }
    
    // Send button click
    chatSendBtn.addEventListener('click', () => {
        sendMessage(chatInput.value);
    });
    
    // Enter key
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage(chatInput.value);
        }
    });
    
    // Quick reply buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('quick-reply-btn')) {
            const reply = e.target.dataset.reply;
            const replyText = e.target.textContent;
            
            // Add user message
            const userMessageHTML = `
                <div class="chat-message user">
                    <div class="message-bubble">${replyText}</div>
                </div>
            `;
            chatMessages.insertAdjacentHTML('beforeend', userMessageHTML);
            
            // Show typing indicator
            typingIndicator.classList.add('active');
            
            // Bot response
            setTimeout(() => {
                typingIndicator.classList.remove('active');
                const response = responses[reply] || responses['default'];
                const botMessageHTML = `
                    <div class="chat-message bot">
                        <div class="message-avatar">🤖</div>
                        <div class="message-bubble">${response}</div>
                    </div>
                `;
                chatMessages.insertAdjacentHTML('beforeend', botMessageHTML);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 1000);
        }
    });
    
    // Show badge after 5 seconds
    setTimeout(() => {
        if (!chatWindow.classList.contains('active')) {
            chatBadge.style.display = 'flex';
        }
    }, 5000);
    
})();

 * Live Chat Widget
 * Add this script to any page to enable the chat widget
 * Usage: <script src="chat-widget.js"></script> before closing </body> tag
 */

(function() {
    'use strict';
    
    // Chat Widget Styles
    const styles = `
        .chat-widget {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            font-family: 'Inter', sans-serif;
        }
        
        .chat-button {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, #6366F1, #EC4899);
            border: none;
            box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
            position: relative;
        }
        
        .chat-button:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 30px rgba(99, 102, 241, 0.5);
        }
        
        .chat-button i {
            color: white;
            font-size: 24px;
        }
        
        .chat-button .close-icon {
            display: none;
        }
        
        .chat-button.active .chat-icon {
            display: none;
        }
        
        .chat-button.active .close-icon {
            display: block;
        }
        
        .chat-badge {
            position: absolute;
            top: -5px;
            right: -5px;
            background: #EF4444;
            color: white;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            font-size: 12px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.1);
            }
        }
        
        .chat-window {
            position: absolute;
            bottom: 80px;
            right: 0;
            width: 380px;
            height: 550px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            display: none;
            flex-direction: column;
            animation: slideUp 0.3s ease-out;
        }
        
        .chat-window.active {
            display: flex;
        }
        
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .chat-header {
            background: linear-gradient(135deg, #6366F1, #EC4899);
            color: white;
            padding: 20px;
            border-radius: 16px 16px 0 0;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .chat-header-avatar {
            width: 45px;
            height: 45px;
            border-radius: 50%;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            color: #6366F1;
        }
        
        .chat-header-info h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
        }
        
        .chat-header-info p {
            margin: 0;
            font-size: 12px;
            opacity: 0.9;
        }
        
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: #F8FAFC;
        }
        
        .chat-message {
            margin-bottom: 15px;
            animation: fadeIn 0.3s;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .chat-message.bot {
            display: flex;
            gap: 10px;
        }
        
        .chat-message.bot .message-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: linear-gradient(135deg, #6366F1, #EC4899);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 14px;
            flex-shrink: 0;
        }
        
        .chat-message.bot .message-bubble {
            background: white;
            padding: 12px 16px;
            border-radius: 0 12px 12px 12px;
            max-width: 75%;
            color: #0F172A;
            font-size: 14px;
            line-height: 1.5;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .chat-message.user {
            display: flex;
            justify-content: flex-end;
        }
        
        .chat-message.user .message-bubble {
            background: linear-gradient(135deg, #6366F1, #EC4899);
            color: white;
            padding: 12px 16px;
            border-radius: 12px 0 12px 12px;
            max-width: 75%;
            font-size: 14px;
            line-height: 1.5;
        }
        
        .chat-quick-replies {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
        }
        
        .quick-reply-btn {
            background: white;
            border: 2px solid #E2E8F0;
            border-radius: 20px;
            padding: 8px 16px;
            font-size: 13px;
            color: #6366F1;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .quick-reply-btn:hover {
            background: #6366F1;
            color: white;
            border-color: #6366F1;
        }
        
        .chat-input-container {
            padding: 20px;
            background: white;
            border-top: 1px solid #E2E8F0;
            border-radius: 0 0 16px 16px;
        }
        
        .chat-input-wrapper {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        
        .chat-input {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid #E2E8F0;
            border-radius: 24px;
            font-size: 14px;
            font-family: 'Inter', sans-serif;
            outline: none;
            transition: border-color 0.2s;
        }
        
        .chat-input:focus {
            border-color: #6366F1;
        }
        
        .chat-send-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, #6366F1, #EC4899);
            border: none;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s;
        }
        
        .chat-send-btn:hover {
            transform: scale(1.1);
        }
        
        .chat-send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .typing-indicator {
            display: none;
            padding: 12px 16px;
            background: white;
            border-radius: 12px;
            width: fit-content;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .typing-indicator.active {
            display: block;
        }
        
        .typing-indicator span {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #6366F1;
            display: inline-block;
            margin: 0 2px;
            animation: typing 1.4s infinite;
        }
        
        .typing-indicator span:nth-child(2) {
            animation-delay: 0.2s;
        }
        
        .typing-indicator span:nth-child(3) {
            animation-delay: 0.4s;
        }
        
        @keyframes typing {
            0%, 60%, 100% {
                transform: translateY(0);
            }
            30% {
                transform: translateY(-10px);
            }
        }
        
        @media (max-width: 768px) {
            .chat-window {
                width: calc(100vw - 40px);
                height: calc(100vh - 100px);
                bottom: 80px;
                right: 20px;
                left: 20px;
            }
        }
    `;
    
    // Inject styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
    
    // Chat Widget HTML
    const chatHTML = `
        <div class="chat-widget">
            <button class="chat-button" id="chatButton">
                <i class="fas fa-comment-alt chat-icon"></i>
                <i class="fas fa-times close-icon"></i>
                <span class="chat-badge" id="chatBadge">1</span>
            </button>
            
            <div class="chat-window" id="chatWindow">
                <div class="chat-header">
                    <div class="chat-header-avatar">👋</div>
                    <div class="chat-header-info">
                        <h3>MADAS Support</h3>
                        <p>Online • Typically replies in minutes</p>
                    </div>
                </div>
                
                <div class="chat-messages" id="chatMessages">
                    <div class="chat-message bot">
                        <div class="message-avatar">🤖</div>
                        <div class="message-bubble">
                            Hi there! 👋 Welcome to MADAS! How can I help you today?
                            <div class="chat-quick-replies">
                                <button class="quick-reply-btn" data-reply="pricing">View Pricing</button>
                                <button class="quick-reply-btn" data-reply="features">See Features</button>
                                <button class="quick-reply-btn" data-reply="demo">Request Demo</button>
                                <button class="quick-reply-btn" data-reply="support">Get Support</button>
                            </div>
                        </div>
                    </div>
                    <div class="typing-indicator" id="typingIndicator">
                        <span></span><span></span><span></span>
                    </div>
                </div>
                
                <div class="chat-input-container">
                    <div class="chat-input-wrapper">
                        <input type="text" class="chat-input" id="chatInput" placeholder="Type your message...">
                        <button class="chat-send-btn" id="chatSendBtn">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Inject widget HTML
    document.body.insertAdjacentHTML('beforeend', chatHTML);
    
    // Chat functionality
    const chatButton = document.getElementById('chatButton');
    const chatWindow = document.getElementById('chatWindow');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    const chatBadge = document.getElementById('chatBadge');
    const typingIndicator = document.getElementById('typingIndicator');
    
    // Toggle chat window
    chatButton.addEventListener('click', () => {
        chatButton.classList.toggle('active');
        chatWindow.classList.toggle('active');
        chatBadge.style.display = 'none';
        if (chatWindow.classList.contains('active')) {
            chatInput.focus();
        }
    });
    
    // Auto-responses
    const responses = {
        'pricing': 'We have 3 plans: Basic ($29/mo), Professional ($79/mo), and Enterprise ($199/mo). Want to see detailed comparison?',
        'features': 'MADAS includes POS, Inventory Management, CRM, Analytics, Gamification, and 20+ more features! Check our features page for details.',
        'demo': 'Great! I can schedule a demo for you. Please email us at sales@madas.com or use the contact form.',
        'support': 'I\'m here to help! You can also email support@madas.com or call +1 (555) 123-4567.',
        'default': 'Thanks for your message! Our team will get back to you shortly. You can also email support@madas.com for immediate assistance.'
    };
    
    // Send message
    function sendMessage(message) {
        if (!message.trim()) return;
        
        // Add user message
        const userMessageHTML = `
            <div class="chat-message user">
                <div class="message-bubble">${message}</div>
            </div>
        `;
        chatMessages.insertAdjacentHTML('beforeend', userMessageHTML);
        chatInput.value = '';
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Show typing indicator
        typingIndicator.classList.add('active');
        
        // Simulate bot response
        setTimeout(() => {
            typingIndicator.classList.remove('active');
            const response = responses['default'];
            const botMessageHTML = `
                <div class="chat-message bot">
                    <div class="message-avatar">🤖</div>
                    <div class="message-bubble">${response}</div>
                </div>
            `;
            chatMessages.insertAdjacentHTML('beforeend', botMessageHTML);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 1500);
    }
    
    // Send button click
    chatSendBtn.addEventListener('click', () => {
        sendMessage(chatInput.value);
    });
    
    // Enter key
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage(chatInput.value);
        }
    });
    
    // Quick reply buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('quick-reply-btn')) {
            const reply = e.target.dataset.reply;
            const replyText = e.target.textContent;
            
            // Add user message
            const userMessageHTML = `
                <div class="chat-message user">
                    <div class="message-bubble">${replyText}</div>
                </div>
            `;
            chatMessages.insertAdjacentHTML('beforeend', userMessageHTML);
            
            // Show typing indicator
            typingIndicator.classList.add('active');
            
            // Bot response
            setTimeout(() => {
                typingIndicator.classList.remove('active');
                const response = responses[reply] || responses['default'];
                const botMessageHTML = `
                    <div class="chat-message bot">
                        <div class="message-avatar">🤖</div>
                        <div class="message-bubble">${response}</div>
                    </div>
                `;
                chatMessages.insertAdjacentHTML('beforeend', botMessageHTML);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 1000);
        }
    });
    
    // Show badge after 5 seconds
    setTimeout(() => {
        if (!chatWindow.classList.contains('active')) {
            chatBadge.style.display = 'flex';
        }
    }, 5000);
    
})();
