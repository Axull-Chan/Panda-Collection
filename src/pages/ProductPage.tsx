import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart } from "lucide-react";
import { useProducts } from "../context/ProductsContext";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { fetchProductBySlug } from "../lib/catalog";
import { EASE, pageVariants } from "../lib/motionVariants";
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

  const stockFor = (size: string) =>
    product?.variants
      ? product.variants.filter((v) => v.size === size).reduce((s, v) => s + v.stock, 0)
      : null;
  const soldOut = product?.variants ? product.variants.every((v) => v.stock === 0) : false;

  const [selectedSize, setSelectedSize] = useState("");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (product && !selectedSize) {
      const firstInStock =
        product.sizes.find((s) => (stockFor(s) ?? 1) > 0) ?? product.sizes[0] ?? "";
      setSelectedSize(firstInStock);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

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

  const selectedOut = (stockFor(selectedSize) ?? 1) === 0;

  const handleAddToCart = () => {
    if (soldOut || selectedOut || isPreview) return;
    addToCart(product.id, selectedSize);
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
          <div className="aspect-[3/4] overflow-hidden bg-panel">
            <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
          </div>
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
          <p className="label mt-6">${product.price}</p>
          <p className="label mt-2 text-muted">
            Numbered edition of {product.edition} — No. {product.releaseIndex}
          </p>

          <p className="mt-8 max-w-[400px] text-sm leading-relaxed text-muted">
            {product.description}
          </p>

          <div className="mt-12">
            <p className="label">Size</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {product.sizes.map((size) => {
                const out = (stockFor(size) ?? 1) === 0;
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
              void toggle(product);
            }}
            className="label mt-4 flex h-12 w-full items-center justify-center gap-2.5 border border-line transition-colors duration-300 hover:border-ink"
          >
            <Heart
              size={14}
              strokeWidth={1.5}
              className={has(product) ? "fill-ink" : ""}
            />
            {has(product) ? "Saved to Wishlist" : "Save to Wishlist"}
          </button>

          <p className="mt-8 max-w-[400px] text-xs leading-relaxed text-muted">
            Each piece is made to keep. Complimentary repairs for the life of the
            garment; shipping and returns within 30 days.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
