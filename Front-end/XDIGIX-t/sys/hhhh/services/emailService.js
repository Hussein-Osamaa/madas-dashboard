// Email Service for Staff Invitations
const nodemailer = require('nodemailer');

// Email configuration
// You can use Gmail, Outlook, or any SMTP service
const createTransporter = () => {
    // Option 1: Gmail (recommended for testing)
    // You need to enable "App Passwords" in your Google Account
    // https://myaccount.google.com/apppasswords
    
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;
    
    console.log('📧 Email configuration check:');
    console.log('EMAIL_USER:', emailUser ? `${emailUser.substring(0, 3)}***` : 'NOT SET');
    console.log('EMAIL_PASSWORD:', emailPassword ? '***SET***' : 'NOT SET');
    
    if (!emailUser || !emailPassword) {
        throw new Error('Email credentials not configured. Please set EMAIL_USER and EMAIL_PASSWORD in .env file');
    }
    
    if (emailUser === 'your-email@gmail.com' || emailPassword === 'your-app-password-here') {
        throw new Error('Please replace the placeholder email credentials in .env file with your actual Gmail and app password');
    }
    
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: emailUser,
            pass: emailPassword
        }
    });
    
    // Option 2: Custom SMTP (for production)
    /*
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.example.com',
        port: process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
    */
};

