// lib/auth.ts
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export function getTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get("token")?.value || null;
}

export function verifyToken(token: string) {
  try {
    // Note: process.env.JWT_SECRET should be defined and is available only on the server.
    return jwt.verify(token, process.env.JWT_SECRET as string);
  } catch (error) {
    console.error("Invalid token:", error);
    return null;
  }
}

export async function requireAuth(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) {
    throw new Error("Unauthorized: No token provided");
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    throw new Error("Unauthorized: Invalid token");
  }
  return decoded; // e.g., { userId, username, iat, exp }
}

export async function getUserIdFromCookies(): Promise<number | null> {
  const token = (await cookies()).get("token")?.value;
  if (!token) {
    return null;
  }
  const decoded = verifyToken(token) as { userId?: number | string } | null;
  if (!decoded || decoded.userId === undefined) {
    return null;
  }
  const userId = typeof decoded.userId === "string" ? Number(decoded.userId) : decoded.userId;
  return Number.isFinite(userId) ? userId : null;
}
