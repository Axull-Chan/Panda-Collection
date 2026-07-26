import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ImageOff } from "lucide-react";
import { useProducts } from "../context/ProductsContext";
import { journalPosts } from "../data/journal";
import { ProductCard } from "../components/ProductCard";
import { NewsletterSection } from "../components/NewsletterSection";
import { Reveal } from "../components/Reveal";
import { Image } from "../components/Image";
import { EASE, pageVariants } from "../lib/motionVariants";

const heroImage = "/images/panda-blossom.jpg";

const galleryImages = [
  { src: "/images/suede-jacket.jpg", caption: "Suede chore jacket — fitting" },
  { src: "/images/knit-polo.jpg", caption: "Striped polo, pre-release" },
  { src: "/images/military-jacket.jpg", caption: "Double breasted, look 07" },
  { src: "/images/mohair.jpg", caption: "Mohair knit — colour test" },
  { src: "/images/wool-suit.jpg", caption: "Relaxed suit, studio" },
  { src: "/images/corset-midi.jpg", caption: "Corset midi, first fitting" },
];

function SectionHeader({
  index,
  title,
  linkTo,
  linkText,
}: {
  index: string;
  title: string;
  linkTo?: string;
  linkText?: string;
}) {
  return (
    <Reveal className="flex items-end justify-between gap-6 border-b border-line pb-6 sm:pb-8">
      <div>
        <p className="label text-muted">{index}</p>
        <h2 className="mt-3 font-serif text-4xl leading-[1.05] sm:mt-4 md:text-5xl lg:text-6xl">
          {title}
        </h2>
      </div>
      {linkTo && (
        <Link to={linkTo} className="label link-underline mb-2 hidden shrink-0 sm:block">
          {linkText}
        </Link>
      )}
    </Reveal>
  );
}

