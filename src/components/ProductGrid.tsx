import type { Product } from "../types";
import { ProductCard } from "./ProductCard";

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="py-20 text-center sm:py-32">
        <p className="label text-muted">No garments match your search</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-14 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-20">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} delay={(index % 3) * 0.08} />
      ))}
    </div>
  );
}
