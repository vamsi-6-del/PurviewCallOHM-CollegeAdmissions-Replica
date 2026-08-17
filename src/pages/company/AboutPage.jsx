import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '../../hooks/useTheme'
import SiteNav from '../../components/SiteNav'
import SiteFooter from '../../components/SiteFooter'

/**
 * Company → About, set editorially.
 *
 * The story runs as a spread with a sticky label column; values and journey are
 * indexed rows rather than cards. Figures match the customers page so the site
 * does not contradict itself.
 */

const FIGURES = [
  ['185K+', 'calls placed every month'],
  ['50+', 'institutions onboarded'],
  ['30+', 'Indian languages spoken'],
]

const VALUES = [
  {
    n: '01',
    title: 'Every student, their own language',
    body: 'A student who enquires in Telugu should be answered in Telugu. EduGuide speaks 30+ Indian languages, so no candidate is lost to a language barrier.',
  },
  {
    n: '02',
    title: 'The first call wins the seat',
    body: 'Enquiries go cold in hours, not days. EduGuide calls back within minutes of a form fill, at any hour, through every day of the intake rush.',
  },
  {
    n: '03',
    title: 'Compliant by design',
    body: 'TRAI and DND rules, calling windows, consent and recording policy are built into the platform, not left for your team to remember.',
  },
  {
    n: '04',
    title: 'Scales with your intake',
    body: 'Whether it is 500 enquiries or 50,000 across every campus, the platform picks up the volume so admissions is never limited by headcount.',
  },
]

const JOURNEY = [
  {
    n: '01', year: '2024', title: 'The spark',
    body: 'We watched admissions teams work through intake season: counsellors dialling the same numbers, asking the same ten questions, while hundreds of enquiries sat untouched in a spreadsheet.',
  },
  {
    n: '02', year: '2024', title: 'The first call',
    body: 'We built a voice agent that could answer what students actually ask: fees, cutoffs, hostel, placements. It ran a live counselling call end to end, and the student never asked to speak to a person.',
  },
  {
    n: '03', year: '2025', title: 'Languages and scale',
    body: 'Multilingual calling grew to 30+ Indian languages, with scoring, scheduling and follow-up automated end to end, so counsellors met only the candidates who were ready to enrol.',
  },
  {
    n: '04', year: '2026', title: 'Today',
    body: 'EduGuide places over 185,000 calls a month for 50+ institutions, qualifying enquiries and booking counselling sessions around the clock.',
  },
]

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay },
})

