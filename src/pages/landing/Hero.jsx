import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

import { BrandMark } from '../../components/BrandLogo'
import { CLIPS } from './clips'

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay },
})

const TRUST = [
  'Live in under a week',
  '30+ Indian languages',
  'TRAI + DND compliant',
]

/* The opening clip plays beside the copy so the product is on screen before
   anyone scrolls; the other four stages follow in VideoStorySection below. */
function HeroShowreel() {
  const { icon: Icon, tag, title, src } = CLIPS[0]

  return (
    <div className="nx-hero-reel">
      <div className="nx-vframe">
        <video
          className="nx-vvideo"
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
        <span className="nx-vmark" aria-hidden="true">
          <BrandMark />
        </span>
      </div>

      <div className="nx-hero-reel-bar">
        <span className="nx-hero-reel-now">
          <span className="nx-hero-reel-icon"><Icon size={14} strokeWidth={2.1} /></span>
          <b>{tag}</b>
          {title}
        </span>
      </div>
    </div>
  )
}

/* Copy on the left, the showreel on the right — the trust row and caption
   close the column rather than the section. */
export default function Hero() {
  return (
    <section className="nx-hero">
      <div className="nx-hero-aurora" aria-hidden="true">
        <span /><span /><span />
      </div>
      <div className="nx-hero-mesh" aria-hidden="true" />

      <div className="landing-container nx-hero-grid">
        <div className="nx-hero-copy">
          <motion.div {...fade(0)}>
            <span className="nx-badge">
              <span className="nx-badge-dot" />
              Trusted by <b>50+ engineering colleges</b>
            </span>
          </motion.div>

          <motion.h1 className="nx-h1" {...fade(0.06)}>
            Your admissions team,<br />
            <span>powered by AI voice agents</span>
          </motion.h1>

          <motion.p className="nx-hero-sub" {...fade(0.12)}>
            EduGuide calls every enquiry in their own language, answers what they
            actually want to know about fees, cutoffs and placements, and hands your
            counsellors a shortlist of candidates who are ready to enrol.
          </motion.p>

          <motion.div className="nx-hero-trust" {...fade(0.24)}>
            {TRUST.map((t) => (
              <span key={t}><Check size={14} strokeWidth={3} /> {t}</span>
            ))}
          </motion.div>

          <motion.p className="nx-hero-caption" {...fade(0.3)}>
            One agent, one campaign. Every call recorded, transcribed, scored and
            scheduled without a counsellor touching a dialler.
          </motion.p>
        </div>

        <motion.div
          className="nx-hero-media"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
        >
          <HeroShowreel />
        </motion.div>
      </div>
    </section>
  )
}
