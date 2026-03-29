import { db } from '@/lib/backend';

export interface BusinessData {
  id: string;
  ownerUid: string;
  businessName: string;
  plan: 'Starter' | 'Pro' | 'Enterprise';
  staff: string[];
  createdAt: any;
  updatedAt: any;
}

/**
 * Creates a new business document in Firestore
 * @param businessId - Unique business identifier
 * @param businessData - Business information
 * @returns Promise<void>
 */
export async function createBusiness(
  businessId: string, 
  businessData: Omit<BusinessData, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  try {
    console.log('Creating business:', businessId);

    const businessRef = doc(db, 'businesses', businessId);
    
    const completeBusinessData: BusinessData = {
      id: businessId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...businessData
    };

    await setDoc(businessRef, completeBusinessData);
    console.log('Business created successfully:', businessId);

  } catch (error) {
    console.error('Error creating business:', error);
    throw new Error(`Failed to create business: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Updates an existing business document
 * @param businessId - Business ID
 * @param updateData - Data to update
 * @returns Promise<void>
 */
export async function updateBusiness(
  businessId: string, 
  updateData: Partial<Omit<BusinessData, 'id' | 'createdAt'>>
): Promise<void> {
  try {
    const businessRef = doc(db, 'businesses', businessId);
    await setDoc(businessRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log('Business updated successfully:', businessId);
  } catch (error) {
    console.error('Error updating business:', error);
    throw error;
  }
}
