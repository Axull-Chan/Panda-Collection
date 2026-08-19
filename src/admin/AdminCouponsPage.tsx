import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { deleteCoupon, fetchAdminCoupons, setCouponActive, type AdminCoupon } from "../lib/coupons";
import { formatIDR } from "../lib/currency";
import { Reveal } from "../components/Reveal";
import { AdminButton, PageTitle, StatusBadge } from "./ui";

type StatusFilter = "all" | "active" | "inactive";

function formatDiscount(c: AdminCoupon) {
  return c.discount_type === "percent"
    ? `${c.discount_value}% off`
    : `${formatIDR(c.discount_value)} off`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isExpired(c: AdminCoupon) {
  return c.expires_at != null && new Date(c.expires_at).getTime() < Date.now();
}

export function AdminCouponsPage() {
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchAdminCoupons()
      .then(setCoupons)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const filtered = useMemo(
    () =>
      coupons.filter((c) => {
        if (statusFilter === "active" && !c.active) return false;
        if (statusFilter === "inactive" && c.active) return false;
        if (search.trim() && !c.code.toLowerCase().includes(search.trim().toLowerCase()))
          return false;
        return true;
      }),
    [coupons, statusFilter, search]
  );

  const toggleActive = async (c: AdminCoupon) => {
    setBusyId(c.id);
    setError(null);
    try {
      await setCouponActive(c.id, !c.active);
      setCoupons((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x)));
    } catch (e) {
      setError((e as Error).message);
    }
    setBusyId(null);
  };

  const remove = async (c: AdminCoupon) => {
    if (!window.confirm(`Delete coupon "${c.code}"? This cannot be undone.`)) return;
    setBusyId(c.id);
    setError(null);
    try {
      await deleteCoupon(c.id);
      setCoupons((prev) => prev.filter((x) => x.id !== c.id));
    } catch (e) {
      setError((e as Error).message);
    }
    setBusyId(null);
  };

  return (
    <div>
      <PageTitle
        eyebrow="Marketing"
        title="Coupons"
        action={
          <AdminButton solid onClick={() => navigate("/admin/coupons/new")}>
            Create Coupon
          </AdminButton>
        }
      />

      <Reveal className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4 border-b border-line pb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by code"
          aria-label="Search coupons"
          className="h-9 w-full max-w-[220px] border-b border-line bg-transparent text-sm placeholder:text-muted focus:border-ink focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          aria-label="Filter by status"
          className="label h-9 cursor-pointer appearance-none border-b border-line bg-transparent pr-1 focus:border-ink focus:outline-none"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </Reveal>

      {error && (
        <p role="alert" className="mt-4 text-sm text-[#9c4a33]">
          {error}
        </p>
      )}

      <Reveal delay={0.06} className="mt-8">
        <div className="hidden items-center gap-4 border-b border-line pb-3 lg:flex">
          <span className="label flex-1 text-muted">Code</span>
          <span className="label w-32 text-muted">Discount</span>
          <span className="label w-28 text-muted">Min. Order</span>
          <span className="label w-28 text-muted">Usage</span>
          <span className="label w-32 text-muted">Expires</span>
          <span className="label w-24 text-muted">Status</span>
          <span className="label w-[220px] text-muted">Actions</span>
        </div>

        {loading ? (
          <p role="status" className="label py-14 text-center text-muted">
            Loading coupons…
          </p>
        ) : filtered.length === 0 ? (
          <p role="status" className="label py-14 text-center text-muted">
            No coupons match these filters
          </p>
        ) : (
          <div className="divide-y divide-line">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4 lg:flex-nowrap"
              >
                <div className="min-w-0 basis-full lg:basis-auto lg:flex-1">
                  <Link
                    to={`/admin/coupons/${c.id}`}
                    className="block truncate font-serif text-lg transition-colors hover:text-muted"
                  >
                    {c.code}
                  </Link>
                  {c.description && (
                    <p className="label mt-0.5 truncate text-muted">{c.description}</p>
                  )}
                </div>
                <span className="label w-32">{formatDiscount(c)}</span>
                <span className="label w-28">{formatIDR(c.min_order)}</span>
                <span className="label w-28">
                  {c.used_count}
                  {c.max_uses != null ? ` / ${c.max_uses}` : " / ∞"}
                </span>
                <span className={`label w-32 ${isExpired(c) ? "text-[#9c4a33]" : ""}`}>
                  {isExpired(c) ? "Expired" : formatDate(c.expires_at)}
                </span>
                <span className="w-24">
                  <StatusBadge status={c.active ? "active" : "inactive"} />
                </span>
                <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 lg:w-[220px]">
                  <Link to={`/admin/coupons/${c.id}`} className="label link-underline">
                    Edit
                  </Link>
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    onClick={() => toggleActive(c)}
                    className="label link-underline text-muted"
                  >
                    {c.active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    onClick={() => remove(c)}
                    className="label link-underline text-muted"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Reveal>
    </div>
  );
}
