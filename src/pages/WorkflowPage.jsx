import { HowItWorksSection } from './landing/Sections'
import { useTheme } from '../hooks/useTheme'
import SiteNav from '../components/SiteNav'
import SiteFooter from '../components/SiteFooter'

/**
 * The "How it Works" page is the rotating Admissions Auto Flow ring — the same
 * section the landing page carries, given the whole viewport here. The older
 * step-by-step builder animation still lives in ./landing/WorkflowSection.
 */
export default function WorkflowPage() {
  const [theme, toggleTheme] = useTheme()

  return (
    <div className="landing-v2" data-accent="edu" data-theme-scope={theme} style={{ minHeight: '100vh' }}>
      <SiteNav theme={theme} onToggleTheme={toggleTheme} active="workflow" />
      <HowItWorksSection page />
      <SiteFooter />
    </div>
  )
}
