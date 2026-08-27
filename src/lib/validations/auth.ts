import { z } from 'zod';

// A password strong enough to be worth hashing but not so strict it annoys
// a personal-inventory user — see docs/API.md's register/reset-password error cases.
const password = z.string().min(10, 'Password must be at least 10 characters');

// Normalize before validating so "Foo@Example.com" and "foo@example.com"
// are treated as the same account everywhere (register, login, reset).
const email = z.string().trim().toLowerCase().email();

export const registerSchema = z.object({
  email,
  password,
});

export const forgotPasswordSchema = z.object({
  email,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: password,
});
