import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useProducts } from "../context/ProductsContext";
import { createOrder, orderNumber } from "../lib/orders";
import { AuthCheckbox, AuthError, AuthField, AuthSubmit } from "../components/auth/AuthField";
import { Reveal } from "../components/Reveal";
import { pageVariants } from "../lib/motionVariants";

export function CheckoutPage() {
  const { user, profile, updateProfile } = useAuth();
  const { lines, subtotal, clearCart } = useCart();
  const { products, source } = useProducts();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [postal, setPostal] = useState("");
  const [country, setCountry] = useState("");
  const [saveAddress, setSaveAddress] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName((v) => v || (profile.full_name ?? ""));
      const a = profile.address;
      if (a) {
        setLine1((v) => v || (a.line1 ?? ""));
        setLine2((v) => v || (a.line2 ?? ""));
        setCity((v) => v || (a.city ?? ""));
        setPostal((v) => v || (a.postal_code ?? ""));
        setCountry((v) => v || (a.country ?? ""));
      }
    }
  }, [profile]);

  const cartProducts = lines.map((line) => ({
    line,
    product: products.find((p) => p.id === line.productId),
  }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !user) return;
    if (!line1.trim() || !city.trim() || !postal.trim() || !country.trim()) {
      setError("Please fill in your shipping address.");
      return;
    }
    if (source !== "database") {
      setError("The catalog is still loading — please try again in a moment.");
      return;
    }
    setBusy(true);
    setError(null);

    const address = {
      line1: line1.trim(),
      line2: line2.trim() || undefined,
      city: city.trim(),
      postal_code: postal.trim(),
      country: country.trim(),
    };

    const result = await createOrder(user, lines, products, address);
    if ("error" in result) {
      setBusy(false);
      setError(result.error);
      return;
    }

    if (saveAddress) await updateProfile({ address });
    clearCart();
    navigate(`/account/orders?placed=${orderNumber(result.orderId)}`, { replace: true });
  };

  if (lines.length === 0) {
    return (
      <motion.div
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        className="mx-auto max-w-[1400px] px-6 pb-20 pt-28 md:px-12 md:pt-36 lg:pt-48"
      >
        <p className="label text-muted">Checkout</p>
        <h1 className="mt-4 font-serif text-5xl leading-[1.02] md:text-6xl">Checkout</h1>
        <div className="py-20 text-center sm:py-28">
          <p className="label text-muted">Your cart is empty</p>
          <Link
            to="/collections"
            className="label mt-8 inline-block border border-ink px-8 py-4 transition-colors duration-300 hover:bg-ink hover:text-bg"
          >
            Explore Collection
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      className="mx-auto max-w-[1400px] px-6 pb-20 pt-28 sm:pb-32 md:px-12 md:pt-36 lg:pt-48"
    >
      <Reveal>
        <p className="label text-muted">Almost there</p>
        <h1 className="mt-4 font-serif text-5xl leading-[1.02] md:text-6xl">Checkout</h1>
      </Reveal>

      <div className="mt-12 grid grid-cols-1 gap-x-8 gap-y-14 sm:mt-16 lg:grid-cols-12">
        {/* Shipping address */}
        <Reveal className="lg:col-span-6">
          <form onSubmit={onSubmit} className="space-y-8" noValidate>
            <p className="label border-b border-line pb-4">Shipping Address</p>
            <AuthField
              label="Full Name"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={busy}
            />
            <AuthField
              label="Address Line 1"
              type="text"
              autoComplete="address-line1"
              required
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              disabled={busy}
            />
            <AuthField
              label="Address Line 2 (optional)"
              type="text"
              autoComplete="address-line2"
              value={line2}
              onChange={(e) => setLine2(e.target.value)}
              disabled={busy}
            />
            <div className="grid grid-cols-2 gap-6">
              <AuthField
                label="City"
                type="text"
                autoComplete="address-level2"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={busy}
              />
              <AuthField
                label="Postal Code"
                type="text"
                autoComplete="postal-code"
                required
                value={postal}
                onChange={(e) => setPostal(e.target.value)}
                disabled={busy}
              />
            </div>
            <AuthField
              label="Country"
              type="text"
              autoComplete="country-name"
              required
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              disabled={busy}
            />
            <AuthCheckbox
              id="save-address"
              label="Save this address to my profile"
              checked={saveAddress}
              onChange={setSaveAddress}
            />
            <AuthError message={error} />
            <AuthSubmit busy={busy}>{busy ? "Placing order" : "Place Order"}</AuthSubmit>
            <p className="text-xs leading-relaxed text-muted">
              Payment is collected on dispatch. Each piece is made to keep —
              complimentary repairs for the life of the garment.
            </p>
          </form>
        </Reveal>

        {/* Order summary */}
        <Reveal delay={0.1} className="lg:col-span-5 lg:col-start-8">
          <p className="label border-b border-line pb-4">Your Order</p>
          <div>
            {cartProducts.map(({ line, product }) =>
              product ? (
                <div
                  key={`${line.productId}-${line.size}`}
                  className="flex items-center gap-5 border-b border-line py-5"
                >
                  <div className="h-20 w-[60px] shrink-0 overflow-hidden bg-panel">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-lg leading-tight">{product.name}</p>
                    <p className="label mt-1 text-muted">
                      Size {line.size} · Qty {line.quantity}
                    </p>
                  </div>
                  <p className="label shrink-0">${product.price * line.quantity}</p>
                </div>
              ) : null
            )}
          </div>
          <div className="flex justify-between pt-6">
            <span className="label text-muted">Subtotal</span>
            <span className="label">${subtotal}</span>
          </div>
          <div className="mt-3 flex justify-between">
            <span className="label text-muted">Shipping</span>
            <span className="label text-muted">Calculated on dispatch</span>
          </div>
          <div className="mt-6 flex justify-between border-t border-line pt-6">
            <span className="label">Total</span>
            <span className="label">${subtotal}</span>
          </div>
        </Reveal>
      </div>
    </motion.div>
  );
}
