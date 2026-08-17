import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight, Check, Loader2,
  Clock, Phone, ShieldCheck,
} from 'lucide-react'
import { createBookDemoRequest } from '../api/bookDemo/bookDemoService'
import { useTheme } from '../hooks/useTheme'
import SiteNav from '../components/SiteNav'
import SiteFooter from '../components/SiteFooter'

const INITIAL_FORM = {
  fullName: '', workEmail: '', organization: '', message: '',
}

const fade = {
  hidden: { opacity: 0, y: 18 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
}

const HIGHLIGHTS = [
  { icon: Clock, text: 'A live 15-minute walkthrough. No slides, no fluff.' },
  { icon: Phone, text: 'See your funnel inside EduGuide with sample data.' },
  { icon: ShieldCheck, text: 'Your details stay private. We never share or spam.' },
]

/* ── Field ── */
function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{
        fontSize: 12, fontWeight: 600,
        color: 'var(--ink-3)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        fontFamily: 'var(--mono)',
      }}>
        {label}
      </span>
      {children}
    </label>
  )
}

const inputStyle = {
  width: '100%',
  padding: '13px 16px',
  borderRadius: 12,
  border: '1px solid var(--hair)',
  background: 'var(--surface)',
  color: 'var(--ink)',
  fontSize: 15,
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
}

function applyFocus(e) {
  e.target.style.borderColor = 'var(--accent)'
  e.target.style.boxShadow = '0 0 0 3px var(--accent-tint)'
}
function applyBlur(e) {
  e.target.style.borderColor = 'var(--hair)'
  e.target.style.boxShadow = 'none'
}

