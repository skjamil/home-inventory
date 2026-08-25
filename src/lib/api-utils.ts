import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

// Common error shape — see docs/API.md's "Common error shape".
export function jsonError(status: number, message: string, field?: string) {
  return NextResponse.json({ error: { message, ...(field ? { field } : {}) } }, { status });
}

export function randomToken() {
  return randomBytes(32).toString('hex');
}
