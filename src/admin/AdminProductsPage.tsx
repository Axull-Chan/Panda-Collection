import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  deleteProducts,
  duplicateProduct,
  fetchAdminProducts,
  fetchTaxonomies,
  setProductFeatured,
  setProductsStatus,
  LOW_STOCK_PRODUCT_THRESHOLD,
  type AdminProduct,
  type Taxonomy,
} from "../lib/admin";
import { Reveal } from "../components/Reveal";
import { AdminButton, PageTitle, StatusBadge } from "./ui";

type StatusFilter = "all" | "published" | "draft" | "archived";
type StockFilter = "all" | "low" | "out";

const totalStock = (p: AdminProduct) =>
  p.product_variants.reduce((s, v) => s + v.stock, 0);

export function AdminProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Taxonomy[]>([]);
  const [collections, setCollections] = useState<Taxonomy[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchAdminProducts().then(setProducts).catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
    fetchTaxonomies().then(({ categories, collections }) => {
      setCategories(categories);
      setCollections(collections);
    });
  }, [load]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (featuredOnly && !p.featured) return false;
      if (categoryFilter !== "all" && p.categories?.id !== categoryFilter) return false;
      if (
        collectionFilter !== "all" &&
        !p.product_collections.some((c) => c.collection_id === collectionFilter)
      )
        return false;
      const stock = totalStock(p);
      if (stockFilter === "low" && !(stock > 0 && stock <= LOW_STOCK_PRODUCT_THRESHOLD))
        return false;
      if (stockFilter === "out" && stock !== 0) return false;
      if (search.trim() && !p.name.toLowerCase().includes(search.trim().toLowerCase()))
        return false;
      return true;
    });
  }, [products, statusFilter, featuredOnly, categoryFilter, collectionFilter, stockFilter, search]);

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  const bulk = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setSelected(new Set());
      load();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  const selectedIds = [...selected];
  const selectedDrafts = products
    .filter((p) => selected.has(p.id) && p.status === "draft")
    .map((p) => p.id);

  const filterSelect =
    "label h-9 cursor-pointer appearance-none border-b border-line bg-transparent pr-1 focus:border-ink focus:outline-none";

  return (
    <div>
      <PageTitle
        eyebrow="Catalog"
        title="Products"
        action={
          <AdminButton solid onClick={() => navigate("/admin/products/new")}>
            Create Product
          </AdminButton>
        }
      />

      {/* Filters */}
      <Reveal className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4 border-b border-line pb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products"
          aria-label="Search products"
          className="h-9 w-full max-w-[220px] border-b border-line bg-transparent text-sm placeholder:text-muted focus:border-ink focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className={filterSelect}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className={filterSelect}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={collectionFilter}
          onChange={(e) => setCollectionFilter(e.target.value)}
          className={filterSelect}
          aria-label="Filter by collection"
        >
          <option value="all">All collections</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as StockFilter)}
          className={filterSelect}
          aria-label="Filter by stock"
        >
          <option value="all">All stock levels</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
        <label className="label flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={featuredOnly}
            onChange={(e) => setFeaturedOnly(e.target.checked)}
            className="h-3.5 w-3.5 accent-ink"
          />
          Featured only
        </label>
      </Reveal>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="label mr-2 text-muted">{selected.size} selected</span>
          <AdminButton
            disabled={busy}
            onClick={() => bulk(() => setProductsStatus(selectedIds, "published"))}
          >
            Publish
          </AdminButton>
          <AdminButton
            disabled={busy}
            onClick={() => bulk(() => setProductsStatus(selectedIds, "draft"))}
          >
            Move to Draft
          </AdminButton>
          <AdminButton
            disabled={busy}
            onClick={() => bulk(() => setProductsStatus(selectedIds, "archived"))}
          >
            Archive
          </AdminButton>
          <AdminButton
            disabled={busy || selectedDrafts.length === 0}
            onClick={() => {
              if (window.confirm(`Delete ${selectedDrafts.length} draft product(s)? This cannot be undone.`))
                void bulk(() => deleteProducts(selectedDrafts));
            }}
          >
            Delete Drafts
          </AdminButton>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-[#9c4a33]">{error}</p>}

      {/* Product rows */}
      <Reveal delay={0.06} className="mt-8">
        <div className="hidden items-center gap-4 border-b border-line pb-3 lg:flex">
          <input
            type="checkbox"
            aria-label="Select all"
            checked={allSelected}
            onChange={() =>
              setSelected(allSelected ? new Set() : new Set(filtered.map((p) => p.id)))
            }
            className="h-3.5 w-3.5 accent-ink"
          />
          <span className="label w-14 text-muted" />
          <span className="label flex-1 text-muted">Product</span>
          <span className="label w-24 text-muted">Price</span>
          <span className="label w-20 text-muted">Stock</span>
          <span className="label w-28 text-muted">Status</span>
          <span className="label w-[300px] text-muted">Actions</span>
        </div>

        {filtered.length === 0 ? (
          <p className="label py-14 text-center text-muted">No products match these filters</p>
        ) : (
          <div className="divide-y divide-line">
            {filtered.map((p) => {
              const stock = totalStock(p);
              const primary =
                p.product_images.find((i) => i.is_primary) ?? p.product_images[0];
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4 lg:flex-nowrap"
                >
                  <input
                    type="checkbox"
                    aria-label={`Select ${p.name}`}
                    checked={selected.has(p.id)}
                    onChange={() => toggleSelect(p.id)}
                    className="h-3.5 w-3.5 accent-ink"
                  />
                  <Link to={`/admin/products/${p.id}`} className="block h-16 w-12 shrink-0 overflow-hidden bg-panel">
                    {primary && (
                      <img src={primary.url} alt="" className="h-full w-full object-cover" />
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/admin/products/${p.id}`}
                      className="block truncate font-serif text-lg transition-colors hover:text-muted"
                    >
                      {p.name}
                    </Link>
                    <p className="label mt-0.5 text-muted">
                      {p.categories?.name ?? "—"}
                      {p.featured ? " · Featured" : ""}
                    </p>
                  </div>
                  <span className="label w-24">
                    ${p.price}
                    {p.sale_price != null && (
                      <span className="ml-1 text-muted line-through">${p.sale_price}</span>
                    )}
                  </span>
                  <span
                    className={`label w-20 ${
                      stock === 0
                        ? "text-[#9c4a33]"
                        : stock <= LOW_STOCK_PRODUCT_THRESHOLD
                          ? "text-muted"
                          : ""
                    }`}
                  >
                    {stock === 0 ? "Out" : stock}
                  </span>
                  <span className="w-28">
                    <StatusBadge status={p.status} />
                  </span>
                  <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 lg:w-[300px]">
                    {p.status !== "published" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => bulk(() => setProductsStatus([p.id], "published"))}
                        className="label link-underline"
                      >
                        Publish
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => bulk(() => setProductsStatus([p.id], "draft"))}
                        className="label link-underline text-muted"
                      >
                        Unpublish
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        bulk(() =>
                          setProductsStatus([p.id], p.status === "archived" ? "draft" : "archived")
                        )
                      }
                      className="label link-underline text-muted"
                    >
                      {p.status === "archived" ? "Restore" : "Archive"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => bulk(() => setProductFeatured(p.id, !p.featured))}
                      className="label link-underline text-muted"
                    >
                      {p.featured ? "Unfeature" : "Feature"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        bulk(async () => {
                          await duplicateProduct(p);
                        })
                      }
                      className="label link-underline text-muted"
                    >
                      Duplicate
                    </button>
                    <Link
                      to={`/product/${p.slug}?preview=1`}
                      target="_blank"
                      className="label link-underline text-muted"
                    >
                      Preview
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Reveal>
    </div>
  );
}
