import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Adds a show/hide toggle for password inputs */
  concealable?: boolean;
}

/** Hairline editorial input — label above, bottom border, no boxes. */
export function AuthField({ label, concealable, type, id, ...rest }: AuthFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div>
      <label htmlFor={inputId} className="label text-muted">
        {label}
      </label>
      <div className="flex items-center border-b border-line focus-within:border-ink">
        <input
          id={inputId}
          type={concealable ? (revealed ? "text" : "password") : type}
          className="h-12 w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none disabled:opacity-50"
          {...rest}
        />
        {concealable && (
          <button
            type="button"
            aria-label={revealed ? "Hide password" : "Show password"}
            onClick={() => setRevealed((r) => !r)}
            className="p-2 text-muted transition-colors hover:text-ink"
          >
            {revealed ? <EyeOff size={15} strokeWidth={1.5} /> : <Eye size={15} strokeWidth={1.5} />}
          </button>
        )}
      </div>
    </div>
  );
}

export function AuthCheckbox({
  label,
  checked,
  onChange,
  id,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-3 select-none">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`flex h-4 w-4 shrink-0 items-center justify-center border transition-colors duration-300 ${
          checked ? "border-ink bg-ink" : "border-line bg-transparent"
        }`}
      >
        {checked && (
          <svg viewBox="0 0 10 8" className="h-2 w-2.5 fill-none stroke-bg" strokeWidth="1.5">
            <path d="M1 4l2.5 2.5L9 1" />
          </svg>
        )}
      </span>
      <span className="text-xs text-muted peer-focus-visible:underline">{label}</span>
    </label>
  );
}

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="mt-4 text-xs leading-relaxed text-[#9c4a33]">{message}</p>;
}

export function AuthSubmit({ children, busy }: { children: ReactNode; busy?: boolean }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="label mt-8 h-14 w-full border border-ink bg-ink text-bg transition-colors duration-300 hover:bg-transparent hover:text-ink disabled:pointer-events-none disabled:opacity-50"
    >
      {children}
    </button>
  );
}