export function HomePage() {
  const { products } = useProducts();
  const featured = products.filter((p) => p.badge === "SIGNATURE").slice(0, 3);
  const [heroFailed, setHeroFailed] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "16%"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.18]);

  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants}>
      {/* Hero — light ink illustration on a white canvas, so the artwork is
          never cropped and the type sits in ink rather than white */}
      <section ref={heroRef} className="relative h-svh overflow-hidden bg-white">
        {heroFailed ? (
          <div className="absolute inset-x-0 top-0 flex h-[58%] items-center justify-center sm:h-[62%] lg:h-[66%]">
            <ImageOff size={24} strokeWidth={1.25} className="text-muted/60" aria-hidden="true" />
            <span className="sr-only">
              Ink illustration of a panda sleeping on a blossoming plum branch
            </span>
          </div>
        ) : (
          <motion.img
            src={heroImage}
            alt="Ink illustration of a panda sleeping on a blossoming plum branch"
            style={{ y: imageY, scale: imageScale }}
            onError={() => setHeroFailed(true)}
            className="absolute inset-x-0 top-0 h-[58%] w-full object-contain object-right-top px-6 pt-20 sm:h-[62%] md:px-12 lg:h-[66%] lg:pt-28"
          />
        )}

        <div className="relative mx-auto flex h-full max-w-[1400px] flex-col justify-end px-6 pb-14 text-ink sm:pb-20 md:px-12 lg:pb-28">
          <motion.p
            className="label"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
          >
            Edition No. 01 — Autumn 2026
          </motion.p>
          <motion.h1
            className="mt-4 max-w-[900px] font-serif text-5xl leading-[1.02] sm:mt-6 md:text-6xl lg:text-8xl"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.35 }}
          >
            Panda Collection
          </motion.h1>
          <motion.p
            className="mt-4 max-w-[420px] text-sm leading-relaxed text-muted sm:mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.5 }}
          >
            Twenty garments, handcrafted in numbered editions. Each piece designed
            as an architectural pause.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.65 }}
          >
            <Link
              to="/collections"
              className="label mt-6 inline-flex items-center gap-3 border border-ink px-6 py-3 transition-colors duration-300 hover:bg-ink hover:text-bg sm:mt-10 sm:px-8 sm:py-4"
            >
              Explore Collection <ArrowRight size={14} strokeWidth={1.5} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Featured Collection */}
      <section className="mx-auto max-w-[1400px] px-6 pt-16 md:px-12 md:pt-24 lg:pt-48">
        <SectionHeader
          index="01 — Featured"
          title="Signature Pieces"
          linkTo="/collections"
          linkText="View all garments"
        />
        <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-12 sm:mt-16 sm:gap-y-20 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <ProductCard product={featured[0]} />
          </div>
          <div className="lg:col-span-4 lg:col-start-8 lg:mt-40">
            <ProductCard product={featured[1]} delay={0.1} />
          </div>
          <div className="lg:col-span-5 lg:col-start-3 lg:-mt-8">
            <ProductCard product={featured[2]} delay={0.05} />
          </div>
        </div>
      </section>

      {/* Brand Story */}
      <section className="mx-auto max-w-[1400px] px-6 pt-16 md:px-12 md:pt-24 lg:pt-48">
        <div className="grid grid-cols-1 items-end gap-x-8 gap-y-8 sm:gap-y-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <p className="label text-muted">02 — Atelier</p>
            <h2 className="mt-4 font-serif text-4xl leading-[1.05] sm:mt-6 md:text-5xl lg:text-6xl">
              Made once,
              <br />
              kept forever.
            </h2>
            <p className="mt-6 max-w-[360px] text-sm leading-relaxed text-muted sm:mt-8">
              Every ANITA garment is released as a numbered edition of twenty.
              When the edition closes, the pattern is retired. What remains is a
              wardrobe built the way a collection is built — slowly, and with
              intent.
            </p>
            <Link to="/about" className="label link-underline mt-8 inline-block sm:mt-10">
              Read our story
            </Link>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-7 lg:col-start-6">
            <Image
              src="/images/houndstooth.jpg"
              alt="Houndstooth tailoring from Edition No. 01, seated in the atelier"
              aspectRatio="4/5"
            />
          </Reveal>
        </div>

        <div className="mt-16 grid grid-cols-1 items-center gap-x-8 gap-y-8 sm:mt-32 sm:gap-y-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-6">
            <Image
              src="/images/flatlay-oxford.jpg"
              alt="A full look laid flat — blazer, washed blue shirt, and tiered skirt"
              aspectRatio="5/4"
            />
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-5 lg:col-start-8">
            <blockquote className="font-serif text-3xl italic leading-[1.15] md:text-4xl lg:text-5xl">
              "A garment should be the calmest thing in the room — and the most
              certain."
            </blockquote>
            <p className="label mt-6 text-muted sm:mt-8">Anita V. — Founder</p>
          </Reveal>
        </div>
      </section>

      {/* Gallery */}
      <section className="mx-auto max-w-[1400px] px-6 pt-16 md:px-12 md:pt-24 lg:pt-48">
        <SectionHeader index="03 — Gallery" title="From the Studio" />
        <div className="mt-10 columns-2 gap-4 sm:mt-16 md:gap-6 lg:columns-3 lg:gap-8">
          {galleryImages.map((image, i) => (
            <Reveal key={image.src} delay={(i % 3) * 0.08} className="mb-4 md:mb-6 lg:mb-8">
              <figure className="group">
                <Image
                  src={image.src}
                  alt={image.caption}
                  hoverZoom
                  imgClassName="group-hover:opacity-90"
                />
                <figcaption className="label mt-2 text-muted sm:mt-3">{image.caption}</figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Journal */}
      <section className="mx-auto max-w-[1400px] px-6 pt-16 md:px-12 md:pt-24 lg:pt-48">
        <SectionHeader
          index="04 — Journal"
          title="Notes & Essays"
          linkTo="/journal"
          linkText="All entries"
        />
        <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-10 sm:mt-16 sm:gap-y-16 lg:grid-cols-3">
          {journalPosts.map((post, i) => (
            <Reveal key={post.id} delay={i * 0.08}>
              <Link to="/journal" className="group block">
                <Image src={post.image} alt="" aspectRatio="4/5" hoverZoom />
                <p className="label mt-4 text-muted sm:mt-6">
                  {post.category} · {post.date}
                </p>
                <h3 className="mt-2 font-serif text-2xl leading-tight sm:mt-3 sm:text-3xl">
                  {post.title}
                </h3>
                <p className="mt-3 max-w-[340px] text-sm leading-relaxed text-muted">
                  {post.excerpt}
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <NewsletterSection />
    </motion.div>
  );
}
