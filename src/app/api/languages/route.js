import { NextResponse } from 'next/server';
import { languageRepo, mediaRepo, auditRepo } from '@/lib/db.js';
import { getAuthenticatedAdmin } from '@/lib/auth.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const languages = await languageRepo.findAll();
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

    const created = await languageRepo.create({
      code,
      name,
      nativeName,
      badgeColor,
    });

    await auditRepo.log('CREATE_LANGUAGE', code, { name, code });

    return NextResponse.json({ success: true, language: created });
  } catch (error) {
    console.error('Create language error:', error);
    return NextResponse.json({ error: 'Failed to create language' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const url = req.nextUrl ? req.nextUrl : new URL(req.url, 'http://localhost:3000');
    const code = url.searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Language code is required' }, { status: 400 });
    }

    const files = await mediaRepo.findAll({ language: code });
    if (files.length > 0) {
      return NextResponse.json(
        { error: `Cannot delete language: ${files.length} media file(s) are associated with it` },
        { status: 400 }
      );
    }

    const deleted = await languageRepo.delete(code);
    if (!deleted) {
      return NextResponse.json({ error: 'Language not found' }, { status: 404 });
    }

    auditRepo.log('DELETE_LANGUAGE', code, { code });
    return NextResponse.json({ success: true, message: `Language ${code} deleted` });
  } catch (error) {
    console.error('Delete language error:', error);
    return NextResponse.json({ error: 'Failed to delete language' }, { status: 500 });
  }
}
