/**
 * StaffUser - Separate identity for warehouse/shipping/finance staff.
 * Staff cannot self-register. Created by Admin only.
 */
import mongoose, { Schema, Document, Model } from 'mongoose';

export type StaffDepartment = 'WAREHOUSE' | 'SHIPPING' | 'FINANCE';
export type StaffAllowedApp = 'WAREHOUSE' | 'SHIPPING' | 'ADMIN';

/** Allowed permission keys for staff (used in validation). */
export const STAFF_PERMISSIONS = [
  'inventory_view',
  'inventory_edit',
  'inventory_adjust',
  'audit_scan',
  'audit_start_finish',
  'orders_view',
  'orders_fulfill',
  'orders_ship',
  'reports_view',
  'staff_manage',
] as const;
export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];

export interface IStaffUser extends Document {
  fullName: string;
  email: string;
  passwordHash: string;
  department: StaffDepartment;
  role: string;
  allowedApps: StaffAllowedApp[];
  permissions: string[];
  active: boolean;
  createdBy: string; // adminId
  createdAt: Date;
  updatedAt: Date;
}

const StaffUserSchema = new Schema<IStaffUser>(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    department: { type: String, enum: ['WAREHOUSE', 'SHIPPING', 'FINANCE'], required: true },
    role: { type: String, required: true, default: 'staff' },
    allowedApps: { type: [String], enum: ['WAREHOUSE', 'SHIPPING', 'ADMIN'], default: [] },
    permissions: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

// email has unique: true → index created automatically
StaffUserSchema.index({ active: 1 });
StaffUserSchema.index({ department: 1 });

export const StaffUser: Model<IStaffUser> =
  mongoose.models.StaffUser ?? mongoose.model<IStaffUser>('StaffUser', StaffUserSchema);
