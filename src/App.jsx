import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/landing/Landing'
import Login from './pages/auth/Login'
import WorkflowPage from './pages/WorkflowPage'
import ProductPage from './pages/ProductPage'
import CustomersPage from './pages/CustomersPage'
import AboutPage from './pages/company/AboutPage'
import LeadershipPage from './pages/company/LeadershipPage'
import ContactPage from './pages/company/ContactPage'
import PricingPage from './pages/PricingPage'
import BookDemoPage from './pages/BookDemoPage'
import AppLayout from './layouts/AppLayout'
import { getSession, ensureProfileLoaded } from './api/auth/authService'
import { can, canViewPage } from './api/permissions'
import { getDefaultRoute } from './layouts/navConfig'
import { RouteScrollRestoration } from './utils/homeNavigation'

import DashboardPage from './pages/analytics/DashboardPage'
import PlaceCallPage from './pages/calls/PlaceCallPage'
import CallHistoryPage from './pages/calls/CallHistoryPage'
import ContactCategoriesPage from './pages/contacts/ContactCategoriesPage'
import ContactsListPage from './pages/contacts/ContactsListPage'
import ContactDetailPage from './pages/contacts/ContactDetailPage'
import AgentsListPage from './pages/agents/AgentsListPage'
import AgentDetailPage from './pages/agents/AgentDetailPage'
import AgentCreatePage from './pages/agents/AgentCreatePage'
import AgentTrashPage from './pages/agents/AgentTrashPage'
import PromptsPage from './pages/catalog/PromptsPage'
import PromptEditorPage from './pages/catalog/PromptEditorPage'
import VoicesPage from './pages/catalog/VoicesPage'
import KnowledgePage from './pages/knowledge/KnowledgePage'
import CompaniesPage from './pages/admin/CompaniesPage'
import UsersPage from './pages/admin/UsersPage'
import TelephonyPage from './pages/billing/TelephonyPage'
import ProviderAccountsPage from './pages/billing/ProviderAccountsPage'
import BuyNumberPage from './pages/billing/BuyNumberPage'
import CreditsPage from './pages/billing/CreditsPage'
import ProfilePage from './pages/account/ProfilePage'

/**
 * Routes are gated by the same checks as the nav, so a user who types a URL
 * for a page they cannot open is redirected rather than shown a 403 from the
 * API. The backend remains the authority — this is only to keep the UI honest.
 */
function Guarded({ page, allow, element }) {
  return canViewPage(page, allow) ? element : <Navigate to={getDefaultRoute()} replace />
}

function AppRoutes() {
  const session = getSession()
  // Sessions from before the profile fields existed have no role name, which
  // would fail every permission check. Top them up from /auth/me once.
  const [hydrating, setHydrating] = useState(!session?.roleName)

  useEffect(() => {
    if (!session?.accessToken || session.roleName) { setHydrating(false); return }
    let cancelled = false
    ensureProfileLoaded()
      .catch(() => {})
      .finally(() => { if (!cancelled) setHydrating(false) })
    return () => { cancelled = true }
  }, [session?.accessToken, session?.roleName])

  if (!session?.accessToken) {
    return <Navigate to="/login" replace />
  }

  if (hydrating) return null

  return (
    <AppLayout>
      <Routes>
        <Route path="analytics" element={<Guarded page="analytics" allow={can.viewAnalytics} element={<DashboardPage />} />} />

        <Route path="calls/new" element={<Guarded page="place_call" allow={can.placeCalls} element={<PlaceCallPage />} />} />
        <Route path="calls" element={<Guarded page="call_history" allow={can.viewCallHistory} element={<CallHistoryPage />} />} />
        {/* Recordings are no longer a page of their own: audio is played,
            downloaded and deleted inside the call it belongs to. The old route
            redirects so bookmarks and the browser's history still resolve. */}
        <Route path="calls/recordings" element={<Navigate to="/app/calls" replace />} />
        {/* Contacts are browsed by category: the index is the category grid,
            and opening one lists the contacts inside it. */}
        <Route path="contacts" element={<Guarded page="contacts" allow={can.viewContacts} element={<ContactCategoriesPage />} />} />
        <Route path="contacts/:categoryId" element={<Guarded page="contacts" allow={can.viewContacts} element={<ContactsListPage />} />} />
        <Route path="contacts/:categoryId/:contactId" element={<Guarded page="contacts" allow={can.viewContacts} element={<ContactDetailPage />} />} />

        <Route path="agents" element={<Guarded page="agents" allow={can.viewAgents} element={<AgentsListPage />} />} />
        <Route path="agents/new" element={<Guarded page="agents" allow={can.manageAgents} element={<AgentCreatePage />} />} />
        {/* Before :agentId, or "trash" would be read as an agent ID. */}
        <Route path="agents/trash" element={<Guarded page="agents" allow={can.manageAgents} element={<AgentTrashPage />} />} />
        <Route path="agents/:agentId" element={<Guarded page="agents" allow={can.viewAgents} element={<AgentDetailPage />} />} />
        <Route path="prompts" element={<Guarded page="prompts" allow={can.viewPrompts} element={<PromptsPage />} />} />
        <Route path="prompts/new" element={<Guarded page="prompts" allow={can.managePrompts} element={<PromptEditorPage />} />} />
        <Route path="prompts/:promptId" element={<Guarded page="prompts" allow={can.viewPrompts} element={<PromptEditorPage />} />} />
        <Route path="voices" element={<Guarded page="voices" allow={can.viewVoices} element={<VoicesPage />} />} />
        <Route path="knowledge" element={<Guarded page="knowledge" allow={can.viewKnowledge} element={<KnowledgePage />} />} />
        {/* Categories merged into Contacts — kept so old links still land. */}
        <Route path="categories" element={<Navigate to="/app/contacts" replace />} />

        <Route path="companies" element={<Guarded page="companies" allow={can.viewCompanies} element={<CompaniesPage />} />} />
        <Route path="users" element={<Guarded page="users" allow={can.viewUsers} element={<UsersPage />} />} />
        {/* Provider accounts come before numbers: a company connects Twilio or
            Plivo first, then syncs or buys numbers against that account. */}
        <Route path="telephony" element={<Guarded page="telephony" allow={can.viewTelephony} element={<TelephonyPage />} />} />
        <Route path="telephony/providers" element={<Guarded page="telephony" allow={can.viewTelephony} element={<ProviderAccountsPage />} />} />
        <Route path="telephony/buy" element={<Guarded page="telephony" allow={can.viewTelephony} element={<BuyNumberPage />} />} />
        <Route path="credits" element={<Guarded page="credits" allow={can.viewCredits} element={<CreditsPage />} />} />

        {/* Your own account — no page key, since it is never policy-gated. */}
        <Route path="profile" element={<ProfilePage />} />

        <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
      </Routes>
    </AppLayout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteScrollRestoration />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/product" element={<ProductPage />} />
        <Route path="/workflow" element={<WorkflowPage />} />
        {/* Customers moved under the Company menu, but keeps its own URL. */}
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/leadership" element={<LeadershipPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/book-demo" element={<BookDemoPage />} />
        <Route path="/app/*" element={<AppRoutes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
