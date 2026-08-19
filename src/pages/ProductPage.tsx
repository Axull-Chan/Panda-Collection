import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart } from "lucide-react";
import { useProducts } from "../context/ProductsContext";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { fetchProductBySlug } from "../lib/catalog";
import { formatIDR } from "../lib/currency";
import { EASE, pageVariants } from "../lib/motionVariants";
import { Image } from "../components/Image";
import type { Product } from "../types";

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart } = useCart();
  const { products } = useProducts();
  const { user } = useAuth();
  const { has, toggle } = useWishlist();

  const listed = products.find((p) => p.id === id);

  // Admin preview: unlisted slugs (drafts/archived) are fetched directly —
  // RLS only returns them to admins, so customers still see "not found".
  const [unlisted, setUnlisted] = useState<Product | null>(null);
  const [unlistedChecked, setUnlistedChecked] = useState(false);
  useEffect(() => {
    if (listed || !id) return;
    let cancelled = false;
    fetchProductBySlug(id).then((p) => {
      if (!cancelled) {
        setUnlisted(p);
        setUnlistedChecked(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id, listed]);

  const product = listed ?? unlisted ?? undefined;
  const isPreview = !!product && (product.status ?? "published") !== "published";

  // Every current variant shares one default colour ("One Colour") unless
  // the catalog actually offers a choice — only show the picker when there
  // is one to make.
  const colors = product?.variants
    ? [...new Set(product.variants.map((v) => v.color))]
    : [];
  const hasColorChoice = colors.length > 1;

  const stockFor = (size: string, color?: string) =>
    product?.variants
      ? product.variants
          .filter((v) => v.size === size && (color === undefined || v.color === color))
          .reduce((s, v) => s + v.stock, 0)
      : null;
  const soldOut = product?.variants ? product.variants.every((v) => v.stock === 0) : false;

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [added, setAdded] = useState(false);
  const [wishlistError, setWishlistError] = useState<string | null>(null);

  useEffect(() => {
    if (product && !selectedColor) {
      // Prefer a colour that's both in stock AND has its own photo, so the
      // page's first impression is always a real image — falls back to
      // "just in stock" only if every in-stock colour lacks a photo.
      const inStock = (c: string) => (stockFor(product.sizes[0] ?? "", c) ?? 1) > 0;
      const hasPhoto = (c: string) => product.images?.some((i) => i.color === c) ?? false;
      const best =
        colors.find((c) => inStock(c) && hasPhoto(c)) ?? colors.find(inStock) ?? colors[0] ?? "";
      setSelectedColor(best);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  useEffect(() => {
    if (product && !selectedSize) {
      const firstInStock =
        product.sizes.find((s) => (stockFor(s, selectedColor || undefined) ?? 1) > 0) ??
        product.sizes[0] ??
        "";
      setSelectedSize(firstInStock);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, selectedColor]);

  // The hero image swaps to whichever shot is tagged for the selected
  // colour (images are already sorted by sort_order, so this is that
  // colour's first/best shot). Deliberately no fallback to the product's
  // generic default image here: showing a different colour's photo reads
  // as "this is what you're buying," which is worse than being honest that
  // this specific colour doesn't have its own photo yet — the Image
  // component's own empty-src state renders that clearly instead.
  const displayImage = product?.images?.find((i) => i.color === selectedColor)?.url;

  if (!product && !listed && !unlistedChecked) {
    return <div className="min-h-svh" />;
  }

  if (!product) {
    return (
      <motion.div
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        className="mx-auto max-w-[1400px] px-6 pt-28 sm:pt-40 md:px-12"
      >
        <div className="py-20 text-center sm:py-32">
          <p className="label text-muted">Garment not found</p>
          <Link
            to="/collections"
            className="label mt-8 inline-block border border-ink px-8 py-4 transition-colors hover:bg-ink hover:text-bg"
          >
            Back to Collections
          </Link>
        </div>
      </motion.div>
    );
  }

  const selectedOut = (stockFor(selectedSize, selectedColor || undefined) ?? 1) === 0;

  const handleAddToCart = () => {
    if (soldOut || selectedOut || isPreview) return;
    addToCart(product.id, selectedSize, selectedColor || "One Colour");
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      className="mx-auto max-w-[1400px] px-6 pt-24 md:px-12 md:pt-32 lg:pt-36"
    >
      {isPreview && (
        <div className="mb-6 border border-line bg-panel/60 px-5 py-3">
          <p className="label text-muted">
            {(product.status ?? "draft").toUpperCase()} PREVIEW — visible only to
            administrators. Publish it from the admin to make it live.
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="label link-underline inline-flex items-center gap-2 py-2 -my-2 text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={13} strokeWidth={1.5} /> Back
      </button>

      <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-8 pb-20 sm:mt-10 sm:gap-y-12 sm:pb-32 lg:grid-cols-12">
        <motion.div
          className="lg:col-span-7"
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          <Image src={displayImage} alt={product.name} aspectRatio="3/4" priority />
        </motion.div>

        <motion.div
          className="lg:col-span-4 lg:col-start-9 lg:pt-8"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
        >
          <p className="label text-muted">
            {product.category}
            {product.badge ? ` — ${product.badge}` : ""}
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-[1.05] sm:mt-4 sm:text-5xl">
            {product.name}
          </h1>
          <p className="label mt-6">{formatIDR(product.price)}</p>

          <p className="mt-8 max-w-[400px] text-sm leading-relaxed text-muted">
            {product.description}
          </p>

          {hasColorChoice && (
            <div className="mt-10">
              <p className="label">Color — {selectedColor}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {colors.map((color) => {
                  const out = (stockFor(selectedSize, color) ?? 1) === 0;
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => !out && setSelectedColor(color)}
                      aria-pressed={selectedColor === color}
                      disabled={out}
                      className={`label h-12 border px-4 transition-colors duration-300 ${
                        out
                          ? "cursor-not-allowed border-line text-muted line-through opacity-50"
                          : selectedColor === color
                            ? "border-ink bg-ink text-bg"
                            : "border-line text-ink hover:border-ink"
                      }`}
                    >
                      {color}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-12">
            <p className="label">Size</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {product.sizes.map((size) => {
                const out = (stockFor(size, selectedColor || undefined) ?? 1) === 0;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => !out && setSelectedSize(size)}
                    aria-pressed={selectedSize === size}
                    disabled={out}
                    className={`label h-12 w-14 border transition-colors duration-300 ${
                      out
                        ? "cursor-not-allowed border-line text-muted line-through opacity-50"
                        : selectedSize === size
                          ? "border-ink bg-ink text-bg"
                          : "border-line text-ink hover:border-ink"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={soldOut || selectedOut || isPreview}
            className="label mt-12 h-14 w-full overflow-hidden border border-ink bg-ink text-bg transition-colors duration-300 hover:bg-transparent hover:text-ink disabled:pointer-events-none disabled:opacity-40"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={soldOut ? "out" : added ? "added" : "add"}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="block"
              >
                {soldOut
                  ? "Out of Stock"
                  : isPreview
                    ? "Preview Only"
                    : added
                      ? "Added to Cart"
                      : "Add to Cart"}
              </motion.span>
            </AnimatePresence>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!user) {
                navigate("/account/sign-in", { state: { from: location.pathname } });
                return;
              }
              // product.dbId is unset while the bundled fallback catalog is
              // still showing (before the live Supabase fetch resolves) —
              // toggle() needs the real product UUID for the FK insert, so
              // a click in that window silently no-ops otherwise.
              if (!product.dbId) return;
              setWishlistError(null);
              void toggle(product).then((err) => {
                if (err) setWishlistError(err);
              });
            }}
            disabled={!product.dbId}
            className="label mt-4 flex h-12 w-full items-center justify-center gap-2.5 border border-line transition-colors duration-300 hover:border-ink disabled:pointer-events-none disabled:opacity-40"
          >
            <Heart
              size={14}
              strokeWidth={1.5}
              className={has(product) ? "fill-ink" : ""}
            />
            {has(product) ? "Saved to Wishlist" : "Save to Wishlist"}
          </button>
          {wishlistError && (
            <p className="mt-3 text-xs leading-relaxed text-[#9c4a33]">{wishlistError}</p>
          )}

          <p className="mt-8 max-w-[400px] text-xs leading-relaxed text-muted">
            Each piece is made to keep. Complimentary repairs for the life of the
            garment; shipping and returns within 30 days.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
