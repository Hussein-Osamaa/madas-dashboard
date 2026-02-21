// ============================================================================
// CREATE OWNER SUPER ADMIN USER
// This script creates a super admin user for hesainosama@gmail.com with full access
// Run this in browser console after initializing RBAC (Step 1)
// ============================================================================

(async function createOwnerAdmin() {
  console.log('👑 Creating Owner Super Admin User...\n');
  
  try {
    // Use Firebase Compat API from CDN
    if (!window.firebase) {
      console.log('📦 Loading Firebase SDK from CDN...');
      await new Promise((resolve, reject) => {
        const script1 = document.createElement('script');
        script1.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js';
        script1.onload = () => {
          const script2 = document.createElement('script');
          script2.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js';
          script2.onload = () => {
            const script3 = document.createElement('script');
            script3.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js';
            script3.onload = () => resolve(window.firebase);
            script3.onerror = reject;
            document.head.appendChild(script3);
          };
          script2.onerror = reject;
          document.head.appendChild(script2);
        };
        script1.onerror = reject;
        document.head.appendChild(script1);
      });
    }
    
    const firebase = window.firebase;
    const firebaseConfig = {
      apiKey: 'AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8',
      authDomain: 'madas-store.firebaseapp.com',
      projectId: 'madas-store',
      storageBucket: 'madas-store.firebasestorage.app',
      messagingSenderId: '527071300010',
      appId: '1:527071300010:web:7470e2204065b4590583d3'
    };
    
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    
    const db = firebase.firestore();
    const auth = firebase.auth();
    
    // Check authentication
    let currentUser = auth.currentUser;
    if (!currentUser) {
      // Try to sign in with email
      console.log('⚠️  Not authenticated. Please sign in first.');
      console.log('   You can sign in at: http://localhost:5177/login');
      console.log('   Or sign in here with:');
      console.log('   await auth.signInWithEmailAndPassword("hesainosama@gmail.com", "YOUR_PASSWORD")');
      return;
    }
    
    console.log('✅ Authenticated as:', currentUser.email);
    
    // Find Root role
    console.log('\n🔍 Finding Root role...');
    const rolesQuery = await db.collection('roles')
      .where('name', '==', 'Root')
      .where('tenant_id', '==', null)
      .get();
    
    if (rolesQuery.empty) {
      console.error('❌ Root role not found!');
      console.error('   Please run Step 1 (Initialize RBAC) first');
      console.error('   See: sys/scripts/init-rbac-copy-paste.js');
      return;
    }
    
    const rootRoleId = rolesQuery.docs[0].id;
    console.log('✅ Found Root role:', rootRoleId);
    
    // Check if user already exists
    const userEmail = 'hesainosama@gmail.com';
    const userQuery = await db.collection('users')
      .where('email', '==', userEmail)
      .get();
    
    const userData = {
      firebase_uid: currentUser.uid,
      name: 'Husain Osama',
      email: userEmail,
      type: 'super_admin',
      role_id: rootRoleId,
      tenant_id: null,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    if (!userQuery.empty) {
      console.log('\n⚠️  User already exists! Updating to give full access...');
      const existingUser = userQuery.docs[0];
      await existingUser.ref.update({
        ...userData,
        updated_at: new Date().toISOString()
      });
      console.log('✅ Updated user with full access!');
      console.log('   User ID:', existingUser.id);
      console.log('   Role: Root (Full Access)');
      console.log('   Type: super_admin');
    } else {
      console.log('\n📝 Creating new super admin user...');
      const userRef = db.collection('users').doc();
      await userRef.set(userData);
      console.log('✅ Created super admin user with full access!');
      console.log('   User ID:', userRef.id);
      console.log('   Role: Root (Full Access)');
      console.log('   Type: super_admin');
    }
    
    console.log('\n🎉 Owner account setup complete!');
    console.log('   Email: hesainosama@gmail.com');
    console.log('   Name: Husain Osama');
    console.log('   Access: Full (Root role)');
    console.log('\n🔄 Please refresh the page to load your permissions.');
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'permission-denied') {
      console.error('\n💡 SOLUTION:');
      console.error('   Deploy Firestore rules first:');
      console.error('   https://console.firebase.google.com/project/madas-store/firestore/rules');
    }
  }
})();


