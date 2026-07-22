import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAdminOrders, fetchAdminProducts, fetchAdminStats } from "../lib/admin";
import type { AdminOrder, AdminProduct, AdminStats } from "../lib/admin";
import { formatOrderDate, formatStatus, orderNumber } from "../lib/orders";
import { Reveal } from "../components/Reveal";
import { PageTitle, StatTile, StatusBadge } from "./ui";

export function DashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [recentProducts, setRecentProducts] = useState<AdminProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchAdminStats(), fetchAdminOrders(), fetchAdminProducts()])
      .then(([s, o, p]) => {
        if (cancelled) return;
        setStats(s);
        setOrders(o.slice(0, 5));
        setRecentProducts(
          [...p]
            .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
            .slice(0, 5)
        );
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <PageTitle eyebrow="Atelier Admin" title="Dashboard" />

      {error && <p className="mt-6 text-sm text-[#9c4a33]">{error}</p>}

      {stats && (
        <Reveal className="mt-10">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatTile label="Products" value={stats.totalProducts} />
            <StatTile label="Published" value={stats.published} />
            <StatTile label="Drafts" value={stats.draft} />
            <StatTile label="Archived" value={stats.archived} />
            <StatTile label="Orders Today" value={stats.ordersToday} />
            <StatTile label="Pending Orders" value={stats.pendingOrders} />
            <StatTile
              label="Low Stock"
              value={stats.lowStock}
              hint={`${stats.outOfStock} out of stock`}
            />
            <StatTile label="Customers" value={stats.customers} />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-2">
            <StatTile
              label="Revenue — Paid"
              value={`$${stats.revenuePaid}`}
              hint="Payments not yet connected"
            />
            <StatTile label="Open Order Value" value={`$${stats.totalOrderValue}`} />
          </div>
        </Reveal>
      )}

      <div className="mt-14 grid grid-cols-1 gap-x-10 gap-y-14 xl:grid-cols-2">
        <Reveal>
          <div className="flex items-end justify-between border-b border-line pb-4">
            <h2 className="font-serif text-2xl">Recent Orders</h2>
            <Link to="/admin/orders" className="label link-underline text-muted">
              View all
            </Link>
          </div>
          {orders.length === 0 ? (
            <p className="label mt-6 text-muted">No orders yet</p>
          ) : (
            <div className="divide-y divide-line">
              {orders.map((o) => (
                <Link
                  key={o.id}
                  to="/admin/orders"
                  className="flex items-center justify-between gap-4 py-4 transition-colors hover:bg-panel/40"
                >
                  <div className="min-w-0">
                    <p className="label">{orderNumber(o.id)}</p>
                    <p className="label mt-1 truncate text-muted">
                      {o.email ?? "—"} · {formatOrderDate(o.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <span className="label text-muted">{formatStatus(o.status)}</span>
                    <span className="label">${o.total}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Reveal>

        <Reveal delay={0.08}>
          <div className="flex items-end justify-between border-b border-line pb-4">
            <h2 className="font-serif text-2xl">Recent Product Updates</h2>
            <Link to="/admin/products" className="label link-underline text-muted">
              View all
            </Link>
          </div>
          <div className="divide-y divide-line">
            {recentProducts.map((p) => (
              <Link
                key={p.id}
                to={`/admin/products/${p.id}`}
                className="flex items-center justify-between gap-4 py-4 transition-colors hover:bg-panel/40"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="h-14 w-10 shrink-0 overflow-hidden bg-panel">
                    {p.product_images[0] && (
                      <img
                        src={
                          p.product_images.find((i) => i.is_primary)?.url ??
                          p.product_images[0].url
                        }
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <p className="truncate font-serif text-lg">{p.name}</p>
                </div>
                <StatusBadge status={p.status} />
              </Link>
            ))}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
