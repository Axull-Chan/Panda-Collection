import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { AuthError, AuthField, AuthSubmit } from "../../components/auth/AuthField";

/**
 * Landing page for the password-recovery email link. Supabase signs the
 * visitor in with a temporary recovery session; we let them set a new
 * password and continue to their account.
 */
export function ResetPasswordPage() {
  const { user, loading, updatePassword } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [linkChecked, setLinkChecked] = useState(false);

  // Give supabase-js a moment to consume the token in the URL hash
  useEffect(() => {
    const t = setTimeout(() => setLinkChecked(true), 800);
    return () => clearTimeout(t);
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    const err = await updatePassword(password);
    setBusy(false);
    if (err) setError(err);
    else navigate("/account", { replace: true });
  };

  if ((loading || !linkChecked) && !user) {
    return (
      <AuthLayout eyebrow="Account" title="One moment" intro="Verifying your link…">
        {null}
      </AuthLayout>
    );
  }

  if (!user) {
    return (
      <AuthLayout
        eyebrow="Account"
        title="Link expired"
        intro="This reset link is invalid or has expired. Request a fresh one and try again."
      >
        <Link
          to="/account/forgot-password"
          className="label inline-block border border-ink px-8 py-4 transition-colors duration-300 hover:bg-ink hover:text-bg"
        >
          Request New Link
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Account"
      title="Reset Password"
      intro="Choose a new password for your account."
    >
      <form onSubmit={onSubmit} className="space-y-8" noValidate>
        <AuthField
          label="New Password"
          concealable
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
        />
        <AuthField
          label="Confirm New Password"
          concealable
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={busy}
        />
        <AuthError message={error} />
        <AuthSubmit busy={busy}>{busy ? "Saving" : "Save New Password"}</AuthSubmit>
      </form>
    </AuthLayout>
  );
}
