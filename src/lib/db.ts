import { PrismaClient } from '@prisma/client';

// Singleton pattern avoids exhausting Postgres connections from Next.js's
// dev-mode module hot-reload. See docs/ARCHITECTURE.md's folder structure.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
