import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DEFAULT_IMAGE = 'https://picsum.photos/seed/placeholder/800/600';

export function imgSrc(src?: string) {
  if (!src) return DEFAULT_IMAGE;
  const s = String(src).trim();
  return s.length > 0 ? s : DEFAULT_IMAGE;
}

const RESPONSIVE_WIDTHS = [320, 375, 414, 480, 768, 1024, 1280, 1440, 1920];

const isPicsum = (url: URL) => url.hostname.includes('picsum.photos');

const buildPicsumSrcSet = (url: URL) => {
  const match = url.pathname.match(/\/(\d+)\/(\d+)(?:\/)?$/);
  if (!match) return '';

  const originalW = Number(match[1]);
  const originalH = Number(match[2]);
  if (!Number.isFinite(originalW) || !Number.isFinite(originalH) || originalW <= 0 || originalH <= 0) return '';

  const ratio = originalH / originalW;
  return RESPONSIVE_WIDTHS.map((w) => {
    const h = Math.max(1, Math.round(w * ratio));
    const pathname = url.pathname.replace(/\/\d+\/\d+(?:\/)?$/, `/${w}/${h}`);
    return `${url.origin}${pathname}${url.search} ${w}w`;
  }).join(', ');
};

export function responsiveImageProps(
  src?: string,
  opts?: {
    kind?: 'card' | 'hero' | 'cover';
    lazy?: boolean;
  },
) {
  const resolved = imgSrc(src);
  const kind = opts?.kind || 'card';
  const sizes =
    kind === 'hero'
      ? '100vw'
      : kind === 'cover'
        ? '(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw'
        : '(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 25vw';
  const loading: 'lazy' | 'eager' = opts?.lazy === false ? 'eager' : 'lazy';

  let srcSet: string | undefined;
  try {
    const u = new URL(resolved, 'https://local.joestore');
    if (isPicsum(u)) {
      const generated = buildPicsumSrcSet(u);
      if (generated) srcSet = generated;
    }
  } catch {
    srcSet = undefined;
  }

  return {
    src: resolved,
    srcSet,
    sizes,
    loading,
    decoding: 'async' as const,
  };
}
