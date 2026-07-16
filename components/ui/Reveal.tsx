"use client";

import { motion } from "framer-motion";

/**
 * Lightweight fade-and-rise entrance used across landing page sections.
 * Respects prefers-reduced-motion via Framer Motion's built-in handling
 * combined with the reduced-motion override in globals.css.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
