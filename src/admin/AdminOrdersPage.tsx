import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchAdminOrders,
  fetchCustomers,
  updateOrder,
  ORDER_STATUSES,
  SHIPPING_STATUSES,
  type AdminOrder,
  type CustomerProfile,
} from "../lib/admin";
import { formatOrderDate, formatStatus, orderNumber } from "../lib/orders";
import { formatIDR } from "../lib/currency";
import { Reveal } from "../components/Reveal";
import { PageTitle } from "./ui";

const PAYMENT_STATUSES = ["unpaid", "paid", "refunded"] as const;

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [customers, setCustomers] = useState<Map<string, CustomerProfile>>(new Map());
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([fetchAdminOrders(), fetchCustomers()])
      .then(([o, c]) => {
        setOrders(o);
        setCustomers(new Map(c.map((p) => [p.id, p])));
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        if (statusFilter !== "all" && o.status !== statusFilter) return false;
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          const customer = o.user_id ? customers.get(o.user_id) : null;
          const hay = `${orderNumber(o.id)} ${o.email ?? ""} ${customer?.full_name ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      }),
    [orders, statusFilter, search, customers]
  );

  const change = async (
    id: string,
    fields: { status?: string; payment_status?: string; shipping_status?: string }
  ) => {
    setError(null);
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...fields } : o)));
    try {
      await updateOrder(id, fields);
    } catch (e) {
      setError((e as Error).message);
      load();
    }
  };

  const selectCls =
    "label h-9 cursor-pointer appearance-none border-b border-line bg-transparent pr-1 focus:border-ink focus:outline-none";

  return (
    <div>
      <PageTitle eyebrow="Fulfilment" title="Orders" />

      <Reveal className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4 border-b border-line pb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search number, customer, email"
          aria-label="Search orders"
          className="h-9 w-full max-w-[260px] border-b border-line bg-transparent text-sm placeholder:text-muted focus:border-ink focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className={selectCls}
        >
          <option value="all">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {formatStatus(s)}
            </option>
          ))}
        </select>
      </Reveal>

      {error && (
        <p role="alert" className="mt-4 text-sm text-[#9c4a33]">
          {error}
        </p>
      )}

      <Reveal delay={0.06} className="mt-8 space-y-6">
        {loading ? (
          <p role="status" className="label py-14 text-center text-muted">
            Loading orders…
          </p>
        ) : filtered.length === 0 ? (
          <p role="status" className="label py-14 text-center text-muted">
            No orders match
          </p>
        ) : (
          filtered.map((o) => {
            const customer = o.user_id ? customers.get(o.user_id) : null;
            const expanded = open === o.id;
            return (
              <article key={o.id} className="border border-line">
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : o.id)}
                  className="flex w-full flex-col gap-2 px-5 py-5 text-left transition-colors hover:bg-panel/40 sm:flex-row sm:items-center sm:justify-between sm:px-7"
                >
                  <div className="min-w-0">
                    <p className="label">{orderNumber(o.id)}</p>
                    <p className="label mt-1 truncate text-muted">
                      {customer?.full_name || o.email || "Guest"} ·{" "}
                      {formatOrderDate(o.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                    <span className="label text-muted">
                      {o.payment_provider === "midtrans" ? "Midtrans" : "Stripe"}
                    </span>
                    <span className="label text-muted">· {formatStatus(o.status)}</span>
                    <span className="label text-muted">· {formatStatus(o.payment_status)}</span>
                    <span className="label text-muted">· {formatStatus(o.shipping_status)}</span>
                    <span className="label sm:ml-2">{formatIDR(o.total)}</span>
                    <span className="label text-muted">{expanded ? "Close" : "Details"}</span>
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-line px-5 pb-6 sm:px-7">
                    <div className="flex flex-wrap gap-x-10 gap-y-2 border-b border-line py-5">
                      <div>
                        <p className="label text-muted">Payment Date</p>
                        <p className="label mt-1.5">
                          {o.paid_at ? formatOrderDate(o.paid_at) : "Not yet paid"}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="label text-muted">
                          {o.payment_provider === "midtrans" ? "Midtrans Transaction" : "Stripe Session"}
                        </p>
                        <p
                          className="label mt-1.5 truncate"
                          title={
                            (o.payment_provider === "midtrans"
                              ? o.midtrans_transaction_id
                              : o.stripe_session_id) ?? undefined
                          }
                        >
                          {(o.payment_provider === "midtrans"
                            ? o.midtrans_transaction_id
                            : o.stripe_session_id) ?? "—"}
                        </p>
                      </div>
                      <div>
                        <p className="label text-muted">Coupon</p>
                        <p className="label mt-1.5">
                          {o.coupon_code
                            ? `${o.coupon_code}${o.discount_type === "percent" ? ` (${o.discount_value}%)` : ""}`
                            : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="divide-y divide-line">
                      {o.order_items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate font-serif text-lg">{item.product_name}</p>
                            <p className="label mt-0.5 text-muted">
                              {item.variant_label ?? "—"} · Qty {item.quantity}
                            </p>
                          </div>
                          <p className="label shrink-0">{formatIDR(item.unit_price * item.quantity)}</p>
                        </div>
                      ))}
                    </div>
                    {o.coupon_code && (
                      <div className="border-t border-line py-5">
                        <div className="flex justify-between">
                          <span className="label text-muted">Original Total</span>
                          <span className="label">{formatIDR(o.subtotal)}</span>
                        </div>
                        <div className="mt-2 flex justify-between">
                          <span className="label text-muted">Discount</span>
                          <span className="label">−{formatIDR(o.discount)}</span>
                        </div>
                        <div className="mt-2 flex justify-between">
                          <span className="label">Final Paid</span>
                          <span className="label">{formatIDR(o.total)}</span>
                        </div>
                      </div>
                    )}

                    <div className="mt-6 flex flex-wrap items-end gap-x-10 gap-y-4 border-t border-line pt-6">
                      <div>
                        <label className="label text-muted" htmlFor={`status-${o.id}`}>
                          Order Status
                        </label>
                        <select
                          id={`status-${o.id}`}
                          value={o.status}
                          onChange={(e) => void change(o.id, { status: e.target.value })}
                          className={selectCls}
                        >
                          {ORDER_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {formatStatus(s)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label text-muted" htmlFor={`pay-${o.id}`}>
                          Payment
                        </label>
                        <select
                          id={`pay-${o.id}`}
                          value={o.payment_status}
                          onChange={(e) => void change(o.id, { payment_status: e.target.value })}
                          className={selectCls}
                        >
                          {PAYMENT_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {formatStatus(s)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label text-muted" htmlFor={`ship-${o.id}`}>
                          Shipping
                        </label>
                        <select
                          id={`ship-${o.id}`}
                          value={o.shipping_status}
                          onChange={(e) => void change(o.id, { shipping_status: e.target.value })}
                          className={selectCls}
                        >
                          {SHIPPING_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {formatStatus(s)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="label ml-auto text-muted">
                        Completing an order deducts variant stock automatically.
                      </p>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </Reveal>
    </div>
  );
}
