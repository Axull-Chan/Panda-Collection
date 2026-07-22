import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { AuthError, AuthField, AuthSubmit } from "../../components/auth/AuthField";

export function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !email.trim()) return;
    setBusy(true);
    setError(null);
    const err = await sendPasswordReset(email);
    setBusy(false);
    if (err) setError(err);
    else setSent(true);
  };

  if (sent) {
    return (
      <AuthLayout
        eyebrow="Account"
        title="Check your inbox"
        intro={`If an account exists for ${email}, a reset link is on its way. Follow it to choose a new password.`}
      >
        <Link
          to="/account/sign-in"
          className="label inline-block border border-ink px-8 py-4 transition-colors duration-300 hover:bg-ink hover:text-bg"
        >
          Back to Sign In
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Account"
      title="Forgot Password"
      intro="Enter the email you signed up with and we'll send you a link to reset it."
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
        <AuthError message={error} />
        <AuthSubmit busy={busy}>{busy ? "Sending" : "Send Reset Link"}</AuthSubmit>
      </form>

      <p className="mt-10 text-sm text-muted">
        Remembered it after all?{" "}
        <Link to="/account/sign-in" className="link-underline text-ink">
          Sign In
        </Link>
      </p>
    </AuthLayout>
  );
}
