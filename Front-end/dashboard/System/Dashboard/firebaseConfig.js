// Firebase Configuration for MADAS Dashboard
const firebaseConfig = {
    apiKey: "AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8",
    authDomain: "madas-store.firebaseapp.com",
    projectId: "madas-store",
    storageBucket: "madas-store.firebasestorage.app",
    messagingSenderId: "527071300010",
    appId: "1:527071300010:web:70470e2204065b4590583d3"
};

// Make Firebase config available globally
window.firebaseConfig = firebaseConfig;

// Initialize Firebase (modern syntax)
async function initializeFirebase() {
    try {
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
        const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
        const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        const auth = getAuth(app);

        // Make Firebase available globally
        window.db = db;
        window.auth = auth;
        window.firebase = { auth, firestore: () => db };

        console.log('🔥 Firebase configuration loaded successfully');
    } catch (error) {
        console.error('❌ Error initializing Firebase:', error);
    }
}

// Initialize Firebase when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFirebase);
} else {
    initializeFirebase();
}
