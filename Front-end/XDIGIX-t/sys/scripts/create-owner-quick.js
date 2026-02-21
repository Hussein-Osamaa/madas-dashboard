// ============================================================================
// QUICK: CREATE OWNER ADMIN (hesainosama@gmail.com)
// This script loads Firebase and creates your owner account with full access
// ============================================================================

(async function createOwner() {
  console.log('👑 Creating Owner Admin for hesainosama@gmail.com...\n');
  
  try {
    // Load Firebase if not already loaded
    if (!window.firebase) {
      console.log('📦 Loading Firebase SDK...');
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
    
    // Check if user is authenticated
    let user = auth.currentUser;
    
    if (!user) {
      // Try to get user from app's Firebase if available
      if (window.__FIREBASE_AUTH__) {
        const appAuth = window.__FIREBASE_AUTH__;
        user = appAuth.currentUser;
        if (user) {
          console.log('✅ Found authenticated user from app:', user.email);
          // Get token and try to sign in to compat Firebase
          try {
            const token = await user.getIdToken();
            // Note: Can't directly transfer auth, but we can use the UID
            console.log('⚠️  Using Firebase UID from app:', user.uid);
          } catch (error) {
            console.warn('Could not get token:', error);
          }
        }
      }
      
      if (!user) {
        console.error('❌ ERROR: You are not logged in!');
        console.error('\n💡 Please:');
        console.error('   1. Log in at http://localhost:5177/login');
        console.error('   2. Then run this script again');
        console.error('\n   OR sign in here with:');
        console.error('   await auth.signInWithEmailAndPassword("hesainosama@gmail.com", "YOUR_PASSWORD")');
        return;
      }
    }
    
    console.log('✅ Authenticated as:', user.email);
    
    // Get Root role
    console.log('\n🔍 Finding Root role...');
    const roles = await db.collection('roles')
      .where('name', '==', 'Root')
      .where('tenant_id', '==', null)
      .get();
    
    if (roles.empty) {
      console.error('❌ Root role not found!');
      console.error('\n💡 Please run Step 1 first:');
      console.error('   Copy and paste: sys/scripts/init-rbac-copy-paste.js');
      return;
    }
    
    const rootRoleId = roles.docs[0].id;
    console.log('✅ Found Root role:', rootRoleId);
    
    // Create/update user with retry logic for network errors
    console.log('\n📝 Creating/updating owner account...');
    
    const userData = {
      firebase_uid: user.uid,
      name: 'Husain Osama',
      email: 'hesainosama@gmail.com',
      type: 'super_admin',
      role_id: rootRoleId,
      tenant_id: null,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Retry function for network errors
    const retryOperation = async (operation, maxRetries = 3) => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await operation();
        } catch (error) {
          if (error.code === 'unavailable' || error.message.includes('network') || error.message.includes('ERR_NETWORK')) {
            if (i < maxRetries - 1) {
              console.log(`⚠️  Network error, retrying (${i + 1}/${maxRetries})...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
              continue;
            }
          }
          throw error;
        }
      }
    };
    
    // Try to find existing user
    let existing;
    try {
      existing = await retryOperation(async () => {
        return await db.collection('users')
          .where('email', '==', 'hesainosama@gmail.com')
          .get();
      });
    } catch (error) {
      console.warn('⚠️  Could not check for existing user:', error.message);
      existing = { empty: true }; // Assume no existing user
    }
    
    // Create or update user
    try {
      if (!existing.empty) {
        await retryOperation(async () => {
          await existing.docs[0].ref.update({
            ...userData,
            updated_at: new Date().toISOString()
          });
        });
        console.log('✅ Updated owner account!');
        console.log('   User ID:', existing.docs[0].id);
      } else {
        // Try to find by Firebase UID first
        let existingByUid;
        try {
          existingByUid = await retryOperation(async () => {
            return await db.collection('users')
              .where('firebase_uid', '==', user.uid)
              .get();
          });
        } catch (error) {
          existingByUid = { empty: true };
        }
        
        if (!existingByUid.empty) {
          await retryOperation(async () => {
            await existingByUid.docs[0].ref.update({
              ...userData,
              updated_at: new Date().toISOString()
            });
          });
          console.log('✅ Updated owner account (found by Firebase UID)!');
          console.log('   User ID:', existingByUid.docs[0].id);
        } else {
          const userRef = db.collection('users').doc();
          await retryOperation(async () => {
            await userRef.set(userData);
          });
          console.log('✅ Created owner account!');
          console.log('   User ID:', userRef.id);
        }
      }
    } catch (error) {
      console.error('❌ Failed to create/update owner account:', error);
      throw error;
    }
    
    console.log('\n🎉 Owner account setup complete!');
    console.log('   Name: Husain Osama');
    console.log('   Email: hesainosama@gmail.com');
    console.log('   Role: Root (Full Access)');
    console.log('   Type: super_admin');
    console.log('\n🔄 Please refresh the page to load your permissions!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'permission-denied') {
      console.error('\n💡 SOLUTION:');
      console.error('   Deploy Firestore rules first:');
      console.error('   https://console.firebase.google.com/project/madas-store/firestore/rules');
      console.error('   Copy contents from: sys/firestore.rules');
    }
  }
})();

