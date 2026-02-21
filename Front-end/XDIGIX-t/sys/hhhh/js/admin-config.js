// Admin Configuration
// Add or remove admin emails here to grant/revoke full access

const ADMIN_EMAILS = [
  "hesainosama@gmail.com",
  // Add more admin emails here:
  // "your-admin-email@gmail.com",
  // "another-admin@example.com"
];

// Function to check if an email is admin
function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(email);
}

// Export for use in other files
window.ADMIN_EMAILS = ADMIN_EMAILS;
window.isAdminEmail = isAdminEmail;
