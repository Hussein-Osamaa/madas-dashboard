// Create Test Users in Firebase Authentication
// This script creates Firebase Auth users and Firestore staff documents

const firebaseConfig = {
    apiKey: "AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8",
    authDomain: "madas-store.firebaseapp.com",
    projectId: "madas-store",
    storageBucket: "madas-store.firebasestorage.app",
    messagingSenderId: "527071300010",
    appId: "1:527071300010:web:70470e2204065b4590583d3"
};

// Test users data
const testUsers = [
    {
        email: "nextgencoders404@gmail.com",
        password: "12341234",
        name: "Next Gen Coders",
        role: "admin",
        approved: true,
        permissions: {
            home: ["view"],
            orders: ["view", "search", "create", "edit", "delete"],
            inventory: ["view", "edit", "create", "delete"],
            customers: ["view", "edit", "create", "delete"],
            employees: ["view", "edit", "create", "delete"],
            finance: ["view", "reports", "export"],
            analytics: ["view", "export"],
            settings: ["view", "edit"]
        }
    },
    {
        email: "admin@madas.com",
        password: "admin123",
        name: "Admin User",
        role: "admin",
        approved: true,
        permissions: {
            home: ["view"],
            orders: ["view", "search", "create", "edit", "delete"],
            inventory: ["view", "edit", "create", "delete"],
            customers: ["view", "edit", "create", "delete"],
            employees: ["view", "edit", "create", "delete"],
            finance: ["view", "reports", "export"],
            analytics: ["view", "export"],
            settings: ["view", "edit"]
        }
    },
    {
        email: "manager@madas.com",
        password: "manager123",
        name: "Manager User",
        role: "manager",
        approved: true,
        permissions: {
            home: ["view"],
            orders: ["view", "search", "create", "edit"],
            inventory: ["view", "edit"],
            customers: ["view", "edit"],
            employees: ["view"],
            finance: ["view", "reports"],
            analytics: ["view"],
            settings: ["view"]
        }
    },
    {
        email: "staff@madas.com",
        password: "staff123",
        name: "Staff User",
        role: "staff",
        approved: true,
        permissions: {
            home: ["view"],
            orders: ["view", "search"],
            inventory: ["view"],
            customers: ["view"],
            employees: ["view"],
            finance: ["view"],
            analytics: ["view"],
            settings: ["view"]
        }
    },
    {
        email: "pending@madas.com",
        password: "pending123",
        name: "Pending User",
        role: "staff",
        approved: false, // This user should not be able to access dashboard
        permissions: {
            home: ["view"],
            orders: ["view"],
            inventory: ["view"],
            customers: ["view"],
            employees: ["view"],
            finance: ["view"],
            analytics: ["view"],
            settings: ["view"]
        }
    }
];

// Function to create Firebase Auth users and Firestore documents
async function createTestUsers() {
    console.log('🔧 Creating test users in Firebase...');
    
    try {
        // Import Firebase modules
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
        const { getAuth, createUserWithEmailAndPassword, signOut } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
        const { getFirestore, collection, addDoc, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        for (const userData of testUsers) {
            try {
                console.log(`🔄 Creating user: ${userData.email}`);
                
                // Create Firebase Auth user
                const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
                const user = userCredential.user;
                console.log(`✅ Firebase Auth user created: ${user.email}`);
                
                // Check if staff document already exists
                const existingQuery = query(collection(db, 'staff'), where('email', '==', userData.email));
                const existingSnapshot = await getDocs(existingQuery);
                
                if (existingSnapshot.empty) {
                    // Create staff document
                    const staffData = {
                        email: userData.email,
                        name: userData.name,
                        role: userData.role,
                        approved: userData.approved,
                        permissions: userData.permissions,
                        createdAt: new Date().toISOString(),
                        uid: user.uid
                    };
                    
                    await addDoc(collection(db, 'staff'), staffData);
                    console.log(`✅ Staff document created for: ${userData.email}`);
                } else {
                    console.log(`ℹ️ Staff document already exists for: ${userData.email}`);
                }
                
                // Sign out after creating user
                await signOut(auth);
                
            } catch (error) {
                if (error.code === 'auth/email-already-in-use') {
                    console.log(`ℹ️ Firebase Auth user already exists: ${userData.email}`);
                    
                    // Still create/update staff document
                    const existingQuery = query(collection(db, 'staff'), where('email', '==', userData.email));
                    const existingSnapshot = await getDocs(existingQuery);
                    
                    if (existingSnapshot.empty) {
                        const staffData = {
                            email: userData.email,
                            name: userData.name,
                            role: userData.role,
                            approved: userData.approved,
                            permissions: userData.permissions,
                            createdAt: new Date().toISOString()
                        };
                        
                        await addDoc(collection(db, 'staff'), staffData);
                        console.log(`✅ Staff document created for existing user: ${userData.email}`);
                    } else {
                        console.log(`ℹ️ Staff document already exists for: ${userData.email}`);
                    }
                } else {
                    console.error(`❌ Error creating user ${userData.email}:`, error);
                }
            }
        }
        
        console.log('✅ Test users creation completed!');
        console.log('\n📋 Test Credentials:');
        testUsers.forEach(user => {
            console.log(`${user.role.toUpperCase()}: ${user.email} / ${user.password} ${user.approved ? '✅' : '⏳'}`);
        });
        
    } catch (error) {
        console.error('❌ Error in createTestUsers:', error);
    }
}

// Function to verify all users exist
async function verifyTestUsers() {
    console.log('🔍 Verifying test users...');
    
    try {
        // Import Firebase modules
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
        const { getFirestore, collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        // Check Firestore staff collection
        const staffSnapshot = await getDocs(collection(db, 'staff'));
        console.log(`📊 Found ${staffSnapshot.size} staff members in Firestore:`);
        
        staffSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`  - ${data.email} (${data.role}) - ${data.approved ? 'Approved' : 'Pending'}`);
        });
        
        // Check which test users are missing
        const testEmails = testUsers.map(u => u.email);
        const existingEmails = [];
        staffSnapshot.forEach(doc => {
            existingEmails.push(doc.data().email);
        });
        
        const missingUsers = testEmails.filter(email => !existingEmails.includes(email));
        if (missingUsers.length > 0) {
            console.log(`⚠️ Missing users: ${missingUsers.join(', ')}`);
        } else {
            console.log('✅ All test users are present in Firestore');
        }
        
    } catch (error) {
        console.error('❌ Error verifying users:', error);
    }
}

// Make functions available globally
if (typeof window !== 'undefined') {
    window.createTestUsers = createTestUsers;
    window.verifyTestUsers = verifyTestUsers;
    
    console.log('🔧 Test user creation functions available:');
    console.log('  - createTestUsers() - Creates Firebase Auth users and Firestore documents');
    console.log('  - verifyTestUsers() - Verifies all test users exist');
    
    // Auto-run creation when script loads
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            createTestUsers();
        }, 1000);
    });
} else {
    module.exports = {
        createTestUsers,
        verifyTestUsers,
        testUsers
    };
}
