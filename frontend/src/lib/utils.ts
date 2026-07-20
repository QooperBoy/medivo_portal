import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Łączy klasy Tailwind z rozwiązywaniem konfliktów (ostatnia wygrywa).
 * Używane przez cały design system.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
