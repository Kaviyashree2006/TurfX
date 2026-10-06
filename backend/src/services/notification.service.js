/**
 * notification.service.js — Phase 6
 *
 * Helper used by booking and tournament controllers to create in-app
 * notifications. Never throws — a notification failure must never break
 * the originating business operation.
 *
 * NOTE: The existing notification.service.js handled email (sendEmail,
 * sendPasswordResetEmail). We extend it here with createNotification.
 * The email helpers are preserved below unchanged.
 */

const nodemailer = require('nodemailer');
const Notification = require('../models/Notification');

// ── In-app notification helper ────────────────────────────────────────────────

/**
 * Create an in-app notification for a user.
 * @param {{ userId, type, title, message, refId?, refType? }} payload
 */
const createNotification = async ({ userId, type, title, message, refId = null, refType = null }) => {
  try {
    await Notification.create({ userId, type, title, message, refId, refType });
  } catch (err) {
    // Log but never rethrow — notification failure is non-fatal
    console.error('[notification.service] Failed to create notification:', err.message);
  }
};

// ── Email helpers (preserved from Phase 1) ────────────────────────────────────

let _transporter = null;

const getTransporter = () => {
  if (_transporter) return _transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null; // SMTP not configured — skip silently
  }
  _transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return _transporter;
};

const sendEmail = async ({ to, subject, html }) => {
  const transporter = getTransporter();
  if (!transporter || !to) return; // silently skip when unconfigured
  try {
    await transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, html });
  } catch (err) {
    console.error('[notification.service] Email send failed:', err.message);
  }
};

const sendPasswordResetEmail = async (to, resetUrl) => {
  await sendEmail({
    to,
    subject: 'Reset your TurfX password',
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
      <h2>Reset your password</h2>
      <p>Click the link below to reset your TurfX password. This link expires in 1 hour.</p>
      <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Reset password</a>
      <p style="color:#9ca3af;font-size:0.8125rem;margin-top:16px;">If you didn't request this, ignore this email.</p>
    </div>`,
  });
};

module.exports = { createNotification, sendEmail, sendPasswordResetEmail };
