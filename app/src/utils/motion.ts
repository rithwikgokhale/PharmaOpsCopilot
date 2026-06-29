import type { Variants } from "framer-motion";

/** Container that staggers its children's entrance. */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.02 },
  },
};

/** Item that fades and slides up — pairs with staggerContainer. */
export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3 } },
};

/** Standard hover/press for interactive cards. */
export const interactiveHover = {
  whileHover: { y: -2 },
  whileTap: { scale: 0.99 },
  transition: { type: "spring" as const, stiffness: 400, damping: 28 },
};
