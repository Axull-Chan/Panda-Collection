import { Reveal } from "../components/Reveal";
import { PageTitle } from "./ui";

const SETTINGS_SECTIONS = [
  { title: "Store Settings", note: "Name, currency, contact details." },
  { title: "Shipping", note: "Zones, rates, and carriers." },
  { title: "Payment", note: "Stripe connection and payout settings." },
  { title: "Taxes", note: "Regional tax rules." },
  { title: "Discounts", note: "Coupons and campaign pricing." },
  { title: "Email Templates", note: "Order confirmations and shipping notices." },
];

export function AdminSettingsPage() {
  return (
    <div>
      <PageTitle eyebrow="Configuration" title="Settings" />
      <Reveal className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SETTINGS_SECTIONS.map((s) => (
          <div key={s.title} className="border border-line px-6 py-6">
            <h2 className="font-serif text-2xl">{s.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{s.note}</p>
            <p className="label mt-5 text-muted">Coming soon</p>
          </div>
        ))}
      </Reveal>
    </div>
  );
}

export function AdminAnalyticsPage() {
  return (
    <div>
      <PageTitle eyebrow="Insight" title="Analytics" />
      <Reveal className="mt-10 max-w-[520px]">
        <p className="text-sm leading-relaxed text-muted">
          Sales trends, best-selling editions, and customer insight will live
          here once payments are connected. For now, the Dashboard shows live
          counts for products, orders, stock, and customers.
        </p>
      </Reveal>
    </div>
  );
}