export default function AboutPage() {
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
          <span className="ed-kicker">Our story</span>
          <h1 className="ed-display" style={{ margin: '22px 0 34px' }}>
            No student should wait<br />
            <em style={{ color: 'var(--accent)' }}>for an answer.</em>
          </h1>
          <p className="ed-lead" style={{ maxWidth: '58ch' }}>
            EduGuide began with a simple frustration. During intake season, enquiries arrive
            faster than any counselling team can dial, and the students who do not get a call
            back that same day quietly enrol somewhere else. So we built an AI admissions
            assistant that calls every enquiry in their own language, answers what they actually
            want to know, and hands counsellors a shortlist of candidates ready to enrol.
          </p>
        </motion.div>

        <motion.div className="ed-figures" {...fade(0.1)} style={{ marginTop: 64 }}>
          {FIGURES.map(([value, label]) => (
            <div key={label} className="ed-fig">
              <span className="ed-fig-n">{value}</span>
              <span className="ed-fig-l">{label}</span>
            </div>
          ))}
        </motion.div>
        </div>
      </section>

      {/* Mission & vision */}
      <section className="landing-container ed-section">
        <motion.div className="ed-split" {...fade(0)}>
          <div className="ed-aside">
            <span className="ed-kicker">What we are for</span>
            <p className="ed-aside-note">The two sentences everything else is measured against.</p>
          </div>
          <div className="ed-cols">
            <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
              <span className="ed-kicker" style={{ color: 'var(--ink-4)' }}>Mission</span>
              <h2 className="ed-h3" style={{ fontSize: 'clamp(1.3rem, 2.2vw, 1.7rem)' }}>
                Great admissions outreach, available to every institution.
              </h2>
              <p className="ed-body">
                From a single campus to a multi-institute group, every admissions team should have
                the same reach: instant multilingual calling, honest answers on fees and placements,
                and follow-up that never forgets. Affordable, reliable, and live in under a week.
              </p>
            </div>
            <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
              <span className="ed-kicker" style={{ color: 'var(--ink-4)' }}>Vision</span>
              <h2 className="ed-h3" style={{ fontSize: 'clamp(1.3rem, 2.2vw, 1.7rem)' }}>
                A seat decided by fit, never by who called back first.
              </h2>
              <p className="ed-body">
                We want every enquiry, from a metro city or a district town, to get the same fast,
                patient, informed conversation, so students choose a college that suits them and
                counsellors spend their days guiding rather than dialling.
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Belief — the page's one dark band */}
      <section className="ed-band">
        <div className="landing-container">
          <motion.div className="ed-split" {...fade(0)}>
            <div className="ed-aside">
              <span className="ed-kicker">What we believe</span>
            </div>
            <blockquote className="ed-quote">
              &ldquo;We are not building another dialler. We are giving counsellors their time back,
              and giving every student a straight answer, one conversation at a time.&rdquo;
            </blockquote>
          </motion.div>
        </div>
      </section>

      {/* Values — tinted ground, so the two long row lists that follow
          the dark band do not read as one undifferentiated stretch. */}
      <section className="ed-section ed-section-tint" style={{ paddingLeft: 0, paddingRight: 0 }}>
        <motion.div className="ed-split landing-container" {...fade(0)}>
          <div className="ed-aside">
            <span className="ed-kicker">What we stand for</span>
            <p className="ed-aside-note">Four things we will not trade away.</p>
          </div>
          <div className="ed-rows">
            {VALUES.map((value) => (
              <div key={value.n} className="ed-row">
                <span className="ed-row-n">{value.n}</span>
                <div className="ed-row-main">
                  <h3 className="ed-h3">{value.title}</h3>
                  <p className="ed-body">{value.body}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Journey */}
      <section className="landing-container ed-section">
        <motion.div className="ed-split" {...fade(0)}>
          <div className="ed-aside">
            <span className="ed-kicker">Journey</span>
            <p className="ed-aside-note">From an idea to an intake season.</p>
          </div>
          <div className="ed-rows">
            {JOURNEY.map((item) => (
              <div key={item.n} className="ed-row">
                <span className="ed-row-n">{item.n}</span>
                <div className="ed-row-main">
                  <div className="ed-row-head">
                    <h3 className="ed-h3">{item.title}</h3>
                    <span className="ed-year">{item.year}</span>
                  </div>
                  <p className="ed-body">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Who builds it, and the closing ask */}
      <section className="landing-container ed-section">
        <motion.div className="ed-split" {...fade(0)}>
          <div className="ed-aside">
            <span className="ed-kicker">Who builds it</span>
          </div>
          <div style={{ display: 'grid', gap: 26 }}>
            <h2 className="ed-h2" style={{ maxWidth: '20ch' }}>Built by the team at Purview Services.</h2>
            <p className="ed-body">
              An engineering team that has spent years building voice, telephony and AI systems
              for Indian institutions.
            </p>
            <div>
              <Link to="/leadership" className="ed-link ed-link-lg">
                Meet the team <ArrowRight size={22} />
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="landing-container ed-section ed-section-tight">
        <motion.div className="ed-split" {...fade(0)}>
          <div className="ed-aside">
            <span className="ed-kicker">Get started</span>
          </div>
          <div style={{ display: 'grid', gap: 26 }}>
            <h2 className="ed-h2" style={{ maxWidth: '18ch' }}>
              Ready to answer every enquiry on time?
            </h2>
            <p className="ed-body">
              15 minute call. No slides. A real walkthrough of your admissions funnel inside EduGuide.
            </p>
            <div className="btn-row">
              <Link to="/book-demo" className="btn btn-solid-ink btn-arrow">
                Book a demo <ArrowRight size={15} />
              </Link>
              <Link to="/customers" className="btn btn-outline-ink">See our customers</Link>
            </div>
          </div>
        </motion.div>
      </section>

      <SiteFooter />
    </div>
  )
}
