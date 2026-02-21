/**
 * Browser Console Script - Create Super Admin User
 * 
 * INSTRUCTIONS:
 * 1. Log in to the DIGIX Admin Dashboard (http://localhost:5177/)
 * 2. Open browser console (F12 or Cmd+Option+I)
 * 3. Copy and paste this entire script into the console
 * 4. Press Enter
 * 5. Refresh the page after it completes
 */

(async () => {
  console.log('🚀 Creating Super Admin User...\n');
  
  try {
    // Import Firebase functions
    const { db, collection, doc, setDoc, query, where, getDocs, updateDoc } = await import('../../src/lib/firebase.js');
    const { auth } = await import('../../src/lib/firebase.js');
    
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
      console.error('\n❌ Root role not found!');
      console.error('   Please run this command first:');
      console.error('   node sys/scripts/init-rbac.js');
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
    
    const userData = {
      firebase_uid: currentUser.uid,
      name: currentUser.displayName || currentUser.email.split('@')[0],
      email: currentUser.email,
      type: 'super_admin',
      role_id: roleId,
      tenant_id: null,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    if (!userSnapshot.empty) {
      console.log('\n⚠️  User already exists! Updating...');
      const userDoc = userSnapshot.docs[0];
      await updateDoc(doc(db, 'users', userDoc.id), userData);
      console.log('✅ User updated!');
      console.log('   Document ID:', userDoc.id);
      console.log('\n🔄 Please refresh the page now!');
    } else {
      console.log('\n📝 Creating new super admin user...');
      const userRef = doc(collection(db, 'users'));
      await setDoc(userRef, userData);
      console.log('✅ Super admin user created successfully!');
      console.log('   Document ID:', userRef.id);
      console.log('\n🔄 Please refresh the page now!');
    }
    
    console.log('\n📋 User Data:');
    console.log(JSON.stringify(userData, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('\n📋 Manual Setup Instructions:');
    console.error('   1. Go to Firebase Console → Firestore');
    console.error('   2. Open the "users" collection');
    console.error('   3. Click "Add document"');
    console.error('   4. Set fields (see CREATE_SUPER_ADMIN_USER.md)');
  }
})();


