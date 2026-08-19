import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useProducts } from "../context/ProductsContext";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { Reveal } from "../components/Reveal";
import { Image } from "../components/Image";
import { formatIDR } from "../lib/currency";
import { pageVariants } from "../lib/motionVariants";
import type { Product } from "../types";

function WishlistCard({ product, index }: { product: Product; index: number }) {
  const { remove } = useWishlist();
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  const defaultSize = product.sizes[0];
  const defaultColor = product.variants?.[0]?.color ?? "One Colour";

  const onAdd = () => {
    if (!defaultSize) return;
    addToCart(product.id, defaultSize, defaultColor);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <Reveal delay={(index % 3) * 0.08}>
      <div className="group">
        <Link to={`/product/${product.id}`} className="block">
          <Image src={product.image} alt={product.name} aspectRatio="3/4" hoverZoom>
            <div className="pointer-events-none absolute inset-0 bg-ink/0 transition-colors duration-500 group-hover:bg-ink/10" />
          </Image>
        </Link>
        <div className="mt-3 sm:mt-5">
          <Link to={`/product/${product.id}`} className="block">
            <h3 className="font-serif text-base leading-tight sm:text-2xl">{product.name}</h3>
          </Link>
          <p className="label mt-1.5 sm:mt-2">{formatIDR(product.price)}</p>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 sm:mt-4 sm:pt-4">
            <button type="button" onClick={onAdd} className="label link-underline text-left">
              {added ? `Added — Size ${defaultSize}` : "Add to Cart"}
            </button>
            <button
              type="button"
              onClick={() => product.dbId && remove(product.dbId)}
              className="label link-underline text-muted transition-colors hover:text-ink"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export function WishlistPage() {
  const { products } = useProducts();
  const { ids, loading } = useWishlist();
  const saved = products.filter((p) => p.dbId && ids.has(p.dbId));

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      className="mx-auto max-w-[1400px] px-6 pb-20 pt-28 sm:pb-32 md:px-12 md:pt-36 lg:pt-48"
    >
      <Reveal>
        <p className="label text-muted">My Account</p>
        <h1 className="mt-4 font-serif text-5xl leading-[1.02] md:text-6xl">Wishlist</h1>
        <p className="mt-4 max-w-[420px] text-sm leading-relaxed text-muted sm:mt-6">
          {saved.length === 0
            ? "Pieces you love will gather here."
            : `${saved.length} ${saved.length === 1 ? "piece" : "pieces"} saved.`}
        </p>
      </Reveal>

      <div className="mt-12 sm:mt-16">
        {!loading && saved.length === 0 ? (
          <div className="flex flex-col items-start gap-5 border-t border-line pt-10 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 text-muted">
              <Heart size={16} strokeWidth={1.5} />
              <p className="text-sm leading-relaxed">
                Nothing saved yet. Tap the heart on any garment to keep it here.
              </p>
            </div>
            <Link to="/collections" className="label link-underline shrink-0">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-14 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-20">
              {saved.map((product, i) => (
                <WishlistCard key={product.id} product={product} index={i} />
              ))}
            </div>
            <Link
              to="/collections"
              className="label link-underline mt-14 inline-block sm:mt-20"
            >
              Continue Shopping
            </Link>
          </>
        )}
      </div>
    </motion.div>
  );
}
