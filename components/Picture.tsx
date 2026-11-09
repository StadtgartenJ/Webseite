type ArtSource = {
  name: string;
  widths: number[];
  /** Media-Query, für die diese Bildvariante gilt */
  media: string;
  sizes: string;
  width: number;
  height: number;
};

type PictureProps = {
  /** Basisname in /public/images, z. B. "hero-wide" */
  name: string;
  /** Verfügbare Breiten (müssen von scripts/optimize-images.mjs erzeugt sein) */
  widths: number[];
  /** Maße der größten Variante (verhindert Layout-Verschiebung) */
  width: number;
  height: number;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  /** Optionale eigene Bildvariante, z. B. ein Hochformat-Ausschnitt fürs Handy */
  art?: ArtSource;
};

const srcSet = (name: string, widths: number[], ext: string) =>
  widths.map((w) => `/images/${name}-${w}.${ext} ${w}w`).join(", ");

/** <picture> mit AVIF und WebP in mehreren Breiten, optional mit Art-Direction. */
export function Picture({ name, widths, width, height, alt, sizes, className, priority, art }: PictureProps) {
  const largest = widths[widths.length - 1];
  return (
    <picture>
      {art ? (
        <>
          <source media={art.media} type="image/avif" srcSet={srcSet(art.name, art.widths, "avif")} sizes={art.sizes} width={art.width} height={art.height} />
          <source media={art.media} type="image/webp" srcSet={srcSet(art.name, art.widths, "webp")} sizes={art.sizes} width={art.width} height={art.height} />
        </>
      ) : null}
      <source type="image/avif" srcSet={srcSet(name, widths, "avif")} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet(name, widths, "webp")} sizes={sizes} />
      <img
        src={`/images/${name}-${largest}.webp`}
        width={width}
        height={height}
        alt={alt}
        className={className}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        // @ts-expect-error – fetchPriority ist gültiges HTML, React-Typen hinken teils hinterher
        fetchpriority={priority ? "high" : undefined}
      />
    </picture>
  );
}
