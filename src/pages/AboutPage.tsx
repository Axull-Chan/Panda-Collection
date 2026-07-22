import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Reveal } from "../components/Reveal";
import { NewsletterSection } from "../components/NewsletterSection";
import { pageVariants } from "../lib/motionVariants";

const PRINCIPLES = [
  {
    title: "Editions, not seasons",
    body: "Twenty pieces per garment, numbered by hand. When an edition closes, the pattern is retired for good.",
  },
  {
    title: "One atelier",
    body: "Every piece is cut, sewn, and finished in our Lisbon studio. Nothing is outsourced; nothing is anonymous.",
  },
  {
    title: "Cloth first",
    body: "Design begins at the mill. We choose the fabric before the silhouette, and let its weight decide the line.",
  },
];

export function AboutPage() {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      className="pt-28 md:pt-36 lg:pt-48"
    >
      <div className="mx-auto max-w-[1400px] px-6 md:px-12">
        <Reveal>
          <p className="label text-muted">The Atelier</p>
          <h1 className="mt-4 max-w-[1000px] font-serif text-4xl leading-[1.05] sm:mt-6 md:text-5xl lg:text-7xl">
            A clothing house that works like a gallery.
          </h1>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-x-8 gap-y-8 sm:mt-24 sm:gap-y-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <div className="aspect-[4/3] overflow-hidden bg-panel">
              <img
                src="/images/wool-suit.jpg"
                alt="The relaxed wool suit from Edition No. 01, photographed in the studio"
                loading="lazy"
                className="h-full w-full object-cover object-top"
              />
            </div>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-4 lg:col-start-9 lg:self-end">
            <p className="text-sm leading-relaxed text-muted">
              ANITA was founded on a simple refusal: no seasons, no restocks, no
              noise. Each garment is drawn once, made twenty times, and numbered
              like a print. The result is a wardrobe of certainties — pieces
              designed to be the calmest thing in the room.
            </p>
            <p className="mt-6 text-sm leading-relaxed text-muted">
              The studio sits above a paper shop in Lisbon. Morning light, chalk
              lines, shears — the tools have not changed. Only the patience has.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 border-t border-line pt-10 sm:mt-32 sm:pt-16 lg:mt-48">
          <Reveal>
            <p className="label text-muted">Principles</p>
          </Reveal>
          <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-10 sm:mt-12 sm:gap-y-14 lg:grid-cols-3">
            {PRINCIPLES.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08}>
                <p className="label text-muted">0{i + 1}</p>
                <h2 className="mt-4 font-serif text-2xl leading-tight sm:text-3xl">{p.title}</h2>
                <p className="mt-4 max-w-[320px] text-sm leading-relaxed text-muted">{p.body}</p>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 items-center gap-x-8 gap-y-8 sm:mt-32 sm:gap-y-12 lg:mt-48 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <blockquote className="font-serif text-3xl italic leading-[1.15] md:text-4xl lg:text-5xl">
              "We don't make collections. We make decisions — twenty at a time."
            </blockquote>
            <p className="label mt-6 text-muted sm:mt-8">Anita V. — Founder</p>
            <Link to="/collections" className="label link-underline mt-8 inline-block sm:mt-12">
              Explore the current edition
            </Link>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-6 lg:col-start-7">
            <div className="aspect-[4/5] overflow-hidden bg-panel">
              <img
                src="/images/leather-corset.jpg"
                alt="The leather corset dress pinned on the atelier dress form"
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          </Reveal>
        </div>
      </div>

      <NewsletterSection />
    </motion.div>
  );
}
