import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Copy, Check, Phone } from 'lucide-react'
import { useNavigateHomeTop } from '../utils/homeNavigation'
import { BrandLockup } from './BrandLogo'

const SUPPORT_EMAIL = 'meena.atmakuri@purviewservices.com'
const SUPPORT_PHONE_DISPLAY = '+91 70328 35934'
const SUPPORT_PHONE_DIAL = '+917032835934'

const FOOTER_NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Product', to: '/product' },
  { label: 'Workflow', to: '/workflow' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'About', to: '/about' },
  { label: 'Leadership', to: '/leadership' },
  { label: 'Customers', to: '/customers' },
]

/* ─── Phone link: copy on desktop, tap-to-call on mobile ─── */
function PhoneLink({ display, dial }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(display).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <span className="hi-foot-phone">
      <a href={`tel:${dial}`} className="hi-foot-link hi-foot-phone-link">
        <Phone size={13} className="hi-foot-phone-icon" />
        {display}
      </a>
      <button
        className={`hi-foot-copy-btn${copied ? ' copied' : ''}`}
        onClick={handleCopy}
        aria-label="Copy phone number"
        title={copied ? 'Copied!' : 'Copy number'}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
    </span>
  )
}

/* ─── Footer accordion column ─── */
function FooterCol({ title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="hi-foot-col">
      {/* Desktop: static heading always visible */}
      <h4 className="hi-foot-col-heading">{title}</h4>
      {/* Mobile: tappable accordion row */}
      <button className="hi-foot-col-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="hi-foot-col-heading">{title}</span>
        <ChevronDown size={15} className={`hi-foot-chevron${open ? ' open' : ''}`} />
      </button>
      <div className={`hi-foot-links${open ? ' hi-foot-links-open' : ''}`}>
        {children}
      </div>
    </div>
  )
}

/* ─── Shared site footer, used on every marketing/auth page ─── */
export default function SiteFooter() {
  const goHomeTop = useNavigateHomeTop()

  return (
    <footer className="hi-foot">
      <div className="landing-container">
        <div className="hi-foot-grid">
          <div className="hi-foot-brand">
            <Link to="/" onClick={goHomeTop} className="hi-nav-brand hi-foot-brand-link">
              <BrandLockup tagline="Agentic AI for College Admissions" />
            </Link>
            <p className="hi-foot-copy">
              AI guided college admissions. Find your right fit, apply with
              confidence, and track every step in one place.
            </p>
          </div>

          <FooterCol title="Navigate">
            {FOOTER_NAV_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={item.to === '/' ? goHomeTop : undefined}
                className="hi-foot-link"
              >
                {item.label}
              </Link>
            ))}
          </FooterCol>

          <FooterCol title="Contact">
            <Link to="/book-demo" className="hi-foot-link">Book a demo</Link>
            <PhoneLink display={SUPPORT_PHONE_DISPLAY} dial={SUPPORT_PHONE_DIAL} />
            <a href={`mailto:${SUPPORT_EMAIL}`} className="hi-foot-link">{SUPPORT_EMAIL}</a>
            <a href="https://purviewservices.com" target="_blank" rel="noreferrer" className="hi-foot-link">
              Purview Services
            </a>
          </FooterCol>
        </div>

        <div className="hi-foot-bottom">
          <span>&#169; {new Date().getFullYear()} EduGuide. All rights reserved.</span>
          <span>Built by Purview Services</span>
        </div>
      </div>
    </footer>
  )
}
