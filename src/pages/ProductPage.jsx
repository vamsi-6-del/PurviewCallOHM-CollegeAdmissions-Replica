import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, Check,
  PhoneCall, Languages, ClipboardCheck,
  CalendarCheck, BellRing,
  Users, Send, TrendingUp,
} from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import SiteNav from '../components/SiteNav'
import SiteFooter from '../components/SiteFooter'

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-70px' },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay },
})

/* Same three groups as the Product menu in the nav, so a click from the
   dropdown lands on the block the reader expected. */
const GROUPS = [
  {
    key: 'engage',
    eyebrow: 'Engage & qualify',
    title: 'Reach every enquiry, not just the top of the list',
    sub: 'Voice agents call each candidate on your list, hold a real conversation about your college and score what they say.',
    features: [
      {
        id: 'voice-calling',
        icon: PhoneCall,
        tone: 'indigo',
        title: 'AI Voice Calling',
        body: 'Agents dial your enquiry list around the clock and qualify each candidate without a counsellor on the line. Busy, switched off or asked-to-call-later is captured as an outcome and retried on the right cadence.',
        points: ['24/7 outbound and inbound calling', 'Automatic retries and callback windows', 'TRAI, DND and consent handling built in'],
      },
      {
        id: 'languages',
        icon: Languages,
        tone: 'violet',
        title: '30+ Languages',
        body: 'Agents switch between Hindi, Telugu, Tamil, Marathi and English mid-call, in a natural Indian accent, so a candidate never has to change language to be understood.',
        points: ['Mid-call language switching', 'Natural Indian-accent voices', 'Same script, every language'],
      },
      {
        id: 'scoring',
        icon: ClipboardCheck,
        tone: 'sky',
        title: 'Automatic Scoring',
        body: 'Every answer is scored against your admission criteria: branch interest, rank band, budget, location and intent. The shortlist writes itself as the campaign runs.',
        points: ['Score per question and per call', 'Sentiment and intent detection', 'Full transcript behind every score'],
      },
    ],
  },
  {
    key: 'automate',
    eyebrow: 'Schedule & automate',
    title: 'Turn interest into a booked counselling slot',
    sub: 'The steps that usually stall between a good call and a paid fee run on their own.',
    features: [
      {
        id: 'scheduling',
        icon: CalendarCheck,
        tone: 'amber',
        title: 'Counselling Scheduling',
        body: 'Qualified candidates are booked into open counselling, campus-visit and document-verification slots during the call, and reminded until they turn up.',
        points: ['Auto-book into open slots', 'Reminders before every appointment', 'No-show detection and re-book'],
      },
      {
        id: 'follow-up',
        icon: BellRing,
        tone: 'emerald',
        title: 'Application Follow-up',
        body: 'Half-filled applications and pending fee payments are chased with human-sounding nudges. Your counsellor is looped in only when the conversation actually stalls.',
        points: ['Form-fill and fee-payment nudges', 'Escalation to a human counsellor', 'Per-stage cadence you control'],
      },
    ],
  },
  {
    key: 'measure',
    eyebrow: 'Manage & measure',
    title: 'One view of the whole intake season',
    sub: 'Campaigns, candidates, campuses and outcomes in the dashboard your team already opens each morning.',
    features: [
      {
        id: 'pipeline',
        icon: Users,
        tone: 'indigo',
        title: 'Admissions Pipeline',
        body: 'Every campaign, candidate and stage on one board, from first enquiry to enrolled, with the call history attached to each record.',
        points: ['Stage-wise candidate board', 'Recordings and transcripts per contact', 'Notes your counsellors can act on'],
      },
      {
        id: 'outreach',
        icon: Send,
        tone: 'violet',
        title: 'Multi-Campus Outreach',
        body: 'Run a separate agent, number and calling window per campus or branch, and still see the whole group funnel in a single roll-up.',
        points: ['Agent and number per campus', 'Role-based access per team', 'Group-level roll-up reporting'],
      },
      {
        id: 'analytics',
        icon: TrendingUp,
        tone: 'sky',
        title: 'Live Analytics',
        body: 'Connect rates, call outcomes, sentiment, counsellor time saved and cost per enrolment update live while the campaign is still running.',
        points: ['Live campaign dashboards', 'Outcome and sentiment breakdowns', 'Exportable season reports'],
      },
    ],
  },
]

const STATS = [
  { value: '80K+', label: 'Leads called' },
  { value: '30+', label: 'Languages' },
  { value: '72%', label: 'Counsellor time saved' },
  { value: '24/7', label: 'Always calling' },
]

export default function ProductPage() {
  const [theme, toggleTheme] = useTheme()

  return (
    <div className="landing-v2" data-accent="edu" data-theme-scope={theme} style={{ minHeight: '100vh' }}>
      <SiteNav theme={theme} onToggleTheme={toggleTheme} active="product" />

      {/* Hero */}
      <section className="nx-section" style={{ paddingTop: 148, paddingBottom: 40 }}>
        <div className="landing-container">
          <motion.div className="nx-head" {...fade(0)} style={{ marginBottom: 36 }}>
            <span className="nx-eyebrow">Product</span>
            <h2 className="nx-title">
              The admissions platform that <em>calls, qualifies and books</em>
            </h2>
            <p className="nx-sub">
              EduGuide runs the calling, the conversation, the follow-up and the reporting for
              an entire intake season, so your counsellors only spend time on candidates who
              are genuinely interested.
            </p>
          </motion.div>

          <motion.div className="btn-row" {...fade(0.08)} style={{ justifyContent: 'center' }}>
            <Link to="/book-demo" className="btn btn-solid-ink btn-arrow">
              Book a demo <ArrowRight size={15} />
            </Link>
            <Link to="/workflow" className="btn btn-outline-ink">See how it works</Link>
          </motion.div>

          <motion.div className="nx-stats" {...fade(0.14)} style={{ marginTop: 52 }}>
            {STATS.map((s) => (
              <div key={s.label} className="nx-stat">
                <div className="nx-stat-v">{s.value}</div>
                <div className="nx-stat-l">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Feature groups */}
      {GROUPS.map(({ key, eyebrow, title, sub, features }, gi) => (
        <section
          key={key}
          id={key}
          className={`nx-section${gi % 2 === 1 ? ' nx-section-tint' : ''}`}
          style={{ paddingTop: 72, paddingBottom: 72 }}
        >
          <div className="landing-container">
            <motion.div className="nx-head" {...fade(0)}>
              <span className="nx-eyebrow">{eyebrow}</span>
              <h2 className="nx-title" style={{ fontSize: 'clamp(25px, 3vw, 38px)' }}>{title}</h2>
              <p className="nx-sub">{sub}</p>
            </motion.div>

            <div className="pr-grid">
              {features.map(({ id, icon: Icon, tone, title: ft, body, points }, i) => (
                <motion.div key={id} id={id} className="pr-card" {...fade(0.05 + i * 0.06)}>
                  <div className={`nx-ficon nx-ficon-${tone}`}>
                    <Icon size={20} strokeWidth={2} />
                  </div>
                  <h3 className="pr-card-title">{ft}</h3>
                  <p className="pr-card-body">{body}</p>
                  <ul className="pr-points">
                    {points.map(p => (
                      <li key={p}><Check size={14} strokeWidth={2.6} />{p}</li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="landing-container" style={{ padding: '24px 0 100px' }}>
        <motion.div {...fade(0)} className="v2-cta-block">
          <span className="eyebrow no-line">get started</span>
          <h2>See it running on<br /><em>your enquiry list.</em></h2>
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
    </div>
  )
}
