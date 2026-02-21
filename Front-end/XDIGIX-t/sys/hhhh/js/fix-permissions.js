// Utility script to fix permissions for existing users
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8",
  authDomain: "madas-store.firebaseapp.com",
  projectId: "madas-store",
  storageBucket: "madas-store.firebasestorage.app",
  messagingSenderId: "527071300010",
  appId: "1:527071300010:web:70470e2204065b4590583d3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to fix permissions for all users
async function fixAllUserPermissions() {
  try {
    console.log("Starting permission fix for all users...");

    const staffCollection = collection(db, "staff");
    const querySnapshot = await getDocs(staffCollection);

    let fixedCount = 0;

    querySnapshot.forEach((docSnapshot) => {
      const userData = docSnapshot.data();
      const needsFix = !userData.permissions || !userData.permissions.home;

      if (needsFix) {
        const defaultPermissions = {
          home: ["view"],
          ...userData.permissions,
        };

        updateDoc(doc(db, "staff", docSnapshot.id), {
          permissions: defaultPermissions,
        });

        fixedCount++;
        console.log(
          `Fixed permissions for user: ${userData.email || userData.name}`
        );
      }
    });

    console.log(`Permission fix completed. Fixed ${fixedCount} users.`);
    return fixedCount;
  } catch (error) {
    console.error("Error fixing permissions:", error);
    throw error;
  }
}

// Function to fix permissions for a specific user
async function fixUserPermissions(userEmail) {
  try {
    console.log(`Fixing permissions for user: ${userEmail}`);

    const staffCollection = collection(db, "staff");
    const querySnapshot = await getDocs(staffCollection);

    for (const docSnapshot of querySnapshot.docs) {
      const userData = docSnapshot.data();

      if (userData.email === userEmail) {
        const defaultPermissions = {
          home: ["view"],
          ...userData.permissions,
        };

        await updateDoc(doc(db, "staff", docSnapshot.id), {
          permissions: defaultPermissions,
        });

        console.log(`Fixed permissions for user: ${userEmail}`);
        return true;
      }
    }

    console.log(`User not found: ${userEmail}`);
    return false;
  } catch (error) {
    console.error("Error fixing user permissions:", error);
    throw error;
  }
}

// Export functions for use in browser console
window.fixAllUserPermissions = fixAllUserPermissions;
window.fixUserPermissions = fixUserPermissions;

console.log(
  "Permission fix utility loaded. Use fixAllUserPermissions() or fixUserPermissions(email) in console."
);
