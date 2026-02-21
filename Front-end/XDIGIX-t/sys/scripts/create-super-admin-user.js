/**
 * Create Super Admin User Script
 * Creates a super admin user in Firestore for the DIGIX Admin Dashboard
 * 
 * Usage:
 * node sys/scripts/create-super-admin-user.js <firebase_uid> <email> <name>
 * 
 * Example:
 * node sys/scripts/create-super-admin-user.js hxNl8FxpwSU37pQGRK9Mz0hHMnI3 hesainosama@gmail.com "Super Admin"
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
let serviceAccount;
try {
  serviceAccount = require(path.join(__dirname, '../../../serviceAccountKey.json'));
} catch (error) {
  console.error('❌ Error: serviceAccountKey.json not found in project root');
  console.error('   Please create a service account key from Firebase Console');
  console.error('   Go to: Project Settings → Service Accounts → Generate new private key');
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  if (error.code !== 'app/already-initialized') {
    console.error('Error initializing Firebase Admin:', error);
    process.exit(1);
  }
}

const db = admin.firestore();

const COLLECTIONS = {
  USERS: 'users',
  ROLES: 'roles'
};

async function findRootRole() {
  console.log('🔍 Looking for Root role...');
  const rolesSnapshot = await db
    .collection(COLLECTIONS.ROLES)
    .where('name', '==', 'Root')
    .where('tenant_id', '==', null)
    .limit(1)
    .get();

  if (rolesSnapshot.empty) {
    console.error('❌ Root role not found!');
    console.error('   Please run: node sys/scripts/init-rbac.js');
    console.error('   This will create the default roles including the Root role.');
    process.exit(1);
  }

  const rootRole = rolesSnapshot.docs[0];
  console.log(`✅ Found Root role: ${rootRole.id}`);
  return rootRole.id;
}

async function createSuperAdminUser(firebaseUid, email, name) {
  try {
    console.log('\n🚀 Creating Super Admin User...\n');
    console.log(`   Firebase UID: ${firebaseUid}`);
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${name}\n`);

    // Find Root role ID
    const roleId = await findRootRole();

    // Check if user already exists
    const existingUser = await db
      .collection(COLLECTIONS.USERS)
      .where('firebase_uid', '==', firebaseUid)
      .limit(1)
      .get();

    if (!existingUser.empty) {
      console.log('⚠️  User already exists with this firebase_uid');
      const existingDoc = existingUser.docs[0];
      console.log(`   Document ID: ${existingDoc.id}`);
      
      // Update existing user
      await existingDoc.ref.update({
        name,
        email,
        type: 'super_admin',
        role_id: roleId,
        tenant_id: null,
        status: 'active',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ Updated existing user document');
      return;
    }

    // Check by email
    const existingByEmail = await db
      .collection(COLLECTIONS.USERS)
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!existingByEmail.empty) {
      console.log('⚠️  User already exists with this email');
      const existingDoc = existingByEmail.docs[0];
      console.log(`   Document ID: ${existingDoc.id}`);
      
      // Update existing user
      await existingDoc.ref.update({
        firebase_uid: firebaseUid,
        name,
        type: 'super_admin',
        role_id: roleId,
        tenant_id: null,
        status: 'active',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ Updated existing user document');
      return;
    }

    // Create new user
    const userRef = db.collection(COLLECTIONS.USERS).doc();
    await userRef.set({
      firebase_uid: firebaseUid,
      name,
      email,
      type: 'super_admin',
      role_id: roleId,
      tenant_id: null,
      status: 'active',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Created super admin user successfully!`);
    console.log(`   Document ID: ${userRef.id}`);
    console.log(`\n🎉 Super Admin user is ready!`);
    console.log(`   You can now access the DIGIX Admin Dashboard at http://localhost:5177/`);

  } catch (error) {
    console.error('❌ Error creating super admin user:', error);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
  console.log('📋 Create Super Admin User\n');
  console.log('Usage:');
  console.log('  node sys/scripts/create-super-admin-user.js <firebase_uid> <email> <name>\n');
  console.log('Example:');
  console.log('  node sys/scripts/create-super-admin-user.js hxNl8FxpwSU37pQGRK9Mz0hHMnI3 hesainosama@gmail.com "Super Admin"\n');
  console.log('Your Firebase UID: hxNl8FxpwSU37pQGRK9Mz0hHMnI3');
  console.log('Your Email: hesainosama@gmail.com');
  process.exit(1);
}

const [firebaseUid, email, name] = args;

createSuperAdminUser(firebaseUid, email, name);


