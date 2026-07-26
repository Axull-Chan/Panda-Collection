import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Search, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { orderNumber } from "../lib/orders";
import { EASE } from "../lib/motionVariants";

const ADMIN_LINKS = [
  { to: "/admin", labelText: "Dashboard", end: true },
  { to: "/admin/products", labelText: "Products", end: false },
  { to: "/admin/orders", labelText: "Orders", end: false },
  { to: "/admin/coupons", labelText: "Coupons", end: false },
  { to: "/admin/inventory", labelText: "Inventory", end: false },
  { to: "/admin/customers", labelText: "Customers", end: false },
  { to: "/admin/analytics", labelText: "Analytics", end: false },
  { to: "/admin/settings", labelText: "Settings", end: false },
];

interface SearchResults {
  products: { id: string; name: string }[];
  orders: { id: string; email: string | null }[];
  customers: { id: string; label: string }[];
}

function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const navigate = useNavigate();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    const t = setTimeout(async () => {
      const term = `%${query.trim()}%`;
      const [prods, custs, orders] = await Promise.all([
        supabase.from("products").select("id,name").ilike("name", term).limit(5),
        supabase
          .from("profiles")
          .select("id,full_name,email")
          .or(`full_name.ilike.${term},email.ilike.${term}`)
          .limit(5),
        supabase
          .from("orders")
          .select("id,email")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      const q = query.trim().toLowerCase();
      setResults({
        products: prods.data ?? [],
        customers: (custs.data ?? []).map((c) => ({
          id: c.id,
          label: c.full_name || c.email || "—",
        })),
        orders: (orders.data ?? [])
          .filter(
            (o) =>
              orderNumber(o.id).toLowerCase().includes(q) ||
              (o.email ?? "").toLowerCase().includes(q)
          )
          .slice(0, 5),
      });
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setResults(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setResults(null);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const go = (path: string) => {
    setQuery("");
    setResults(null);
    navigate(path);
  };

  const empty =
    results && !results.products.length && !results.orders.length && !results.customers.length;

  return (
    <div ref={boxRef} className="relative w-full max-w-[320px]">
      <div className="flex items-center gap-3 border-b border-line focus-within:border-ink">
        <Search size={14} strokeWidth={1.5} className="shrink-0 text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products, orders, customers"
          aria-label="Global search"
          className="h-9 w-full bg-transparent text-sm placeholder:text-muted focus:outline-none"
        />
      </div>
      <AnimatePresence>
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[320px] overflow-y-auto border border-line bg-bg py-2"
          >
            {empty && <p className="label px-4 py-2 text-muted">No matches</p>}
            {results.products.length > 0 && (
              <p className="label px-4 pb-1 pt-2 text-muted">Products</p>
            )}
            {results.products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => go(`/admin/products/${p.id}`)}
                className="block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-panel"
              >
                {p.name}
              </button>
            ))}
            {results.orders.length > 0 && (
              <p className="label px-4 pb-1 pt-2 text-muted">Orders</p>
            )}
            {results.orders.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => go("/admin/orders")}
                className="block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-panel"
              >
                {orderNumber(o.id)} · {o.email ?? "—"}
              </button>
            ))}
            {results.customers.length > 0 && (
              <p className="label px-4 pb-1 pt-2 text-muted">Customers</p>
            )}
            {results.customers.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => go("/admin/customers")}
                className="block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-panel"
              >
                {c.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AdminLayout() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const navLinks = (
    <ul className="space-y-5">
      {ADMIN_LINKS.map((l) => (
        <li key={l.to}>
          <NavLink to={l.to} end={l.end} className="label link-underline">
            {l.labelText}
          </NavLink>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="min-h-svh">
      {/* Top bar */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-line bg-bg">
        <div className="flex h-16 items-center justify-between gap-6 px-6 lg:px-10">
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Open admin menu"
              onClick={() => setMenuOpen(true)}
              className="py-3 -my-3 lg:hidden"
            >
              <Menu size={18} strokeWidth={1.5} />
            </button>
            <Link to="/admin" className="font-serif text-xl tracking-[0.16em]">
              ANITA
            </Link>
            <span className="label mt-0.5 text-muted">Atelier Admin</span>
          </div>
          <div className="hidden flex-1 justify-center md:flex">
            <GlobalSearch />
          </div>
          <Link to="/" className="label link-underline shrink-0">
            View Store
          </Link>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="fixed bottom-0 left-0 top-16 z-30 hidden w-52 border-r border-line px-8 pt-12 lg:block">
        {navLinks}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="fixed inset-0 z-50 bg-bg lg:hidden"
          >
            <div className="flex h-16 items-center justify-between px-6">
              <span className="font-serif text-xl tracking-[0.16em]">ANITA</span>
              <button
                type="button"
                aria-label="Close admin menu"
                onClick={() => setMenuOpen(false)}
                className="py-3 -my-3"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
            <nav className="px-6 pt-10">
              <p className="label mb-6 text-muted">Atelier Admin</p>
              {navLinks}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <main className="px-6 pb-20 pt-28 lg:pl-64 lg:pr-10">
        <div className="md:hidden">
          <GlobalSearch />
        </div>
        <div className="mt-6 md:mt-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
