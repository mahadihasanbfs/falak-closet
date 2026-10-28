import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductBySlugOrId } from '@/lib/products';
import { formatCurrency } from '@/lib/utils';
import ProductSkeleton from '@/components/product/ProductSkeleton';
import LandingPageClient from './LandingPageClient';

async function loadProduct(slug: string) {
  try {
    return await getProductBySlugOrId(slug);
  } catch (err) {
    console.error('[landing] lookup failed for', slug, err);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);

  if (!product) {
    return {
      title: 'Special Offer | Falak Closet',
      description: 'Exclusive modest fashion promotional offer from Falak Closet.',
      robots: { index: false, follow: true },
    };
  }

  const previewImage =
    product.images?.[0] ||
    'https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=1200&q=80';

  const sellingPrice = product.price || 0;
  const regularPrice =
    product.originalPrice && product.originalPrice > 0
      ? product.originalPrice
      : sellingPrice;
  const discountPercent =
    regularPrice > sellingPrice && sellingPrice > 0
      ? Math.round(((regularPrice - sellingPrice) / regularPrice) * 100)
      : 0;
  const effectivePrice = sellingPrice > 0 ? sellingPrice : regularPrice;

  const pageTitle = `${product.name} | Special Offer | Falak Closet`;
  const description =
    discountPercent > 0
      ? `Special promotional offer on ${product.name}! Regular price: ${formatCurrency(regularPrice)}. Special offer price: ${formatCurrency(effectivePrice)} (${discountPercent}% OFF) with Cash on Delivery nationwide.`
      : `Special promotional offer on ${product.name}! Order now at ${formatCurrency(effectivePrice)} with Cash on Delivery nationwide.`;

  const canonicalUrl = `https://falakcloset.com/landing/${product.slug}`;

  return {
    title: {
      absolute: pageTitle,
    },
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: pageTitle,
      description,
      url: canonicalUrl,
      siteName: 'Falak Closet Modest Fashion',
      images: [
        {
          url: previewImage,
          width: 1200,
          height: 630,
          alt: product.name,
        },
      ],
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      images: [previewImage],
    },
    other: {
      'product:price:amount': String(effectivePrice),
      'product:price:currency': 'BDT',
      'product:availability': product.stock > 0 ? 'in stock' : 'out of stock',
      'product:condition': 'new',
      'product:brand': 'Falak Closet',
    },
  };
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await loadProduct(slug);

  if (!product) notFound();

  return (
    <Suspense fallback={<ProductSkeleton />}>
      <LandingPageClient initialProduct={product} />
    </Suspense>
  );
}
