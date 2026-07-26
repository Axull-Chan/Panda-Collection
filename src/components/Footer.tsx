import type { FormEvent } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { subscribeToNewsletter } from "../lib/newsletter";

const NAV = [
  { to: "/", text: "Home" },
  { to: "/collections", text: "Collections" },
  { to: "/journal", text: "Journal" },
  { to: "/about", text: "About" },
];

const SOCIALS = ["Instagram", "Pinterest", "Are.na"];

export function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error" | "rate_limited">(
    "idle"
  );

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === "sending") return;
    setStatus("sending");
    const result = await subscribeToNewsletter(email);
    if (result === "ok") {
      setStatus("done");
      setEmail("");
    } else if (result === "rate_limited") {
      setStatus("rate_limited");
    } else {
      setStatus("error");
    }
  };

  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-[1400px] px-6 py-14 lg:px-12 lg:py-20">
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:gap-x-8 lg:gap-y-14 lg:grid-cols-12">
          <div className="col-span-2 lg:col-span-3">
            <p className="font-serif text-xl tracking-[0.16em] lg:text-[26px] lg:tracking-[0.22em]">
              ANITA
            </p>
            <p className="mt-4 max-w-[240px] text-sm leading-relaxed text-muted">
              Garments in numbered editions. Designed slowly, made once.
            </p>
          </div>

          <nav aria-label="Footer" className="lg:col-span-2">
            <p className="label text-muted">Navigation</p>
            <ul className="mt-5 space-y-3">
              {NAV.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="link-underline text-sm">
                    {l.text}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-2">
            <p className="label text-muted">Social</p>
            <ul className="mt-5 space-y-3">
              {SOCIALS.map((s) => (
                <li key={s}>
                  <a href="#" className="link-underline text-sm">
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <p className="label text-muted">Contact</p>
            <ul className="mt-5 space-y-3 text-sm text-muted">
              <li>
                <a href="mailto:atelier@anita.example" className="link-underline text-ink">
                  atelier@anita.example
                </a>
              </li>
              <li>Rua da Rosa 114</li>
              <li>1200-385 Lisboa</li>
            </ul>
          </div>

          <div className="col-span-1 lg:col-span-3">
            <p className="label text-muted">Newsletter</p>
            {status === "done" ? (
              <p className="mt-5 text-sm text-muted">Thank you — you're on the list.</p>
            ) : (
              <>
                <form onSubmit={onSubmit} className="mt-5 flex items-center border-b border-ink">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    aria-label="Email address"
                    disabled={status === "sending"}
                    className="h-11 w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    aria-label="Subscribe"
                    disabled={status === "sending"}
                    className="p-2 disabled:opacity-40"
                  >
                    <ArrowRight size={16} strokeWidth={1.5} />
                  </button>
                </form>
                {status === "error" && (
                  <p className="mt-3 text-xs text-muted">
                    Something went wrong — please try again.
                  </p>
                )}
                {status === "rate_limited" && (
                  <p className="mt-3 text-xs text-muted">
                    Too many attempts — please try again in a little while.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-line pt-8 lg:mt-20 lg:flex-row lg:items-center lg:justify-between">
          <p className="label text-muted">© 2026 Anita Atelier. All rights reserved.</p>
          <p className="label text-muted">Numbered editions — made once, kept forever</p>
        </div>
      </div>
    </footer>
  );
}
