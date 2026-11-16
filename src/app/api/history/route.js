import { NextResponse } from 'next/server';
import { auditRepo } from '@/lib/db.js';
import { getAuthenticatedAdmin } from '@/lib/auth.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const logs = await auditRepo.getRecent(100);
    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Audit history error:', error);
    return NextResponse.json({ error: 'Failed to retrieve history logs' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    await auditRepo.clear();
    await auditRepo.log('CLEAR_DATA', admin.user, { message: 'Audit history cleared by administrator' });
    return NextResponse.json({ success: true, message: 'Audit history cleared successfully' });
  } catch (error) {
    console.error('Clear history error:', error);
    return NextResponse.json({ error: 'Failed to clear history' }, { status: 500 });
  }
}
