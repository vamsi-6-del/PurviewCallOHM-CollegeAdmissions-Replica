import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Moon, Sun, Menu, X, ChevronDown, ArrowRight,
  PhoneCall, Languages, ClipboardCheck,
  CalendarCheck, BellRing,
  Users, Send, TrendingUp,
  Building2, UsersRound, Star, Mail,
} from 'lucide-react'
import { BrandLockup } from './BrandLogo'

const LINKS = [
  { key: 'home',      label: 'Home',          to: '/' },
  { key: 'product',   label: 'Product',       to: '/product', menu: 'product' },
  { key: 'workflow',  label: 'How it Works',  to: '/workflow' },
  { key: 'pricing',   label: 'Pricing',       to: '/pricing' },
  { key: 'company',   label: 'Company',       to: '/about', menu: 'company' },
]

/* The product menu mirrors the three jobs the platform does for an admissions
   team, in the order a candidate moves through them. */
const PRODUCT_MENU = [
  {
    group: 'Engage & qualify',
    items: [
      { icon: PhoneCall, title: 'AI Voice Calling', body: 'Call and qualify every enquiry 24/7, automatically.', to: '/product#voice-calling' },
      { icon: Languages, title: '30+ Languages', body: 'Speak to each candidate in their own language.', to: '/product#languages' },
      { icon: ClipboardCheck, title: 'Automatic Scoring', body: 'Every answer scored against your admission criteria.', to: '/product#scoring' },
    ],
  },
  {
    group: 'Schedule & automate',
    items: [
      { icon: CalendarCheck, title: 'Counselling Scheduling', body: 'Auto-book qualified candidates into open slots.', to: '/product#scheduling' },
      { icon: BellRing, title: 'Application Follow-up', body: 'Human-sounding nudges from form fill to fee paid.', to: '/product#follow-up' },
    ],
  },
  {
    group: 'Manage & measure',
    items: [
      { icon: Users, title: 'Admissions Pipeline', body: 'Every campaign, candidate and stage in one board.', to: '/product#pipeline' },
      { icon: Send, title: 'Multi-Campus Outreach', body: 'Separate agents and numbers per campus or branch.', to: '/product#outreach' },
      { icon: TrendingUp, title: 'Live Analytics', body: 'Calls, scores and conversions in one live view.', to: '/product#analytics' },
    ],
  },
]

/* Company sits opposite Product: everything about who is behind the platform,
   rather than what it does. Every entry points at a page that exists. */
const COMPANY_MENU = [
  { icon: Building2, title: 'About', body: 'Our story, mission & values', to: '/about' },
  { icon: UsersRound, title: 'Leadership', body: 'The minds behind EduGuide', to: '/leadership' },
  { icon: Star, title: 'Customers', body: 'Colleges already using EduGuide', to: '/customers' },
  { icon: Mail, title: 'Contact', body: 'Book a demo or call us', to: '/contact' },
]

