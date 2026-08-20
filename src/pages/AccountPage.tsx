import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Package } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useProducts } from "../context/ProductsContext";
import { useWishlist } from "../context/WishlistContext";
import {
  fetchOrders,
  formatOrderDate,
  formatStatus,
  orderNumber,
  type OrderRecord,
} from "../lib/orders";
import { Reveal } from "../components/Reveal";
import { Image } from "../components/Image";
import { AuthError, AuthField, AuthSubmit } from "../components/auth/AuthField";
import { formatIDR } from "../lib/currency";
import { pageVariants } from "../lib/motionVariants";

function AccountSection({
  index,
  id,
  title,
  children,
}: {
  index: string;
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Reveal>
      <section id={id} className="scroll-mt-28 border-t border-line pt-10 sm:pt-14">
        <p className="label text-muted">{index}</p>
        <h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">{title}</h2>
        <div className="mt-8">{children}</div>
      </section>
    </Reveal>
  );
}

function EmptyState({
  icon,
  text,
  linkText,
  linkTo,
}: {
  icon: ReactNode;
  text: string;
  linkText: string;
  linkTo: string;
}) {
  return (
    <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4 text-muted">
        {icon}
        <p className="text-sm leading-relaxed">{text}</p>
      </div>
      <Link to={linkTo} className="label link-underline shrink-0">
        {linkText}
      </Link>
    </div>
  );
}

export function AccountPage() {
  const { user, profile, signOut, sendPasswordReset, updateProfile } = useAuth();
  const { products } = useProducts();
  const { ids: wishlistIds } = useWishlist();
  const [orders, setOrders] = useState<OrderRecord[] | null>(null);
  const navigate = useNavigate();

  const savedProducts = products.filter((p) => p.dbId && wishlistIds.has(p.dbId));

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchOrders().then((data) => {
      if (!cancelled) setOrders(data);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  const firstName = (profile?.full_name ?? "").split(" ")[0] || "there";

  const onSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setProfileError(null);
    setProfileSaved(false);
    const err = await updateProfile({ full_name: fullName.trim(), phone: phone.trim() });
    setBusy(false);
    if (err) setProfileError(err);
    else setProfileSaved(true);
  };

  const onSendReset = async () => {
    if (!user?.email) return;
    const err = await sendPasswordReset(user.email);
    if (!err) setResetSent(true);
  };

  const onSignOut = async () => {
    // Navigate off this guarded route before the auth state actually flips:
    // otherwise RequireAuth reactively redirects to /account/sign-in the
    // instant `user` becomes null, racing this call and usually winning.
    navigate("/");
    await signOut();
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      className="mx-auto max-w-[1400px] px-6 pb-20 pt-28 sm:pb-32 md:px-12 md:pt-36 lg:pt-48"
    >
      <Reveal>
        <p className="label text-muted">My Account</p>
        <h1 className="mt-4 font-serif text-4xl leading-[1.05] sm:mt-6 sm:text-5xl md:text-6xl">
          Welcome back, {firstName}.
        </h1>
        <p className="mt-4 max-w-[420px] text-sm leading-relaxed text-muted sm:mt-6">
          Your profile, wishlist, and orders — all in one quiet place.
        </p>
      </Reveal>

      <div className="mt-14 max-w-[720px] space-y-14 sm:mt-20 sm:space-y-20">
        <AccountSection index="01 — Profile" title="Profile">
          <form onSubmit={onSaveProfile} className="space-y-8" noValidate>
            <div>
              <p className="label text-muted">Email</p>
              <p className="flex h-12 items-center border-b border-line text-sm text-muted">
                {user?.email}
              </p>
            </div>
            <AuthField
              label="Full Name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={busy}
            />
            <AuthField
              label="Phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={busy}
            />
            <AuthError message={profileError} />
            {profileSaved && <p className="mt-4 text-xs text-muted">Saved.</p>}
            <div className="max-w-[240px]">
              <AuthSubmit busy={busy}>{busy ? "Saving" : "Save Changes"}</AuthSubmit>
            </div>
          </form>
        </AccountSection>

        <AccountSection index="02 — Wishlist" id="wishlist" title="Wishlist">
          {savedProducts.length === 0 ? (
            <EmptyState
              icon={<Heart size={16} strokeWidth={1.5} />}
              text="Nothing saved yet. Pieces you love will gather here."
              linkText="Explore Collection"
              linkTo="/collections"
            />
          ) : (
            <div>
              <div className="grid grid-cols-4 gap-3 sm:gap-4">
                {savedProducts.slice(0, 4).map((p) => (
                  <Link key={p.id} to={`/product/${p.id}`} className="group block">
                    <Image src={p.image} alt={p.name} aspectRatio="3/4" hoverZoom />
                  </Link>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-muted">
                  {savedProducts.length} {savedProducts.length === 1 ? "piece" : "pieces"} saved
                </p>
                <Link to="/account/wishlist" className="label link-underline">
                  View Wishlist
                </Link>
              </div>
            </div>
          )}
        </AccountSection>

        <AccountSection index="03 — Orders" id="orders" title="Orders">
          {!orders || orders.length === 0 ? (
            <EmptyState
              icon={<Package size={16} strokeWidth={1.5} />}
              text="No orders yet. Your orders will be listed here."
              linkText="Explore Collection"
              linkTo="/collections"
            />
          ) : (
            <div>
              <div className="divide-y divide-line border-y border-line">
                {orders.slice(0, 3).map((order) => (
                  <Link
                    key={order.id}
                    to="/account/orders"
                    className="flex flex-col gap-1.5 py-5 transition-colors hover:bg-panel/40 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <div className="flex items-center gap-5">
                      <span className="label">{orderNumber(order.id)}</span>
                      <span className="label text-muted">{formatOrderDate(order.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-5">
                      <span className="label text-muted">{formatStatus(order.status)}</span>
                      <span className="label">{formatIDR(order.total)}</span>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mt-6 text-right">
                <Link to="/account/orders" className="label link-underline">
                  View All Orders
                </Link>
              </div>
            </div>
          )}
        </AccountSection>

        <AccountSection index="04 — Settings" title="Account Settings">
          <div className="space-y-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">Change your password by email link.</p>
              {resetSent ? (
                <p className="label text-muted">Reset link sent</p>
              ) : (
                <button type="button" onClick={onSendReset} className="label link-underline">
                  Send Reset Link
                </button>
              )}
            </div>
            <div className="flex flex-col items-start gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">Signed in as {user?.email}</p>
              <button
                type="button"
                onClick={onSignOut}
                className="label border border-ink px-6 py-3 transition-colors duration-300 hover:bg-ink hover:text-bg"
              >
                Sign Out
              </button>
            </div>
          </div>
        </AccountSection>
      </div>
    </motion.div>
  );
}
