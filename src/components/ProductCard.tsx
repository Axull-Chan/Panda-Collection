import { Link } from "react-router-dom";
import type { Product } from "../types";
import { Reveal } from "./Reveal";

export function ProductCard({ product, delay = 0 }: { product: Product; delay?: number }) {
  return (
    <Reveal delay={delay}>
      <Link to={`/product/${product.id}`} className="group block">
        <div className="relative aspect-[3/4] overflow-hidden bg-panel">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
          <div className="pointer-events-none absolute inset-0 bg-ink/0 transition-colors duration-500 group-hover:bg-ink/10" />
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-2 sm:mt-5 sm:gap-4">
          <p className="label min-w-0 truncate text-muted sm:overflow-visible sm:whitespace-normal">
            {product.category}
            {product.badge ? ` — ${product.badge}` : ""}
          </p>
          <p className="label hidden shrink-0 text-muted sm:inline">No. {product.releaseIndex}/20</p>
        </div>
        <h3 className="mt-1.5 font-serif text-base leading-tight sm:mt-2 sm:text-2xl">
          {product.name}
        </h3>
        <div className="mt-1.5 flex items-baseline justify-between gap-2 sm:mt-2 sm:gap-4">
          <p className="label">${product.price}</p>
          <span className="label link-underline hidden text-muted transition-colors group-hover:text-ink sm:inline">
            View Details
          </span>
        </div>
      </Link>
    </Reveal>
  );
}
