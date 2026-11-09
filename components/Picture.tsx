type PictureProps = {
  /** Basisname in /public/images, z. B. "hero-window" */
  name: string;
  /** Verfügbare Breiten (müssen von scripts/optimize-images.mjs erzeugt sein) */
  widths: number[];
  /** Seitenverhältnis-Angaben der größten Variante (verhindert Layout-Verschiebung) */
  width: number;
  height: number;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  style?: React.CSSProperties;
};

/** <picture> mit AVIF und WebP in mehreren Breiten. */
export function Picture({ name, widths, width, height, alt, sizes, className, priority, style }: PictureProps) {
  const set = (ext: string) => widths.map((w) => `/images/${name}-${w}.${ext} ${w}w`).join(", ");
  const largest = widths[widths.length - 1];
  return (
    <picture>
      <source type="image/avif" srcSet={set("avif")} sizes={sizes} />
      <source type="image/webp" srcSet={set("webp")} sizes={sizes} />
      <img
        src={`/images/${name}-${largest}.webp`}
        width={width}
        height={height}
        alt={alt}
        className={className}
        style={style}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        // @ts-expect-error – fetchPriority ist gültiges HTML, React-Typen hinken teils hinterher
        fetchpriority={priority ? "high" : undefined}
      />
    </picture>
  );
}
