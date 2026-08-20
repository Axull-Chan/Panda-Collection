import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useProducts } from "../context/ProductsContext";
import { supabase } from "../lib/supabase";
import { AuthCheckbox, AuthError, AuthField, AuthSubmit } from "../components/auth/AuthField";
import { Reveal } from "../components/Reveal";
import { Image } from "../components/Image";
import { formatIDR } from "../lib/currency";
import { pageVariants } from "../lib/motionVariants";

interface AppliedCoupon {
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  discountAmount: number;
}

type PaymentMethod = "midtrans" | "stripe";

const PAYMENT_METHODS: { id: PaymentMethod; label: string; disclaimer: string }[] = [
  {
    id: "midtrans",
    label: "Bank Transfer / E-Wallet / QRIS",
    disclaimer:
      "You'll complete payment securely via Midtrans — bank transfer, GoPay, OVO, DANA, or QRIS.",
  },
  {
    id: "stripe",
    label: "Card",
    disclaimer: "You'll complete payment securely via Stripe.",
  },
];

export function CheckoutPage() {
  const { profile, updateProfile } = useAuth();
  const { lines, subtotal } = useCart();
  const { products, source } = useProducts();

  const [fullName, setFullName] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [postal, setPostal] = useState("");
  const [country, setCountry] = useState("");
  const [saveAddress, setSaveAddress] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("midtrans");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const discount = appliedCoupon?.discountAmount ?? 0;
  const total = Math.max(0, subtotal - discount);

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

  const onApplyCoupon = async (e: FormEvent) => {
    e.preventDefault();
    const code = couponCode.trim();
    if (couponBusy || !code) return;
    setCouponBusy(true);
    setCouponError(null);

    // Server-side only: re-prices the cart and validates the coupon fresh
    // against the database. This is a preview — create-checkout-session
    // independently re-validates everything again at actual submission.
    const { data, error: fnError } = await supabase.functions.invoke("validate-coupon", {
      body: { code, lines },
    });
    setCouponBusy(false);

    if (fnError || !data?.valid) {
      let message = (data as { error?: string } | null)?.error;
      if (!message && fnError instanceof FunctionsHttpError) {
        try {
          message = (await fnError.context.json())?.error;
        } catch {
          // Non-JSON body — fall through to the generic message below.
        }
      }
      setCouponError(message ?? "Something went wrong applying your coupon. Please try again.");
      return;
    }

    setAppliedCoupon({
      code: data.code as string,
      discountType: data.discountType as "percent" | "fixed",
      discountValue: data.discountValue as number,
      discountAmount: data.discountAmount as number,
    });
    setCouponCode("");
  };

  const onRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
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

    if (saveAddress) await updateProfile({ address });

    // Both functions re-validate prices and stock server-side, create the
    // order as a draft, and start a hosted payment session — nothing is
    // charged and no order is marked paid until the gateway's own
    // signature-verified webhook confirms payment. Both return the same
    // { url } shape, so only which function gets called differs by method.
    const functionName =
      paymentMethod === "midtrans" ? "create-midtrans-transaction" : "create-checkout-session";
    const { data, error: fnError } = await supabase.functions.invoke(functionName, {
      body: {
        lines,
        address,
        couponCode: appliedCoupon?.code,
        origin: window.location.origin,
      },
    });

    if (fnError || !data?.url) {
      setBusy(false);
      // supabase-js doesn't parse the function's JSON body on a non-2xx
      // response — it only gives a generic FunctionsHttpError. The specific,
      // actionable message (sign-in required, out of stock, bad address...)
      // has to be read from the raw response it carries.
      let message = (data as { error?: string } | null)?.error;
      if (!message && fnError instanceof FunctionsHttpError) {
        try {
          message = (await fnError.context.json())?.error;
        } catch {
          // Non-JSON body — fall through to the generic message below.
        }
      }
      setError(message ?? "Something went wrong starting checkout. Please try again.");
      return;
    }

    // Full navigation to the gateway's hosted page — the cart is preserved
    // and only cleared once we land back on the success page.
    window.location.href = data.url as string;
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

            <div>
              <p className="label">Payment Method</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    aria-pressed={paymentMethod === method.id}
                    disabled={busy}
                    className={`label h-12 border px-4 transition-colors duration-300 disabled:pointer-events-none disabled:opacity-50 ${
                      paymentMethod === method.id
                        ? "border-ink bg-ink text-bg"
                        : "border-line text-ink hover:border-ink"
                    }`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            <AuthError message={error} />
            <AuthSubmit busy={busy}>
              {busy ? "Redirecting to Payment" : "Continue to Payment"}
            </AuthSubmit>
            <p className="text-xs leading-relaxed text-muted">
              {PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.disclaimer} Each
              piece is made to keep — complimentary repairs for the life of the garment.
            </p>
          </form>
        </Reveal>

        {/* Order summary */}
        <Reveal delay={0.1} className="lg:col-span-5 lg:col-start-8">
          <p className="label border-b border-line pb-4">Your Order</p>
          <div>
            {cartProducts.map(({ line, product }) => {
              if (!product) return null;
              // No fallback to product.image: a different colour's photo
              // in the order summary would misrepresent what's being paid for.
              const image = product.images?.find((i) => i.color === line.color)?.url;
              return (
                <div
                  key={`${line.productId}-${line.size}-${line.color}`}
                  className="flex items-center gap-5 border-b border-line py-5"
                >
                  <Image src={image} alt={product.name} className="h-20 w-[60px] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-lg leading-tight">{product.name}</p>
                    <p className="label mt-1 text-muted">
                      {line.color !== "One Colour" ? `${line.color} · ` : ""}Size {line.size} · Qty{" "}
                      {line.quantity}
                    </p>
                  </div>
                  <p className="label shrink-0">{formatIDR(product.price * line.quantity)}</p>
                </div>
              );
            })}
          </div>

          {/* Coupon */}
          <div className="border-b border-line py-6">
            {appliedCoupon ? (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="label">{appliedCoupon.code} applied</p>
                  <p className="label mt-1.5 text-muted">
                    {appliedCoupon.discountType === "percent"
                      ? `${appliedCoupon.discountValue}% off`
                      : `${formatIDR(appliedCoupon.discountValue)} off`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onRemoveCoupon}
                  className="label link-underline shrink-0 text-muted"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={onApplyCoupon} className="flex items-end gap-3" noValidate>
                <div className="flex-1">
                  <label htmlFor="coupon-code" className="label text-muted">
                    Coupon Code
                  </label>
                  <input
                    id="coupon-code"
                    type="text"
                    autoComplete="off"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    disabled={couponBusy}
                    aria-describedby={couponError ? "coupon-error" : undefined}
                    className="h-10 w-full border-b border-line bg-transparent text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none disabled:opacity-50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={couponBusy || !couponCode.trim()}
                  className="label h-10 shrink-0 border border-ink px-5 transition-colors duration-300 hover:bg-ink hover:text-bg disabled:pointer-events-none disabled:opacity-40"
                >
                  {couponBusy ? "Applying…" : "Apply"}
                </button>
              </form>
            )}
            {couponError && (
              <p id="coupon-error" role="alert" className="mt-4 text-xs leading-relaxed text-[#9c4a33]">
                {couponError}
              </p>
            )}
          </div>

          <div className="flex justify-between pt-6">
            <span className="label text-muted">Subtotal</span>
            <span className="label">{formatIDR(subtotal)}</span>
          </div>
          <div className="mt-3 flex justify-between">
            <span className="label text-muted">Shipping</span>
            <span className="label text-muted">Calculated on dispatch</span>
          </div>
          {appliedCoupon && (
            <div className="mt-3 flex justify-between">
              <span className="label text-muted">Discount</span>
              <span className="label">−{formatIDR(discount)}</span>
            </div>
          )}
          <div className="mt-6 flex justify-between border-t border-line pt-6">
            <span className="label">Total</span>
            <span className="label">{formatIDR(total)}</span>
          </div>
        </Reveal>
      </div>
    </motion.div>
  );
}
