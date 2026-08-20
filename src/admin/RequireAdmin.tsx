import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { pageVariants } from "../lib/motionVariants";

function AccessDenied() {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      className="flex min-h-svh items-center justify-center px-6"
    >
      <div className="max-w-[480px] text-center">
        <p className="label text-muted">Private</p>
        <h1 className="mt-4 font-serif text-5xl leading-[1.05] sm:text-6xl">
          This area is private.
        </h1>
        <p className="mx-auto mt-6 max-w-[360px] text-sm leading-relaxed text-muted">
          This area is reserved for administrators. If you believe you should
          have access, ask an administrator to invite you.
        </p>
        <Link
          to="/"
          className="label mt-10 inline-block border border-ink px-8 py-4 transition-colors duration-300 hover:bg-ink hover:text-bg"
        >
          Return to the Store
        </Link>
      </div>
    </motion.div>
  );
}

/** Gates the /admin section: sign-in required, then profiles.role = 'admin'. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) {
    return <Navigate to="/account/sign-in" replace state={{ from: location.pathname }} />;
  }
  if (!profile) return null; // profile still loading
  if (profile.role !== "admin") return <AccessDenied />;
  return <>{children}</>;
}
