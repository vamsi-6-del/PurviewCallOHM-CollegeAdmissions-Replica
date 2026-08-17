import { Link } from 'react-router-dom'
import { Quote, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '../hooks/useTheme'
import SiteNav from '../components/SiteNav'
import SiteFooter from '../components/SiteFooter'

const STATS = [
  { value: '185K+', label: 'calls placed every month' },
  { value: '32%', label: 'avg. lift in conversions' },
  { value: '50+', label: 'institutions onboarded' },
  { value: '4.8', label: 'avg. director rating' },
]

const TESTIMONIALS = [
  {
    quote: 'EduGuide cut our follow-up time from days to minutes. Our counselors now focus on real conversations - the platform handles the rest.',
    name: 'Rohit Mehra',
    role: 'Director of Admissions',
    institution: 'CBIT',
    initials: 'RM',
  },
  {
    quote: 'We ran three intake cycles with EduGuide. Each one was smoother than the last. The analytics alone saved us 20+ hours of reporting.',
    name: 'Priya Nair',
    role: 'Head of Enrolment',
    institution: 'Mahindra University',
    initials: 'PN',
  },
  {
    quote: 'The multilingual voice agents were a game changer for us. Students respond much better to a voice that feels natural in their language.',
    name: 'Arjun Sethi',
    role: 'VP, Student Affairs',
    institution: 'VNR VJIET',
    initials: 'AS',
  },
]

const COLLEGES = [
  { name: 'SCETW',      logo: '/college_logos/stanley.png' },
  { name: 'CBIT',       logo: '/college_logos/CBIT-LOGO-2023.png' },
  { name: 'VCE',        logo: '/college_logos/vasavi.jpg' },
  { name: 'VNRVJIET',   logo: '/college_logos/vnrvjit.png' },
  { name: 'VJIT',       logo: '/college_logos/vjit.png' },
  { name: 'AU',         logo: '/college_logos/anurag.png' },
  { name: 'KLH',        logo: '/college_logos/klu.png' },
  { name: 'MRU',        logo: '/college_logos/malla reddy.png' },
  { name: 'MLRITM',     logo: '/college_logos/mlritm.png' },
  { name: 'GCET',       logo: '/college_logos/geetanjali.png' },
  { name: 'IARE',       logo: '/college_logos/IARE.jpg' },
  { name: 'GNITS',      logo: '/college_logos/narayanammma.png' },
]

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay },
})

