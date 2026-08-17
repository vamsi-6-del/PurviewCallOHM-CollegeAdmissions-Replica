import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '../hooks/useTheme'
import SiteNav from '../components/SiteNav'
import SiteFooter from '../components/SiteFooter'

/**
 * Pricing, set editorially.
 *
 * Neither plan carries a public rate card — the price is quoted per intake — so
 * the page sells the model rather than a number. The two plans run as a spread
 * rather than competing cards, and the promise gets the page's one dark band.
 */

const fade = (d = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, delay: d, ease: [0.22, 1, 0.36, 1] },
})

const PLANS = [
  {
    n: '01',
    eyebrow: 'Prepaid',
    name: 'Pay As You Go',
    price: 'Top up any amount',
    note: 'Credits, not contracts.',
    body: 'Recharge and use. Pay only for the calls you actually run.',
    points: [
      'Pay only for completed calls',
      'Recharge anytime, scale up or pause freely',
      'AI voice calling, scoring & counselling scheduling',
      'Multilingual calling across 30+ languages',
      'No lock-in, no setup fees, no surprises',
    ],
    cta: 'Start with credits',
    to: '/book-demo',
  },
  {
    n: '02',
    eyebrow: 'Custom pricing',
    name: 'Enterprise',
    price: "Let's talk",
    note: 'The best per-call rate we can offer.',
    body: 'Built for high-volume intakes and multi-campus rollouts.',
    points: [
      'Volume-based custom pricing at our lowest rates',
      'Dedicated success manager & priority support',
      'Separate agents and numbers per campus',
      'Custom CRM and ERP integrations',
      'Onboarding, rollout planning and season support',
    ],
    cta: 'Reach out to us',
    to: '/contact',
  },
]

const STEPS = [
  { n: '01', title: 'Recharge', body: 'Top up credits with any amount, whenever you need them. No minimum, no expiry games.' },
  { n: '02', title: 'Call candidates', body: 'Run AI voice calls across 30+ Indian languages, around the clock, through the whole intake season.' },
  { n: '03', title: 'Pay per call', body: 'Credits draw down only for completed calls. An unanswered ring costs you nothing.' },
]

