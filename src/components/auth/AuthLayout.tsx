import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { EASE, pageVariants } from "../../lib/motionVariants";

interface AuthLayoutProps {
  eyebrow: string;
  title: string;
  intro?: string;
  image?: { src: string; alt: string; caption: string };
  children: ReactNode;
}

/**
 * Editorial split-screen shell for the account pages: campaign image on the
 * left (desktop), form column on the right. Without an image the form sits
 * centered on the page.
 */
export function AuthLayout({ eyebrow, title, intro, image, children }: AuthLayoutProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      className={`grid min-h-svh ${image ? "lg:grid-cols-2" : ""}`}
    >
      {image && (
        <div className="relative hidden overflow-hidden bg-panel lg:block">
          <motion.img
            src={image.src}
            alt={image.alt}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: EASE }}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <p className="label absolute bottom-8 left-8 z-10 text-white/90">{image.caption}</p>
          <div className="absolute inset-0 bg-ink/10" />
        </div>
      )}

      <div className="flex items-center justify-center px-6 pb-20 pt-32 md:px-12 lg:pt-36">
        <motion.div
          className="w-full max-w-[400px]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
        >
          <p className="label text-muted">{eyebrow}</p>
          <h1 className="mt-4 font-serif text-4xl leading-[1.05] sm:text-5xl">{title}</h1>
          {intro && (
            <p className="mt-4 text-sm leading-relaxed text-muted">{intro}</p>
          )}
          <div className="mt-10">{children}</div>
        </motion.div>
      </div>
    </motion.div>
  );
}