export default function CustomersPage() {
  const [theme, toggleTheme] = useTheme()

  return (
    <div className="landing-v2" data-accent="edu" data-theme-scope={theme} style={{ minHeight: '100vh' }}>

      <SiteNav theme={theme} onToggleTheme={toggleTheme} active="company" />

      {/* Hero */}
      <section className="landing-container" style={{ paddingTop: 140, paddingBottom: 64, textAlign: 'center' }}>
        <motion.span className="eyebrow" {...fade(0)} style={{ display: 'inline-block', marginBottom: 22 }}>
          customers
        </motion.span>
        <motion.h1
          {...fade(0.05)}
          style={{
            margin: '0 auto 22px',
            fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
            lineHeight: 1.05,
            letterSpacing: '-0.035em',
            fontFamily: 'var(--display)',
            color: 'var(--ink)',
            maxWidth: 820,
          }}
        >
          Trusted by engineering colleges<br />
          <em style={{ color: 'var(--accent)' }}>across India.</em>
        </motion.h1>
        <motion.p
          {...fade(0.1)}
          style={{
            color: 'var(--ink-3)', fontSize: 17, maxWidth: 560,
            margin: '0 auto', lineHeight: 1.65,
          }}
        >
          From single-campus colleges to multi-institute groups - EduGuide
          connects engineering admissions teams to 12th-pass students at scale.
        </motion.p>
      </section>

      {/* Stats */}
      <section className="landing-container" style={{ paddingBottom: 96 }}>
        <motion.div
          {...fade(0)}
          className="cu-stats"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            maxWidth: 980, margin: '0 auto',
            border: '1px solid var(--hair)',
            borderRadius: 24,
            background: 'var(--surface)',
            overflow: 'hidden',
          }}
        >
          {STATS.map((s, i) => (
            <div
              key={s.label}
              style={{
                padding: '32px 24px',
                textAlign: 'center',
                borderRight: i < STATS.length - 1 ? '1px solid var(--hair)' : 'none',
              }}
            >
              <div style={{
                fontFamily: 'var(--display)',
                fontSize: 'clamp(2rem, 3.4vw, 2.6rem)',
                letterSpacing: '-0.03em',
                color: 'var(--accent)',
                lineHeight: 1,
              }}>
                {s.value}
              </div>
              <div style={{
                marginTop: 10, fontSize: 12,
                color: 'var(--ink-3)',
                fontFamily: 'var(--mono)', letterSpacing: '0.04em',
              }}>
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Featured testimonial */}
      <section className="landing-container" style={{ paddingBottom: 96 }}>
        <motion.div
          {...fade(0)}
          style={{
            position: 'relative',
            maxWidth: 880, margin: '0 auto',
            background: 'var(--accent-tint)',
            border: '1px solid var(--accent-soft)',
            borderRadius: 28,
            padding: '56px 56px 48px',
            overflow: 'hidden',
          }}
        >
          <Quote
            size={120}
            style={{
              position: 'absolute', top: -20, right: -10,
              color: 'var(--accent)', opacity: 0.08,
              pointerEvents: 'none',
            }}
          />
          <div style={{ position: 'relative' }}>
            <span className="eyebrow" style={{ display: 'inline-block', marginBottom: 18 }}>
              a director&apos;s view
            </span>
            <p style={{
              fontFamily: 'var(--display)',
              fontSize: 'clamp(1.4rem, 2.4vw, 1.85rem)',
              lineHeight: 1.4,
              letterSpacing: '-0.012em',
              color: 'var(--ink)',
              margin: '0 0 28px',
              fontStyle: 'italic',
            }}>
              &ldquo;{TESTIMONIALS[0].quote}&rdquo;
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'var(--accent)', color: 'var(--accent-ink)',
                display: 'grid', placeItems: 'center',
                fontFamily: 'var(--display)', fontStyle: 'italic',
                fontSize: 14, fontWeight: 700,
              }}>
                {TESTIMONIALS[0].initials}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                  {TESTIMONIALS[0].name}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>
                  {TESTIMONIALS[0].role} · {TESTIMONIALS[0].institution}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Smaller testimonials */}
      <section className="landing-container" style={{ paddingBottom: 96 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 20,
          maxWidth: 980, margin: '0 auto',
        }}>
          {TESTIMONIALS.slice(1).map((t, i) => (
            <motion.div
              key={t.name}
              {...fade(i * 0.08)}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--hair)',
                borderRadius: 20,
                padding: '28px 26px',
                display: 'flex', flexDirection: 'column', gap: 20,
              }}
            >
              <Quote size={18} style={{ color: 'var(--accent)', opacity: 0.5 }} />
              <p style={{
                fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.65,
                margin: 0, flex: 1,
              }}>
                {t.quote}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--accent-tint)',
                  color: 'var(--accent)',
                  border: '1px solid var(--accent-soft)',
                  display: 'grid', placeItems: 'center',
                  fontFamily: 'var(--display)', fontStyle: 'italic',
                  fontSize: 12, fontWeight: 700,
                }}>
                  {t.initials}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                    {t.role} · {t.institution}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Logo marquee */}
      <section style={{ paddingBottom: 96 }}>
        <div className="landing-container" style={{ textAlign: 'center', marginBottom: 24 }}>
          <div className="v2-logos-label">Institutions using EduGuide</div>
        </div>
        <div className="logo-marquee">
          <div className="logo-marquee-track">
            {[...COLLEGES, ...COLLEGES].map((c, i) => (
              <span key={`${c.name}-${i}`} className="logo-mark">
                <img src={c.logo} alt={c.name} className="logo-img" loading="lazy" />
                {c.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-container" style={{ paddingBottom: 100 }}>
        <motion.div {...fade(0)} className="v2-cta-block">
          <span className="eyebrow no-line">get started</span>
          <h2>Join the institutions already<br /><em>winning enrolments.</em></h2>
          <p>15 minute call. No slides. A real walkthrough of your funnel inside EduGuide.</p>
          <div className="btn-row">
            <Link to="/book-demo" className="btn btn-solid-ink btn-arrow">
              Book a demo <ArrowRight size={15} />
            </Link>
            <Link to="/pricing" className="btn btn-outline-ink">See pricing</Link>
          </div>
        </motion.div>
      </section>

      <SiteFooter />

      <style>{`
        @media (max-width: 820px) {
          .cu-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .cu-stats > div:nth-child(1),
          .cu-stats > div:nth-child(2) { border-bottom: 1px solid var(--hair); }
          .cu-stats > div:nth-child(2) { border-right: none !important; }
        }
        @media (max-width: 480px) {
          .cu-stats { grid-template-columns: 1fr !important; }
          .cu-stats > div { border-right: none !important; border-bottom: 1px solid var(--hair); }
          .cu-stats > div:last-child { border-bottom: none; }
        }
      `}</style>
    </div>
  )
}
