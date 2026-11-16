import { NextResponse } from 'next/server';
import { languageRepo, auditRepo } from '@/lib/db.js';
import { getAuthenticatedAdmin } from '@/lib/auth.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const languages = languageRepo.findAll();
    return NextResponse.json({ languages });
  } catch (error) {
    console.error('Languages fetch error:', error);
    return NextResponse.json({ error: 'Failed to retrieve languages' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await req.json();
    const { code, name, nativeName, badgeColor } = body;

    if (!code || !name) {
      return NextResponse.json({ error: 'Language code and name are required' }, { status: 400 });
    }

    const created = languageRepo.create({
      code,
      name,
      nativeName,
      badgeColor,
    });

    auditRepo.log('CREATE_LANGUAGE', code, { name, code });

    return NextResponse.json({ success: true, language: created });
  } catch (error) {
    console.error('Create language error:', error);
    return NextResponse.json({ error: 'Failed to create language' }, { status: 500 });
  }
}
