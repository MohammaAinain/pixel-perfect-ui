import { Link } from "@tanstack/react-router";
import type { CatalogProduct } from "@/lib/catalog.functions";
import { effectivePrice, formatINR } from "@/lib/shop";

export function ProductCard({ product }: { product: CatalogProduct }) {
  const price = effectivePrice(product);
  const onSale = product.sale_price !== null && product.sale_price < product.price;
  const soldOut = product.stock <= 0;

  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className="group block"
      aria-label={product.name}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-col gap-1">
          {soldOut && (
            <span className="bg-ink px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-background">
              Sold out
            </span>
          )}
          {!soldOut && onSale && (
            <span className="bg-ink px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-background">
              {product.discount_percent}% off
            </span>
          )}
          {!soldOut && !onSale && product.new_arrival && (
            <span className="bg-background px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground">
              New
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{product.name}</p>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {product.category?.name}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold">{formatINR(price)}</p>
          {onSale && (
            <p className="text-xs text-muted-foreground line-through">
              {formatINR(product.price)}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
