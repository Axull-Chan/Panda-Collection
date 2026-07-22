import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus } from "lucide-react";
import {
  fetchAdminProducts,
  updateVariantStock,
  LOW_STOCK_VARIANT_THRESHOLD,
  type AdminProduct,
} from "../lib/admin";
import { Reveal } from "../components/Reveal";
import { AdminButton, PageTitle } from "./ui";

interface Row {
  variantId: string;
  productId: string;
  productName: string;
  slug: string;
  label: string;
  stock: number;
}

type Filter = "all" | "low" | "out";

export function AdminInventoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDelta, setBulkDelta] = useState("5");
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchAdminProducts()
      .then((products: AdminProduct[]) =>
        setRows(
          products.flatMap((p) =>
            p.product_variants.map((v) => ({
              variantId: v.id,
              productId: p.id,
              productName: p.name,
              slug: p.slug,
              label: `${v.color} / ${v.size}`,
              stock: v.stock,
            }))
          )
        )
      )
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (filter === "low" && !(r.stock > 0 && r.stock <= LOW_STOCK_VARIANT_THRESHOLD))
          return false;
        if (filter === "out" && r.stock !== 0) return false;
        if (search.trim() && !r.productName.toLowerCase().includes(search.trim().toLowerCase()))
          return false;
        return true;
      }),
    [rows, filter, search]
  );

  const setStock = async (variantId: string, stock: number) => {
    const clamped = Math.max(0, stock);
    setRows((prev) => prev.map((r) => (r.variantId === variantId ? { ...r, stock: clamped } : r)));
    setBusyIds((prev) => new Set(prev).add(variantId));
    try {
      await updateVariantStock(variantId, clamped);
    } catch (e) {
      setError((e as Error).message);
      load();
    }
    setBusyIds((prev) => {
      const next = new Set(prev);
      next.delete(variantId);
      return next;
    });
  };

  const applyBulk = async (sign: 1 | -1) => {
    const delta = Number(bulkDelta) || 0;
    if (delta <= 0) return;
    for (const id of selected) {
      const row = rows.find((r) => r.variantId === id);
      if (row) await setStock(id, row.stock + sign * delta);
    }
    setSelected(new Set());
  };

  const stockTone = (stock: number) =>
    stock === 0 ? "text-[#9c4a33]" : stock <= LOW_STOCK_VARIANT_THRESHOLD ? "text-muted" : "";

  return (
    <div>
      <PageTitle eyebrow="Stock Control" title="Inventory" />

      <Reveal className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4 border-b border-line pb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products"
          aria-label="Search inventory"
          className="h-9 w-full max-w-[220px] border-b border-line bg-transparent text-sm placeholder:text-muted focus:border-ink focus:outline-none"
        />
        {(["all", "low", "out"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`label link-underline ${filter === f ? "is-active text-ink" : "text-muted hover:text-ink"}`}
          >
            {f === "all" ? "All" : f === "low" ? "Low Stock" : "Out of Stock"}
          </button>
        ))}
      </Reveal>

      {selected.size > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="label mr-1 text-muted">{selected.size} selected — adjust by</span>
          <input
            type="number"
            min="1"
            value={bulkDelta}
            onChange={(e) => setBulkDelta(e.target.value)}
            aria-label="Bulk stock amount"
            className="h-10 w-16 border-b border-line bg-transparent text-center text-sm focus:border-ink focus:outline-none"
          />
          <AdminButton onClick={() => void applyBulk(1)}>Add</AdminButton>
          <AdminButton onClick={() => void applyBulk(-1)}>Subtract</AdminButton>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-[#9c4a33]">{error}</p>}

      <Reveal delay={0.06} className="mt-8">
        <div className="hidden items-center gap-4 border-b border-line pb-3 sm:flex">
          <span className="w-4" />
          <span className="label flex-1 text-muted">Product</span>
          <span className="label w-36 text-muted">Variant</span>
          <span className="label w-44 text-muted">Stock</span>
          <span className="label w-24 text-muted">State</span>
        </div>
        <div className="divide-y divide-line">
          {filtered.map((r) => (
            <div key={r.variantId} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 sm:flex-nowrap">
              <input
                type="checkbox"
                aria-label={`Select ${r.productName} ${r.label}`}
                checked={selected.has(r.variantId)}
                onChange={() =>
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (next.has(r.variantId)) next.delete(r.variantId);
                    else next.add(r.variantId);
                    return next;
                  })
                }
                className="h-3.5 w-3.5 accent-ink"
              />
              <Link
                to={`/admin/products/${r.productId}`}
                className="min-w-0 flex-1 truncate font-serif text-lg transition-colors hover:text-muted"
              >
                {r.productName}
              </Link>
              <span className="label w-36 text-muted">{r.label}</span>
              <div className="flex w-44 items-center gap-2">
                <button
                  type="button"
                  aria-label="Decrease stock"
                  disabled={busyIds.has(r.variantId) || r.stock === 0}
                  onClick={() => void setStock(r.variantId, r.stock - 1)}
                  className="border border-line p-1.5 transition-colors hover:border-ink disabled:opacity-30"
                >
                  <Minus size={12} strokeWidth={1.5} />
                </button>
                <input
                  type="number"
                  min="0"
                  value={r.stock}
                  aria-label="Stock quantity"
                  onChange={(e) => void setStock(r.variantId, Number(e.target.value))}
                  className={`h-9 w-16 border-b border-line bg-transparent text-center text-sm focus:border-ink focus:outline-none ${stockTone(r.stock)}`}
                />
                <button
                  type="button"
                  aria-label="Increase stock"
                  disabled={busyIds.has(r.variantId)}
                  onClick={() => void setStock(r.variantId, r.stock + 1)}
                  className="border border-line p-1.5 transition-colors hover:border-ink disabled:opacity-30"
                >
                  <Plus size={12} strokeWidth={1.5} />
                </button>
              </div>
              <span className={`label w-24 ${stockTone(r.stock)}`}>
                {r.stock === 0
                  ? "Out of stock"
                  : r.stock <= LOW_STOCK_VARIANT_THRESHOLD
                    ? "Low"
                    : "In stock"}
              </span>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  );
}
