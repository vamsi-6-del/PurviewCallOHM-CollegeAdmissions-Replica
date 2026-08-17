/**
 * Shared motion vocabulary.
 *
 * One spring and one easing curve used everywhere, so transitions across the
 * app feel like the same system rather than a set of one-off effects.
 * Everything respects prefers-reduced-motion via `useMotion()`.
 */

export const SPRING = { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 }
export const SPRING_SOFT = { type: 'spring', stiffness: 260, damping: 30 }
export const EASE = [0.22, 0.61, 0.36, 1]

/** Container that reveals its children one after another. */
export const stagger = (delayChildren = 0.04, staggerChildren = 0.035) => ({
  hidden: {},
  show: { transition: { delayChildren, staggerChildren } },
})

/** The default entrance: a short rise with a fade. */
export const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } },
}

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.24, ease: EASE } },
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.97 },
  show: { opacity: 1, scale: 1, transition: SPRING },
}

/**
 * Wizard steps travel in the direction of navigation, so forward and back
 * read differently.
 */
export const stepVariants = {
  enter: (direction) => ({ opacity: 0, x: direction > 0 ? 28 : -28 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.3, ease: EASE } },
  exit: (direction) => ({
    opacity: 0,
    x: direction > 0 ? -28 : 28,
    transition: { duration: 0.2, ease: EASE },
  }),
}

/** Row hover lift, kept subtle enough to feel like weight rather than motion. */
export const rowHover = { y: -1, transition: { duration: 0.15, ease: EASE } }

/** Strips motion when the user has asked for reduced motion. */
export function resolveMotion(reduced, variants) {
  if (!reduced) return variants
  return {
    hidden: { opacity: 1 },
    show: { opacity: 1 },
    enter: { opacity: 1, x: 0 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 0 },
  }
}
