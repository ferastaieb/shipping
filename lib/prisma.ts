// lib/prisma.ts
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';       // Next.js helper to read request cookies

const JWT_SECRET = "Zaxon_Secret_JWT";

// 1) Ensure a single global instance in development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}
const globalForPrisma = global as typeof globalThis & { prisma?: PrismaClient };
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    // log: ['query'], // ← enable if you want SQL debug logs
  });
}
const prisma = globalForPrisma.prisma!;

// 2) Middleware to stamp createdBy & updatedBy

// ── Extended middleware: stamp + audit log ───────────────────────────────────────
prisma.$use(async (params, next) => {
  if (['create','update'].includes(params.action)) {
    const token = (await cookies()).get('token')?.value;
    if (token) {
      try {
        const { userId } = jwt.verify(token, JWT_SECRET) as any;
        params.args.data = {
          ...params.args.data,
          ...(params.action==='create' && { createdByUserId: userId }),
          ...(params.action==='update' && { updatedByUserId: userId }),
        };
      } catch {}
    }
  }
  return next(params);
});

// ── end middleware ───────────────────────────────────────────────────────────────
export default prisma;
