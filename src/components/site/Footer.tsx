import { Link } from "@tanstack/react-router";
const logoAsset = { url: "/img/avenue-nest-mark.png" };

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-ink text-background">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-4 md:px-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <img src={logoAsset.url} alt="" className="size-12 object-contain invert" />
            <p className="font-display text-2xl font-extrabold">Fusion Fabric</p>
          </div>
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
          <p className="eyebrow text-background/50">Connect</p>
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
            <li>
              <a href="https://wa.me/917024293444" target="_blank" rel="noreferrer">
                WhatsApp: +91 70242 93444
              </a>
            </li>
            <li>
              <a href="https://www.instagram.com/fusionfabric_clothing/" target="_blank" rel="noreferrer">
                Instagram: fusionfabric_clothing
              </a>
            </li>
            <li>
              <a href="https://www.instagram.com/fusion_fabric_/" target="_blank" rel="noreferrer">
                Instagram: fusion_fabric_
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-background/10 px-5 py-6 text-center text-xs text-background/50 md:px-8">
        &copy; {new Date().getFullYear()} Fusion Fabric. Cash on delivery only.
      </div>
    </footer>
  );
}
