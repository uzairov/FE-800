import { NextRequest, NextResponse } from 'next/server';
import { err } from '@/types';

export interface RequestUser {
  id: string;
  email: string;
  role: string;
  companyId: string;
}

/** Extract user injected by middleware (from validated JWT). */
export function getRequestUser(req: NextRequest): RequestUser {
  return {
    id: req.headers.get('x-user-id') ?? '',
    email: req.headers.get('x-user-email') ?? '',
    role: req.headers.get('x-user-role') ?? '',
    companyId: req.headers.get('x-user-company-id') ?? '',
  };
}

/** Return 403 if user is not ADMIN. */
export function requireAdmin(user: RequestUser): NextResponse | null {
  if (user.role !== 'ADMIN') {
    return NextResponse.json(err('Forbidden'), { status: 403 });
  }
  return null;
}
