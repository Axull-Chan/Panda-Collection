import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  deleteCoupon,
  fetchAdminCoupon,
  saveCoupon,
  setCouponActive,
  type CouponInput,
  type DiscountType,
} from "../lib/coupons";
import { AuthField } from "../components/auth/AuthField";
import { AdminButton, PageTitle, StatusBadge } from "./ui";

/** <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in local time,
 *  not the timestamptz ISO string the database returns. */
function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

export function CouponEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === undefined;
  const navigate = useNavigate();

  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrder, setMinOrder] = useState("0");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [active, setActive] = useState(true);
  const [usedCount, setUsedCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState(false);
  // Guards the save/activate/delete actions against firing while an
  // existing coupon's data is still loading — the same reasoning as
  // ProductEditorPage's loadingProduct guard.
  const [loadingCoupon, setLoadingCoupon] = useState(!isNew);

  useEffect(() => {
    if (!id) return;
    // React StrictMode double-invokes this effect in development, firing
    // two independent fetches. Without this guard, whichever one resolves
    // last always wins — if that's the stale first call, it silently
    // overwrites any edit the user already made (and a click on Save that
    // lands in between reads the just-clobbered value). The `cancelled`
    // flag makes only the effect instance that's still current allowed to
    // apply its result — the same pattern WishlistContext's fetch uses.
    let cancelled = false;
    fetchAdminCoupon(id)
      .then((c) => {
        if (cancelled) return;
        setCode(c.code);
        setDescription(c.description ?? "");
        setDiscountType(c.discount_type);
        setDiscountValue(String(c.discount_value));
        setMinOrder(String(c.min_order));
        setMaxDiscount(c.max_discount != null ? String(c.max_discount) : "");
        setStartsAt(toLocalInputValue(c.starts_at));
        setExpiresAt(toLocalInputValue(c.expires_at));
        setMaxUses(c.max_uses != null ? String(c.max_uses) : "");
        setActive(c.active);
        setUsedCount(c.used_count);
        setLoadingCoupon(false);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
        setLoadingCoupon(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || loadingCoupon) return;
    if (!code.trim() || !discountValue.trim() || Number(discountValue) <= 0) {
      setError("A code and a discount value greater than zero are required.");
      return;
    }
    setBusy(true);
    setError(null);
    setSavedNote(false);
    try {
      const input: CouponInput = {
        code: code.trim(),
        description: description.trim() || null,
        discount_type: discountType,
        discount_value: Number(discountValue),
        min_order: minOrder.trim() ? Number(minOrder) : 0,
        max_discount: maxDiscount.trim() ? Number(maxDiscount) : null,
        starts_at: fromLocalInputValue(startsAt),
        expires_at: fromLocalInputValue(expiresAt),
        max_uses: maxUses.trim() ? Number(maxUses) : null,
        active,
      };
      const cid = await saveCoupon(input, id);
      setSavedNote(true);
      if (!id) {
        navigate(`/admin/coupons/${cid}`, { replace: true });
      }
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  };

  const onToggleActive = async () => {
    if (!id || busy || loadingCoupon) return;
    setBusy(true);
    setError(null);
    try {
      await setCouponActive(id, !active);
      setActive((a) => !a);
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  };

  const onDelete = async () => {
    if (!id || busy || loadingCoupon) return;
    if (!window.confirm(`Delete coupon "${code}"? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteCoupon(id);
      navigate("/admin/coupons");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const selectCls =
    "h-12 w-full cursor-pointer appearance-none border-b border-line bg-transparent text-sm focus:border-ink focus:outline-none disabled:opacity-50";

  return (
    <div>
      <Link
        to="/admin/coupons"
        className="label link-underline inline-flex items-center gap-2 text-muted"
      >
        <ArrowLeft size={13} strokeWidth={1.5} /> All Coupons
      </Link>

      <div className="mt-6">
        <PageTitle
          eyebrow={isNew ? "New Coupon" : "Edit Coupon"}
          title={code || "Untitled Coupon"}
          action={!isNew ? <StatusBadge status={active ? "active" : "inactive"} /> : undefined}
        />
      </div>

      <form onSubmit={onSave} noValidate className="mt-10 max-w-[640px] space-y-8">
        <AuthField
          label="Coupon Code"
          type="text"
          required
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          disabled={busy || loadingCoupon}
        />
        <div>
          <label htmlFor="coupon-description" className="label text-muted">
            Description
          </label>
          <textarea
            id="coupon-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            disabled={busy || loadingCoupon}
            className="mt-1 w-full resize-y border-b border-line bg-transparent py-2 text-sm leading-relaxed text-ink focus:border-ink focus:outline-none disabled:opacity-50"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label htmlFor="discount-type" className="label text-muted">
              Discount Type
            </label>
            <select
              id="discount-type"
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as DiscountType)}
              disabled={busy || loadingCoupon}
              className={selectCls}
            >
              <option value="percent">Percentage Off</option>
              <option value="fixed">Fixed Amount Off</option>
            </select>
          </div>
          <AuthField
            label={discountType === "percent" ? "Discount (%)" : "Discount (Rp)"}
            type="number"
            min="0"
            step={discountType === "percent" ? "0.01" : "1"}
            required
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            disabled={busy || loadingCoupon}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <AuthField
            label="Minimum Purchase (Rp)"
            type="number"
            min="0"
            step="1"
            value={minOrder}
            onChange={(e) => setMinOrder(e.target.value)}
            disabled={busy || loadingCoupon}
          />
          <AuthField
            label="Maximum Discount (Rp, optional)"
            type="number"
            min="0"
            step="1"
            value={maxDiscount}
            onChange={(e) => setMaxDiscount(e.target.value)}
            disabled={busy || loadingCoupon}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <AuthField
            label="Starts (optional)"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            disabled={busy || loadingCoupon}
          />
          <AuthField
            label="Expires (optional)"
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            disabled={busy || loadingCoupon}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <AuthField
            label="Usage Limit (optional)"
            type="number"
            min="1"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            disabled={busy || loadingCoupon}
          />
          {!isNew && (
            <div>
              <p className="label text-muted">Usage</p>
              <p className="mt-3.5 text-sm">
                {usedCount} used
                {maxUses.trim()
                  ? ` · ${Math.max(0, Number(maxUses) - usedCount)} remaining`
                  : " · unlimited"}
              </p>
            </div>
          )}
        </div>

        <label className="label flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            disabled={busy || loadingCoupon}
            className="h-3.5 w-3.5 accent-ink"
          />
          Active
        </label>

        {error && (
          <p role="alert" className="text-sm text-[#9c4a33]">
            {error}
          </p>
        )}
        {savedNote && (
          <p role="status" className="label text-muted">
            Saved.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-8">
          <AdminButton solid type="submit" disabled={busy || loadingCoupon}>
            {busy ? "Saving…" : "Save"}
          </AdminButton>
          {!isNew && (
            <>
              <AdminButton disabled={busy || loadingCoupon} onClick={onToggleActive}>
                {active ? "Deactivate" : "Activate"}
              </AdminButton>
              <AdminButton disabled={busy || loadingCoupon} onClick={onDelete}>
                Delete
              </AdminButton>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
