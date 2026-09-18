import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-ink text-background">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-4 md:px-8">
        <div className="md:col-span-2">
          <p className="font-display text-2xl font-extrabold uppercase tracking-[-0.04em]">
            Modish Clothing
          </p>
          <p className="mt-3 max-w-sm text-sm text-background/60">
            Considered menswear in a strict monochrome palette. Made in small runs, shipped
            across India, paid for on delivery.
          </p>
        </div>
        <div>
          <p className="eyebrow text-background/50">Shop</p>
          <ul className="mt-4 space-y-2 text-sm text-background/70">
            <li>
              <Link to="/shop" search={{ category: "shirts" }}>
                Shirts
              </Link>
            </li>
            <li>
              <Link to="/shop" search={{ category: "t-shirts" }}>
                T-Shirts
              </Link>
            </li>
            <li>
              <Link to="/shop" search={{ category: "oversized-t-shirts" }}>
                Oversized T-Shirts
              </Link>
            </li>
            <li>
              <Link to="/shop" search={{ category: "pants" }}>
                Pants
              </Link>
            </li>
            <li>
              <Link to="/shop" search={{ category: "jeans" }}>
                Jeans
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="eyebrow text-background/50">Help</p>
          <ul className="mt-4 space-y-2 text-sm text-background/70">
            <li>
              <Link to="/about">About</Link>
            </li>
            <li>
              <Link to="/contact">Contact</Link>
            </li>
            <li>
              <Link to="/policies">Policies</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-background/10 px-5 py-6 text-center text-xs text-background/50 md:px-8">
        &copy; {new Date().getFullYear()} Modish Clothing. Cash on delivery only.
      </div>
    </footer>
  );
}
