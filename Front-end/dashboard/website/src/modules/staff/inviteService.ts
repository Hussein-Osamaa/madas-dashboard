import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface StaffInvite {
  id: string;
  email: string;
  businessId: string;
  role: 'staff' | 'manager' | 'admin';
  invitedBy: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  token: string;
  expiresAt: any; // Firestore Timestamp
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface StaffMember {
  id: string;
  uid: string;
  email: string;
  businessId: string;
  role: 'staff' | 'manager' | 'admin';
  status: 'active' | 'inactive' | 'pending';
  permissions: Record<string, string[]>;
  joinedAt: any; // Firestore Timestamp
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

/**
 * Staff Invite Service - Manages staff invitations and onboarding
 */
export class StaffInviteService {
  private static readonly INVITE_EXPIRY_DAYS = 7;

  /**
   * Generate a secure invite token
   */
  private static generateInviteToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Send staff invitation
   * @param email - Staff member's email
   * @param businessId - Business ID
   * @param role - Staff role
   * @param invitedBy - UID of user sending invite
   * @returns Promise<StaffInvite>
   */
  static async sendInvite(
    email: string, 
    businessId: string, 
    role: 'staff' | 'manager' | 'admin',
    invitedBy: string
  ): Promise<StaffInvite> {
    try {
      console.log('Sending staff invite to:', email, 'for business:', businessId);

      // Check if user already exists in this business
      const existingStaffQuery = query(
        collection(db, 'staff'),
        where('email', '==', email),
        where('businessId', '==', businessId)
      );
      const existingStaff = await getDocs(existingStaffQuery);

      if (!existingStaff.empty) {
        throw new Error('User is already a member of this business');
      }

      // Check if there's already a pending invite
      const existingInviteQuery = query(
        collection(db, 'staff_invites'),
        where('email', '==', email),
        where('businessId', '==', businessId),
        where('status', '==', 'pending')
      );
      const existingInvites = await getDocs(existingInviteQuery);

      if (!existingInvites.empty) {
        throw new Error('A pending invitation already exists for this email');
      }

      // Generate invite token and expiry date
      const token = this.generateInviteToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.INVITE_EXPIRY_DAYS);

      // Create invite document
      const inviteData: Omit<StaffInvite, 'id'> = {
        email,
        businessId,
        role,
        invitedBy,
        status: 'pending',
        token,
        expiresAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const inviteRef = doc(collection(db, 'staff_invites'));
      await setDoc(inviteRef, inviteData);

      const invite: StaffInvite = {
        id: inviteRef.id,
        ...inviteData
      };

      // TODO: Send email notification
      // This would typically call a Cloud Function to send the email
      console.log('Staff invite created:', invite.id);
      console.log('Invite token:', token);
      console.log('Invite URL:', `${window.location.origin}/staff-invite/${token}`);

      return invite;

    } catch (error) {
      console.error('Error sending staff invite:', error);
      throw new Error(`Failed to send invite: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Accept staff invitation
   * @param token - Invite token
   * @param uid - User's Firebase UID
   * @returns Promise<StaffMember>
   */
  static async acceptInvite(token: string, uid: string): Promise<StaffMember> {
    try {
      console.log('Accepting staff invite with token:', token);

      // Find invite by token
      const inviteQuery = query(
        collection(db, 'staff_invites'),
        where('token', '==', token),
        where('status', '==', 'pending')
      );
      const inviteDocs = await getDocs(inviteQuery);

      if (inviteDocs.empty) {
        throw new Error('Invalid or expired invitation');
      }

      const inviteDoc = inviteDocs.docs[0];
      const inviteData = inviteDoc.data() as StaffInvite;

      // Check if invite has expired
      const now = new Date();
      const expiresAt = inviteData.expiresAt.toDate();
      
      if (now > expiresAt) {
        // Mark invite as expired
        await updateDoc(inviteDoc.ref, {
          status: 'expired',
          updatedAt: serverTimestamp()
        });
        throw new Error('Invitation has expired');
      }

      // Get user data
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('User document not found');
      }

      const userData = userDoc.data();

      // Create staff member record
      const staffData: Omit<StaffMember, 'id'> = {
        uid,
        email: inviteData.email,
        businessId: inviteData.businessId,
        role: inviteData.role,
        status: 'active',
        permissions: this.getDefaultPermissions(inviteData.role),
        joinedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const staffRef = doc(collection(db, 'staff'));
      await setDoc(staffRef, staffData);

      // Update user document with business ID
      await updateDoc(userRef, {
        businessId: inviteData.businessId,
        role: inviteData.role,
        updatedAt: serverTimestamp()
      });

      // Mark invite as accepted
      await updateDoc(inviteDoc.ref, {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        acceptedBy: uid,
        updatedAt: serverTimestamp()
      });

      // Add staff to business staff array
      const businessRef = doc(db, 'businesses', inviteData.businessId);
      await updateDoc(businessRef, {
        staff: serverTimestamp(), // This would be arrayUnion in real implementation
        updatedAt: serverTimestamp()
      });

      const staffMember: StaffMember = {
        id: staffRef.id,
        ...staffData
      };

      console.log('Staff invite accepted successfully:', staffMember.id);
      return staffMember;

    } catch (error) {
      console.error('Error accepting staff invite:', error);
      throw new Error(`Failed to accept invite: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get staff members for a business
   * @param businessId - Business ID
   * @returns Promise<StaffMember[]>
   */
  static async getStaffMembers(businessId: string): Promise<StaffMember[]> {
    try {
      const staffQuery = query(
        collection(db, 'staff'),
        where('businessId', '==', businessId)
      );
      const staffDocs = await getDocs(staffQuery);

      return staffDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as StaffMember));

    } catch (error) {
      console.error('Error getting staff members:', error);
      throw new Error(`Failed to get staff members: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel staff invitation
   * @param inviteId - Invite ID
   * @param cancelledBy - UID of user cancelling invite
   * @returns Promise<void>
   */
  static async cancelInvite(inviteId: string, cancelledBy: string): Promise<void> {
    try {
      const inviteRef = doc(db, 'staff_invites', inviteId);
      await updateDoc(inviteRef, {
        status: 'cancelled',
        cancelledBy,
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('Staff invite cancelled:', inviteId);

    } catch (error) {
      console.error('Error cancelling staff invite:', error);
      throw error;
    }
  }

  /**
   * Remove staff member
   * @param staffId - Staff member ID
   * @param removedBy - UID of user removing staff
   * @returns Promise<void>
   */
  static async removeStaff(staffId: string, removedBy: string): Promise<void> {
    try {
      const staffRef = doc(db, 'staff', staffId);
      const staffDoc = await getDoc(staffRef);

      if (!staffDoc.exists()) {
        throw new Error('Staff member not found');
      }

      const staffData = staffDoc.data();
      
      // Update staff status to inactive
      await updateDoc(staffRef, {
        status: 'inactive',
        removedBy,
        removedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Remove from business staff array
      const businessRef = doc(db, 'businesses', staffData.businessId);
      await updateDoc(businessRef, {
        staff: serverTimestamp(), // This would be arrayRemove in real implementation
        updatedAt: serverTimestamp()
      });

      console.log('Staff member removed:', staffId);

    } catch (error) {
      console.error('Error removing staff member:', error);
      throw error;
    }
  }

  /**
   * Get default permissions for a role - Grant full access to all users
   * @param role - Staff role
   * @returns Record<string, string[]>
   */
  private static getDefaultPermissions(role: 'staff' | 'manager' | 'admin'): Record<string, string[]> {
    // Grant full access to all users regardless of role
    return {
      home: ['view', 'edit', 'delete', 'admin'],
      orders: ['view', 'search', 'create', 'edit', 'delete', 'admin'],
      inventory: ['view', 'edit', 'delete', 'admin'],
      customers: ['view', 'edit', 'delete', 'admin'],
      employees: ['view', 'edit', 'delete', 'admin'],
      finance: ['view', 'reports', 'export', 'edit', 'delete', 'admin'],
      analytics: ['view', 'export', 'edit', 'delete', 'admin'],
      settings: ['view', 'edit', 'delete', 'admin'],
      staff: ['view', 'invite', 'edit', 'remove', 'admin'],
      reports: ['view', 'edit', 'delete', 'admin'],
      insights: ['view', 'edit', 'delete', 'admin'],
      loyalty: ['view', 'edit', 'delete', 'admin'],
      notifications: ['view', 'edit', 'delete', 'admin'],
      profile: ['view', 'edit', 'delete', 'admin'],
      expenses: ['view', 'edit', 'delete', 'admin'],
      domains: ['view', 'edit', 'delete', 'admin'],
      game_hub: ['view', 'edit', 'delete', 'admin'],
      madas_pass: ['view', 'edit', 'delete', 'admin'],
      scratch_card: ['view', 'edit', 'delete', 'admin'],
      discount_wheel: ['view', 'edit', 'delete', 'admin'],
      collections: ['view', 'edit', 'delete', 'admin'],
      deposits: ['view', 'edit', 'delete', 'admin'],
      low_stock: ['view', 'edit', 'delete', 'admin'],
      product_reviews: ['view', 'edit', 'delete', 'admin'],
      shares: ['view', 'edit', 'delete', 'admin'],
      admin: ['view', 'edit', 'delete', 'admin']
    };
  }

  /**
   * Validate invite token
   * @param token - Invite token
   * @returns Promise<StaffInvite | null>
   */
  static async validateInviteToken(token: string): Promise<StaffInvite | null> {
    try {
      const inviteQuery = query(
        collection(db, 'staff_invites'),
        where('token', '==', token),
        where('status', '==', 'pending')
      );
      const inviteDocs = await getDocs(inviteQuery);

      if (inviteDocs.empty) {
        return null;
      }

      const inviteDoc = inviteDocs.docs[0];
      const inviteData = inviteDoc.data() as StaffInvite;

      // Check if invite has expired
      const now = new Date();
      const expiresAt = inviteData.expiresAt.toDate();
      
      if (now > expiresAt) {
        return null;
      }

      return {
        id: inviteDoc.id,
        ...inviteData
      };

    } catch (error) {
      console.error('Error validating invite token:', error);
      return null;
    }
  }
}
