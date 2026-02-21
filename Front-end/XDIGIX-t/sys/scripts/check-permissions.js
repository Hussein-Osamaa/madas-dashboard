// ============================================================================
// CHECK PERMISSIONS SCRIPT
// Run this in browser console to diagnose permission issues
// ============================================================================

(async function checkPermissions() {
  console.log('🔍 Checking permissions...\n');
  
  try {
    // Check if Firebase is already loaded
    if (!window.firebase) {
      console.log('📦 Loading Firebase SDK...');
      const loadFirebase = () => new Promise((resolve, reject) => {
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
      await loadFirebase();
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
    
    const auth = firebase.auth();
    const db = firebase.firestore();
    
    // Check authentication
    console.log('1️⃣ Checking Authentication...');
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('❌ NOT AUTHENTICATED!');
      console.log('   Please log in first at http://localhost:5177/login');
      return;
    }
    console.log('✅ Authenticated');
    console.log('   UID:', currentUser.uid);
    console.log('   Email:', currentUser.email);
    
    // Test read permission on permissions collection
    console.log('\n2️⃣ Testing Read Permission...');
    try {
      const testRead = await db.collection('permissions').limit(1).get();
      console.log('✅ Read permission works');
    } catch (error) {
      console.error('❌ Read permission FAILED:', error.message);
    }
    
    // Test write permission by trying to create a test document
    console.log('\n3️⃣ Testing Write Permission...');
    try {
      const testDocRef = db.collection('permissions').doc();
      await testDocRef.set({
        key: '__test_permission__',
        description: 'Test permission - delete this',
        category: 'test',
        created_at: new Date().toISOString()
      });
      console.log('✅ Write permission works');
      
      // Clean up test document
      await testDocRef.delete();
      console.log('   (Test document deleted)');
    } catch (error) {
      console.error('❌ Write permission FAILED:', error.message);
      console.error('   Error code:', error.code);
      console.error('\n💡 SOLUTION:');
      console.error('   1. Go to: https://console.firebase.google.com/project/madas-store/firestore/rules');
      console.error('   2. Click "Edit rules"');
      console.error('   3. Copy contents from sys/firestore.rules');
      console.error('   4. Paste and click "Publish"');
      console.error('   5. Wait 30 seconds, then try again');
    }
    
    // Check if collections exist
    console.log('\n4️⃣ Checking Collections...');
    try {
      const permissionsSnapshot = await db.collection('permissions').limit(1).get();
      console.log('✅ permissions collection exists');
      
      const rolesSnapshot = await db.collection('roles').limit(1).get();
      console.log('✅ roles collection exists');
      
      const rolePermissionsSnapshot = await db.collection('role_permissions').limit(1).get();
      console.log('✅ role_permissions collection exists');
    } catch (error) {
      console.error('❌ Error checking collections:', error.message);
    }
    
    console.log('\n✅ Diagnosis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();


