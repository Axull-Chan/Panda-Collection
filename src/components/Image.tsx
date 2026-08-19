import { useCallback, useState, type ReactNode } from "react";
import { ImageOff } from "lucide-react";

export interface ImageProps {
  src?: string | null;
  alt: string;
  /** e.g. "3/4" — omit for natural/intrinsic sizing (e.g. a masonry gallery). */
  aspectRatio?: string;
  fit?: "cover" | "contain";
  objectPosition?: string;
  /** Applies the site's card hover-zoom. Requires a `group` ancestor. */
  hoverZoom?: boolean;
  /** Skips lazy-loading for above-the-fold images. */
  priority?: boolean;
  /** Classes for the outer wrapper — sizing overrides, etc. */
  className?: string;
  /** Extra classes for the <img> itself, for one-off hover effects. */
  imgClassName?: string;
  /** Overlay content (e.g. a "Primary" badge) rendered inside the wrapper. */
  children?: ReactNode;
}

/**
 * Standard image renderer: never shows the browser's broken-image icon (an
 * empty/failing src falls back to a muted glyph instead), fades in on load
 * rather than popping in, and defers off-screen images unless `priority`.
 */
export function Image({
  src,
  alt,
  aspectRatio,
  fit = "cover",
  objectPosition,
  hoverZoom,
  priority,
  className = "",
  imgClassName = "",
  children,
}: ImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(src ? "loading" : "error");

  // Reset status when `src` changes — adjusted during render (React's
  // documented pattern for this) rather than in a useEffect, since an
  // effect fires after every mount too, which would otherwise clobber the
  // ref callback below the moment it marks a cache-hot image as loaded.
  const [trackedSrc, setTrackedSrc] = useState(src);
  if (src !== trackedSrc) {
    setTrackedSrc(src);
    setStatus(src ? "loading" : "error");
  }

  // `load`/`error` don't bubble, and lazy-loaded images in particular can
  // finish (or fail) well after mount — relying on React's onLoad/onError
  // props here proved unreliable, leaving fully-loaded images stuck at
  // opacity: 0 forever. Attaching native listeners directly to the node
  // avoids that entirely; the immediate `.complete` check still covers the
  // case where the image was already cached before this even ran.
  const attachLoadListeners = useCallback((node: HTMLImageElement | null) => {
    if (!node) return;
    if (node.complete && node.naturalWidth > 0) {
      setStatus("loaded");
      return;
    }
    const onLoad = () => setStatus("loaded");
    const onError = () => setStatus("error");
    node.addEventListener("load", onLoad);
    node.addEventListener("error", onError);
    return () => {
      node.removeEventListener("load", onLoad);
      node.removeEventListener("error", onError);
    };
  }, []);

  // Natural-sizing mode (no aspectRatio — e.g. the masonry gallery) has
  // nothing to give the wrapper a height once the <img> is gone, so the
  // error state falls back to a sensible box instead of collapsing to 0.
  const boxRatio = aspectRatio ?? (status === "error" ? "3/4" : undefined);

  return (
    <div
      className={`relative overflow-hidden bg-panel ${className}`}
      style={boxRatio ? { aspectRatio: boxRatio } : undefined}
    >
      {status !== "error" && src && (
        <img
          // A ref callback only fires on mount/unmount — when `src` changes
          // on an already-mounted <img> (e.g. switching colour on the same
          // product, or navigating product-to-product without the page
          // remounting), React just updates the attribute in place and the
          // callback never re-runs, so the new image's load event is never
          // listened for and it stays stuck at opacity: 0 forever. Keying
          // on `src` forces a fresh node — and a fresh ref call — per image.
          key={src}
          ref={attachLoadListeners}
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          // Opacity is set inline (a plain numeric 0/1) rather than via a
          // Tailwind opacity-* class, which compiles to percentage syntax
          // (`opacity: 100%`) — deliberate, since it's toggled dynamically
          // per load state rather than being a fixed design-time value.
          style={{
            opacity: status === "loaded" ? 1 : 0,
            ...(objectPosition ? { objectPosition } : undefined),
          }}
          className={`${aspectRatio ? "h-full w-full" : "w-full"} ${
            aspectRatio ? (fit === "contain" ? "object-contain" : "object-cover") : ""
          } transition-all duration-700 ease-out ${
            hoverZoom ? "group-hover:scale-[1.03]" : ""
          } ${imgClassName}`}
        />
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageOff size={20} strokeWidth={1.25} className="text-muted/60" aria-hidden="true" />
          {alt && <span className="sr-only">{alt}</span>}
        </div>
      )}
      {children}
    </div>
  );
}
