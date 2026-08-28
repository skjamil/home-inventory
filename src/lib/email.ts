import { Resend } from 'resend';
import nodemailer from 'nodemailer';

// Two swappable transports — see docs/ARCHITECTURE.md's
// "Local development — email testing". Resend in production; Mailtrap's
// SMTP sandbox in local dev so testing never risks a real delivery.
const provider = process.env.EMAIL_PROVIDER ?? (process.env.NODE_ENV === 'production' ? 'resend' : 'mailtrap');
const mailtrapConfigured = !!(process.env.MAILTRAP_USER && process.env.MAILTRAP_PASS);

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const mailtrapTransport = mailtrapConfigured
  ? nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST,
      port: Number(process.env.MAILTRAP_PORT ?? 2525),
      auth: { user: process.env.MAILTRAP_USER, pass: process.env.MAILTRAP_PASS },
    })
  : null;

async function sendMail(to: string, subject: string, html: string, consoleFallbackLine: string) {
  const from = process.env.EMAIL_FROM ?? 'Home Inventory <onboarding@resend.dev>';

  if (provider === 'resend') {
    if (!resend) throw new Error('RESEND_API_KEY is not set');
    await resend.emails.send({ from, to, subject, html });
    return;
  }

  // No Mailtrap credentials configured yet (see .env.example) — rather
  // than fail the whole request, log the link so local dev can keep
  // moving without signing up for Mailtrap first.
  if (!mailtrapTransport) {
    console.log(`\n[dev email — Mailtrap not configured] ${consoleFallbackLine}\n`);
    return;
  }

  await mailtrapTransport.sendMail({ from, to, subject, html });
}

function appUrl() {
  return process.env.AUTH_URL ?? 'http://localhost:3000';
}

export async function sendVerificationEmail(email: string, token: string) {
  const link = `${appUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  await sendMail(
    email,
    'Verify your email — Home Inventory',
    `<p>Confirm your email to finish setting up your account.</p><p><a href="${link}">Verify email</a></p>`,
    `Verification link for ${email}: ${link}`
  );
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const link = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  await sendMail(
    email,
    'Reset your password — Home Inventory',
    `<p>Someone requested a password reset for this account. If that was you:</p><p><a href="${link}">Reset password</a></p><p>If you didn't request this, you can ignore this email.</p>`,
    `Password reset link for ${email}: ${link}`
  );
}

export interface ExpiringDigestItem {
  itemName: string;
  kind: 'warranty' | 'amc';
  daysUntil: number;
}

export async function sendExpirationDigestEmail(email: string, entries: ExpiringDigestItem[]) {
  const link = `${appUrl()}/dashboard`;
  const subject = `${entries.length} ${entries.length === 1 ? 'item' : 'items'} expiring soon — Home Inventory`;
  const rows = entries
    .map((e) => {
      const kindLabel = e.kind === 'warranty' ? 'Warranty' : 'AMC contract';
      const dayLabel = e.daysUntil === 0 ? 'expires today' : `expires in ${e.daysUntil} day${e.daysUntil === 1 ? '' : 's'}`;
      return `<li>${e.itemName} — ${kindLabel} ${dayLabel}</li>`;
    })
    .join('');

  await sendMail(
    email,
    subject,
    `<p>The following items are expiring soon:</p><ul>${rows}</ul><p><a href="${link}">View your dashboard</a></p>`,
    `Expiration digest for ${email}: ${entries.length} item(s) expiring soon — ${link}`
  );
}
