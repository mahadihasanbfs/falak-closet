import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Image & Media upload/delete endpoint.
 *
 * Uploads are stored directly in the MongoDB database (via Prisma `UploadedFile` model).
 * Images are served via `/api/images/[id]` from the same database.
 */

// Route handlers are dynamic by default in Next 16 — keep uploads uncached.
export const dynamic = 'force-dynamic';

const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB per image (MongoDB max BSON doc is 16 MB)
const MAX_VIDEO_BYTES = 15 * 1024 * 1024; // 15 MB per video
const FOLDER_RE = /^[a-z0-9/_-]{1,60}$/;

/** Normalize the logical storage folder without allowing arbitrary input. */
function safeFolder(raw: unknown): string {
  const hint = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!hint || !FOLDER_RE.test(hint)) return 'uploads';
  return hint;
}

interface UploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  width: number | null;
  height: number | null;
  format: string;
  bytes: number;
}

// ─── POST /api/upload — multipart/form-data { file | files[], folder? } ──────
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Expected multipart/form-data' },
      { status: 400 }
    );
  }

  const folder = safeFolder(form.get('folder'));

  const files = [...form.getAll('file'), ...form.getAll('files')].filter(
    (f): f is File => f instanceof File
  );
  if (files.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No media file provided' },
      { status: 400 }
    );
  }

  const results: UploadResult[] = [];
  for (const file of files) {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { success: false, error: `"${file.name}" is not a supported image or video`, uploaded: results },
        { status: 400 }
      );
    }

    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > maxBytes) {
      return NextResponse.json(
        {
          success: false,
          error: `"${file.name}" exceeds the 15 MB database document limit`,
          uploaded: results,
          results,
        },
        { status: 413 }
      );
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const record = await prisma.uploadedFile.create({
        data: {
          filename: file.name || 'image.jpg',
          contentType: file.type || 'image/jpeg',
          data: buffer,
          size: buffer.length,
          folder,
        },
      });

      const url = `/api/images/${record.id}`;
      const format = file.type.split('/')[1] || (isVideo ? 'mp4' : 'jpeg');

      results.push({
        url,
        secureUrl: url,
        publicId: record.id,
        width: null,
        height: null,
        format,
        bytes: buffer.length,
      });
    } catch (err) {
      console.error('[POST /api/upload] Database insert failed:', err);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to save "${file.name}" to database`,
          uploaded: results,
          results,
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true, results, uploaded: results }, { status: 201 });
}

// ─── DELETE /api/upload — body { publicId | url } ────────────────────────────
export async function DELETE(req: Request) {
  const body = await req.json().catch(() => null);
  const rawId =
    typeof body?.publicId === 'string'
      ? body.publicId.trim()
      : typeof body?.url === 'string'
      ? body.url.trim()
      : '';

  if (!rawId) {
    return NextResponse.json(
      { success: false, error: 'Missing publicId or url' },
      { status: 400 }
    );
  }

  // 1. Check if target is a database image (24-hex ObjectId or /api/images/[id])
  const objectIdMatch = rawId.match(/([a-f\d]{24})/i);
  if (objectIdMatch) {
    const fileId = objectIdMatch[1];
    try {
      await prisma.uploadedFile.delete({ where: { id: fileId } });
    } catch {
      // Ignore not found or already deleted
    }
    return NextResponse.json({ success: true, result: 'ok' });
  }

  return NextResponse.json({ success: true, result: 'ok' });
}
