import { z } from 'zod';

// A password strong enough to be worth hashing but not so strict it annoys
// a personal-inventory user — see docs/API.md's register/reset-password error cases.
const password = z.string().min(10, 'Password must be at least 10 characters');

export const registerSchema = z.object({
  email: z.string().email(),
  password,
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: password,
});
