import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Reveal } from "../components/Reveal";
import { pageVariants } from "../lib/motionVariants";

/**
 * Landing page when a customer backs out of Stripe Checkout. Nothing was
 * ever charged, and the cart was never touched — the draft order left
 * behind is released automatically by the checkout.session.expired webhook
 * once the Stripe session times out, with no action needed here.
 */
export function CheckoutCancelledPage() {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      className="mx-auto max-w-[1400px] px-6 pb-20 pt-28 md:px-12 md:pt-36 lg:pt-48"
    >
      <Reveal>
        <p className="label text-muted">Checkout</p>
        <h1 className="mt-4 font-serif text-5xl leading-[1.02] md:text-6xl">
          Payment Cancelled
        </h1>
        <p className="mt-6 max-w-[460px] text-sm leading-relaxed text-muted">
          No charge was made, and your cart is exactly as you left it.
        </p>
      </Reveal>

      <div className="mt-12 flex flex-wrap gap-4 sm:mt-16">
        <Link
          to="/checkout"
          className="label border border-ink px-8 py-4 transition-colors duration-300 hover:bg-ink hover:text-bg"
        >
          Return to Checkout
        </Link>
        <Link
          to="/cart"
          className="label border border-line px-8 py-4 transition-colors duration-300 hover:border-ink"
        >
          View Cart
        </Link>
      </div>
    </motion.div>
  );
}
