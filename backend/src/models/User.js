const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name must be 100 characters or fewer'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // never returned in queries by default
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    role: {
      type: String,
      enum: ['customer', 'owner', 'admin'],
      required: true,
      default: 'customer',
    },
    // Meaningful for role='owner' only.
    // customers and admins default to 'approved'.
    // Doc 06: no isApproved boolean — approvalStatus is the single source of truth.
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved', // overridden to 'pending' for owners on creation
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    resubmissionCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Password reset (Doc 06)
    passwordResetTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
    // Refresh token storage: array of hashed tokens per device (Doc 08)
    refreshTokens: {
      type: [String],
      default: [],
      select: false,
    },
    // Business details — used for owner registration / resubmission (Phase 1)
    businessName: {
      type: String,
      trim: true,
      default: null,
    },
    businessAddress: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────
userSchema.index({ email: 1 }, { unique: true });

// ─── Instance method: compare password ──────────────────────────────────────
userSchema.methods.comparePassword = async function (plainPassword) {
  // passwordHash is select:false — must be explicitly selected in query
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// ─── Static: hash a password ────────────────────────────────────────────────
userSchema.statics.hashPassword = async function (plain) {
  return bcrypt.hash(plain, 12);
};

module.exports = mongoose.model('User', userSchema);
