import { createBusiness } from "../business/createBusiness.js";

/**
 * Signup Service
 * Handles user registration and business creation
 */
export class SignupService {
  constructor() {
    this.auth = getAuth();
    this.db = getFirestore();
  }

  /**
   * Sign up a new user with email and password
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @param {string} businessName - Business name
   * @param {string} ownerName - Owner's full name
   * @param {string} plan - Subscription plan (default: "Starter")
   * @returns {Promise<{user: User, businessId: string}>}
   */
  async signUpWithEmailAndPassword(email, password, businessName, ownerName, plan = "Starter") {
    try {
      console.log("Starting signup process for:", email);

      // 1. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      console.log("Firebase Auth user created:", user.uid);

      // 2. Generate business ID (using user's UID for simplicity)
      const businessId = user.uid;

      // 3. Create business document
      const businessData = {
        id: businessId,
        ownerUid: user.uid,
        businessName: businessName,
        plan: plan,
        staff: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await createBusiness(businessId, businessData);
      console.log("Business created:", businessId);

      // 4. Create user document
      const userData = {
        uid: user.uid,
        email: email,
        businessId: businessId,
        role: "owner",
        ownerName: ownerName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await this.createUserDocument(user.uid, userData);
      console.log("User document created:", user.uid);

      return {
        user: user,
        businessId: businessId,
        userData: userData,
        businessData: businessData
      };

    } catch (error) {
      console.error("Signup error:", error);
      throw new Error(`Signup failed: ${error.message}`);
    }
  }

  /**
   * Create user document in Firestore
   * @param {string} uid - User's UID
   * @param {object} userData - User data
   */
  async createUserDocument(uid, userData) {
    try {
      const userRef = doc(this.db, "users", uid);
      await setDoc(userRef, userData);
      console.log("User document created successfully:", uid);
    } catch (error) {
      console.error("Error creating user document:", error);
      throw error;
    }
  }

  /**
   * Sign up staff member (invited by owner)
   * @param {string} email - Staff email
   * @param {string} password - Staff password
   * @param {string} businessId - Business ID to link to
   * @param {string} role - Staff role (default: "staff")
   * @param {string} staffName - Staff member's name
   * @returns {Promise<{user: User, businessId: string}>}
   */
  async signUpStaff(email, password, businessId, role = "staff", staffName) {
    try {
      console.log("Starting staff signup for:", email, "in business:", businessId);

      // 1. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      console.log("Staff Firebase Auth user created:", user.uid);

      // 2. Create user document
      const userData = {
        uid: user.uid,
        email: email,
        businessId: businessId,
        role: role,
        staffName: staffName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await this.createUserDocument(user.uid, userData);
      console.log("Staff user document created:", user.uid);

      // 3. Add staff to business staff array
      await this.addStaffToBusiness(businessId, user.uid);

      return {
        user: user,
        businessId: businessId,
        userData: userData
      };

    } catch (error) {
      console.error("Staff signup error:", error);
      throw new Error(`Staff signup failed: ${error.message}`);
    }
  }

  /**
   * Add staff member to business staff array
   * @param {string} businessId - Business ID
   * @param {string} staffUid - Staff UID
   */
  async addStaffToBusiness(businessId, staffUid) {
    try {
      const businessRef = doc(this.db, "businesses", businessId);
      await setDoc(businessRef, {
        staff: [staffUid]
      }, { merge: true });
      console.log("Staff added to business:", businessId);
    } catch (error) {
      console.error("Error adding staff to business:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const signupService = new SignupService();

