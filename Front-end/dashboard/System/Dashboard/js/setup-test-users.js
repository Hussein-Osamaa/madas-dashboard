// Setup Test Users for MADAS Dashboard
// This script creates authorized test users in Firestore

const firebaseConfig = {
    apiKey: "AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8",
    authDomain: "madas-store.firebaseapp.com",
    projectId: "madas-store",
    storageBucket: "madas-store.firebasestorage.app",
    messagingSenderId: "527071300010",
    appId: "1:527071300010:web:70470e2204065b4590583d3"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.getFirestore(app);
const auth = firebase.getAuth(app);

// Test users data
const testUsers = [
    {
        email: "admin@madas.com",
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

// Function to setup test users
async function setupTestUsers() {
    console.log('🔧 Setting up test users...');
    
    try {
        for (const userData of testUsers) {
            // Check if user already exists
            const existingQuery = firebase.firestore().collection('staff').where('email', '==', userData.email);
            const existingSnapshot = await existingQuery.get();
            
            if (existingSnapshot.empty) {
                // Create new user document
                await firebase.firestore().collection('staff').add(userData);
                console.log(`✅ Created test user: ${userData.email} (${userData.role})`);
            } else {
                // Update existing user
                const docId = existingSnapshot.docs[0].id;
                await firebase.firestore().collection('staff').doc(docId).update(userData);
                console.log(`🔄 Updated test user: ${userData.email} (${userData.role})`);
            }
        }
        
        console.log('✅ Test users setup completed!');
        console.log('\n📋 Test Credentials:');
        console.log('Admin: admin@madas.com / admin123');
        console.log('Manager: manager@madas.com / manager123');
        console.log('Staff: staff@madas.com / staff123');
        console.log('Pending: pending@madas.com / pending123 (should be denied access)');
        
    } catch (error) {
        console.error('❌ Error setting up test users:', error);
    }
}

// Function to create Firebase Auth users (for testing)
async function createFirebaseAuthUsers() {
    console.log('🔧 Creating Firebase Auth test users...');
    
    const authUsers = [
        { email: "admin@madas.com", password: "admin123" },
        { email: "manager@madas.com", password: "manager123" },
        { email: "staff@madas.com", password: "staff123" },
        { email: "pending@madas.com", password: "pending123" }
    ];
    
    try {
        for (const user of authUsers) {
            try {
                await firebase.auth().createUserWithEmailAndPassword(user.email, user.password);
                console.log(`✅ Created Firebase Auth user: ${user.email}`);
                // Sign out after creation
                await firebase.auth().signOut();
            } catch (error) {
                if (error.code === 'auth/email-already-in-use') {
                    console.log(`ℹ️ Firebase Auth user already exists: ${user.email}`);
                } else {
                    console.error(`❌ Error creating Firebase Auth user ${user.email}:`, error);
                }
            }
        }
    } catch (error) {
        console.error('❌ Error creating Firebase Auth users:', error);
    }
}

// Function to verify setup
async function verifySetup() {
    console.log('🔍 Verifying test user setup...');
    
    try {
        const staffSnapshot = await firebase.firestore().collection('staff').get();
        console.log(`📊 Found ${staffSnapshot.size} staff members in database:`);
        
        staffSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`  - ${data.email} (${data.role}) - ${data.approved ? 'Approved' : 'Pending'}`);
        });
        
    } catch (error) {
        console.error('❌ Error verifying setup:', error);
    }
}

// Auto-run setup when script loads
if (typeof window !== 'undefined') {
    // Browser environment
    window.setupTestUsers = setupTestUsers;
    window.createFirebaseAuthUsers = createFirebaseAuthUsers;
    window.verifySetup = verifySetup;
    
    console.log('🔧 Test user setup functions available:');
    console.log('  - setupTestUsers() - Creates/updates staff documents');
    console.log('  - createFirebaseAuthUsers() - Creates Firebase Auth users');
    console.log('  - verifySetup() - Verifies the setup');
    
    // Auto-run setup
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            setupTestUsers();
        }, 1000);
    });
} else {
    // Node.js environment
    module.exports = {
        setupTestUsers,
        createFirebaseAuthUsers,
        verifySetup
    };
}
