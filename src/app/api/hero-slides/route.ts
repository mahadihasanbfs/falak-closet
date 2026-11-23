import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { Prisma } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from '@/lib/prisma';
import { HERO_SLIDES_TAG } from '@/lib/fetcher';
import { DEFAULT_HERO_SLIDES } from '@/lib/heroSlides';
import { cloudinaryPublicIdFromUrl } from '@/lib/cloudinary';

/**
 * Admin CRUD for home page hero slides. The storefront never calls this — it
 * reads through the cached lib (src/lib/heroSlides.ts); every write here busts
 * that cache plus the home path itself.
 */

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Server error';
}

function bustHeroCache() {
  revalidateTag(HERO_SLIDES_TAG, 'max');
  revalidatePath('/'); // home is the only storefront consumer
}

function isSafeCtaLink(value: string): boolean {
  return value.startsWith('/') || /^https?:\/\//i.test(value);
}

function isUsableImage(value: string): boolean {
  // Base64 payloads belong in Cloudinary, not Mongo — reject with guidance.
  return Boolean(value) && !value.startsWith('data:');
}

// ─── GET /api/hero-slides ────────────────────────────────────────────────────
export async function GET() {
  try {
    let slides = await prisma.heroSlide.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    // First run: give the admin the shipped slides to edit, not an empty table.
    if (slides.length === 0) {
      await prisma.heroSlide.createMany({
        data: DEFAULT_HERO_SLIDES.map((s) => ({ ...s })),
      });
      slides = await prisma.heroSlide.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      });
      bustHeroCache();
    }

    return NextResponse.json({ success: true, slides });
  } catch (err) {
    console.error('[GET /api/hero-slides]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch hero slides' },
      { status: 500 }
    );
  }
}

// ─── POST /api/hero-slides ───────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const title = String(body.title || '').trim();
    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    const image = String(body.image || '').trim();
    if (!isUsableImage(image)) {
      return NextResponse.json(
        { success: false, error: 'A hosted image URL is required — upload via the Cloudinary uploader, embedded (data:) images are not stored' },
        { status: 400 }
      );
    }

    const ctaLink = String(body.ctaLink || '/shop').trim() || '/shop';
    if (!isSafeCtaLink(ctaLink)) {
      return NextResponse.json(
        { success: false, error: 'CTA link must be an internal path (/...) or an http(s) URL' },
        { status: 400 }
      );
    }

    const slide = await prisma.heroSlide.create({
      data: {
        title,
        tag: String(body.tag || '').trim(),
        subtitle: String(body.subtitle || '').trim(),
        ctaText: String(body.ctaText || 'Shop Now').trim() || 'Shop Now',
        ctaLink,
        image,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
        sortOrder: Number(body.sortOrder) || 0,
      },
    });

    bustHeroCache();
    return NextResponse.json(
      { success: true, message: 'Slide created successfully', slide },
      { status: 201 }
    );
  } catch (err) {
    console.error('[POST /api/hero-slides]', err);
    return NextResponse.json({ success: false, error: errorMessage(err) }, { status: 500 });
  }
}

// ─── PATCH /api/hero-slides ──────────────────────────────────────────────────
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const id = String(body.id || body._id || '').trim();
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json({ success: false, error: 'Valid ID is required' }, { status: 400 });
    }

    const existing = await prisma.heroSlide.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Slide not found' }, { status: 404 });
    }

    const data: Prisma.HeroSlideUpdateInput = {};

    if (body.title !== undefined) {
      const title = String(body.title || '').trim();
      if (!title) {
        return NextResponse.json({ success: false, error: 'Title cannot be empty' }, { status: 400 });
      }
      data.title = title;
    }

    if (body.image !== undefined) {
      const image = String(body.image || '').trim();
      if (!isUsableImage(image)) {
        return NextResponse.json(
          { success: false, error: 'Image must be a hosted URL — embedded (data:) images are not stored' },
          { status: 400 }
        );
      }
      data.image = image;
    }

    if (body.ctaLink !== undefined) {
      const ctaLink = String(body.ctaLink || '').trim();
      if (!isSafeCtaLink(ctaLink)) {
        return NextResponse.json(
          { success: false, error: 'CTA link must be an internal path (/...) or an http(s) URL' },
          { status: 400 }
        );
      }
      data.ctaLink = ctaLink;
    }

    if (body.tag !== undefined) data.tag = String(body.tag || '').trim();
    if (body.subtitle !== undefined) data.subtitle = String(body.subtitle || '').trim();
    if (body.ctaText !== undefined) {
      const ctaText = String(body.ctaText || '').trim();
      data.ctaText = ctaText || 'Shop Now';
    }
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
    if (body.sortOrder !== undefined) {
      const sortOrder = Number(body.sortOrder);
      if (!Number.isFinite(sortOrder) || sortOrder < 0) {
        return NextResponse.json(
          { success: false, error: 'Sort order must be a non-negative number' },
          { status: 400 }
        );
      }
      data.sortOrder = Math.trunc(sortOrder);
    }

    const slide = await prisma.heroSlide.update({ where: { id }, data });

    bustHeroCache();
    return NextResponse.json({ success: true, message: 'Slide updated successfully', slide });
  } catch (err) {
    console.error('[PATCH /api/hero-slides]', err);
    return NextResponse.json({ success: false, error: errorMessage(err) }, { status: 500 });
  }
}

// ─── DELETE /api/hero-slides?id=... ──────────────────────────────────────────
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get('id') || '').trim();
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Valid ID is required for deletion' },
        { status: 400 }
      );
    }

    const existing = await prisma.heroSlide.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Slide not found' }, { status: 404 });
    }

    await prisma.heroSlide.delete({ where: { id } });

    // Best-effort destroy of the database or Cloudinary asset —
    // fire-and-forget (never blocks the delete).
    const publicId = cloudinaryPublicIdFromUrl(existing.image);
    if (publicId && /^[a-f\d]{24}$/i.test(publicId)) {
      await prisma.uploadedFile.delete({ where: { id: publicId } }).catch(() => null);
    } else if (publicId?.startsWith('falak-closet/')) {
      try {
        if (process.env.CLOUDINARY_URL || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
          cloudinary.uploader
            .destroy(publicId, { resource_type: 'image' })
            .catch((err) => console.warn('[DELETE /api/hero-slides] asset cleanup failed:', publicId, err));
        }
      } catch {
        // Ignore
      }
    }

    bustHeroCache();
    return NextResponse.json({ success: true, message: 'Slide deleted successfully' });
  } catch (err) {
    console.error('[DELETE /api/hero-slides]', err);
    return NextResponse.json({ success: false, error: errorMessage(err) }, { status: 500 });
  }
}
