// Simple script to create a test user for Firebase Authentication
// Run this with: node create-test-user.js

const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8",
  authDomain: "madas-store.firebaseapp.com",
  projectId: "madas-store",
  storageBucket: "madas-store.firebasestorage.app",
  messagingSenderId: "527071300010",
  appId: "1:527071300010:web:70470e2204065b4590583d3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createTestUser() {
  const testEmail = 'test@madas.com';
  const testPassword = 'test123456';
  
  try {
    console.log('Creating test user...');
    
    // Create user with Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    const user = userCredential.user;
    
    console.log('✅ User created successfully:', user.uid);
    
    // Create user document in Firestore (users collection)
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: testEmail,
      displayName: 'Test User',
      firstName: 'Test',
      lastName: 'User',
      role: 'admin',
      approved: true,
      permissions: {
        home: ['view'],
        orders: ['view', 'create', 'edit', 'delete'],
        inventory: ['view', 'create', 'edit', 'delete'],
        customers: ['view', 'create', 'edit', 'delete'],
        employees: ['view', 'create', 'edit', 'delete'],
        finance: ['view', 'create', 'edit', 'delete'],
        analytics: ['view'],
        reports: ['view', 'create', 'edit', 'delete'],
        insights: ['view']
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Also create in staff collection for compatibility
    await setDoc(doc(db, 'staff', user.uid), {
      uid: user.uid,
      email: testEmail,
      name: 'Test User',
      firstName: 'Test',
      lastName: 'User',
      role: 'admin',
      approved: true,
      permissions: {
        home: ['view'],
        orders: ['view', 'create', 'edit', 'delete'],
        inventory: ['view', 'create', 'edit', 'delete'],
        customers: ['view', 'create', 'edit', 'delete'],
        employees: ['view', 'create', 'edit', 'delete'],
        finance: ['view', 'create', 'edit', 'delete'],
        analytics: ['view'],
        reports: ['view', 'create', 'edit', 'delete'],
        insights: ['view']
      },
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      status: 'active'
    });
    
    console.log('✅ User document created in Firestore');
    console.log('\n🎉 Test user created successfully!');
    console.log('Email:', testEmail);
    console.log('Password:', testPassword);
    console.log('\nYou can now use these credentials to log in to your dashboard.');
    
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('ℹ️  Test user already exists. Testing login...');
      
      try {
        const signInResult = await signInWithEmailAndPassword(auth, testEmail, testPassword);
        console.log('✅ Login test successful:', signInResult.user.uid);
        console.log('\n🎉 Test user is ready!');
        console.log('Email:', testEmail);
        console.log('Password:', testPassword);
      } catch (loginError) {
        console.error('❌ Login test failed:', loginError.message);
      }
    } else {
      console.error('❌ Error creating test user:', error.message);
    }
  }
}

createTestUser();
