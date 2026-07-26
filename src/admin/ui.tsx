import type { ReactNode } from "react";
import { Reveal } from "../components/Reveal";

export function PageTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <Reveal className="flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="label text-muted">{eyebrow}</p>
        <h1 className="mt-3 font-serif text-4xl leading-[1.05] sm:text-5xl">{title}</h1>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </Reveal>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="border border-line px-5 py-5 sm:px-6 sm:py-6">
      <p className="label text-muted">{label}</p>
      <p className="mt-3 font-serif text-3xl leading-none sm:text-4xl">{value}</p>
      {hint && <p className="label mt-2 text-muted">{hint}</p>}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  published: "text-ink border-ink",
  draft: "text-muted border-line",
  archived: "text-muted border-line line-through",
  active: "text-ink border-ink",
  inactive: "text-muted border-line",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`label inline-block border px-2.5 py-1 ${STATUS_STYLES[status] ?? "text-muted border-line"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function AdminButton({
  children,
  onClick,
  disabled,
  solid,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  solid?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`label px-5 py-3 transition-colors duration-300 disabled:pointer-events-none disabled:opacity-40 ${
        solid
          ? "border border-ink bg-ink text-bg hover:bg-transparent hover:text-ink"
          : "border border-line text-ink hover:border-ink"
      }`}
    >
      {children}
    </button>
  );
}
