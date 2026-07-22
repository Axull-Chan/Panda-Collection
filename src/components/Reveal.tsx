import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { EASE } from "../lib/motionVariants";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/** Fades content in and slides it upward once it scrolls into view. */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}
