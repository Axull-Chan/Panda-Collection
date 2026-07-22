import { useEffect, useMemo, useState } from "react";
import { fetchAdminOrders, fetchCustomers, type AdminOrder, type CustomerProfile } from "../lib/admin";
import { formatOrderDate } from "../lib/orders";
import { Reveal } from "../components/Reveal";
import { PageTitle } from "./ui";

export function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchCustomers(), fetchAdminOrders()])
      .then(([c, o]) => {
        setCustomers(c);
        setOrders(o);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const stats = useMemo(() => {
    const byUser = new Map<string, { count: number; spend: number }>();
    for (const o of orders) {
      if (!o.user_id) continue;
      const s = byUser.get(o.user_id) ?? { count: 0, spend: 0 };
      s.count += 1;
      if (o.payment_status === "paid") s.spend += Number(o.total);
      byUser.set(o.user_id, s);
    }
    return byUser;
  }, [orders]);

  const filtered = useMemo(
    () =>
      customers.filter((c) => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (
          (c.full_name ?? "").toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q)
        );
      }),
    [customers, search]
  );

  return (
    <div>
      <PageTitle eyebrow="The House List" title="Customers" />

      <Reveal className="mt-8 border-b border-line pb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email"
          aria-label="Search customers"
          className="h-9 w-full max-w-[280px] border-b border-line bg-transparent text-sm placeholder:text-muted focus:border-ink focus:outline-none"
        />
      </Reveal>

      {error && <p className="mt-4 text-sm text-[#9c4a33]">{error}</p>}

      <Reveal delay={0.06} className="mt-8">
        <div className="hidden items-center gap-4 border-b border-line pb-3 sm:flex">
          <span className="label flex-1 text-muted">Customer</span>
          <span className="label w-56 text-muted">Email</span>
          <span className="label w-32 text-muted">Registered</span>
          <span className="label w-20 text-muted">Orders</span>
          <span className="label w-24 text-muted">Spend</span>
        </div>
        <div className="divide-y divide-line">
          {filtered.map((c) => {
            const s = stats.get(c.id);
            return (
              <div key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-4 sm:flex-nowrap">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-lg">
                    {c.full_name || "—"}
                    {c.role === "admin" && <span className="label ml-3 text-muted">Admin</span>}
                  </p>
                </div>
                <span className="label w-full truncate text-muted sm:w-56">{c.email ?? "—"}</span>
                <span className="label w-32 text-muted">{formatOrderDate(c.created_at)}</span>
                <span className="label w-20">{s?.count ?? 0}</span>
                <span className="label w-24">${s?.spend ?? 0}</span>
              </div>
            );
          })}
        </div>
      </Reveal>
    </div>
  );
}
