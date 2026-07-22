import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { AuthCheckbox, AuthError, AuthField, AuthSubmit } from "../../components/auth/AuthField";

export function SignUpPage() {
  const { user, loading, signUp } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  if (!loading && user) return <Navigate to="/account" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!agreed) {
      setError("Please agree to the Terms & Privacy Policy.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await signUp(firstName, lastName, email, password);
    setBusy(false);
    if (result.error) setError(result.error);
    else if (result.needsConfirmation) setConfirmationSent(true);
    else navigate("/account", { replace: true });
  };

  if (confirmationSent) {
    return (
      <AuthLayout
        eyebrow="Account"
        title="Check your inbox"
        intro={`We've sent a confirmation link to ${email}. Follow it to activate your account, then sign in.`}
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
      title="Create Account"
      intro="Join the house — editions access, order history, and a wishlist of your own."
      image={{
        src: "/images/boucle-suit.jpg",
        alt: "Bouclé skirt suit from Edition No. 01",
        caption: "Edition No. 01 — Bouclé Skirt Suit",
      }}
    >
      <form onSubmit={onSubmit} className="space-y-8" noValidate>
        <div className="grid grid-cols-2 gap-6">
          <AuthField
            label="First Name"
            type="text"
            autoComplete="given-name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={busy}
          />
          <AuthField
            label="Last Name"
            type="text"
            autoComplete="family-name"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={busy}
          />
        </div>
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
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
        />
        <AuthField
          label="Confirm Password"
          concealable
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={busy}
        />

        <AuthCheckbox
          id="agree-terms"
          label="I agree to the Terms & Privacy Policy"
          checked={agreed}
          onChange={setAgreed}
        />

        <AuthError message={error} />
        <AuthSubmit busy={busy}>{busy ? "Creating account" : "Create Account"}</AuthSubmit>
      </form>

      <p className="mt-10 text-sm text-muted">
        Already have an account?{" "}
        <Link to="/account/sign-in" className="link-underline text-ink">
          Sign In
        </Link>
      </p>
    </AuthLayout>
  );
}
