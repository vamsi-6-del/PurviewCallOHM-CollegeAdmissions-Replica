import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../../api/auth/authService'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, Moon, Sun, House } from 'lucide-react'
import { BrandLockup } from '../../components/BrandLogo'

function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    const saved = localStorage.getItem('callohm-theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.setAttribute('data-theme', 'dark')
    else root.removeAttribute('data-theme')
    localStorage.setItem('callohm-theme', theme)
  }, [theme])
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))]
}

const fade = {
  hidden: { opacity: 0, y: 12 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] } }),
}

const CAMPUS_IMG =
  'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?auto=format&fit=crop&w=1600&q=80'

function BrandMark({ light = false }) {
  return (
    <BrandLockup
      tagline="Agentic AI for College Admissions"
      tone={light ? 'light' : 'default'}
    />
  )
}

function Field({ id, label, type = 'text', value, onChange, placeholder, trailing, autoComplete }) {
  return (
    <label className="block" htmlFor={id}>
      <span
        className="mb-2 block text-[11px] font-medium uppercase"
        style={{ color: 'var(--ink-3)', letterSpacing: '0.1em', fontFamily: 'var(--mono)' }}
      >
        {label}
      </span>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full rounded-2xl px-4 py-3.5 pr-12 text-sm outline-none transition-all duration-200"
          style={{ border: '1px solid var(--hair)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--ui)' }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)'
            e.currentTarget.style.boxShadow = '0 0 0 4px color-mix(in srgb, var(--accent) 18%, transparent)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--hair)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
        {trailing}
      </div>
    </label>
  )
}

/** Turn an API/network failure into something a person can act on. */
function loginErrorMessage(err) {
  // fetch() rejects with a TypeError when the API is unreachable - no status.
  if (err?.status == null) {
    return 'Could not reach the server. Check your connection and try again.'
  }
  switch (err.status) {
    case 400:
    case 401:
      return err.message && !/^Request failed/.test(err.message)
        ? err.message
        : 'Incorrect email or password. Please try again.'
    case 403:
      return err.message || 'This account does not have access. Contact your administrator.'
    case 404:
      return 'No account found with that email address.'
    case 422:
      return err.message || 'Please enter a valid email address and password.'
    case 429:
      return 'Too many sign-in attempts. Please wait a moment and try again.'
    default:
      if (err.status >= 500) return 'The server ran into a problem. Please try again shortly.'
      return err.message || 'Sign-in failed. Please try again.'
  }
}

