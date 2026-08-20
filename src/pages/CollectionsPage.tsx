import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { ProductGrid } from "../components/ProductGrid";
import { Reveal } from "../components/Reveal";
import { useProducts } from "../context/ProductsContext";
import type { Category, SortOption } from "../types";
import { pageVariants } from "../lib/motionVariants";

const CATEGORIES: (Category | "ALL")[] = [
  "ALL",
  "T-SHIRTS",
  "KNITWEAR",
  "SHIRTS",
  "TROUSERS",
  "DRESSES",
  "TAILORING",
];

const SORT_LABELS: Record<SortOption, string> = {
  FEATURED: "Featured",
  NEWEST: "Newest",
  PRICE_LOW: "Price, low to high",
  PRICE_HIGH: "Price, high to low",
};

export function CollectionsPage() {
  const { products } = useProducts();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category | "ALL">("ALL");
  const [sort, setSort] = useState<SortOption>("FEATURED");

  const filteredProducts = useMemo(() => {
    let result = products;

    if (category !== "ALL") {
      result = result.filter((p) => p.category === category);
    }

    if (search.trim()) {
      const query = search.trim().toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(query));
    }

    result = [...result];
    switch (sort) {
      case "NEWEST":
        result.sort((a, b) => b.releaseIndex - a.releaseIndex);
        break;
      case "PRICE_LOW":
        result.sort((a, b) => a.price - b.price);
        break;
      case "PRICE_HIGH":
        result.sort((a, b) => b.price - a.price);
        break;
      case "FEATURED":
      default:
        result.sort((a, b) => a.releaseIndex - b.releaseIndex);
        break;
    }

    return result;
  }, [products, search, category, sort]);

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      className="mx-auto max-w-[1400px] px-6 pt-28 md:px-12 md:pt-36 lg:pt-48"
    >
      <Reveal>
        <p className="label text-muted">Curated Collection</p>
        <h1 className="mt-4 font-serif text-5xl leading-[1.02] sm:mt-6 md:text-6xl lg:text-8xl">
          Collections
        </h1>
        <p className="mt-4 max-w-[420px] text-sm leading-relaxed text-muted sm:mt-6">
          Real pieces, real stock — browse the full collection.
        </p>
      </Reveal>

      <Reveal delay={0.1} className="mt-12 border-y border-line py-4 sm:mt-20 sm:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-5 overflow-x-auto no-scrollbar sm:gap-6 lg:flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={c === category}
                className={`label link-underline shrink-0 whitespace-nowrap transition-colors ${
                  c === category ? "is-active text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {c === "ALL" ? "All" : c.charAt(0) + c.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
            <div className="flex items-center gap-3 border-b border-line focus-within:border-ink sm:flex-1 lg:w-[220px] lg:flex-none">
              <Search size={14} strokeWidth={1.5} className="shrink-0 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search garments"
                aria-label="Search garments"
                className="h-9 w-full bg-transparent text-sm placeholder:text-muted focus:outline-none"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              aria-label="Sort products"
              className="label h-9 shrink-0 cursor-pointer appearance-none bg-transparent pr-1 focus:outline-none"
            >
              {Object.entries(SORT_LABELS).map(([key, text]) => (
                <option key={key} value={key}>
                  {text}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Reveal>

      <p className="label mt-6 text-muted sm:mt-8">
        {filteredProducts.length} {filteredProducts.length === 1 ? "piece" : "pieces"}
      </p>

      <div className="mt-8 pb-20 sm:mt-12 sm:pb-32">
        <ProductGrid products={filteredProducts} />
      </div>
    </motion.div>
  );
}