// Send staff invitation email
const sendStaffInvitation = async (invitationData) => {
    try {
        const {
            toEmail,
            staffName,
            businessName,
            role,
            inviterName,
            loginUrl
        } = invitationData;

        console.log('📧 Attempting to send invitation to:', toEmail);
        console.log('📧 Business:', businessName);
        console.log('📧 Role:', role);

        const transporter = createTransporter();

        const mailOptions = {
            from: `"${businessName}" <${process.env.EMAIL_USER || 'noreply@madas.com'}>`,
            to: toEmail,
            subject: `🎉 You've been invited to join ${businessName} on MADAS`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            border-radius: 10px;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            background: linear-gradient(135deg, #232946 0%, #3B4371 100%);
            color: white;
            width: 60px;
            height: 60px;
            border-radius: 12px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 20px;
        }
        h1 {
            color: #232946;
            margin: 0;
            font-size: 24px;
        }
        .welcome-text {
            font-size: 16px;
            color: #666;
            margin: 20px 0;
        }
        .info-box {
            background-color: #f8f9fa;
            border-left: 4px solid #232946;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .info-box p {
            margin: 10px 0;
        }
        .info-box strong {
            color: #232946;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #232946 0%, #3B4371 100%);
            color: white;
            padding: 15px 40px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
        }
        .cta-button:hover {
            opacity: 0.9;
        }
        .steps {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .steps ol {
            margin: 10px 0;
            padding-left: 20px;
        }
        .steps li {
            margin: 10px 0;
            color: #555;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #999;
            font-size: 12px;
        }
        .permissions {
            background-color: #e8f4fd;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
        }
        .permissions h3 {
            color: #232946;
            margin-top: 0;
            font-size: 16px;
        }
        .badge {
            display: inline-block;
            background-color: #232946;
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            margin: 5px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">M</div>
            <h1>Welcome to ${businessName}!</h1>
        </div>

        <p class="welcome-text">
            Hi <strong>${staffName}</strong>,
        </p>

        <p>
            Great news! <strong>${inviterName}</strong> has invited you to join <strong>${businessName}</strong> 
            as a team member on the MADAS platform.
        </p>

        <div class="info-box">
            <p><strong>📧 Your Email:</strong> ${toEmail}</p>
            <p><strong>🎭 Your Role:</strong> <span class="badge">${role.toUpperCase()}</span></p>
            <p><strong>🏢 Business:</strong> ${businessName}</p>
        </div>

        <div style="text-align: center;">
            <a href="${loginUrl}" class="cta-button">
                🚀 Get Started Now
            </a>
        </div>

        <div class="steps">
            <h3 style="color: #232946; margin-top: 0;">📋 Next Steps:</h3>
            <ol>
                <li><strong>Click the button above</strong> to access the login page</li>
                <li><strong>Sign in with your email:</strong> ${toEmail}</li>
                <li><strong>If you don't have an account:</strong> Sign up first at the signup page</li>
                <li><strong>Once logged in:</strong> You'll have access to ${businessName}'s dashboard</li>
            </ol>
        </div>

        <div class="permissions">
            <h3>🔐 Your Access Level</h3>
            <p>As a <strong>${role}</strong>, you'll have access to specific features based on your role. 
            Your permissions have been configured by ${inviterName}.</p>
        </div>

        <p style="color: #666; font-size: 14px; margin-top: 30px;">
            <strong>Need help?</strong> If you have any questions or need assistance getting started, 
            please contact ${inviterName} or reach out to our support team.
        </p>

        <div class="footer">
            <p>This invitation was sent by ${businessName} via MADAS</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            <p style="margin-top: 10px;">
                © ${new Date().getFullYear()} MADAS. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
        `,
            text: `
Welcome to ${businessName}!

Hi ${staffName},

${inviterName} has invited you to join ${businessName} as a ${role} on the MADAS platform.

Your Details:
- Email: ${toEmail}
- Role: ${role}
- Business: ${businessName}

Next Steps:
1. Visit: ${loginUrl}
2. Sign in with your email: ${toEmail}
3. If you don't have an account, sign up first
4. Once logged in, you'll have access to ${businessName}'s dashboard

Need help? Contact ${inviterName} or our support team.

This invitation was sent by ${businessName} via MADAS.
If you didn't expect this invitation, you can safely ignore this email.

© ${new Date().getFullYear()} MADAS. All rights reserved.
        `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId);
        return {
            success: true,
            messageId: info.messageId,
            message: 'Invitation email sent successfully'
        };
    } catch (error) {
        console.error('❌ Error sending email:', error);
        console.error('❌ Error details:', {
            message: error.message,
            code: error.code,
            response: error.response,
            responseCode: error.responseCode
        });
        
        let userMessage = 'Failed to send invitation email';
        if (error.message.includes('Invalid login')) {
            userMessage = 'Email authentication failed. Please check your Gmail app password.';
        } else if (error.message.includes('not configured')) {
            userMessage = 'Email service not configured. Please check your .env file.';
        } else if (error.message.includes('placeholder')) {
            userMessage = 'Please update your email credentials in the .env file.';
        }
        
        return {
            success: false,
            error: error.message,
            message: userMessage
        };
    }
};

// Send welcome email to new staff member
const sendWelcomeEmail = async (staffData) => {
    const {
        toEmail,
        staffName,
        businessName,
        dashboardUrl
    } = staffData;

    const transporter = createTransporter();

    const mailOptions = {
        from: `"${businessName}" <${process.env.EMAIL_USER || 'noreply@madas.com'}>`,
        to: toEmail,
        subject: `✅ Welcome to ${businessName} - You're All Set!`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            border-radius: 10px;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .success-icon {
            text-align: center;
            font-size: 60px;
            margin-bottom: 20px;
        }
        h1 {
            color: #10B981;
            text-align: center;
            margin: 0;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
            color: white;
            padding: 15px 40px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success-icon">✅</div>
        <h1>You're All Set!</h1>
        <p>Hi ${staffName},</p>
        <p>Your account has been successfully activated for ${businessName}. You now have full access to the dashboard.</p>
        <div style="text-align: center;">
            <a href="${dashboardUrl}" class="cta-button">Go to Dashboard</a>
        </div>
    </div>
</body>
</html>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Welcome email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Error sending welcome email:', error);
        return { success: false, error: error.message };
    }
};

// Test email configuration
const testEmailConfig = async () => {
    const transporter = createTransporter();
    
    try {
        await transporter.verify();
        console.log('✅ Email server is ready to send messages');
        return { success: true, message: 'Email configuration is valid' };
    } catch (error) {
        console.error('❌ Email configuration error:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendStaffInvitation,
    sendWelcomeEmail,
    testEmailConfig
};