export default function SiteNav({ theme, onToggleTheme, active }) {
  const [menuOpen, setMenuOpen] = useState(false)
  /* Which dropdown is open — 'product', 'company' or null. One piece of state
     for both, so opening one closes the other without extra bookkeeping. */
  const [openMenu, setOpenMenu] = useState(null)
  const [mobileOpenMenu, setMobileOpenMenu] = useState(null)
  const [companyLeft, setCompanyLeft] = useState(0)
  const closeTimer = useRef(null)
  const companyTriggerRef = useRef(null)
  const navigate = useNavigate()

  /* The company panel is centred under its trigger and kept inside the
     viewport. The nav is fixed, so only a resize can move the trigger — and it
     is re-measured rather than dismissed, since mobile browsers fire `resize`
     on their own (the URL bar collapsing) and closing on that would make the
     menu feel like it dismisses itself. */
  const COMPANY_PANEL_WIDTH = 320
  useEffect(() => {
    if (openMenu !== 'company') return
    const place = () => {
      const rect = companyTriggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const ideal = rect.left + rect.width / 2 - COMPANY_PANEL_WIDTH / 2
      const max = window.innerWidth - COMPANY_PANEL_WIDTH - 16
      setCompanyLeft(Math.round(Math.min(Math.max(16, ideal), Math.max(16, max))))
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [openMenu])

  const close = () => { setMenuOpen(false); setMobileOpenMenu(null) }

  /* The panel hangs a few pixels below the nav pill, so the pointer crosses a
     strip of the pill itself on its way down. Closing on the trigger's own
     mouseleave made that strip a dead zone: travel it at anything but a flick
     and the menu was gone before you arrived. The menu is held open for as
     long as the pointer is anywhere in the nav, and closes when it leaves the
     nav, hovers another link, or leaves the panel. */
  const openMega = (key) => { clearTimeout(closeTimer.current); setOpenMenu(key) }
  const closeMega = () => {
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpenMenu(null), 160)
  }

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  useEffect(() => {
    if (!openMenu) return
    const onKey = (e) => { if (e.key === 'Escape') setOpenMenu(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openMenu])

  const handleHome = (e) => {
    e.preventDefault()
    close()
    navigate('/')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <div className="hi-nav-backdrop" aria-hidden="true" />
      <nav className="hi-nav" onMouseLeave={closeMega}>
        {/* Brand */}
        <a href="/" onClick={handleHome} className="hi-nav-brand" style={{ textDecoration: 'none' }}>
          <BrandLockup tagline="Agentic AI for College Admissions" />
        </a>

        {/* Desktop links */}
        <div className="hi-nav-links">
          {LINKS.map(({ key, label, to, menu }) => {
            if (key === 'home') {
              return (
                <a key={key} href="/" onClick={handleHome} onMouseEnter={closeMega}
                  className={`hi-nav-link${active === key ? ' active' : ''}`}>
                  {label}
                </a>
              )
            }
            if (menu) {
              const isOpen = openMenu === menu
              return (
                <div
                  key={key}
                  className="hi-nav-mega-wrap"
                  onMouseEnter={() => openMega(menu)}
                >
                  <Link
                    ref={menu === 'company' ? companyTriggerRef : undefined}
                    to={to}
                    className={`hi-nav-link hi-nav-link-mega${active === key || isOpen ? ' active' : ''}`}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                  >
                    {label}
                    <ChevronDown size={14} className={`hi-nav-chev${isOpen ? ' is-open' : ''}`} />
                  </Link>
                </div>
              )
            }
            return (
              <Link key={key} to={to} onMouseEnter={closeMega}
                className={`hi-nav-link${active === key ? ' active' : ''}`}>
                {label}
              </Link>
            )
          })}
        </div>

        {/* Right side: theme + log in + book a demo + hamburger */}
        <div className="hi-nav-cta" onMouseEnter={closeMega}>
          <button
            className="theme-toggle"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Link to="/login" className="hi-nav-link hi-nav-login">Log in</Link>
          <Link to="/book-demo" className="btn btn-solid-ink hi-nav-demo-btn">Book a Demo</Link>
          <button
            className="hi-nav-hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Product mega panel (desktop) */}
      {openMenu === 'product' && (
        <div
          className="hi-mega"
          onMouseEnter={() => openMega('product')}
          onMouseLeave={closeMega}
        >
          <div className="hi-mega-cols">
            {PRODUCT_MENU.map(({ group, items }) => (
              <div key={group} className="hi-mega-col">
                <span className="hi-mega-group">{group}</span>
                {items.map(({ icon: Icon, title, body, to }) => (
                  <Link key={title} to={to} className="hi-mega-item" onClick={() => setOpenMenu(null)}>
                    <span className="hi-mega-icon"><Icon size={17} strokeWidth={1.9} /></span>
                    <span className="hi-mega-text">
                      <span className="hi-mega-title">{title}</span>
                      <span className="hi-mega-body">{body}</span>
                    </span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
          <div className="hi-mega-foot">
            <Link to="/workflow" className="hi-mega-link" onClick={() => setOpenMenu(null)}>
              See how it works <ArrowRight size={14} />
            </Link>
            <Link to="/product" className="hi-mega-link" onClick={() => setOpenMenu(null)}>
              Explore all features <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* Company panel (desktop) — a single narrow column under its trigger.
          The nav's backdrop-filter would trap a `position: fixed` child, so the
          panel sits outside <nav> and is placed from the trigger's own rect. */}
      {openMenu === 'company' && (
        <div
          className="hi-mega hi-mega-panel"
          style={{ left: companyLeft }}
          onMouseEnter={() => openMega('company')}
          onMouseLeave={closeMega}
        >
          <span className="hi-mega-group">Company</span>
          {COMPANY_MENU.map(({ icon: Icon, title, body, to }) => (
            <Link key={title} to={to} className="hi-mega-item" onClick={() => setOpenMenu(null)}>
              <span className="hi-mega-icon"><Icon size={17} strokeWidth={1.9} /></span>
              <span className="hi-mega-text">
                <span className="hi-mega-title">{title}</span>
                <span className="hi-mega-body">{body}</span>
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="hi-nav-mobile-menu">
          {LINKS.map(({ key, label, to, menu }) => {
            if (key === 'home') {
              return (
                <a key={key} href="/" onClick={handleHome}
                  className={`hi-nav-mobile-link${active === key ? ' active' : ''}`}>
                  {label}
                </a>
              )
            }
            if (menu) {
              const isOpen = mobileOpenMenu === menu
              const isProduct = menu === 'product'
              const items = isProduct ? PRODUCT_MENU.flatMap(g => g.items) : COMPANY_MENU
              return (
                <div key={key} className="hi-nav-mobile-group">
                  <button
                    type="button"
                    className={`hi-nav-mobile-link hi-nav-mobile-toggle${active === key ? ' active' : ''}`}
                    onClick={() => setMobileOpenMenu(o => (o === menu ? null : menu))}
                    aria-expanded={isOpen}
                  >
                    {label}
                    <ChevronDown size={15} className={`hi-nav-chev${isOpen ? ' is-open' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="hi-nav-mobile-sub">
                      {items.map(({ icon: Icon, title, to: itemTo }) => (
                        <Link key={title} to={itemTo} onClick={close} className="hi-nav-mobile-sublink">
                          <Icon size={15} strokeWidth={1.9} />
                          {title}
                        </Link>
                      ))}
                      {isProduct && (
                        <Link to="/product" onClick={close} className="hi-nav-mobile-sublink is-all">
                          Explore all features <ArrowRight size={14} />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )
            }
            return (
              <Link key={key} to={to} onClick={close}
                className={`hi-nav-mobile-link${active === key ? ' active' : ''}`}>
                {label}
              </Link>
            )
          })}
          {/* Log in is not repeated here — it sits in the bar itself at every width */}
          <Link to="/book-demo" onClick={close} className="btn btn-solid-ink hi-nav-mobile-demo">Book a Demo</Link>
        </div>
      )}
    </>
  )
}
