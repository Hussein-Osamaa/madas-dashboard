
/**
 * Business Creation Service
 * Handles business document creation and management
 */
export class BusinessService {
  constructor() {
    this.db = getFirestore();
  }

  /**
   * Create a new business document
   * @param {string} businessId - Business ID
   * @param {object} businessData - Business data
   * @returns {Promise<void>}
   */
  async createBusiness(businessId, businessData) {
    try {
      console.log("Creating business:", businessId);

      const businessRef = doc(this.db, "businesses", businessId);
      
      // Ensure required fields are present
      const completeBusinessData = {
        id: businessId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...businessData
      };

      await setDoc(businessRef, completeBusinessData);
      console.log("Business created successfully:", businessId);

    } catch (error) {
      console.error("Error creating business:", error);
      throw new Error(`Failed to create business: ${error.message}`);
    }
  }

  /**
   * Update business document
   * @param {string} businessId - Business ID
   * @param {object} updateData - Data to update
   * @returns {Promise<void>}
   */
  async updateBusiness(businessId, updateData) {
    try {
      const businessRef = doc(this.db, "businesses", businessId);
      await setDoc(businessRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      }, { merge: true });
      console.log("Business updated successfully:", businessId);
    } catch (error) {
      console.error("Error updating business:", error);
      throw error;
    }
  }

  /**
   * Get business document
   * @param {string} businessId - Business ID
   * @returns {Promise<object|null>}
   */
  async getBusiness(businessId) {
    try {
      const businessRef = doc(this.db, "businesses", businessId);
      const businessDoc = await getDoc(businessRef);
      
      if (businessDoc.exists()) {
        return { id: businessDoc.id, ...businessDoc.data() };
      }
      return null;
    } catch (error) {
      console.error("Error getting business:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const businessService = new BusinessService();

// Export the createBusiness function for direct use
export async function createBusiness(businessId, businessData) {
  const service = new BusinessService();
  return await service.createBusiness(businessId, businessData);
}
