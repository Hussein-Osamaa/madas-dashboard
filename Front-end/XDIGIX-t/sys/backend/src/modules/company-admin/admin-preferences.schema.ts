import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminPreferences extends Document {
  adminUserId: string;
  dashboardLayout?: Record<string, unknown>;
  savedViews?: Array<{ name: string; filters: Record<string, unknown> }>;
  notificationPrefs?: { email: boolean; slack: boolean; push: boolean };
  createdAt: Date;
  updatedAt: Date;
}

const AdminPreferencesSchema = new Schema<IAdminPreferences>(
  {
    adminUserId: { type: String, required: true, unique: true },
    dashboardLayout: { type: Schema.Types.Mixed, default: {} },
    savedViews: { type: [Schema.Types.Mixed], default: [] },
    notificationPrefs: {
      email: { type: Boolean, default: true },
      slack: { type: Boolean, default: false },
      push: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

export const AdminPreferences = (mongoose.models.AdminPreferences as mongoose.Model<IAdminPreferences>) || mongoose.model<IAdminPreferences>(
  'AdminPreferences',
  AdminPreferencesSchema,
);
