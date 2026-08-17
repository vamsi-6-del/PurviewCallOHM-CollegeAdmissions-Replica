import Hero from './Hero'
import {
  StatsSection,
  WhyExistsSection,
  FeaturesSection,
  HowItWorksSection,
  UseCasesSection,
  VideoStorySection,
  DemoSection,
  ComparisonSection,
  ResultsSection,
  VoicesSection,
  ComplianceSection,
  PricingTeaserSection,
  FaqSection,
  FinalCtaSection,
} from './Sections'
import { useTheme } from '../../hooks/useTheme'
import SiteNav from '../../components/SiteNav'
import SiteFooter from '../../components/SiteFooter'

/* ─── Logos ─── */
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

function TrustSection() {
  return (
    <section className="v2-logos">
      <div className="landing-container">
        <div className="nx-head" style={{ marginBottom: 32 }}>
          <span className="nx-eyebrow">Trusted by students and institutions</span>
          <h2 className="nx-title" style={{ fontSize: 'clamp(26px, 3vw, 38px)' }}>
            Helping students find the <em>right college</em>, faster
          </h2>
          <p className="nx-sub">
            Built for modern, digital-first admissions, partnered with leading
            engineering colleges across India.
          </p>
        </div>
      </div>
      <div className="logo-marquee" aria-hidden="false">
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
  )
}

/* ─── Page ─── */
export default function Landing() {
  const [theme, toggleTheme] = useTheme()

  return (
    <div className="landing-v2" data-accent="edu" data-theme-scope={theme}>
      <SiteNav theme={theme} onToggleTheme={toggleTheme} active="home" />
      <Hero />
      <VideoStorySection />
      <StatsSection />
      <WhyExistsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <UseCasesSection />
      <DemoSection />
      <ComparisonSection />
      <ResultsSection />
      <VoicesSection />
      <TrustSection />
      <ComplianceSection />
      <PricingTeaserSection />
      <FaqSection />
      <FinalCtaSection />
      <SiteFooter />
    </div>
  )
}