export default function Login() {
  const navigate = useNavigate()
  const [theme, toggleTheme] = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Enter both your email address and password to continue.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/app/analytics')
    } catch (err) {
      setError(loginErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="landing-v2 relative min-h-screen"
      data-accent="edu"
      data-theme-scope={theme}
      style={{ background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'var(--ui)' }}
    >
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">

        {/* Left: campus panel */}
        <aside className="relative hidden lg:flex flex-col overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url('${CAMPUS_IMG}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'saturate(0.85) contrast(0.95)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, color-mix(in srgb, var(--ink) 78%, transparent) 0%, color-mix(in srgb, var(--ink) 55%, transparent) 50%, color-mix(in srgb, var(--accent) 55%, transparent) 100%)',
              mixBlendMode: 'multiply',
            }}
          />
          <div className="relative z-10 flex h-full flex-col p-10 xl:p-14 text-white">
            <Link to="/" style={{ textDecoration: 'none' }}>
              <BrandMark light />
            </Link>
            <div className="mt-auto">
              <h2
                style={{
                  fontFamily: 'var(--display)',
                  fontWeight: 400,
                  fontSize: 'clamp(40px, 4.6vw, 64px)',
                  lineHeight: 1.02,
                  letterSpacing: '-0.022em',
                  color: '#fff',
                  textWrap: 'balance',
                }}
              >
                Every call.{' '}
                <em style={{ fontStyle: 'normal', color: 'color-mix(in srgb, var(--accent) 55%, white)' }}>
                  Every intake.
                </em>
              </h2>
              <p className="mt-5 max-w-sm" style={{ color: 'rgba(255,255,255,0.78)', fontSize: 15, lineHeight: 1.55 }}>
                One workspace for your admissions team.
              </p>
            </div>
          </div>
        </aside>

        {/* Right: login form */}
        <main className="relative flex flex-col">
          <div className="auth-topbar fixed top-0 right-0 z-50 flex items-center justify-between px-6 sm:px-10 py-4 lg:justify-end w-full lg:w-1/2">
            <Link to="/" className="auth-topbar-brand inline-flex lg:hidden" style={{ textDecoration: 'none' }}>
              <BrandMark />
            </Link>
            <div className="auth-topbar-actions flex items-center gap-2">
              <button
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <Link to="/" className="theme-toggle" aria-label="Home">
                <House size={16} />
              </Link>
            </div>
          </div>

          <div className="relative z-10 flex flex-1 items-center justify-center px-5 sm:px-8 py-10">
            <div className="w-full max-w-md">
              <motion.div custom={0} variants={fade} initial="hidden" animate="show" className="mb-7">
                <h1
                  className="text-4xl sm:text-5xl"
                  style={{ fontFamily: 'var(--display)', fontWeight: 700, letterSpacing: '-0.038em', lineHeight: 1.02 }}
                >
                  Sign <em style={{ fontStyle: 'normal' }}>in.</em>
                </h1>
              </motion.div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <motion.div custom={1} variants={fade} initial="hidden" animate="show">
                  <Field
                    id="email"
                    label="Email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@institution.edu"
                  />
                </motion.div>

                <motion.div custom={2} variants={fade} initial="hidden" animate="show">
                  <Field
                    id="password"
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    trailing={
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        /* Padded out to a ~37px target: the bare icon was 17px. */
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5"
                        style={{ color: 'var(--ink-3)' }}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    }
                  />
                </motion.div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="rounded-2xl px-4 py-3 text-sm"
                      style={{
                        background: 'color-mix(in srgb, #C95955 14%, transparent)',
                        color: '#C95955',
                        border: '1px solid color-mix(in srgb, #C95955 28%, transparent)',
                      }}
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div custom={3} variants={fade} initial="hidden" animate="show" className="flex justify-end text-sm">
                  <a href="#reset" className="font-medium" style={{ color: 'var(--accent)' }}>Forgot password?</a>
                </motion.div>

                <motion.div custom={4} variants={fade} initial="hidden" animate="show">
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.99 }}
                    className="btn btn-solid-ink btn-arrow w-full justify-center"
                    style={{ padding: '14px 22px', fontSize: 15, fontWeight: 500 }}
                  >
                    <AnimatePresence mode="wait">
                      {loading ? (
                        <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                          <motion.span
                            className="h-4 w-4 rounded-full border-2"
                            style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'var(--accent-ink)' }}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                          />
                          Signing in…
                        </motion.span>
                      ) : (
                        <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                          Continue <ArrowRight size={16} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </motion.div>
              </form>

              <motion.div
                custom={5}
                variants={fade}
                initial="hidden"
                animate="show"
                className="mt-7 pt-6 text-center text-sm"
                style={{ borderTop: '1px solid var(--hair)', color: 'var(--ink-3)' }}
              >
                New here?{' '}
                <Link to="/book-demo" style={{ color: 'var(--accent)', fontWeight: 500 }}>Book a demo →</Link>
              </motion.div>
            </div>
          </div>

          {/* Signing in is the only job on this page, so the marketing footer
              would only add a scroll and a dead band under the campus panel.
              One slim line closes the column instead. */}
          <div
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-5 sm:px-8 pb-7 text-center text-xs"
            style={{ color: 'var(--ink-4)' }}
          >
            <span>© {new Date().getFullYear()} EduGuide</span>
            <Link to="/" style={{ color: 'inherit' }}>Home</Link>
            <Link to="/pricing" style={{ color: 'inherit' }}>Pricing</Link>
            <Link to="/contact" style={{ color: 'inherit' }}>Contact</Link>
          </div>
        </main>

      </div>
    </div>
  )
}
