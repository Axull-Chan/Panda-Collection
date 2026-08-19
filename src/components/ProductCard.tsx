import { Link } from "react-router-dom";
import type { Product } from "../types";
import { Reveal } from "./Reveal";
import { Image } from "./Image";
import { formatIDR } from "../lib/currency";

export function ProductCard({ product, delay = 0 }: { product: Product; delay?: number }) {
  return (
    <Reveal delay={delay}>
      <Link to={`/product/${product.id}`} className="group block">
        <Image src={product.image} alt={product.name} aspectRatio="3/4" hoverZoom>
          <div className="pointer-events-none absolute inset-0 bg-ink/0 transition-colors duration-500 group-hover:bg-ink/10" />
        </Image>

        <p className="label mt-3 min-w-0 truncate text-muted sm:mt-5 sm:overflow-visible sm:whitespace-normal">
          {product.category}
          {product.badge ? ` — ${product.badge}` : ""}
        </p>
        <h3 className="mt-1.5 font-serif text-base leading-tight sm:mt-2 sm:text-2xl">
          {product.name}
        </h3>
        <div className="mt-1.5 flex items-baseline justify-between gap-2 sm:mt-2 sm:gap-4">
          <p className="label">{formatIDR(product.price)}</p>
          <span className="label link-underline hidden text-muted transition-colors group-hover:text-ink sm:inline">
            View Details
          </span>
        </div>
      </Link>
    </Reveal>
  );
}
