import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Package } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  fetchOrders,
  formatOrderDate,
  formatStatus,
  orderNumber,
  type OrderRecord,
} from "../lib/orders";
import { Reveal } from "../components/Reveal";
import { Image } from "../components/Image";
import { formatIDR } from "../lib/currency";
import { pageVariants } from "../lib/motionVariants";

function orderImage(item: OrderRecord["order_items"][number]) {
  const images = item.products?.product_images ?? [];
  return images.find((i) => i.is_primary)?.url ?? images[0]?.url ?? null;
}

export function OrderBlock({ order }: { order: OrderRecord }) {
  return (
    <article className="border border-line">
      <header className="flex flex-col gap-3 border-b border-line px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <p className="label">{orderNumber(order.id)}</p>
          <p className="label mt-1.5 text-muted">{formatOrderDate(order.created_at)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <span className="label text-muted">
            {order.payment_provider === "midtrans" ? "Midtrans" : "Stripe"}
          </span>
          <span className="label text-muted">· {formatStatus(order.status)}</span>
          <span className="label text-muted">· {formatStatus(order.payment_status)}</span>
          <span className="label text-muted">· {formatStatus(order.shipping_status)}</span>
          <span className="label sm:ml-3">{formatIDR(order.total)}</span>
        </div>
      </header>
      <div className="px-5 sm:px-8">
        {order.order_items.map((item) => {
          const img = orderImage(item);
          const slug = item.products?.slug;
          const media = (
            <Image
              src={img}
              alt={item.product_name}
              className="h-20 w-[60px] shrink-0"
            />
          );
          return (
            <div
              key={item.id}
              className="flex items-center gap-5 border-b border-line py-5 last:border-b-0"
            >
              {slug ? <Link to={`/product/${slug}`}>{media}</Link> : media}
              <div className="min-w-0 flex-1">
                {slug ? (
                  <Link
                    to={`/product/${slug}`}
                    className="truncate font-serif text-lg leading-tight transition-colors hover:text-muted"
                  >
                    {item.product_name}
                  </Link>
                ) : (
                  <p className="truncate font-serif text-lg leading-tight">{item.product_name}</p>
                )}
                <p className="label mt-1 text-muted">
                  {item.variant_label ?? ""} · Qty {item.quantity}
                </p>
              </div>
              <p className="label shrink-0">{formatIDR(item.unit_price * item.quantity)}</p>
            </div>
          );
        })}
      </div>
      {order.coupon_code && (
        <div className="border-t border-line px-5 py-5 sm:px-8">
          <div className="flex justify-between">
            <span className="label text-muted">Original Total</span>
            <span className="label">{formatIDR(order.subtotal)}</span>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="label text-muted">
              Coupon {order.coupon_code}
              {order.discount_type === "percent" ? ` (${order.discount_value}%)` : ""}
            </span>
            <span className="label">−{formatIDR(order.discount)}</span>
          </div>
          <div className="mt-3 flex justify-between border-t border-line pt-3">
            <span className="label">Final Total Paid</span>
            <span className="label">{formatIDR(order.total)}</span>
          </div>
        </div>
      )}
    </article>
  );
}

export function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRecord[] | null>(null);
  const [params] = useSearchParams();
  const placed = params.get("placed");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchOrders().then((data) => {
      if (!cancelled) setOrders(data);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

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
        <h1 className="mt-4 font-serif text-5xl leading-[1.02] md:text-6xl">Orders</h1>
        {placed && (
          <p className="mt-6 max-w-[460px] text-sm leading-relaxed text-muted">
            Thank you — order <span className="text-ink">{placed}</span> has been
            placed. A confirmation will follow by email.
          </p>
        )}
      </Reveal>

      <div className="mt-12 max-w-[860px] sm:mt-16">
        {orders === null ? null : orders.length === 0 ? (
          <div className="flex flex-col items-start gap-5 border-t border-line pt-10 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 text-muted">
              <Package size={16} strokeWidth={1.5} />
              <p className="text-sm leading-relaxed">
                No orders yet. Your numbered editions will be listed here.
              </p>
            </div>
            <Link to="/collections" className="label link-underline shrink-0">
              Explore Collection
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {orders.map((order, i) => (
              <Reveal key={order.id} delay={i * 0.06}>
                <OrderBlock order={order} />
              </Reveal>
            ))}
          </div>
        )}
      </div>

      <Link to="/account" className="label link-underline mt-14 inline-block sm:mt-20">
        Back to My Account
      </Link>
    </motion.div>
  );
}
