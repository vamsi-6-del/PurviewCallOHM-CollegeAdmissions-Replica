import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight, Languages, Bot, RotateCw, LayoutDashboard,
  Upload, GraduationCap, Mic2, PhoneCall, CalendarRange,
  Plus, Check, X, Clock, PhoneOff, FileSpreadsheet, UserX,
  Megaphone, ClipboardCheck, BellRing, Wallet, Repeat2, Building2,
  ShieldCheck, Lock, ServerCog, FileCheck2, Quote,
  Play, Pause,
} from 'lucide-react'

import { BrandMark } from '../../components/BrandLogo'
import { CLIPS } from './clips'

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay },
})

/* ─────────── Stats ─────────── */
const STATS = [
  { value: '80K+', label: 'Leads called' },
  { value: '72%', label: 'Counsellor time saved' },
  { value: '30+', label: 'Languages supported' },
  { value: '10', label: 'Live campaigns' },
]

export function StatsSection() {
  return (
    <section className="nx-section" style={{ paddingTop: 24, paddingBottom: 0 }}>
      <div className="landing-container">
        <motion.div className="nx-stats" {...fade(0)}>
          {STATS.map((s) => (
            <div key={s.label} className="nx-stat">
              <div className="nx-stat-v">{s.value}</div>
              <div className="nx-stat-l">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ─────────── Why this exists ─────────── */
const PAINS = [
  {
    icon: Clock,
    title: 'The list is bigger than the team',
    body: 'Four counsellors, twelve thousand enquiries, a six week window. Most of that list is never called even once.',
  },
  {
    icon: PhoneOff,
    title: 'First attempt, no answer, gone',
    body: 'A candidate who was busy at 11 AM rarely gets a second attempt. The intent was there, but the follow-up was not.',
  },
  {
    icon: FileSpreadsheet,
    title: 'The truth lives in a spreadsheet',
    body: 'Dispositions typed at the end of the day, exported weekly. By the time you spot a drop-off, the cohort has moved on.',
  },
  {
    icon: UserX,
    title: 'Seasonal callers, seasonal quality',
    body: 'You hire and train for every intake, and every intake starts from zero on what your college actually offers.',
  },
]

export function WhyExistsSection() {
  return (
    <section className="nx-section">
      <div className="landing-container">
        <motion.div className="nx-head" {...fade(0)}>
          <span className="nx-eyebrow">Why this exists</span>
          <h2 className="nx-title">
            Admissions teams are stretched thin. <em>We give them leverage.</em>
          </h2>
          <p className="nx-sub">
            An intake season means thousands of enquiries, hundreds of callbacks and a
            small counselling team. Spreadsheets and manual dialling leave seats
            unfilled. EduGuide is the bridge between your enquiry list and a full intake.
          </p>
        </motion.div>

        <div className="nx-pains">
          {PAINS.map(({ icon: Icon, title, body }, i) => (
            <motion.div key={title} className="nx-pain" {...fade(0.05 + i * 0.06)}>
              <span className="nx-pain-icon"><Icon size={17} strokeWidth={2} /></span>
              <div>
                <h3 className="nx-pain-title">{title}</h3>
                <p className="nx-pain-body">{body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────── Features ─────────── */
const FEATURES = [
  {
    icon: Languages,
    tone: 'indigo',
    title: 'Call in their language',
    body: 'Voice agents like Priya and Meera switch fluently between Hindi, Tamil and English mid-call, so every contact is understood no matter what they speak.',
  },
  {
    icon: Bot,
    tone: 'violet',
    title: 'One agent, every answer',
    body: 'Brief your admission agent once on fees, hostel, placements and cutoffs, and it then handles any question a candidate asks about your college.',
  },
  {
    icon: RotateCw,
    tone: 'sky',
    title: 'Busy? Captured, not lost',
    body: 'If a contact is busy on the first attempt, the agent notes the time they asked for and logs the callback automatically. Nobody replays a recording to find it.',
  },
  {
    icon: LayoutDashboard,
    tone: 'emerald',
    title: 'Every call transcribed and scored',
    body: 'Recordings, transcripts, sentiment, duration and outcome all roll into one analytics dashboard, the same one your team logs into every morning.',
  },
]

export function FeaturesSection() {
  return (
    <section className="nx-section">
      <div className="landing-container">
        <motion.div className="nx-head" {...fade(0)}>
          <span className="nx-eyebrow">Platform</span>
          <h2 className="nx-title">
            Everything admissions needs to <em>move faster</em>
          </h2>
          <p className="nx-sub">
            EduGuide runs the calling, the conversation and the reporting, so your
            counsellors only spend time on candidates who are actually interested.
          </p>
        </motion.div>

        <div className="nx-features">
          {FEATURES.map(({ icon: Icon, tone, title, body }, i) => (
            <motion.div key={title} className="nx-fcard" {...fade(0.05 + i * 0.06)}>
              <div className={`nx-ficon nx-ficon-${tone}`}>
                <Icon size={20} strokeWidth={2} />
              </div>
              <h3 className="nx-ftitle">{title}</h3>
              <p className="nx-fbody">{body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────── How it works ─────────── */
/* Seven steps sit on an ellipse. The active one rotates to the top of the ring
   and its copy is shown in the middle, so the whole intake flow is visible at
   once instead of scrolling through six cards. */
const FLOW = [
  {
    icon: Upload, label: 'Import list', tone: 'indigo',
    title: 'Import your enquiry list',
    body: 'Upload a CSV from your enquiry forms, ad leads or education fairs, or add candidates by hand. No CRM required.',
  },
  {
    icon: GraduationCap, label: 'Brief agent', tone: 'violet',
    title: 'Brief your admission agent',
    body: 'Tell it about fees, hostel, placements and cutoffs once. It then answers anything a candidate asks, the same way every time.',
  },
  {
    icon: Mic2, label: 'Model & voice', tone: 'sky',
    title: 'Pick the model and voice',
    body: 'Choose the reasoning model, a natural Indian-accent voice and the languages it should switch between mid-call.',
  },
  {
    icon: PhoneCall, label: 'AI calling', tone: 'amber',
    title: 'AI voice calling, 24/7',
    body: 'Agents call and qualify every candidate in 30+ languages, at the hour that suits them, scoring each answer as they go.',
  },
  {
    icon: ClipboardCheck, label: 'Auto-qualify', tone: 'emerald',
    title: 'Auto-qualify every call',
    body: 'Every call is scored against your admission criteria, question by question, with the sentiment and the full transcript behind each score.',
  },
  {
    icon: CalendarRange, label: 'Counselling', tone: 'rose',
    title: 'Book the counselling slot',
    body: 'Interested candidates are booked into open counselling and campus-visit slots, then reminded until they turn up.',
  },
  {
    icon: LayoutDashboard, label: 'Analytics', tone: 'indigo',
    title: 'Live admissions analytics',
    body: 'Recordings, transcripts, sentiment and dispositions land live in the one dashboard your team opens every morning.',
  },
]

const HIW_INTERVAL = 4600

/* `page` renders it as a standalone page hero (no tint band, more top room for
   the floating nav pill) — the /workflow route uses that form. */
export function HowItWorksSection({ page = false }) {
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(true)
  const step = FLOW[active]

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setActive(i => (i + 1) % FLOW.length), HIW_INTERVAL)
    return () => clearInterval(id)
  }, [playing, active])

  const select = (i) => { setActive(i); setPlaying(false) }

  /* On phones the ring flattens into a horizontal strip, so the active card can
     sit off-screen — whether you picked it or the rotation moved on. Keep it
     centred. The desktop ellipse does not scroll, so it is left alone. */
  const ringRef = useRef(null)
  const cardRefs = useRef([])
  useEffect(() => {
    const ring = ringRef.current
    const card = cardRefs.current[active]
    if (!ring || !card) return
    if (ring.scrollWidth <= ring.clientWidth + 4) return
    const offset = card.getBoundingClientRect().left - ring.getBoundingClientRect().left + ring.scrollLeft
    ring.scrollTo({ left: offset - (ring.clientWidth - card.offsetWidth) / 2, behavior: 'smooth' })
  }, [active])

  return (
    <section
      className={`nx-section hiw${page ? ' hiw-as-page' : ' nx-section-tint'}`}
      id="how-it-works"
    >
      <div className="landing-container">
        <motion.div className="nx-head" {...fade(0)}>
          <span className="nx-eyebrow">How it works</span>
          <h2 className="nx-title">
            From enquiry list to enrolled student with <em>Admissions Auto Flow</em>
          </h2>
        </motion.div>

        <div className="hiw-stage">
          <div className="hiw-ring" ref={ringRef}>
            {FLOW.map(({ icon: Icon, label, tone }, i) => {
              /* Active card at the top of the ellipse; the rest follow clockwise. */
              const angle = (-90 + ((i - active + FLOW.length) % FLOW.length) * (360 / FLOW.length)) * (Math.PI / 180)
              const isActive = i === active
              return (
                <button
                  key={label}
                  ref={(el) => { cardRefs.current[i] = el }}
                  type="button"
                  onClick={() => select(i)}
                  aria-label={`Step ${i + 1}: ${label}`}
                  aria-current={isActive}
                  className={`hiw-card hiw-card-${tone}${isActive ? ' is-active' : ''}`}
                  style={{
                    '--x': `${50 + Math.cos(angle) * 39}%`,
                    '--y': `${50 + Math.sin(angle) * 44}%`,
                    /* Tilt with the curve: flat at the top, leaning most at the sides */
                    '--r': `${isActive ? 0 : Math.cos(angle) * 15}deg`,
                  }}
                >
                  <span className="hiw-card-icon"><Icon size={isActive ? 30 : 24} strokeWidth={1.7} /></span>
                  <span className="hiw-card-label">{label}</span>
                </button>
              )
            })}
          </div>

          <div className="hiw-center">
            <span className="hiw-step">Step {String(active + 1).padStart(2, '0')} / {String(FLOW.length).padStart(2, '0')}</span>
            <AnimatePresence mode="wait">
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <h3 className="hiw-title">{step.title}</h3>
                <p className="hiw-body">{step.body}</p>
              </motion.div>
            </AnimatePresence>
            <Link to="/book-demo" className="btn btn-solid-ink hiw-cta">
              Start admissions now <ArrowRight size={16} />
            </Link>
          </div>

          <div className="hiw-controls">
            <div className="hiw-dots">
              {FLOW.map((s, i) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => select(i)}
                  aria-label={`Go to step ${i + 1}`}
                  className={`hiw-dot${i === active ? ' is-active' : ''}`}
                >
                  <span />
                </button>
              ))}
            </div>
            <button type="button" className="hiw-play" onClick={() => setPlaying(p => !p)}>
              {playing ? <Pause size={12} /> : <Play size={12} />}
              {playing ? 'Pause' : 'Play'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────── Demo split ─────────── */
const OUTCOME_BARS = [
  { label: 'Success', value: 68, color: '#10B981' },
  { label: 'Partial', value: 22, color: '#F59E0B' },
  { label: 'Failure', value: 10, color: '#F43F5E' },
]

const TREND = [18, 26, 22, 38, 34, 47, 52, 46, 61, 58, 72, 80]

function DashboardPreview() {
  const w = 320
  const h = 96
  const pad = 6
  const step = (w - pad * 2) / (TREND.length - 1)
  const pts = TREND.map((v, i) => [pad + i * step, h - pad - (v / 100) * (h - pad * 2)])
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${w - pad},${h - pad} L${pad},${h - pad} Z`

  return (
    <>
      <div className="nx-prev-row">
        <div className="nx-kpi">
          <div className="nx-kpi-l">Calls</div>
          <div className="nx-kpi-v">1,204</div>
          <div className="nx-kpi-d">↑ 18%</div>
        </div>
        <div className="nx-kpi">
          <div className="nx-kpi-l">Avg. duration</div>
          <div className="nx-kpi-v">4m 12s</div>
          <div className="nx-kpi-d">↑ 6%</div>
        </div>
        <div className="nx-kpi">
          <div className="nx-kpi-l">Positive mood</div>
          <div className="nx-kpi-v">74%</div>
          <div className="nx-kpi-d">↑ 9%</div>
        </div>
      </div>

      <div className="nx-prev-chart">
        <div className="nx-panel-h">
          <span className="nx-panel-t">Conversion trend</span>
          <span className="nx-panel-m">last 12 days</span>
        </div>
        <svg className="nx-spark" style={{ height: 96 }} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="nxTrendStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4F46E5" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
            <linearGradient id="nxTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#nxTrendFill)" />
          <path d={line} fill="none" stroke="url(#nxTrendStroke)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="nx-prev-legend">
          {OUTCOME_BARS.map((b) => (
            <span key={b.label}>
              <i style={{ background: b.color }} /> {b.label} {b.value}%
            </span>
          ))}
        </div>
      </div>
    </>
  )
}

const DEMO_POINTS = [
  'Full transcript and recording against every contact',
  'Sentiment, priority and skepticism scored per call',
  'Outcomes and callbacks synced to the contact timeline',
]

export function DemoSection() {
  return (
    <section className="nx-section">
      <div className="landing-container">
        <motion.div className="nx-split" {...fade(0)}>
          <div className="nx-split-media">
            <DashboardPreview />
          </div>
          <div className="nx-split-text">
            <span className="nx-eyebrow">See it in action</span>
            <h2 className="nx-title">
              Every conversation, <em>scored automatically</em>
            </h2>
            <p className="nx-sub">
              Nobody listens back to recordings. Each call your agent makes is
              transcribed, tagged and rolled into a live overview, so you know how a
              campaign is doing without pulling a single report.
            </p>
            <ul className="nx-split-list">
              {DEMO_POINTS.map((p) => (
                <li key={p}><Check size={16} strokeWidth={3} /> {p}</li>
              ))}
            </ul>
            <Link to="/workflow" className="nx-link">
              See the full workflow <ArrowRight size={16} />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ─────────── Results ─────────── */
const RESULTS = [
  { stat: '3.2x', label: 'More conversations completed every week, without adding headcount' },
  { stat: '68%', label: 'Fewer manual dialling hours for the admissions team' },
  { stat: '92%', label: 'Of callback requests logged automatically, ready for your team to action' },
]

export function ResultsSection() {
  return (
    <section className="nx-section nx-section-tint">
      <div className="landing-container">
        <motion.div className="nx-head" {...fade(0)}>
          <span className="nx-eyebrow">Results</span>
          <h2 className="nx-title">
            Colleges move faster with <em>EduGuide</em>
          </h2>
          <p className="nx-sub">
            Real outcomes once AI handles the calling, the conversation and the follow-up.
          </p>
        </motion.div>

        <div className="nx-results">
          {RESULTS.map((r, i) => (
            <motion.div key={r.label} className="nx-rcard" {...fade(0.05 + i * 0.06)}>
              <div className="nx-rstat">{r.stat}</div>
              <p className="nx-rlabel">{r.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────── Use cases ─────────── */
const USE_CASES = [
  {
    icon: Megaphone, tag: 'Top of funnel',
    title: 'Fresh enquiry outreach',
    body: 'Every form fill, ad lead and education-fair contact called within hours of landing, while your college is still on their mind.',
  },
  {
    icon: ClipboardCheck, tag: 'Post-result',
    title: 'Rank and result campaigns',
    body: 'The moment results are out, call the score bands you actually admit and pitch the branches they qualify for.',
  },
  {
    icon: BellRing, tag: 'Follow-up',
    title: 'Callback and no-answer chase',
    body: 'Busy, switched off, asked to be called at 7 PM. Whatever the outcome, the agent retries on the right cadence instead of dropping the lead.',
  },
  {
    icon: Wallet, tag: 'Conversion',
    title: 'Application and fee nudges',
    body: 'Half-filled applications and pending payments chased automatically, with the counsellor looped in only when it stalls.',
  },
  {
    icon: Repeat2, tag: 'Retention',
    title: 'Counselling round reminders',
    body: 'Confirm attendance for counselling dates, spot-admission days and document verification without a manual call list.',
  },
  {
    icon: Building2, tag: 'Multi-campus',
    title: 'Group and multi-branch intake',
    body: 'Run separate agents, numbers and analytics per campus, and still see the whole group funnel in one dashboard.',
  },
]

export function UseCasesSection() {
  return (
    <section className="nx-section">
      <div className="landing-container">
        <motion.div className="nx-head" {...fade(0)}>
          <span className="nx-eyebrow">Use cases</span>
          <h2 className="nx-title">
            One platform, <em>every campaign in the season</em>
          </h2>
          <p className="nx-sub">
            Admissions is not one call, it is a chain of them. EduGuide runs each stage
            of that chain on its own cadence.
          </p>
        </motion.div>

        <div className="nx-uses">
          {USE_CASES.map(({ icon: Icon, tag, title, body }, i) => (
            <motion.div key={title} className="nx-use" {...fade(0.04 + i * 0.05)}>
              <div className="nx-use-top">
                <span className="nx-use-icon"><Icon size={16} strokeWidth={2} /></span>
                <span className="nx-use-tag">{tag}</span>
              </div>
              <h3 className="nx-use-title">{title}</h3>
              <p className="nx-use-body">{body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}


/* Shared visibility gate: a clip is only fetched once its own block is near
   the viewport, and it pauses again the moment you scroll past. */
function useVideoInView() {
  const [inView, setInView] = useState(false)
  const boxRef = useRef(null)
  const videoRef = useRef(null)

  useEffect(() => {
    const el = boxRef.current
    if (!el || typeof IntersectionObserver === 'undefined') { setInView(true); return }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true)
        const v = videoRef.current
        if (!v) return
        if (entry.isIntersecting) v.play().catch(() => {})
        else v.pause()
      },
      { rootMargin: '200px', threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return { inView, boxRef, videoRef }
}

/* The clips ship with the generator's mark burnt into the bottom-right pixels,
   so every frame carries our own badge in that corner instead. */
function VideoMark() {
  return (
    <span className="nx-vmark" aria-hidden="true">
      <BrandMark />
    </span>
  )
}

/* ── The three middle clips: media and copy trade sides row by row ── */
function VideoRow({ item, index }) {
  const { icon: Icon, tag, title, body, points, src } = item
  const { inView, boxRef, videoRef } = useVideoInView()

  return (
    <motion.div
      ref={boxRef}
      className={`nx-vrow${index % 2 ? ' is-flipped' : ''}`}
      {...fade(0)}
    >
      <div className="nx-vrow-media">
        <div className="nx-vframe">
          {inView && (
            <video
              ref={videoRef}
              className="nx-vvideo"
              src={src}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            />
          )}
          <VideoMark />
        </div>
      </div>

      <div className="nx-vrow-text">
        <span className="nx-vrow-tag">
          <span className="nx-vrow-icon"><Icon size={15} strokeWidth={2.1} /></span>
          {tag}
        </span>
        <h3 className="nx-vrow-title">{title}</h3>
        <p className="nx-vrow-body">{body}</p>
        <ul className="nx-vrow-list">
          {points.map((p) => (
            <li key={p}><Check size={15} strokeWidth={3} /> {p}</li>
          ))}
        </ul>
      </div>
    </motion.div>
  )
}

/* Sits directly under the hero, where the product mockup used to be. */
export function VideoStorySection() {
  return (
    <section className="nx-section nx-vsection nx-vstory">
      <div className="landing-container">
        <motion.div className="nx-head" {...fade(0)}>
          <span className="nx-eyebrow">See it in action</span>
          <h2 className="nx-title">
            Every stage of the season, <em>handled on the call</em>
          </h2>
          <p className="nx-sub">
            No slides. This is what a candidate actually hears, from the course
            they pick to the reminder that gets them enrolled.
          </p>
        </motion.div>

        {/* The opening clip already plays in the hero, so the rows pick up
            from the stage after it. */}
        <div className="nx-vrows">
          {CLIPS.slice(1).map((item, i) => (
            <VideoRow key={item.title} item={item} index={i} />
          ))}
        </div>

        <motion.div className="nx-vbig-cta" {...fade(0.1)}>
          <Link to="/workflow" className="nx-link">
            See the live workflow <ArrowRight size={16} />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

/* ─────────── Before / after comparison ─────────── */
const COMPARE = [
  ['Counsellors dial 50 leads a day', 'Your full list dialled in a day'],
  ['Excel disposition tracking, daily exports', 'Live disposition and sentiment per call'],
  ['Lost callbacks, dropped follow-ups', 'Automatic follow-up on the right cadence'],
  ['“How is the funnel doing?” guesswork', 'Real-time conversion analytics'],
  ['One language per caller', '30+ Indian languages on the same agent'],
  ['Hire seasonal callers every intake', 'Scale without adding headcount'],
]

export function ComparisonSection() {
  return (
    <section className="nx-section nx-section-tint">
      <div className="landing-container">
        <motion.div className="nx-head" {...fade(0)}>
          <span className="nx-eyebrow">Why EduGuide</span>
          <h2 className="nx-title">
            A better admissions engine, <em>by design</em>
          </h2>
          <p className="nx-sub">
            The same intake list, run two ways. This is the difference your counsellors
            feel in week one.
          </p>
        </motion.div>

        <motion.div className="nx-compare" {...fade(0.08)}>
          <div className="nx-compare-h">
            <span className="nx-compare-hl">Traditional admissions ops</span>
            <span className="nx-compare-hr">Admissions on EduGuide</span>
          </div>
          {COMPARE.map(([before, after]) => (
            <div key={before} className="nx-compare-row">
              <span className="nx-compare-before">
                <X size={14} strokeWidth={3} /> {before}
              </span>
              <span className="nx-compare-after">
                <Check size={14} strokeWidth={3} /> {after}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ─────────── Voices from admissions teams ─────────── */
const VOICES = [
  {
    quote: 'We used to decide which half of the enquiry list to ignore. Now the whole list gets a real conversation and my team only walks into meetings that are worth having.',
    role: 'Admissions Director',
    org: 'Private engineering college · Telangana',
  },
  {
    quote: 'The language switching is what sold the principal. A candidate starts in English, drops into Telugu halfway, and the agent just follows them.',
    role: 'Head of Counselling',
    org: 'Autonomous institute · 2,400 seats',
  },
  {
    quote: 'Every callback the agent books shows up on the counsellor timeline with the transcript attached. Nobody asks “what did they say?” anymore.',
    role: 'Marketing Lead',
    org: 'Multi-campus group · 3 institutes',
  },
]

export function VoicesSection() {
  return (
    <section className="nx-section">
      <div className="landing-container">
        <motion.div className="nx-head" {...fade(0)}>
          <span className="nx-eyebrow">From the field</span>
          <h2 className="nx-title">
            What admissions teams <em>tell us</em>
          </h2>
        </motion.div>

        <div className="nx-quotes">
          {VOICES.map((v, i) => (
            <motion.figure key={v.quote} className="nx-quote" {...fade(0.05 + i * 0.07)}>
              <span className="nx-quote-mark"><Quote size={16} strokeWidth={2.2} /></span>
              <blockquote className="nx-quote-text">{v.quote}</blockquote>
              <figcaption className="nx-quote-by">
                <span className="nx-quote-role">{v.role}</span>
                <span className="nx-quote-org">{v.org}</span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────── Compliance & security ─────────── */
const PILLARS = [
  {
    icon: ShieldCheck, title: 'TRAI & DND compliant',
    body: 'Calling-window enforcement, DND scrubs and opt-out handling built into every campaign.',
  },
  {
    icon: FileCheck2, title: 'Consent captured per lead',
    body: 'Consent metadata is stored against the contact, and calls are placed only against lists you upload.',
  },
  {
    icon: Lock, title: 'Your data stays yours',
    body: 'Recordings, transcripts and analytics belong to your institution. Export anytime, delete anytime.',
  },
  {
    icon: ServerCog, title: 'Fits your stack',
    body: 'CSV in, webhook or CRM sync out. No rip-and-replace, no three-month integration project.',
  },
]

export function ComplianceSection() {
  return (
    <section className="nx-section nx-section-tint">
      <div className="landing-container">
        <motion.div className="nx-head" {...fade(0)}>
          <span className="nx-eyebrow">Compliance & security</span>
          <h2 className="nx-title">
            Built for institutions, <em>not just for speed</em>
          </h2>
          <p className="nx-sub">
            Calling students at scale comes with obligations. We handle them so your name
            is never the one on a complaint.
          </p>
        </motion.div>

        <div className="nx-pillars">
          {PILLARS.map(({ icon: Icon, title, body }, i) => (
            <motion.div key={title} className="nx-pillar" {...fade(0.05 + i * 0.06)}>
              <span className="nx-pillar-icon"><Icon size={18} strokeWidth={2} /></span>
              <h3 className="nx-pillar-title">{title}</h3>
              <p className="nx-pillar-body">{body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────── Pricing teaser ─────────── */
const PRICING_POINTS = [
  'Per-call pricing for outbound conversations',
  'Platform fee that scales with your intake size',
  'No long contracts, no per-seat licences',
]

export function PricingTeaserSection() {
  return (
    <section className="nx-section">
      <div className="landing-container">
        <motion.div className="nx-price-band" {...fade(0)}>
          <div>
            <span className="nx-eyebrow">Pricing</span>
            <h2 className="nx-title" style={{ textAlign: 'left', margin: '0 0 14px' }}>
              Priced around your <em>intake</em>, not a seat count
            </h2>
            <p className="nx-sub" style={{ textAlign: 'left', margin: 0 }}>
              Tell us your enquiry volume and calling window and we will shape a plan
              around it. Most colleges see the number on the first call.
            </p>
          </div>
          <div className="nx-price-side">
            <ul className="nx-split-list">
              {PRICING_POINTS.map((p) => (
                <li key={p}><Check size={16} strokeWidth={3} /> {p}</li>
              ))}
            </ul>
            <div className="nx-price-btns">
              <Link to="/pricing" className="btn btn-solid-ink btn-arrow">
                See pricing <ArrowRight size={16} />
              </Link>
              <Link to="/book-demo" className="nx-link">
                Talk to us <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ─────────── FAQ ─────────── */
const FAQS = [
  {
    q: 'Do we need a separate CRM?',
    a: 'No. Import your enquiry list as a CSV or add contacts manually right inside EduGuide, which tracks every contact through New, Contacted, Interested, Applied and Enrolled. If you already run a CRM, you can keep bringing leads in from there.',
  },
  {
    q: 'How does the agent handle objections, languages and callbacks?',
    a: 'The agent is built for admissions conversations specifically. It handles common objections (fees, placements, branch availability), switches to the candidate’s preferred language mid-call, and if they are busy on the first attempt it logs the time they asked to be called back, ready for your team to action.',
  },
  {
    q: 'What about TRAI, DND and consent compliance?',
    a: 'Calls are placed only against the leads you upload, with consent metadata captured. TRAI window enforcement, opt-out handling and DND scrubs are built in. We can share the full compliance brief during the demo.',
  },
  {
    q: 'How fast can we go live?',
    a: 'Most colleges go live within a week. Day one is onboarding and agent configuration. By the end of the week your first cohort is being called and dispositions are flowing into the dashboard.',
  },
  {
    q: 'How does pricing work?',
    a: 'Per-call pricing for outbound conversations, plus a monthly platform fee that scales with intake volume. No long contracts. We share full pricing on the demo call once we know your intake size.',
  },
  {
    q: 'Who owns the call data?',
    a: 'You do. Recordings, transcripts, analytics and lead state are all yours. Export anytime, delete anytime.',
  },
]

export function FaqSection() {
  const [open, setOpen] = useState(0)
  return (
    <section className="nx-section">
      <div className="landing-container">
        <motion.div className="nx-head" {...fade(0)}>
          <span className="nx-eyebrow">FAQ</span>
          <h2 className="nx-title">Quick answers, <em>before the demo</em></h2>
        </motion.div>

        <div className="nx-faq">
          {FAQS.map((item, i) => {
            const isOpen = open === i
            return (
              <motion.div
                key={item.q}
                className={`nx-faq-item${isOpen ? ' is-open' : ''}`}
                {...fade(0.04 * i)}
              >
                <button
                  type="button"
                  className="nx-faq-q"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                >
                  <span>{item.q}</span>
                  <span className="nx-faq-ic"><Plus size={14} strokeWidth={2.5} /></span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <p className="nx-faq-a">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ─────────── Final CTA ─────────── */
export function FinalCtaSection() {
  return (
    <section className="nx-cta-wrap">
      <div className="landing-container">
        <motion.div
          className="nx-cta"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="nx-cta-eyebrow">Ready when your next intake is</span>
          <h2>Fill more seats. Without adding headcount.</h2>
          <p>
            A 15 minute walkthrough, no slides. We open your funnel inside EduGuide
            and show you what an AI-run intake actually looks like.
          </p>
          <div className="nx-cta-btns">
            <Link to="/book-demo" className="btn btn-lg nx-btn-white btn-arrow">
              Book a demo <ArrowRight size={16} />
            </Link>
            <Link to="/workflow" className="btn btn-lg nx-btn-glass">
              See the live workflow
            </Link>
          </div>
          <p className="nx-cta-meta">No credit card · No long contract · Live in under a week</p>
        </motion.div>
      </div>
    </section>
  )
}
