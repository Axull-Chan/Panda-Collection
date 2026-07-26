import { lazy, Suspense, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { Route, Routes, useLocation } from "react-router-dom";
import { Nav } from "./components/Nav";
import { Footer } from "./components/Footer";
import { useLenis } from "./lib/useLenis";
import { HomePage } from "./pages/HomePage";
import { CollectionsPage } from "./pages/CollectionsPage";
import { ProductPage } from "./pages/ProductPage";
import { JournalPage } from "./pages/JournalPage";
import { AboutPage } from "./pages/AboutPage";
import { CartPage } from "./pages/CartPage";
import { AccountPage } from "./pages/AccountPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { CheckoutSuccessPage } from "./pages/CheckoutSuccessPage";
import { CheckoutCancelledPage } from "./pages/CheckoutCancelledPage";
import { OrdersPage } from "./pages/OrdersPage";
import { WishlistPage } from "./pages/WishlistPage";
import { SignInPage } from "./pages/auth/SignInPage";
import { SignUpPage } from "./pages/auth/SignUpPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { RequireAuth } from "./components/RequireAuth";

// The admin dashboard is a distinct app that only the house ever opens —
// splitting it into its own chunk keeps it out of every customer's initial
// download entirely.
const RequireAdmin = lazy(() =>
  import("./admin/RequireAdmin").then((m) => ({ default: m.RequireAdmin }))
);
const AdminLayout = lazy(() =>
  import("./admin/AdminLayout").then((m) => ({ default: m.AdminLayout }))
);
const DashboardPage = lazy(() =>
  import("./admin/DashboardPage").then((m) => ({ default: m.DashboardPage }))
);
const AdminProductsPage = lazy(() =>
  import("./admin/AdminProductsPage").then((m) => ({ default: m.AdminProductsPage }))
);
const ProductEditorPage = lazy(() =>
  import("./admin/ProductEditorPage").then((m) => ({ default: m.ProductEditorPage }))
);
const AdminInventoryPage = lazy(() =>
  import("./admin/AdminInventoryPage").then((m) => ({ default: m.AdminInventoryPage }))
);
const AdminOrdersPage = lazy(() =>
  import("./admin/AdminOrdersPage").then((m) => ({ default: m.AdminOrdersPage }))
);
const AdminCouponsPage = lazy(() =>
  import("./admin/AdminCouponsPage").then((m) => ({ default: m.AdminCouponsPage }))
);
const CouponEditorPage = lazy(() =>
  import("./admin/CouponEditorPage").then((m) => ({ default: m.CouponEditorPage }))
);
const AdminCustomersPage = lazy(() =>
  import("./admin/AdminCustomersPage").then((m) => ({ default: m.AdminCustomersPage }))
);
const AdminAnalyticsPage = lazy(() =>
  import("./admin/AdminPlaceholderPage").then((m) => ({ default: m.AdminAnalyticsPage }))
);
const AdminSettingsPage = lazy(() =>
  import("./admin/AdminPlaceholderPage").then((m) => ({ default: m.AdminSettingsPage }))
);

function App() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  useLenis();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // The admin section has its own shell — no store nav or footer.
  if (isAdmin) {
    return (
      <Suspense fallback={null}>
        <RequireAdmin>
          <Routes>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="products/new" element={<ProductEditorPage />} />
              <Route path="products/:id" element={<ProductEditorPage />} />
              <Route path="inventory" element={<AdminInventoryPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="coupons" element={<AdminCouponsPage />} />
              <Route path="coupons/new" element={<CouponEditorPage />} />
              <Route path="coupons/:id" element={<CouponEditorPage />} />
              <Route path="customers" element={<AdminCustomersPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>
          </Routes>
        </RequireAdmin>
      </Suspense>
    );
  }

  return (
    <div className="flex min-h-svh flex-col">
      <Nav />
      <main className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<HomePage />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/product/:id" element={<ProductPage />} />
            <Route path="/journal" element={<JournalPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/account/sign-in" element={<SignInPage />} />
            <Route path="/account/sign-up" element={<SignUpPage />} />
            <Route path="/account/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/account/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/account"
              element={
                <RequireAuth>
                  <AccountPage />
                </RequireAuth>
              }
            />
            <Route
              path="/account/wishlist"
              element={
                <RequireAuth>
                  <WishlistPage />
                </RequireAuth>
              }
            />
            <Route
              path="/account/orders"
              element={
                <RequireAuth>
                  <OrdersPage />
                </RequireAuth>
              }
            />
            <Route
              path="/checkout"
              element={
                <RequireAuth>
                  <CheckoutPage />
                </RequireAuth>
              }
            />
            <Route
              path="/checkout/success"
              element={
                <RequireAuth>
                  <CheckoutSuccessPage />
                </RequireAuth>
              }
            />
            <Route
              path="/checkout/cancelled"
              element={
                <RequireAuth>
                  <CheckoutCancelledPage />
                </RequireAuth>
              }
            />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}

export default App;
