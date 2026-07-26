import { useCallback, useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUp, ArrowDown, Star, Trash2, UploadCloud } from "lucide-react";
import {
  fetchAdminProduct,
  fetchTaxonomies,
  removeProductImage,
  saveProduct,
  setPrimaryImage,
  setProductCollections,
  swapImageOrder,
  syncVariants,
  uploadProductImage,
  type AdminImage,
  type AdminVariant,
  type ProductInput,
  type ProductStatus,
  type Taxonomy,
} from "../lib/admin";
import { AuthField } from "../components/auth/AuthField";
import { Reveal } from "../components/Reveal";
import { Image } from "../components/Image";
import { AdminButton, PageTitle, StatusBadge } from "./ui";

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL"];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// ---------- image manager ----------

function ImageManager({
  productId,
  images,
  onChange,
}: {
  productId: string;
  images: AdminImage[];
  onChange: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      const list = [...files];
      setUploading(list.map((f) => f.name));
      for (const file of list) {
        try {
          await uploadProductImage(productId, file);
        } catch (e) {
          setError((e as Error).message);
        }
        setUploading((prev) => prev.filter((n) => n !== file.name));
      }
      onChange();
    },
    [productId, onChange]
  );

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <p className="label border-b border-line pb-4">Images</p>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`mt-6 flex h-36 w-full flex-col items-center justify-center gap-3 border border-dashed transition-colors duration-300 ${
          dragOver ? "border-ink bg-panel/60" : "border-line hover:border-ink"
        }`}
      >
        <UploadCloud size={18} strokeWidth={1.5} className="text-muted" />
        <span className="label text-muted">
          Drag & drop, or click to upload — JPEG, PNG, WEBP
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && void handleFiles(e.target.files)}
      />

      {uploading.length > 0 && (
        <p role="status" className="label mt-4 text-muted">
          Uploading {uploading.join(", ")}…
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-xs text-[#9c4a33]">
          {error}
        </p>
      )}

      {sorted.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4">
          {sorted.map((img, i) => (
            <figure key={img.id} className="group">
              <Image src={img.url} alt={img.alt ?? ""} aspectRatio="3/4">
                {img.is_primary && (
                  <span className="label absolute left-2 top-2 bg-bg px-2 py-1">Primary</span>
                )}
              </Image>
              <div className="mt-2 flex items-center justify-between gap-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Move image earlier"
                    disabled={i === 0}
                    onClick={async () => {
                      await swapImageOrder(sorted[i], sorted[i - 1]);
                      onChange();
                    }}
                    className="p-1 text-muted transition-colors hover:text-ink disabled:opacity-30"
                  >
                    <ArrowUp size={13} strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    aria-label="Move image later"
                    disabled={i === sorted.length - 1}
                    onClick={async () => {
                      await swapImageOrder(sorted[i], sorted[i + 1]);
                      onChange();
                    }}
                    className="p-1 text-muted transition-colors hover:text-ink disabled:opacity-30"
                  >
                    <ArrowDown size={13} strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    aria-label="Set as primary image"
                    disabled={img.is_primary}
                    onClick={async () => {
                      await setPrimaryImage(productId, img.id);
                      onChange();
                    }}
                    className="p-1 text-muted transition-colors hover:text-ink disabled:opacity-30"
                  >
                    <Star size={13} strokeWidth={1.5} className={img.is_primary ? "fill-ink" : ""} />
                  </button>
                </div>
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={async () => {
                    if (window.confirm("Remove this image?")) {
                      await removeProductImage(img);
                      onChange();
                    }
                  }}
                  className="p-1 text-muted transition-colors hover:text-ink"
                >
                  <Trash2 size={13} strokeWidth={1.5} />
                </button>
              </div>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- editor ----------

interface VariantRow extends AdminVariant {
  key: string;
}

export function ProductEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === undefined;
  const navigate = useNavigate();

  const [productId, setProductId] = useState<string | null>(id ?? null);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [sku, setSku] = useState("");
  const [brand, setBrand] = useState("ANITA");
  const [badge, setBadge] = useState("");
  const [editionSize, setEditionSize] = useState("20");
  const [releaseIndex, setReleaseIndex] = useState("");
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState<ProductStatus>("draft");
  const [categoryId, setCategoryId] = useState("");
  const [collectionIds, setCollectionIds] = useState<Set<string>>(new Set());
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [removedVariantIds, setRemovedVariantIds] = useState<string[]>([]);
  const [images, setImages] = useState<AdminImage[]>([]);
  const [categories, setCategories] = useState<Taxonomy[]>([]);
  const [collections, setCollections] = useState<Taxonomy[]>([]);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState(false);
  // Guards the save buttons against firing while an existing product's
  // data is still being fetched — otherwise a click that lands in that
  // window sees the pre-load empty name/price and incorrectly rejects a
  // product that genuinely has both, just not painted into state yet.
  const [loadingProduct, setLoadingProduct] = useState(!isNew);

  const loadProduct = useCallback(async (pid: string) => {
    const p = await fetchAdminProduct(pid);
    setName(p.name);
    setSlug(p.slug);
    setSavedSlug(p.slug);
    setDescription(p.description ?? "");
    setPrice(String(p.price));
    setSalePrice(p.sale_price != null ? String(p.sale_price) : "");
    setSku(p.sku ?? "");
    setBrand(p.brand);
    setBadge(p.badge ?? "");
    setEditionSize(String(p.edition_size));
    setReleaseIndex(p.release_index != null ? String(p.release_index) : "");
    setFeatured(p.featured);
    setStatus(p.status);
    setCategoryId(p.category_id ?? "");
    setCollectionIds(new Set(p.product_collections.map((c) => c.collection_id)));
    setVariants(
      p.product_variants.map((v) => ({ ...v, key: v.id! }))
    );
    setImages(p.product_images);
  }, []);

  useEffect(() => {
    fetchTaxonomies().then(({ categories, collections }) => {
      setCategories(categories);
      setCollections(collections);
    });
    if (id) {
      void loadProduct(id)
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoadingProduct(false));
    }
  }, [id, loadProduct]);

  const refreshImages = useCallback(() => {
    if (productId) {
      void fetchAdminProduct(productId).then((p) => setImages(p.product_images));
    }
  }, [productId]);

  const onSave = async (e: FormEvent, overrideStatus?: ProductStatus) => {
    e.preventDefault();
    if (busy || loadingProduct) return;
    if (!name.trim() || !price.trim()) {
      setError("Name and price are required.");
      return;
    }
    setBusy(true);
    setError(null);
    setSavedNote(false);
    try {
      const nextStatus = overrideStatus ?? status;
      const input: ProductInput = {
        slug: slug.trim() || slugify(name),
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        sale_price: salePrice.trim() ? Number(salePrice) : null,
        sku: sku.trim() || null,
        brand: brand.trim() || "ANITA",
        badge: badge.trim() || null,
        edition_size: Number(editionSize) || 20,
        release_index: releaseIndex.trim() ? Number(releaseIndex) : null,
        featured,
        status: nextStatus,
        category_id: categoryId || null,
      };
      const pid = await saveProduct(input, productId ?? undefined);
      await syncVariants(
        pid,
        variants.map(({ key: _key, ...v }) => v),
        removedVariantIds
      );
      await setProductCollections(pid, [...collectionIds]);
      setRemovedVariantIds([]);
      setStatus(nextStatus);
      setSavedSlug(input.slug);
      setSavedNote(true);
      if (!productId) {
        setProductId(pid);
        navigate(`/admin/products/${pid}`, { replace: true });
      } else {
        await loadProduct(pid);
      }
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  };

  const addVariant = () =>
    setVariants((prev) => [
      ...prev,
      { key: `new-${Date.now()}`, size: "M", color: "One Colour", stock: 0 },
    ]);

  const inputCls =
    "h-12 w-full border-b border-line bg-transparent text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none";

  return (
    <div>
      <Link to="/admin/products" className="label link-underline inline-flex items-center gap-2 text-muted">
        <ArrowLeft size={13} strokeWidth={1.5} /> All Products
      </Link>

      <div className="mt-6">
        <PageTitle
          eyebrow={isNew && !productId ? "New Product" : "Edit Product"}
          title={name || "Untitled Garment"}
          action={
            <div className="flex items-center gap-3">
              <StatusBadge status={status} />
              {savedSlug && (
                <Link
                  to={`/product/${savedSlug}?preview=1`}
                  target="_blank"
                  className="label link-underline"
                >
                  Preview
                </Link>
              )}
            </div>
          }
        />
      </div>

      <form
        onSubmit={(e) => onSave(e)}
        noValidate
        className="mt-10 grid grid-cols-1 gap-x-12 gap-y-12 xl:grid-cols-2"
      >
        {/* Left column: details */}
        <Reveal className="space-y-8">
          <p className="label border-b border-line pb-4">Details</p>
          <AuthField
            label="Product Name"
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            disabled={busy}
          />
          <AuthField
            label="Slug (URL)"
            type="text"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            disabled={busy}
          />
          <div>
            <label htmlFor="description" className="label text-muted">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              disabled={busy}
              className="mt-1 w-full resize-y border-b border-line bg-transparent py-2 text-sm leading-relaxed text-ink focus:border-ink focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <AuthField
              label="Price ($)"
              type="number"
              min="0"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={busy}
            />
            <AuthField
              label="Sale Price ($, optional)"
              type="number"
              min="0"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              disabled={busy}
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <AuthField
              label="SKU"
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              disabled={busy}
            />
            <AuthField
              label="Brand"
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              disabled={busy}
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <AuthField
              label="Badge (e.g. SIGNATURE)"
              type="text"
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              disabled={busy}
            />
            <div className="grid grid-cols-2 gap-4">
              <AuthField
                label="Edition Size"
                type="number"
                min="1"
                value={editionSize}
                onChange={(e) => setEditionSize(e.target.value)}
                disabled={busy}
              />
              <AuthField
                label="Release No."
                type="number"
                value={releaseIndex}
                onChange={(e) => setReleaseIndex(e.target.value)}
                disabled={busy}
              />
            </div>
          </div>

          <div>
            <label htmlFor="category" className="label text-muted">
              Category
            </label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={busy}
              className={`${inputCls} cursor-pointer appearance-none`}
            >
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="label text-muted">Collections</p>
            <div className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
              {collections.map((c) => (
                <label key={c.id} className="label flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={collectionIds.has(c.id)}
                    onChange={(e) =>
                      setCollectionIds((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(c.id);
                        else next.delete(c.id);
                        return next;
                      })
                    }
                    className="h-3.5 w-3.5 accent-ink"
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </div>

          <label className="label flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="h-3.5 w-3.5 accent-ink"
            />
            Featured product
          </label>
        </Reveal>

        {/* Right column: variants + images */}
        <Reveal delay={0.08} className="space-y-12">
          <div>
            <div className="flex items-center justify-between border-b border-line pb-4">
              <p className="label">Sizes, Colours & Stock</p>
              <button type="button" onClick={addVariant} className="label link-underline">
                Add Variant
              </button>
            </div>
            {variants.length === 0 ? (
              <p className="label mt-6 text-muted">No variants yet — add sizes above.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {variants.map((v, i) => (
                  <div key={v.key} className="flex items-center gap-3">
                    <select
                      value={v.size}
                      aria-label="Size"
                      onChange={(e) =>
                        setVariants((prev) =>
                          prev.map((row, j) => (j === i ? { ...row, size: e.target.value } : row))
                        )
                      }
                      className="label h-10 w-20 cursor-pointer appearance-none border-b border-line bg-transparent focus:border-ink focus:outline-none"
                    >
                      {SIZE_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={v.color}
                      aria-label="Colour"
                      onChange={(e) =>
                        setVariants((prev) =>
                          prev.map((row, j) => (j === i ? { ...row, color: e.target.value } : row))
                        )
                      }
                      className="h-10 flex-1 border-b border-line bg-transparent text-sm focus:border-ink focus:outline-none"
                    />
                    <input
                      type="number"
                      min="0"
                      value={v.stock}
                      aria-label="Stock"
                      onChange={(e) =>
                        setVariants((prev) =>
                          prev.map((row, j) =>
                            j === i ? { ...row, stock: Math.max(0, Number(e.target.value)) } : row
                          )
                        )
                      }
                      className="h-10 w-20 border-b border-line bg-transparent text-sm focus:border-ink focus:outline-none"
                    />
                    <button
                      type="button"
                      aria-label="Remove variant"
                      onClick={() => {
                        if (v.id) setRemovedVariantIds((prev) => [...prev, v.id!]);
                        setVariants((prev) => prev.filter((_, j) => j !== i));
                      }}
                      className="p-1.5 text-muted transition-colors hover:text-ink"
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {productId ? (
            <ImageManager productId={productId} images={images} onChange={refreshImages} />
          ) : (
            <div>
              <p className="label border-b border-line pb-4">Images</p>
              <p className="label mt-6 text-muted">
                Save as draft first to enable image upload.
              </p>
            </div>
          )}
        </Reveal>

        {/* Footer actions */}
        <div className="xl:col-span-2">
          {error && (
            <p role="alert" className="mb-4 text-sm text-[#9c4a33]">
              {error}
            </p>
          )}
          {savedNote && (
            <p role="status" className="label mb-4 text-muted">
              Saved.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-8">
            <AdminButton solid type="submit" disabled={busy || loadingProduct}>
              {busy ? "Saving…" : status === "published" ? "Save Changes" : "Save"}
            </AdminButton>
            {status !== "published" && (
              <AdminButton disabled={busy || loadingProduct} onClick={() => onSave(new Event("submit") as unknown as FormEvent, "published")}>
                Save & Publish
              </AdminButton>
            )}
            {status === "published" && (
              <AdminButton disabled={busy || loadingProduct} onClick={() => onSave(new Event("submit") as unknown as FormEvent, "draft")}>
                Unpublish to Draft
              </AdminButton>
            )}
            {status !== "archived" ? (
              <AdminButton disabled={busy || loadingProduct || !productId} onClick={() => onSave(new Event("submit") as unknown as FormEvent, "archived")}>
                Archive
              </AdminButton>
            ) : (
              <AdminButton disabled={busy || loadingProduct} onClick={() => onSave(new Event("submit") as unknown as FormEvent, "draft")}>
                Restore to Draft
              </AdminButton>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
