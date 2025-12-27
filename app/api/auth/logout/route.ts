// pages/api/auth/me.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const decoded = await requireAuth(request);
    // Optionally, look up additional user info from your DB using decoded.userId.
    return NextResponse.json({ user: decoded });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
