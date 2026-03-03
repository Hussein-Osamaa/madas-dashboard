// Script to create an admin user in Firestore
// Run this with: node scripts/create-admin.js

const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin SDK
// You'll need to download your service account key from Firebase Console
// and place it in the project root as 'service-account-key.json'
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'madas-store'
});

const db = admin.firestore();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function createAdminUser() {
  try {
    console.log('🔐 Admin User Creation Tool');
    console.log('==========================\n');

    // Get user input
    const email = await question('Enter admin email: ');
    const uid = await question('Enter Firebase UID (or press Enter to generate): ');
    
    // Generate UID if not provided
    const finalUid = uid || admin.auth().generateUid();
    
    console.log(`\nCreating admin user with UID: ${finalUid}`);
    
    // Create user in Firebase Auth (if UID was provided)
    if (uid) {
      try {
        await admin.auth().createUser({
          uid: finalUid,
          email: email,
          emailVerified: true
        });
        console.log('✅ User created in Firebase Auth');
      } catch (error) {
        if (error.code === 'auth/uid-already-exists') {
          console.log('ℹ️  User already exists in Firebase Auth');
        } else {
          throw error;
        }
      }
    }
    
    // Create staff document
    const staffData = {
      email: email,
      role: 'admin',
      approved: true,
      permissions: {
        home: ['view'],
        orders: ['view', 'search', 'create', 'edit'],
        inventory: ['view', 'edit'],
        customers: ['view', 'edit'],
        employees: ['view', 'edit'],
        finance: ['view', 'reports'],
        analytics: ['view', 'export'],
        settings: ['view', 'edit']
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('staff').doc(finalUid).set(staffData);
    
    console.log('✅ Admin user created successfully!');
    console.log(`📧 Email: ${email}`);
    console.log(`🆔 UID: ${finalUid}`);
    console.log(`🔑 Role: admin`);
    console.log(`✅ Approved: true`);
    console.log('\n🎉 You can now log in to the admin dashboard!');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    rl.close();
    process.exit(0);
  }
}

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Run the script
createAdminUser();
