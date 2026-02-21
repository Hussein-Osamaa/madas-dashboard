/**
 * Create Super Admin User (Client-Side)
 * Run this in the browser console while logged in to create your super admin user
 * 
 * Instructions:
 * 1. Log in to the DIGIX Admin Dashboard
 * 2. Open browser console (F12)
 * 3. Copy and paste this entire script
 * 4. It will automatically create your super admin user
 */

(async function createSuperAdminUser() {
  try {
    console.log('🚀 Creating Super Admin User...\n');
    
    // Get current Firebase user
    const { auth, db, collection, addDoc, query, where, getDocs, doc, updateDoc, setDoc } = await import('/src/lib/firebase.js');
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.error('❌ No user logged in! Please log in first.');
      return;
    }

    console.log('📧 Email:', currentUser.email);
    console.log('🔑 Firebase UID:', currentUser.uid);
    
    // Find Root role
    console.log('\n🔍 Looking for Root role...');
    const rolesQuery = query(
      collection(db, 'roles'),
      where('name', '==', 'Root'),
      where('tenant_id', '==', null)
    );
    const rolesSnapshot = await getDocs(rolesQuery);
    
    if (rolesSnapshot.empty) {
      console.error('❌ Root role not found!');
      console.error('   Please run: node sys/scripts/init-rbac.js');
      console.error('   This will create the default roles.');
      return;
    }
    
    const rootRole = rolesSnapshot.docs[0];
    const roleId = rootRole.id;
    console.log(`✅ Found Root role: ${roleId}`);
    
    // Check if user already exists
    const userQuery = query(
      collection(db, 'users'),
      where('firebase_uid', '==', currentUser.uid)
    );
    const userSnapshot = await getDocs(userQuery);
    
    if (!userSnapshot.empty) {
      console.log('\n⚠️  User already exists! Updating...');
      const userDoc = userSnapshot.docs[0];
      await updateDoc(doc(db, 'users', userDoc.id), {
        name: currentUser.displayName || currentUser.email.split('@')[0],
        email: currentUser.email,
        type: 'super_admin',
        role_id: roleId,
        tenant_id: null,
        status: 'active',
        updated_at: new Date().toISOString()
      });
      console.log('✅ Updated existing user!');
      console.log('   Document ID:', userDoc.id);
      console.log('\n🔄 Please refresh the page to load your permissions.');
      return;
    }
    
    // Create new user
    console.log('\n📝 Creating new super admin user...');
    const userRef = doc(collection(db, 'users'));
    await setDoc(userRef, {
      firebase_uid: currentUser.uid,
      name: currentUser.displayName || currentUser.email.split('@')[0],
      email: currentUser.email,
      type: 'super_admin',
      role_id: roleId,
      tenant_id: null,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    console.log('✅ Super admin user created successfully!');
    console.log('   Document ID:', userRef.id);
    console.log('\n🎉 Your super admin account is ready!');
    console.log('🔄 Please refresh the page to load your permissions.');
    
  } catch (error) {
    console.error('❌ Error creating super admin user:', error);
    console.error('\n📋 Manual Setup Instructions:');
    console.error('   1. Go to Firebase Console → Firestore');
    console.error('   2. Open the "users" collection');
    console.error('   3. Click "Add document"');
    console.error('   4. Set the following fields:');
    console.error('      - firebase_uid: "' + auth.currentUser.uid + '"');
    console.error('      - email: "' + auth.currentUser.email + '"');
    console.error('      - name: "Super Admin"');
    console.error('      - type: "super_admin"');
    console.error('      - role_id: "<Root role ID>"');
    console.error('      - tenant_id: null');
    console.error('      - status: "active"');
    console.error('      - created_at: "' + new Date().toISOString() + '"');
    console.error('      - updated_at: "' + new Date().toISOString() + '"');
  }
})();


