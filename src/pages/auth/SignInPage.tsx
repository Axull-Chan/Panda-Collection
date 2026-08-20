import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { AuthCheckbox, AuthError, AuthField, AuthSubmit } from "../../components/auth/AuthField";

export function SignInPage() {
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/account";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to={from} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const err = await signIn(email, password, remember);
    setBusy(false);
    if (err) setError(err);
    else navigate(from, { replace: true });
  };

  return (
    <AuthLayout
      eyebrow="Account"
      title="Sign In"
      intro="Access your orders and wishlist."
      image={{
        src: "/images/check-trouser.jpg",
        alt: "Pleated check trousers",
        caption: "Pleated Check Trouser",
      }}
    >
      <form onSubmit={onSubmit} className="space-y-8" noValidate>
        <AuthField
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
        />
        <AuthField
          label="Password"
          concealable
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
        />

        <div className="flex items-center justify-between gap-4">
          <AuthCheckbox
            id="remember-me"
            label="Remember me"
            checked={remember}
            onChange={setRemember}
          />
          <Link to="/account/forgot-password" className="label link-underline text-muted">
            Forgot password
          </Link>
        </div>

        <AuthError message={error} />
        <AuthSubmit busy={busy}>{busy ? "Signing in" : "Sign In"}</AuthSubmit>
      </form>

      <p className="mt-10 text-sm text-muted">
        Don't have an account?{" "}
        <Link to="/account/sign-up" className="link-underline text-ink">
          Create Account
        </Link>
      </p>
    </AuthLayout>
  );
}
