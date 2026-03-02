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
