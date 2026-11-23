import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    // Fast check for valid 24-character hexadecimal MongoDB ObjectId
    if (!id || !/^[a-f\d]{24}$/i.test(id)) {
      return new Response('Invalid image ID', { status: 400 });
    }

    // Check ETag for fast client caching
    const ifNoneMatch = req.headers.get('if-none-match');
    if (ifNoneMatch === `"${id}"`) {
      return new Response(null, { status: 304 });
    }

    const file = await prisma.uploadedFile.findUnique({
      where: { id },
      select: {
        id: true,
        filename: true,
        contentType: true,
        data: true,
        size: true,
      },
    });

    if (!file || !file.data) {
      return new Response('Image not found', { status: 404 });
    }

    const headers = new Headers();
    headers.set('Content-Type', file.contentType || 'image/jpeg');
    headers.set('Content-Length', String(file.size || file.data.length));
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('ETag', `"${file.id}"`);
    headers.set(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(file.filename || 'image.jpg')}"`
    );

    return new Response(file.data, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error('[GET /api/images/[id]]', err);
    return new Response('Server error', { status: 500 });
  }
}

export async function HEAD(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    if (!id || !/^[a-f\d]{24}$/i.test(id)) {
      return new Response(null, { status: 400 });
    }

    const file = await prisma.uploadedFile.findUnique({
      where: { id },
      select: {
        id: true,
        filename: true,
        contentType: true,
        size: true,
      },
    });

    if (!file) {
      return new Response(null, { status: 404 });
    }

    const headers = new Headers();
    headers.set('Content-Type', file.contentType || 'image/jpeg');
    headers.set('Content-Length', String(file.size));
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('ETag', `"${file.id}"`);

    return new Response(null, {
      status: 200,
      headers,
    });
  } catch {
    return new Response(null, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!id || !/^[a-f\d]{24}$/i.test(id)) {
      return NextResponse.json({ success: false, error: 'Invalid image ID' }, { status: 400 });
    }

    await prisma.uploadedFile.delete({
      where: { id },
    }).catch(() => null);

    return NextResponse.json({ success: true, message: 'Image deleted' });
  } catch (err) {
    console.error('[DELETE /api/images/[id]]', err);
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
  }
}