export default function PricingPage() {
  const [theme, toggleTheme] = useTheme()

  return (
    <div className="landing-v2" data-accent="edu" data-theme-scope={theme} style={{ minHeight: '100vh' }}>
      <SiteNav theme={theme} onToggleTheme={toggleTheme} active="pricing" />

      {/* Masthead */}
      <section className="ed-section ed-masthead" style={{ paddingTop: 168 }}>
        <div className="ed-atmos" aria-hidden="true"><span /><span /><span /></div>
        <div className="ed-mesh" aria-hidden="true" />
        <div className="landing-container ed-inner">
          <motion.div {...fade(0)}>
            <span className="ed-kicker">Pricing</span>
            <h1 className="ed-display" style={{ margin: '22px 0 30px' }}>
              Simple pricing,<br />
              <em style={{ color: 'var(--accent)' }}>honest promise.</em>
            </h1>
            <p className="ed-lead" style={{ maxWidth: '48ch' }}>
              Two ways to pay, one commitment: the best price we can put on the table.
              Tell us your intake volume and we&apos;ll shape a plan around it.
            </p>
          </motion.div>
        </div>
      </section>

      {/* The two plans, as a spread. The second sits on tinted ground so
          the pair reads as two panels rather than one long column. */}
      {PLANS.map((plan, i) => (
        <section
          key={plan.n}
          className={`ed-section${i === 1 ? ' ed-section-tint' : ''}`}
          style={{ paddingLeft: 0, paddingRight: 0 }}
        >
          <div className="landing-container">
          <motion.div className="ed-split" {...fade(0)}>
            <div className="ed-aside">
              <span className="ed-kicker">{plan.n} · {plan.eyebrow}</span>
              <p className="ed-aside-note">{plan.body}</p>
            </div>

            <div className="pr-plan">
              <div>
                <h2 className="ed-h2">{plan.name}</h2>
                <p className="pr-price">{plan.price}</p>
                <p className="ed-body" style={{ marginTop: 8 }}>{plan.note}</p>
                <Link to={plan.to} className="ed-link" style={{ marginTop: 26 }}>
                  {plan.cta} <ArrowRight size={17} />
                </Link>
              </div>

              <ul className="ed-checks">
                {plan.points.map((p) => (
                  <li key={p}><Check size={15} strokeWidth={2.6} />{p}</li>
                ))}
              </ul>
            </div>
          </motion.div>
          </div>
        </section>
      ))}

      {/* How prepaid works */}
      <section className="landing-container ed-section">
        <motion.div className="ed-split" {...fade(0)}>
          <div className="ed-aside">
            <span className="ed-kicker">How prepaid works</span>
            <p className="ed-aside-note">Three steps, no contract in between.</p>
          </div>
          <div>
            <h2 className="ed-h2" style={{ marginBottom: 30 }}>Recharge, call, pay per call.</h2>
            <div className="ed-rows">
              {STEPS.map((step) => (
                <div key={step.n} className="ed-row">
                  <span className="ed-row-n">{step.n}</span>
                  <div className="ed-row-main">
                    <h3 className="ed-h3">{step.title}</h3>
                    <p className="ed-body">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* The promise — the page's one dark band */}
      <section className="ed-band">
        <div className="landing-container">
          <motion.div className="ed-split" {...fade(0)}>
            <div className="ed-aside">
              <span className="ed-kicker">Our price promise</span>
            </div>
            <div style={{ display: 'grid', gap: 30 }}>
              <h2 className="ed-h2">We promise the best pricing in the market.</h2>
              <p className="ed-lead">
                Find a better quote and we&apos;ll match it, or beat it. No bloated packages,
                no paying for seats you don&apos;t use. Just fair pricing for a full intake season.
              </p>
              <p className="ed-quote" style={{ maxWidth: '30ch' }}>
                &ldquo;Admit boldly. We&apos;ll keep the price honest.&rdquo;
              </p>
              <div>
                <Link to="/contact" className="ed-link ed-link-lg">
                  Ask for your best price <ArrowRight size={22} />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Closing */}
      <section className="landing-container ed-section ed-section-tight" style={{ borderTop: 'none' }}>
        <motion.div className="ed-split" {...fade(0)}>
          <div className="ed-aside">
            <span className="ed-kicker">Get started</span>
          </div>
          <div style={{ display: 'grid', gap: 26 }}>
            <h2 className="ed-h2" style={{ maxWidth: '18ch' }}>
              Tell us your intake. We&apos;ll quote a price around it.
            </h2>
            <p className="ed-body">
              15 minute call. No slides. A real walkthrough of your admissions funnel inside EduGuide.
            </p>
            <div className="btn-row">
              <Link to="/book-demo" className="btn btn-solid-ink btn-arrow">
                Book a demo <ArrowRight size={15} />
              </Link>
              <Link to="/contact" className="btn btn-outline-ink">Talk to us</Link>
            </div>
          </div>
        </motion.div>
      </section>

      <SiteFooter />

      <style>{`
        /* The plan's headline sits left, its inclusions right — a
           spread, not a card standing next to another card. */
        .pr-plan {
          display: grid;
          grid-template-columns: minmax(0, 0.85fr) minmax(0, 1fr);
          gap: 56px;
          align-items: start;
        }

        .pr-price {
          margin: 18px 0 0;
          font-family: var(--display);
          font-size: clamp(1.5rem, 2.6vw, 2.1rem);
          letter-spacing: -0.035em;
          color: var(--accent);
        }

        @media (max-width: 900px) {
          .pr-plan { grid-template-columns: minmax(0, 1fr); gap: 30px; }
        }
      `}</style>
    </div>
  )
}
