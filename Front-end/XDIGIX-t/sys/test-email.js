// Test Email Configuration for UNDO Invitation System
require('dotenv').config();

async function testEmail() {
    console.log('🧪 Testing email configuration for UNDO system...');
    console.log('EMAIL_USER:', process.env.EMAIL_USER ? `${process.env.EMAIL_USER.substring(0, 3)}***` : 'NOT SET');
    console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***SET***' : 'NOT SET');
    
    try {
        const { testEmailConfig } = require('./Dashboard/services/emailService');
        const result = await testEmailConfig();
        console.log('📧 Test result:', result);
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testEmail();
