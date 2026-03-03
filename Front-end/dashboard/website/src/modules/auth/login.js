import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

/**
 * Login Service
 * Handles user authentication and fail-safe user document creation
 */
export class LoginService {
  constructor() {
    this.auth = getAuth();
    this.db = getFirestore();
  }

  /**
   * Sign in with email and password
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Promise<{user: User, userData: object, businessId: string}>}
   */
  async signInWithEmailAndPassword(email, password) {
    try {
      console.log("Starting login process for:", email);

      // 1. Authenticate with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      console.log("Firebase Auth login successful:", user.uid);

      // 2. Get or create user document (fail-safe)
      const userData = await this.getOrCreateUserDocument(user.uid, email);
      console.log("User document retrieved/created:", userData);

      // 3. Get business ID
      const businessId = userData.businessId;
      if (!businessId) {
        throw new Error("No business ID found for user. Please contact support.");
      }

      return {
        user: user,
        userData: userData,
        businessId: businessId
      };

    } catch (error) {
      console.error("Login error:", error);
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  /**
   * Get user document or create it if it doesn't exist (fail-safe)
   * @param {string} uid - User's UID
   * @param {string} email - User's email
   * @returns {Promise<object>}
   */
  async getOrCreateUserDocument(uid, email) {
    try {
      const userRef = doc(this.db, "users", uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        console.log("User document found:", uid);
        return { id: userDoc.id, ...userDoc.data() };
      }

      // User document doesn't exist - create it (fail-safe)
      console.log("User document not found, creating fail-safe document:", uid);
      const userData = {
        uid: uid,
        email: email,
        businessId: uid, // Use UID as businessId for fail-safe
        role: "owner",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isFailSafe: true // Flag to indicate this was auto-created
      };

      await setDoc(userRef, userData);
      console.log("Fail-safe user document created:", uid);

      // Also create a fail-safe business document
      await this.createFailSafeBusiness(uid, email);

      return userData;

    } catch (error) {
      console.error("Error getting/creating user document:", error);
      throw error;
    }
  }

  /**
   * Create a fail-safe business document
   * @param {string} businessId - Business ID (same as UID)
   * @param {string} email - User's email
   */
  async createFailSafeBusiness(businessId, email) {
    try {
      const businessRef = doc(this.db, "businesses", businessId);
      const businessData = {
        id: businessId,
        ownerUid: businessId,
        businessName: `${email.split('@')[0]}'s Business`,
        plan: "Starter",
        staff: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isFailSafe: true // Flag to indicate this was auto-created
      };

      await setDoc(businessRef, businessData);
      console.log("Fail-safe business document created:", businessId);
    } catch (error) {
      console.error("Error creating fail-safe business:", error);
      // Don't throw here - this is a fail-safe operation
    }
  }

  /**
   * Redirect user to their business dashboard
   * @param {string} businessId - Business ID
   */
  redirectToBusinessDashboard(businessId) {
    if (businessId) {
      window.location.href = `/pages/dashboard/${businessId}`;
    } else {
      window.location.href = "/no-access.html";
    }
  }
}

// Export singleton instance
export const loginService = new LoginService();

