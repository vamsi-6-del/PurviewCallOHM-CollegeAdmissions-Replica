import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Copy, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '../../hooks/useTheme'
import SiteNav from '../../components/SiteNav'
import SiteFooter from '../../components/SiteFooter'

/**
 * Company → Contact, set editorially.
 *
 * Three ways in, as indexed rows in large type rather than three cards. Every
 * detail is the same one the footer uses, so there is one number to keep
 * current.
 */

const SUPPORT_EMAIL = 'meena.atmakuri@purviewservices.com'
const SUPPORT_PHONE_DISPLAY = '+91 70328 35934'
const SUPPORT_PHONE_DIAL = '+917032835934'

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay },
})

export default function ContactPage() {
  const [theme, toggleTheme] = useTheme()
  const [copied, setCopied] = useState(false)

  const copyNumber = () => {
    navigator.clipboard.writeText(SUPPORT_PHONE_DISPLAY).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="landing-v2" data-accent="edu" data-theme-scope={theme} style={{ minHeight: '100vh' }}>

      <SiteNav theme={theme} onToggleTheme={toggleTheme} active="company" />

      {/* Masthead */}
      <section className="ed-section ed-masthead" style={{ paddingTop: 168 }}>
        <div className="ed-atmos" aria-hidden="true"><span /><span /><span /></div>
        <div className="ed-mesh" aria-hidden="true" />
        <div className="landing-container ed-inner">
          <motion.div {...fade(0)}>
            <span className="ed-kicker">Contact</span>
            <h1 className="ed-display" style={{ margin: '22px 0 34px' }}>
              Let&rsquo;s <em style={{ color: 'var(--accent)' }}>talk.</em>
            </h1>
            <p className="ed-lead" style={{ maxWidth: '44ch' }}>
              Pick whatever works best for you. We&rsquo;re quick to respond, right through
              the intake season.
            </p>
          </motion.div>
        </div>
      </section>

      {/* The ways in */}
      <section className="ed-section ed-section-tint" style={{ paddingLeft: 0, paddingRight: 0 }}>
        <div className="landing-container">
        <motion.div className="ed-split" {...fade(0)}>
          <div className="ed-aside">
            <span className="ed-kicker">Ways in</span>
            <p className="ed-aside-note">Whichever you choose, a person answers.</p>
          </div>

          <div className="ed-rows">
            <div className="ed-row ct-row">
              <span className="ed-row-n">01</span>
              <div className="ed-row-main">
                <Link to="/book-demo" className="ct-lead-link">Book a demo</Link>
                <p className="ed-body">
                  15 minutes, no slides. A real walkthrough of your admissions funnel inside
                  EduGuide, with your own intake in mind.
                </p>
                <Link to="/book-demo" className="ed-link" style={{ marginTop: 6 }}>
                  Schedule now <ArrowRight size={17} />
                </Link>
              </div>
            </div>

            <div className="ed-row ct-row">
              <span className="ed-row-n">02</span>
              <div className="ed-row-main">
                {/* Dials on a phone, selectable on a desktop — where the copy
                    button beside it is the faster path. */}
                <a href={`tel:${SUPPORT_PHONE_DIAL}`} className="ct-lead-link">{SUPPORT_PHONE_DISPLAY}</a>
                <p className="ed-body">Call us Monday to Saturday. Straight through to the team.</p>
                <button type="button" className="ed-link" onClick={copyNumber} style={{ marginTop: 6 }}>
                  {copied ? <>Copied <Check size={17} /></> : <>Copy number <Copy size={17} /></>}
                </button>
              </div>
            </div>

            <div className="ed-row ct-row">
              <span className="ed-row-n">03</span>
              <div className="ed-row-main">
                <a href={`mailto:${SUPPORT_EMAIL}`} className="ct-lead-link ct-lead-sm">{SUPPORT_EMAIL}</a>
                <p className="ed-body">
                  Send us your intake volume and we&rsquo;ll come back with a plan and a price.
                </p>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="ed-link" style={{ marginTop: 6 }}>
                  Write to us <ArrowRight size={17} />
                </a>
              </div>
            </div>
          </div>
        </motion.div>
        </div>
      </section>

      {/* Before you call — the page's one dark band */}
      <section className="ed-band">
        <div className="landing-container">
          <motion.div className="ed-split" {...fade(0)}>
            <div className="ed-aside">
              <span className="ed-kicker">Before you call</span>
            </div>
            <div style={{ display: 'grid', gap: 28 }}>
              <h2 className="ed-h2" style={{ maxWidth: '20ch' }}>
                Not sure which plan fits your intake?
              </h2>
              <p className="ed-lead">
                Tell us the volume and we&rsquo;ll quote a price around it: prepaid credits, or a
                custom enterprise rate for a multi-campus season.
              </p>
              <div>
                <Link to="/pricing" className="ed-link ed-link-lg">
                  See pricing <ArrowRight size={22} />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Who you'll meet */}
      <section className="landing-container ed-section ed-section-tight">
        <motion.div className="ed-split" {...fade(0)}>
          <div className="ed-aside">
            <span className="ed-kicker">Who you&rsquo;ll meet</span>
          </div>
          <div style={{ display: 'grid', gap: 24 }}>
            <h2 className="ed-h2" style={{ maxWidth: '18ch' }}>The team behind EduGuide.</h2>
            <div>
              <Link to="/leadership" className="ed-link">
                Meet the team <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      <SiteFooter />

      <style>{`
        .ct-row { padding: 40px 0; }

        /* The channel itself is the headline of its row. */
        .ct-lead-link {
          display: inline-block;
          justify-self: start;
          font-family: var(--display);
          font-size: clamp(1.6rem, 3.2vw, 2.5rem);
          line-height: 1.1;
          letter-spacing: -0.04em;
          color: var(--ink);
          text-decoration: none;
          transition: color 0.2s var(--ease-out);
        }

        .ct-lead-link:hover { color: var(--accent); }

        .ct-lead-sm {
          font-size: clamp(1.1rem, 2.2vw, 1.7rem);
          overflow-wrap: anywhere;
        }
      `}</style>
    </div>
  )
}
