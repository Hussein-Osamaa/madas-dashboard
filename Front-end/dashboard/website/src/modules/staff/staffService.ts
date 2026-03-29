import { db } from '@/lib/backend';
import { StaffMember } from './inviteService';

/**
 * Staff Service - Manages staff operations and permissions
 */
export class StaffService {
  /**
   * Get staff member by UID
   * @param uid - Staff member's UID
   * @returns Promise<StaffMember | null>
   */
  static async getStaffByUid(uid: string): Promise<StaffMember | null> {
    try {
      const staffQuery = query(
        collection(db, 'staff'),
        where('uid', '==', uid)
      );
      const staffDocs = await getDocs(staffQuery);

      if (staffDocs.empty) {
        return null;
      }

      const staffDoc = staffDocs.docs[0];
      return {
        id: staffDoc.id,
        ...staffDoc.data()
      } as StaffMember;

    } catch (error) {
      console.error('Error getting staff by UID:', error);
      return null;
    }
  }

  /**
   * Update staff member role
   * @param staffId - Staff member ID
   * @param newRole - New role
   * @param updatedBy - UID of user making the update
   * @returns Promise<void>
   */
  static async updateStaffRole(
    staffId: string, 
    newRole: 'staff' | 'manager' | 'admin',
    updatedBy: string
  ): Promise<void> {
    try {
      const staffRef = doc(db, 'staff', staffId);
      const staffDoc = await getDoc(staffRef);

      if (!staffDoc.exists()) {
        throw new Error('Staff member not found');
      }

      const staffData = staffDoc.data();
      
      // Update staff role and permissions
      await updateDoc(staffRef, {
        role: newRole,
        permissions: this.getDefaultPermissions(newRole),
        updatedBy,
        updatedAt: serverTimestamp()
      });

      // Also update user document
      const userRef = doc(db, 'users', staffData.uid);
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: serverTimestamp()
      });

      console.log('Staff role updated:', staffId, 'to', newRole);

    } catch (error) {
      console.error('Error updating staff role:', error);
      throw error;
    }
  }

  /**
   * Update staff member permissions
   * @param staffId - Staff member ID
   * @param permissions - New permissions
   * @param updatedBy - UID of user making the update
   * @returns Promise<void>
   */
  static async updateStaffPermissions(
    staffId: string,
    permissions: Record<string, string[]>,
    updatedBy: string
  ): Promise<void> {
    try {
      const staffRef = doc(db, 'staff', staffId);
      await updateDoc(staffRef, {
        permissions,
        updatedBy,
        updatedAt: serverTimestamp()
      });

      console.log('Staff permissions updated:', staffId);

    } catch (error) {
      console.error('Error updating staff permissions:', error);
      throw error;
    }
  }

  /**
   * Check if user has permission for a specific action
   * @param uid - User's UID
   * @param feature - Feature name
   * @param action - Action name
   * @returns Promise<boolean>
   */
  static async hasPermission(uid: string, feature: string, action: string): Promise<boolean> {
    try {
      const staffMember = await this.getStaffByUid(uid);
      
      if (!staffMember) {
        return false;
      }

      // Admin users have all permissions
      if (staffMember.role === 'admin') {
        return true;
      }

      const permissions = staffMember.permissions || {};
      const featurePermissions = permissions[feature] || [];
      
      return featurePermissions.includes(action);

    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }

  /**
   * Get staff member's business ID
   * @param uid - User's UID
   * @returns Promise<string | null>
   */
  static async getBusinessId(uid: string): Promise<string | null> {
    try {
      const staffMember = await this.getStaffByUid(uid);
      return staffMember?.businessId || null;
    } catch (error) {
      console.error('Error getting business ID:', error);
      return null;
    }
  }

  /**
   * Get staff member's role
   * @param uid - User's UID
   * @returns Promise<string | null>
   */
  static async getRole(uid: string): Promise<string | null> {
    try {
      const staffMember = await this.getStaffByUid(uid);
      return staffMember?.role || null;
    } catch (error) {
      console.error('Error getting role:', error);
      return null;
    }
  }

  /**
   * Check if user is business owner
   * @param uid - User's UID
   * @param businessId - Business ID
   * @returns Promise<boolean>
   */
  static async isBusinessOwner(uid: string, businessId: string): Promise<boolean> {
    try {
      const businessRef = doc(db, 'businesses', businessId);
      const businessDoc = await getDoc(businessRef);

      if (!businessDoc.exists()) {
        return false;
      }

      const businessData = businessDoc.data();
      return businessData.ownerUid === uid;

    } catch (error) {
      console.error('Error checking business ownership:', error);
      return false;
    }
  }

  /**
   * Get default permissions for a role
   * @param role - Staff role
   * @returns Record<string, string[]>
   */
  private static getDefaultPermissions(role: 'staff' | 'manager' | 'admin'): Record<string, string[]> {
    switch (role) {
      case 'admin':
        return {
          home: ['view'],
          orders: ['view', 'search', 'create', 'edit', 'delete'],
          inventory: ['view', 'edit', 'delete'],
          customers: ['view', 'edit', 'delete'],
          employees: ['view', 'edit', 'delete'],
          finance: ['view', 'reports', 'export'],
          analytics: ['view', 'export'],
          settings: ['view', 'edit'],
          staff: ['view', 'invite', 'edit', 'remove']
        };
      case 'manager':
        return {
          home: ['view'],
          orders: ['view', 'search', 'create', 'edit'],
          inventory: ['view', 'edit'],
          customers: ['view', 'edit'],
          employees: ['view'],
          finance: ['view', 'reports'],
          analytics: ['view'],
          settings: ['view']
        };
      case 'staff':
        return {
          home: ['view'],
          orders: ['view', 'search'],
          inventory: ['view'],
          customers: ['view'],
          employees: ['view'],
          finance: ['view'],
          analytics: ['view']
        };
      default:
        return { home: ['view'] };
    }
  }

  /**
   * Get all permissions for a role (for UI display)
   * @param role - Staff role
   * @returns Record<string, string[]>
   */
  static getRolePermissions(role: 'staff' | 'manager' | 'admin'): Record<string, string[]> {
    return this.getDefaultPermissions(role);
  }

  /**
   * Get available roles
   * @returns Array of available roles
   */
  static getAvailableRoles(): Array<{ value: string; label: string; description: string }> {
    return [
      {
        value: 'staff',
        label: 'Staff',
        description: 'Basic access to view and manage orders and inventory'
      },
      {
        value: 'manager',
        label: 'Manager',
        description: 'Extended access including customer management and reports'
      },
      {
        value: 'admin',
        label: 'Admin',
        description: 'Full access including staff management and settings'
      }
    ];
  }
}
