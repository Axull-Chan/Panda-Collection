import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { EASE } from "../lib/motionVariants";

const NAV_LINKS = [
  { to: "/", labelText: "Home" },
  { to: "/collections", labelText: "Collections" },
  { to: "/journal", labelText: "Journal" },
  { to: "/about", labelText: "About" },
];

const ACCOUNT_LINKS = [
  { to: "/account", labelText: "My Account" },
  { to: "/account/wishlist", labelText: "Wishlist" },
  { to: "/account/orders", labelText: "Orders" },
];

function AccountMenu() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [location.pathname, location.hash]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onSignOut = async () => {
    setOpen(false);
    // Navigate before the auth state flips — see AccountPage's onSignOut
    // for why (RequireAuth can otherwise win a race to /account/sign-in
    // when signing out from a guarded route).
    navigate("/");
    await signOut();
  };

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="block py-3 -my-3"
      >
        <User size={17} strokeWidth={1.5} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="Account"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="absolute right-0 top-full mt-4 w-44 border border-line bg-bg py-2"
          >
            {ACCOUNT_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                role="menuitem"
                className="label block px-5 py-2.5 text-ink transition-colors hover:bg-panel"
              >
                {l.labelText}
              </Link>
            ))}
            <button
              type="button"
              role="menuitem"
              onClick={onSignOut}
              className="label block w-full border-t border-line px-5 py-2.5 text-left text-muted transition-colors hover:bg-panel hover:text-ink"
            >
              Sign Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Nav() {
  const { itemCount } = useCart();
  const { user } = useAuth();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Poll via rAF instead of scroll events: smooth-scroll libraries (Lenis)
    // can swallow or re-time native scroll events.
    let raf = 0;
    const check = () => {
      setScrolled(window.scrollY > 24);
      raf = requestAnimationFrame(check);
    };
    raf = requestAnimationFrame(check);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Over the home hero the bar is transparent (the hero artwork is light,
  // so text stays ink); everywhere else it sits on the paper background.
  const overHero = location.pathname === "/" && !scrolled;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 text-ink transition-colors duration-500 ${
          overHero
            ? "border-b border-transparent bg-transparent"
            : "border-b border-line bg-bg"
        }`}
      >
        <div className="mx-auto grid h-16 max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center px-6 lg:h-20 lg:px-12">
          <Link
            to="/"
            className="justify-self-start font-serif text-xl tracking-[0.16em] lg:text-[26px] lg:tracking-[0.22em]"
          >
            ACD
          </Link>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-10">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to} end={link.to === "/"} className="label link-underline">
                    {link.labelText}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-4 justify-self-end lg:gap-6">
            <Link to="/collections" aria-label="Search" className="hidden lg:block">
              <Search size={17} strokeWidth={1.5} />
            </Link>
            {user ? (
              <div className="hidden lg:block">
                <AccountMenu />
              </div>
            ) : (
              <Link to="/account/sign-in" className="label link-underline hidden lg:block">
                Sign In
              </Link>
            )}
            <Link
              to="/cart"
              aria-label={`Cart, ${itemCount} items`}
              className="flex items-center gap-2 py-3 -my-3"
            >
              <ShoppingBag size={17} strokeWidth={1.5} />
              <span className="label">{itemCount}</span>
            </Link>
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
              className="py-3 -my-3 lg:hidden"
            >
              <Menu size={20} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="fixed inset-0 z-50 overflow-y-auto bg-bg text-ink lg:hidden"
          >
            <div className="flex h-16 items-center justify-between px-6">
              <span className="font-serif text-xl tracking-[0.16em]">ACD</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
                className="py-3 -my-3"
              >
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>
            <nav aria-label="Mobile" className="px-6 pt-12 sm:pt-16">
              <ul className="space-y-6 sm:space-y-8">
                {NAV_LINKS.map((link, i) => (
                  <motion.li
                    key={link.to}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE, delay: 0.1 + i * 0.06 }}
                  >
                    <NavLink to={link.to} end={link.to === "/"} className="font-serif text-4xl sm:text-5xl">
                      {link.labelText}
                    </NavLink>
                  </motion.li>
                ))}
              </ul>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.35 }}
                className="mt-10 border-t border-line pt-8 sm:mt-12"
              >
                {user ? (
                  <ul className="space-y-4">
                    {ACCOUNT_LINKS.map((l) => (
                      <li key={l.to}>
                        <Link to={l.to} className="label link-underline">
                          {l.labelText}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Link to="/account/sign-in" className="label link-underline">
                    Sign In
                  </Link>
                )}
              </motion.div>

              <p className="label mt-12 pb-10 text-muted sm:mt-16">
                Curated women's fashion
              </p>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
