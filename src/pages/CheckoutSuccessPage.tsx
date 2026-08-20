import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useCart } from "../context/CartContext";
import { fetchOrderById, fetchOrderBySessionId, orderNumber, type OrderRecord } from "../lib/orders";
import { OrderBlock } from "./OrdersPage";
import { Reveal } from "../components/Reveal";
import { pageVariants } from "../lib/motionVariants";

const POLL_INTERVAL_MS = 1200;
const MAX_POLLS = 8; // ~10 seconds

/**
 * Landing page after a successful payment redirect — Stripe or Midtrans.
 * Stripe returns `session_id` (looked up via stripe_session_id); Midtrans's
 * finish redirect carries `order_id`, which is this table's id directly
 * (see create-midtrans-transaction). Arrival here means the gateway already
 * confirmed payment client-side, so the cart clears immediately; the order
 * itself is written by the signature-verified webhook, which is usually
 * near-instant but is polled for briefly in case it hasn't landed yet by
 * the time the browser gets here.
 */
export function CheckoutSuccessPage() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const orderId = params.get("order_id");
  const { clearCart } = useCart();
  const clearedRef = useRef(false);

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!clearedRef.current) {
      clearedRef.current = true;
      clearCart();
    }
  }, [clearCart]);

  useEffect(() => {
    if (!sessionId && !orderId) return;
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      const found = sessionId ? await fetchOrderBySessionId(sessionId) : await fetchOrderById(orderId!);
      if (cancelled) return;
      if (found && found.payment_status === "paid") {
        setOrder(found);
        return;
      }
      attempts += 1;
      if (attempts >= MAX_POLLS) {
        setTimedOut(true);
        return;
      }
      setTimeout(poll, POLL_INTERVAL_MS);
    };
    void poll();

    return () => {
      cancelled = true;
    };
  }, [sessionId, orderId]);

  if (!sessionId && !orderId) {
    return (
      <motion.div
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        className="mx-auto max-w-[1400px] px-6 pb-20 pt-28 md:px-12 md:pt-36 lg:pt-48"
      >
        <p className="label text-muted">Checkout</p>
        <h1 className="mt-4 font-serif text-5xl leading-[1.02] md:text-6xl">Nothing here yet</h1>
        <div className="py-20 text-center sm:py-28">
          <p className="label text-muted">This page follows a completed payment</p>
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
        <p className="label text-muted">Thank You</p>
        <h1 className="mt-4 font-serif text-5xl leading-[1.02] md:text-6xl">
          Your Order is Confirmed
        </h1>
        <p className="mt-6 max-w-[460px] text-sm leading-relaxed text-muted">
          {order
            ? `Order ${orderNumber(order.id)} has been placed. A confirmation will follow by email.`
            : "Payment received — we're finalizing your order now."}
        </p>
      </Reveal>

      <div className="mt-12 max-w-[860px] sm:mt-16">
        {order ? (
          <OrderBlock order={order} />
        ) : timedOut ? (
          <p className="label text-muted">
            This is taking a little longer than usual — your order will appear in your
            account shortly.
          </p>
        ) : (
          <p className="label text-muted">Finalizing your order…</p>
        )}
      </div>

      <div className="mt-14 flex flex-wrap gap-x-8 gap-y-3 sm:mt-20">
        <Link to="/account/orders" className="label link-underline">
          View Orders
        </Link>
        <Link to="/collections" className="label link-underline text-muted">
          Continue Shopping
        </Link>
      </div>
    </motion.div>
  );
}
