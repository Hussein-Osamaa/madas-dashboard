// API Endpoint: Send Staff Invitation Email
const { sendStaffInvitation } = require('../services/emailService');

module.exports = async (req, res) => {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            message: 'Method not allowed' 
        });
    }

    try {
        const {
            toEmail,
            staffName,
            businessName,
            role,
            inviterName,
            businessId,
            setupUrl  // Accept pre-generated URL from client
        } = req.body;

        // Validate required fields
        if (!toEmail || !staffName || !businessName || !role) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(toEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Use provided setupUrl or generate one
        let finalSetupUrl = setupUrl;
        if (!finalSetupUrl) {
            // Fallback: Generate URL from request headers (for backwards compatibility)
            const protocol = req.headers['x-forwarded-proto'] || 'http';
            const host = req.headers.host;
            const baseUrl = `${protocol}://${host}`;
            const invitationId = Date.now().toString();
            finalSetupUrl = `${baseUrl}/setup-password?email=${encodeURIComponent(toEmail)}&business=${encodeURIComponent(businessName)}&businessId=${encodeURIComponent(businessId)}&role=${encodeURIComponent(role)}&invitation=${invitationId}`;
        }

        // Prepare invitation data
        const invitationData = {
            toEmail,
            staffName,
            businessName,
            role,
            inviterName: inviterName || 'Your Team',
            loginUrl: finalSetupUrl
        };

        // Send the invitation email
        const result = await sendStaffInvitation(invitationData);

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: `Invitation email sent successfully to ${toEmail}`,
                messageId: result.messageId
            });
        } else {
            return res.status(500).json({
                success: false,
                message: result.message || 'Failed to send invitation email',
                error: result.error
            });
        }

    } catch (error) {
        console.error('❌ Error in send-invitation API:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};
