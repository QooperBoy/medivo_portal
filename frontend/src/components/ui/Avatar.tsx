import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface AvatarProps {
  /** URL zdjęcia (mock: i.pravatar.cc). Brak → inicjały z `alt`. */
  src?: string | null;
  /** Nazwa/tekst alternatywny (używany też do inicjałów). */
  alt: string;
  /** Rozmiar w px (kwadrat). Domyślnie 48. */
  size?: number;
  className?: string;
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

/**
 * Okrągły awatar. Ze zdjęciem używa next/image; bez — pokazuje inicjały
 * (fallback dostępny jako role="img" z aria-label).
 */
export function Avatar({ src, alt, size = 48, className }: AvatarProps) {
  const hasImage = Boolean(src);

  return (
    <span
      role={hasImage ? undefined : 'img'}
      aria-label={hasImage ? undefined : alt}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 font-semibold text-brand-800',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {hasImage ? (
        <Image
          src={src as string}
          alt={alt}
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{initialsFrom(alt)}</span>
      )}
    </span>
  );
}
