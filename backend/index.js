const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

// Initialize Firebase
admin.initializeApp();

// Configure email transport
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "hesainosama@gmail.com", // Replace with your email
    pass: "trnv lubb jlbh nqco", // Use App Password (not your actual password)
  },
});

// Function: Trigger on stock update
exports.stockAlert = functions.firestore
  .document("Products/{productId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // If size count changed and now only one size is left
    if (before.sizes.length > 1 && after.sizes.length === 1) {
      const productName = after.name || "Unknown Product";
      const sizeLeft = after.sizes[0];

      const message = `⚠️ Only one size left for ${productName} (Size: ${sizeLeft})`;

      // Send email
      await transporter.sendMail({
        from: '"MADAS Inventory" <your-email@gmail.com>',
        to: "hesainosama@gmail.com", // or notify multiple admins
        subject: `Low Stock Alert - ${productName}`,
        text: message,
      });

      console.log("Alert sent: " + message);
    }
  });
