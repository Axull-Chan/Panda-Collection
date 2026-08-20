import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Reveal } from "../components/Reveal";
import { NewsletterSection } from "../components/NewsletterSection";
import { Image } from "../components/Image";
import { pageVariants } from "../lib/motionVariants";

const PRINCIPLES = [
  {
    title: "Handpicked, Not Mass-Produced",
    body: "Every piece is chosen because we'd wear it ourselves — not pulled from a catalogue to fill a rack.",
  },
  {
    title: "Based in Indonesia",
    body: "A real, small business — not a faceless storefront. Reach out any time, we're happy to help.",
  },
  {
    title: "Real Photos, No Surprises",
    body: "What's photographed is what's in stock. No stock photos standing in for the actual item.",
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
          <p className="label text-muted">About Us</p>
          <h1 className="mt-4 max-w-[1000px] font-serif text-4xl leading-[1.05] sm:mt-6 md:text-5xl lg:text-7xl">
            Fashion, chosen with care.
          </h1>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-x-8 gap-y-8 sm:mt-24 sm:gap-y-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <Image
              src="/images/wool-suit.jpg"
              alt="A relaxed wool suit, photographed in the studio"
              aspectRatio="4/3"
              objectPosition="top"
            />
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-4 lg:col-start-9 lg:self-end">
            <p className="text-sm leading-relaxed text-muted">
              ACD Fashion is a small, Indonesia-based fashion business. We pick
              every piece ourselves, photograph it honestly, and keep pricing
              straightforward — no seasonal markups, no bait-and-switch.
            </p>
            <p className="mt-6 text-sm leading-relaxed text-muted">
              We're still growing, and we treat every order like it matters —
              because to us, it does.
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
              "We only sell what we'd be happy to wear ourselves."
            </blockquote>
            <Link to="/collections" className="label link-underline mt-8 inline-block sm:mt-12">
              Explore the collection
            </Link>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-6 lg:col-start-7">
            <Image
              src="/images/leather-corset.jpg"
              alt="The leather corset dress, studio shot"
              aspectRatio="4/5"
            />
          </Reveal>
        </div>
      </div>

      <NewsletterSection />
    </motion.div>
  );
}
