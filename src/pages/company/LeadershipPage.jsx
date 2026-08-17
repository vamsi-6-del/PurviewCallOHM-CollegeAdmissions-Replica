import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '../../hooks/useTheme'
import SiteNav from '../../components/SiteNav'
import SiteFooter from '../../components/SiteFooter'

/**
 * Company → Leadership.
 *
 * A plain grid: every face with its own name under it, all five on screen at
 * once. There is nothing to rotate and nothing to click through — five people
 * fit on a page, so making the reader operate a control to meet them was the
 * problem rather than the feature. Photos are plain URLs from
 * public/leadership, matching /college_logos elsewhere.
 */

/** The team. Name, title and photo — nothing claimed beyond what is known. */
const LEADERS = [
  { name: 'Punna Reddy', role: 'Founder & CEO', photo: '/leadership/punna.jpg' },
  { name: 'Chiranjeevi', role: 'Chief Operating Officer', photo: '/leadership/chiranjeevi.jpg' },
  { name: 'Mani Gupta', role: 'Head of UK & Europe', photo: '/leadership/mani.jpg' },
  { name: 'James Hatcher', role: 'GM & Partner – Australia & NZ', photo: '/leadership/james.png' },
  { name: 'Dr Manoj Patil', role: 'Head of AI', photo: '/leadership/manoj.jpg' },
]

const SUPPORT_EMAIL = 'meena.atmakuri@purviewservices.com'
const SUPPORT_PHONE_DISPLAY = '+91 70328 35934'
const SUPPORT_PHONE_DIAL = '+917032835934'

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay },
})

export default function LeadershipPage() {
  const [theme, toggleTheme] = useTheme()

  return (
    <div className="landing-v2" data-accent="edu" data-theme-scope={theme} style={{ minHeight: '100vh' }}>

      <SiteNav theme={theme} onToggleTheme={toggleTheme} active="company" />

      {/* Masthead */}
      <section className="ed-section ed-masthead" style={{ paddingTop: 168 }}>
        <div className="ed-atmos" aria-hidden="true"><span /><span /><span /></div>
        <div className="ed-mesh" aria-hidden="true" />
        <div className="landing-container ed-inner">
          <motion.div {...fade(0)}>
            <span className="ed-kicker">Leadership</span>
            <h1 className="ed-display" style={{ margin: '22px 0 34px' }}>
              The minds behind<br />
              <em style={{ color: 'var(--accent)' }}>EduGuide.</em>
            </h1>
            <p className="ed-lead" style={{ maxWidth: '52ch' }}>
              A team of engineers, linguists and admissions specialists obsessed with the
              conversation that decides a seat, building AI that speaks to every student with
              patience, speed and honesty.
            </p>
          </motion.div>
        </div>
      </section>

      {/* The team — a photo, a name and a title each */}
      <section className="landing-container ed-section" style={{ borderTop: 'none' }}>
        <motion.h2 className="ed-h2 ld-heading" {...fade(0)}>Our leadership team</motion.h2>

        <div className="ld-grid">
          {LEADERS.map((leader, i) => (
            <motion.figure key={leader.name} className="ld-person" {...fade(i * 0.06)}>
              <div className="ld-photo">
                <img src={leader.photo} alt={leader.name} loading="lazy" />
              </div>
              <figcaption className="ld-text">
                <span className="ld-name">{leader.name}</span>
                <span className="ld-role">{leader.role}</span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </section>

      {/* Where the team came from */}
      <section className="landing-container ed-section">
        <motion.div className="ed-split" {...fade(0)}>
          <div className="ed-aside">
            <span className="ed-kicker">Behind EduGuide</span>
          </div>
          <div style={{ display: 'grid', gap: 26 }}>
            <h2 className="ed-h2" style={{ maxWidth: '20ch' }}>Built by the team at Purview Services.</h2>
            <p className="ed-body">
              Years of building voice, telephony and AI systems for Indian institutions, now
              pointed at the one conversation that decides where a student enrols.
            </p>
            <div>
              <Link to="/about" className="ed-link ed-link-lg">
                Our story <ArrowRight size={22} />
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Reaching them */}
      <section className="ed-band">
        <div className="landing-container">
          <motion.div className="ed-split" {...fade(0)}>
            <div className="ed-aside">
              <span className="ed-kicker">Get in touch</span>
            </div>
            <div className="ld-contact">
              <a href={`tel:${SUPPORT_PHONE_DIAL}`} className="ed-link ed-link-lg">
                {SUPPORT_PHONE_DISPLAY}
              </a>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="ed-link">
                {SUPPORT_EMAIL}
              </a>
              <Link to="/book-demo" className="ed-link">
                Book a demo <ArrowRight size={17} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <SiteFooter />

      <style>{`
        .ld-heading { margin-bottom: 40px; }

        /* Even columns rather than a fluid auto-fit: with five people the
           last row holds two, and they must line up with the two above
           them instead of stretching to fill the width. */
        .ld-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 52px 32px;
        }

        .ld-person {
          margin: 0;
          display: grid;
          gap: 20px;
          align-content: start;
        }

        /* A tinted panel behind the portrait, which is what carries these
           cards: the headshots come from different sources and sit on
           different backgrounds, so the panel gives the row one ground. */
        .ld-photo {
          position: relative;
          aspect-ratio: 4 / 3;
          border-radius: 12px;
          overflow: hidden;
          background: var(--bg-2);
          transition: transform 0.3s var(--ease-out);
        }

        .ld-person:hover .ld-photo { transform: translateY(-3px); }

        .ld-photo img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          /* Portraits are framed head-and-shoulders, so the crop is pulled
             up: centring one puts the chin in the middle of the panel. */
          object-position: center 16%;
        }

        .ld-text { display: block; }

        .ld-name {
          display: block;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: var(--ink);
        }

        .ld-role {
          display: block;
          margin-top: 3px;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: var(--ink);
        }

        .ld-contact {
          display: grid;
          gap: 26px;
          justify-items: start;
        }

        @media (max-width: 900px) {
          .ld-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 32px 20px; }
        }

        @media (max-width: 520px) {
          .ld-grid { grid-template-columns: minmax(0, 1fr); gap: 28px; }
          .ld-photo { max-width: 300px; }
        }
      `}</style>
    </div>
  )
}
