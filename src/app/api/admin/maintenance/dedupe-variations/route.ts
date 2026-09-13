import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { PRODUCTS_TAG } from '@/lib/fetcher';
import { isAdminAuthenticated } from '@/lib/session';
import { dedupeVariations } from '@/lib/variations';
import type { ProductVariation } from '@/data/products';

/**
 * POST /api/admin/maintenance/dedupe-variations        → apply the cleanup
 * POST /api/admin/maintenance/dedupe-variations?dryRun=1 → report only (no writes)
 * GET  /api/admin/maintenance/dedupe-variations         → report only (no writes)
 *
 * One-time (repeatable, idempotent) catalog hygiene: removes duplicate
 * variation rows (same color+size, case/whitespace-insensitive) across every
 * product, keeping the first occurrence and merging any missing fields from
 * the dropped duplicates (see dedupeVariations).
 *
 * The response doubles as the audit/backup record — SAVE IT before moving on.
 * After applying, the Next.js data cache is busted (same mechanism as admin
 * product saves), so storefront pages reflect the cleanup immediately.
 */

const BATCH_SIZE = 100;

interface CleanupReport {
  dryRun: boolean;
  scannedProducts: number;
  productsWithDuplicates: number;
  removedVariations: number;
  details: {
    id: string;
    slug: string;
    name: string;
    removedCount: number;
    removed: { id: string; colorName: string; size: string; isHidden: boolean }[];
  }[];
}

async function scanAndClean(apply: boolean): Promise<CleanupReport> {
  const report: CleanupReport = {
    dryRun: !apply,
    scannedProducts: 0,
    productsWithDuplicates: 0,
    removedVariations: 0,
    details: [],
  };

  // Cursor pagination keeps memory flat for catalogs of any size.
  let cursorId: string | undefined;
  for (;;) {
    const rows = await prisma.product.findMany({
      select: { id: true, slug: true, name: true, variations: true },
      take: BATCH_SIZE,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      orderBy: { id: 'asc' },
    });
    if (rows.length === 0) break;
    cursorId = rows[rows.length - 1].id;

    for (const row of rows) {
      report.scannedProducts++;
      const vars = (row.variations || []) as ProductVariation[];
      if (vars.length === 0) continue;

      const { kept, removed } = dedupeVariations(vars);
      if (removed.length === 0) continue;

      report.productsWithDuplicates++;
      report.removedVariations += removed.length;
      report.details.push({
        id: row.id,
        slug: row.slug,
        name: row.name,
        removedCount: removed.length,
        removed: removed.map((r) => ({
          id: r.id,
          colorName: r.colorName,
          size: r.size,
          isHidden: r.isHidden ?? false,
        })),
      });

      if (apply) {
        await prisma.product.update({
          where: { id: row.id },
          data: { variations: { set: kept } },
        });
      }
    }
  }

  return report;
}

function unauthorized() {
  return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
}

/** Read-only duplicate report — safe to hit from a logged-in admin browser. */
export async function GET() {
  if (!(await isAdminAuthenticated())) return unauthorized();
  return NextResponse.json(await scanAndClean(false));
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) return unauthorized();

  const { searchParams } = new URL(req.url);
  const dryRun = ['1', 'true', 'yes'].includes((searchParams.get('dryRun') || '').toLowerCase());

  const report = await scanAndClean(!dryRun);

  if (!dryRun) {
    revalidateTag(PRODUCTS_TAG, 'max');
    revalidatePath('/');
    revalidatePath('/shop');
  }

  return NextResponse.json(report);
}