export default function BookDemoPage() {
  const [theme, toggleTheme] = useTheme()
  const [form, setForm] = useState(INITIAL_FORM)
  const [submitState, setSubmitState] = useState('idle')
  const [submitError, setSubmitError] = useState('')

  const set = field => e => {
    setForm(p => ({ ...p, [field]: e.target.value }))
    if (submitState !== 'idle') setSubmitState('idle')
    if (submitError) setSubmitError('')
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setSubmitState('submitting')
    setSubmitError('')

    const payload = {
      full_name: form.fullName.trim(),
      email: form.workEmail.trim(),
      institution: form.organization.trim(),
      body: form.message.trim(),
    }

    if (!payload.full_name || !payload.email || !payload.institution || !payload.body) {
      setSubmitError('Please fill in all fields.')
      setSubmitState('error')
      return
    }

    try {
      await createBookDemoRequest(payload)
      setSubmitState('success')
      setForm(INITIAL_FORM)
    } catch (error) {
      setSubmitError(error.message || 'Something went wrong. Please try again.')
      setSubmitState('error')
    }
  }

  return (
    <div
      className="landing-v2"
      data-accent="edu"
      data-theme-scope={theme}
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <SiteNav theme={theme} onToggleTheme={toggleTheme} />

      {/* Body */}
      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        padding: '120px 32px 100px',
      }}>
        {/* Soft accent glows in theme color */}
        <div aria-hidden style={{
          position: 'absolute', top: '-10%', left: '-5%',
          width: '45vw', height: '45vw',
          background: 'var(--accent-tint)',
          filter: 'blur(80px)', opacity: 0.6,
          borderRadius: '50%', pointerEvents: 'none',
        }} />
        <div aria-hidden style={{
          position: 'absolute', bottom: '-15%', right: '-10%',
          width: '50vw', height: '50vw',
          background: 'var(--accent-soft)',
          filter: 'blur(100px)', opacity: 0.45,
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        <div style={{
          maxWidth: 1120, margin: '0 auto', width: '100%',
          position: 'relative', zIndex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.05fr)',
          gap: 64,
          alignItems: 'start',
        }}
          className="bd-grid"
        >
          {/* Left - pitch */}
          <motion.div variants={fade} initial="hidden" animate="show" custom={0}>
            <span className="eyebrow" style={{ display: 'inline-block', marginBottom: 22 }}>
              book a demo
            </span>

            <h1 style={{
              fontFamily: 'var(--display)',
              fontSize: 'clamp(2.4rem, 4.6vw, 3.6rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.035em',
              color: 'var(--ink)',
              margin: '0 0 22px',
            }}>
              See EduGuide run on<br />
              <em style={{ color: 'var(--accent)' }}>your intake.</em>
            </h1>

            <p style={{
              fontSize: 17, lineHeight: 1.65,
              color: 'var(--ink-3)',
              maxWidth: 460, margin: '0 0 36px',
            }}>
              Tell us a little about your team and we&apos;ll set up a live walkthrough
              of the platform, tuned to how your admissions cycle actually works.
            </p>

            <ul style={{
              listStyle: 'none', padding: 0, margin: 0,
              display: 'flex', flexDirection: 'column', gap: 18,
            }}>
              {HIGHLIGHTS.map(({ icon: Icon, text }) => (
                <li key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <span style={{
                    width: 36, height: 36, flexShrink: 0,
                    borderRadius: 10,
                    background: 'var(--accent-tint)',
                    color: 'var(--accent)',
                    display: 'grid', placeItems: 'center',
                    border: '1px solid var(--accent-soft)',
                  }}>
                    <Icon size={16} strokeWidth={2.2} />
                  </span>
                  <span style={{
                    fontSize: 15, lineHeight: 1.55, color: 'var(--ink-2)', paddingTop: 8,
                  }}>
                    {text}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Right - form */}
          <motion.div variants={fade} initial="hidden" animate="show" custom={1}>
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--hair)',
              borderRadius: 24,
              padding: 36,
              boxShadow: 'var(--shadow-lg)',
            }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <Field label="Full name">
                  <input
                    type="text" required autoComplete="name" placeholder="Rohit Mehra"
                    value={form.fullName} onChange={set('fullName')}
                    style={inputStyle} onFocus={applyFocus} onBlur={applyBlur}
                  />
                </Field>

                <Field label="Work email">
                  <input
                    type="email" required autoComplete="email" placeholder="rohit@cbit.ac.in"
                    value={form.workEmail} onChange={set('workEmail')}
                    style={inputStyle} onFocus={applyFocus} onBlur={applyBlur}
                  />
                </Field>

                <Field label="Institution">
                  <input
                    type="text" required autoComplete="organization" placeholder="CBIT"
                    value={form.organization} onChange={set('organization')}
                    style={inputStyle} onFocus={applyFocus} onBlur={applyBlur}
                  />
                </Field>

                <Field label="How can we help?">
                  <textarea
                    rows={3}
                    required
                    placeholder="Current challenges, expected call volume…"
                    value={form.message} onChange={set('message')}
                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }}
                    onFocus={applyFocus} onBlur={applyBlur}
                  />
                </Field>

                {submitState === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 14px', borderRadius: 12,
                      background: 'var(--accent-tint)',
                      border: '1px solid var(--accent-soft)',
                      color: 'var(--accent)',
                      fontSize: 14, fontWeight: 600,
                    }}
                  >
                    <Check size={16} strokeWidth={2.5} />
                    Received! We&apos;ll be in touch shortly.
                  </motion.div>
                )}
                {submitState === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    style={{
                      padding: '12px 14px', borderRadius: 12,
                      background: 'rgba(220, 38, 38, 0.08)',
                      border: '1px solid rgba(220, 38, 38, 0.25)',
                      color: '#b91c1c',
                      fontSize: 14, fontWeight: 500,
                    }}
                  >
                    {submitError || 'Something went wrong. Please try again.'}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={submitState === 'submitting'}
                  className="btn btn-solid-ink btn-arrow"
                  style={{
                    marginTop: 6,
                    justifyContent: 'center',
                    width: '100%',
                    padding: '14px 22px',
                    fontSize: 15,
                    opacity: submitState === 'submitting' ? 0.75 : 1,
                    cursor: submitState === 'submitting' ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitState === 'submitting' ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'bd-spin 1s linear infinite' }} />
                      Submitting…
                    </>
                  ) : (
                    <>Request demo <ArrowRight size={15} /></>
                  )}
                </button>

                <p style={{
                  margin: 0, textAlign: 'center',
                  fontSize: 12, color: 'var(--ink-4)',
                  fontFamily: 'var(--mono)', letterSpacing: '0.04em',
                }}>
                  We typically reply within one business day.
                </p>
              </form>
            </div>
          </motion.div>
        </div>
      </div>

      <SiteFooter />

      <style>{`
        @keyframes bd-spin { to { transform: rotate(360deg); } }
        @media (max-width: 880px) {
          .bd-grid {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
          }
        }
      `}</style>
    </div>
  )
}
