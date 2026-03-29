const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    email: String,
    phone: String,
    address: String,
  },
  { _id: false }
);

const clientSchema = new mongoose.Schema(
  {
    brandName: {
      type: String,
      required: [true, 'Brand name is required'],
      trim: true,
    },
    owner: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      email: {
        type: String,
        required: true,
        lowercase: true,
      },
      phone: String,
    },
    contact: {
      type: contactSchema,
      default: () => ({}),
    },
    subscriptionPlan: {
      type: String,
      enum: ['starter', 'standard', 'premium', 'enterprise'],
      default: 'standard',
    },
    active: {
      type: Boolean,
      default: true,
    },
    // System access - controlled from digix-admin (dashboard, finance, fulfillment, shipping)
    systemAccess: {
      dashboard: { type: Boolean, default: true },
      finance: { type: Boolean, default: true },
      fulfillment: { type: Boolean, default: true },
      shipping: { type: Boolean, default: false },
    },
    features: {
      type: Map,
      of: Boolean,
      default: () => ({}),
    },
    suspensionReason: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

clientSchema.index({ brandName: 1 });
clientSchema.index({ 'owner.email': 1 });
clientSchema.index({ active: 1 });

module.exports = mongoose.model('Client', clientSchema);
