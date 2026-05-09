'use client';

const FALLBACK = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=60';

export function ClientImage({
  src, alt, className, style,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={(e) => {
        (e.target as HTMLImageElement).src = FALLBACK;
      }}
    />
  );
}
