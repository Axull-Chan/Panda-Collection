import { motion } from "framer-motion";
import { journalPosts } from "../data/journal";
import { Reveal } from "../components/Reveal";
import { NewsletterSection } from "../components/NewsletterSection";
import { Image } from "../components/Image";
import { pageVariants } from "../lib/motionVariants";

export function JournalPage() {
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
          <p className="label text-muted">Notes & Essays</p>
          <h1 className="mt-4 font-serif text-5xl leading-[1.02] sm:mt-6 md:text-6xl lg:text-8xl">
            Journal
          </h1>
        </Reveal>

        <div className="mt-14 space-y-14 sm:mt-24 sm:space-y-20 lg:space-y-32">
          {journalPosts.map((post, i) => (
            <Reveal key={post.id}>
              <article className="group grid grid-cols-1 items-center gap-x-8 gap-y-6 border-t border-line pt-10 sm:gap-y-8 sm:pt-16 lg:grid-cols-12">
                <div
                  className={`lg:col-span-6 ${i % 2 === 1 ? "lg:order-2 lg:col-start-7" : ""}`}
                >
                  <Image src={post.image} alt="" aspectRatio="4/3" hoverZoom />
                </div>
                <div
                  className={`lg:col-span-5 ${i % 2 === 1 ? "lg:order-1" : "lg:col-start-8"}`}
                >
                  <p className="label text-muted">
                    {post.category} · {post.date}
                  </p>
                  <h2 className="mt-3 font-serif text-3xl leading-[1.08] sm:mt-4 md:text-4xl lg:text-5xl">
                    {post.title}
                  </h2>
                  <p className="mt-4 max-w-[400px] text-sm leading-relaxed text-muted sm:mt-5">
                    {post.excerpt}
                  </p>
                  <span className="label link-underline mt-6 inline-block sm:mt-8">
                    Read the essay
                  </span>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>

      <NewsletterSection />
    </motion.div>
  );
}
