import type { FormEvent } from "react";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";
import { subscribeToNewsletter } from "../lib/newsletter";

export function NewsletterSection() {
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
    <section className="mx-auto max-w-[1400px] px-6 py-16 md:px-12 md:py-24 lg:py-48">
      <div className="mx-auto max-w-[640px] text-center">
        <Reveal>
          <p className="label text-muted">Newsletter</p>
          <h2 className="mt-4 font-serif text-4xl leading-[1.05] sm:mt-6 md:text-5xl lg:text-6xl">
            Stay Inspired
          </h2>
          <p className="mx-auto mt-4 max-w-[420px] text-sm leading-relaxed text-muted sm:mt-6">
            Editions announcements, studio notes, and essays on dressing well —
            a few times a season, never more.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          {status === "done" ? (
            <p className="mt-8 text-sm text-muted sm:mt-12">Thank you — you're on the list.</p>
          ) : (
            <>
              <form
                onSubmit={onSubmit}
                className="mx-auto mt-8 flex max-w-[420px] items-center border-b border-ink sm:mt-12"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  aria-label="Email address"
                  disabled={status === "sending"}
                  className="h-12 w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="label flex shrink-0 items-center gap-2 p-2 transition-opacity hover:opacity-60 disabled:opacity-40"
                >
                  {status === "sending" ? "Sending" : "Subscribe"}{" "}
                  <ArrowRight size={14} strokeWidth={1.5} />
                </button>
              </form>
              {status === "error" && (
                <p role="alert" className="mt-4 text-xs text-muted">
                  Something went wrong — please check the address and try again.
                </p>
              )}
              {status === "rate_limited" && (
                <p role="alert" className="mt-4 text-xs text-muted">
                  Too many attempts — please try again in a little while.
                </p>
              )}
            </>
          )}
        </Reveal>
      </div>
    </section>
  );
}
