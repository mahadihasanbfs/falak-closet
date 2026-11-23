'use client';

import React from 'react';
import Image from 'next/image';
import { CldImage } from 'next-cloudinary';
import { isCloudinaryUrl } from '@/lib/cloudinary';

interface SmartImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
  style?: React.CSSProperties;
}

/**
 * Cloudinary srcs render via CldImage (auto format/quality by default);
 * database images (/api/images/...), local paths, Unsplash, and data URLs
 * render via next/image. Local database images are set to unoptimized so they
 * are served directly from the database API with browser caching.
 */
export function SmartImage({
  src,
  alt,
  width,
  height,
  fill,
  className,
  sizes,
  priority,
  style,
}: SmartImageProps) {
  if (isCloudinaryUrl(src)) {
    return (
      <CldImage
        src={src}
        alt={alt}
        {...(width !== undefined ? { width } : {})}
        {...(height !== undefined ? { height } : {})}
        {...(fill ? { fill: true } : {})}
        {...(className ? { className } : {})}
        {...(sizes ? { sizes } : {})}
        {...(priority ? { priority: true } : {})}
        {...(style ? { style } : {})}
      />
    );
  }

  const isLocalApi = typeof src === 'string' && src.startsWith('/api/');
  const isDataUrl = typeof src === 'string' && src.startsWith('data:');

  return (
    <Image
      src={src}
      alt={alt}
      {...(width !== undefined ? { width } : {})}
      {...(height !== undefined ? { height } : {})}
      {...(fill ? { fill: true } : {})}
      {...(className ? { className } : {})}
      {...(sizes ? { sizes } : {})}
      {...(priority ? { priority: true } : {})}
      {...(style ? { style } : {})}
      unoptimized={isLocalApi || isDataUrl}
    />
  );
}
