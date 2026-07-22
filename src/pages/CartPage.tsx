import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../context/CartContext";
import { useProducts } from "../context/ProductsContext";
import { useAuth } from "../context/AuthContext";
import { EASE, pageVariants } from "../lib/motionVariants";

export function CartPage() {
  const { lines, updateQuantity, removeLine, subtotal } = useCart();
  const { products } = useProducts();
  const { user } = useAuth();
  const navigate = useNavigate();

  const onCheckout = () => {
    if (user) navigate("/checkout");
    else navigate("/account/sign-in", { state: { from: "/checkout" } });
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      className="mx-auto max-w-[1400px] px-6 pt-28 md:px-12 md:pt-36 lg:pt-48"
    >
      <p className="label text-muted">Your Selection</p>
      <h1 className="mt-4 font-serif text-5xl leading-[1.02] sm:mt-6 md:text-6xl lg:text-7xl">
        Cart
      </h1>

      {lines.length === 0 ? (
        <div className="py-20 text-center sm:py-32">
          <p className="label text-muted">Your cart is empty</p>
          <Link
            to="/collections"
            className="label mt-8 inline-block border border-ink px-8 py-4 transition-colors duration-300 hover:bg-ink hover:text-bg"
          >
            Explore Collection
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-x-8 pb-20 sm:mt-16 sm:pb-32 lg:grid-cols-12">
          <div className="border-t border-line lg:col-span-8">
            <AnimatePresence initial={false}>
              {lines.map((line) => {
                const product = products.find((p) => p.id === line.productId);
                if (!product) return null;
                return (
                  <motion.div
                    key={`${line.productId}-${line.size}`}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="overflow-hidden border-b border-line"
                  >
                    <div className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:gap-6 sm:py-8 md:gap-8">
                      <div className="flex gap-4 sm:contents">
                        <Link
                          to={`/product/${product.id}`}
                          className="h-24 w-[72px] shrink-0 overflow-hidden bg-panel sm:h-32 sm:w-24"
                        >
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        </Link>

                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/product/${product.id}`}
                            className="font-serif text-lg leading-tight transition-colors hover:text-muted sm:text-2xl"
                          >
                            {product.name}
                          </Link>
                          <p className="label mt-1.5 text-muted sm:mt-2">Size {line.size}</p>
                          <p className="label mt-1.5 sm:mt-2">${product.price}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:contents">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(line.productId, line.size, line.quantity - 1)
                            }
                            className="h-9 w-9 border border-line text-sm transition-colors hover:border-ink"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="label w-6 text-center">{line.quantity}</span>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(line.productId, line.size, line.quantity + 1)
                            }
                            className="h-9 w-9 border border-line text-sm transition-colors hover:border-ink"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeLine(line.productId, line.size)}
                          className="label link-underline text-muted transition-colors hover:text-ink"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <div className="mt-10 lg:col-span-3 lg:col-start-10 lg:mt-0">
            <div className="border-t border-line pt-8">
              <div className="flex justify-between">
                <span className="label text-muted">Subtotal</span>
                <motion.span
                  key={subtotal}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="label"
                >
                  ${subtotal}
                </motion.span>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted">
                Shipping and duties calculated at checkout.
              </p>
              <button
                type="button"
                onClick={onCheckout}
                className="label mt-8 h-14 w-full border border-ink bg-ink text-bg transition-colors duration-300 hover:bg-transparent hover:text-ink"
              >
                Checkout
              </button>
              {!user && (
                <p className="mt-4 text-xs leading-relaxed text-muted">
                  You'll be asked to sign in before placing your order.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
