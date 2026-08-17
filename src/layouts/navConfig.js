import {
  BarChart3, Bot, BookOpen, Building2, FileText, Mic2, Phone,
  PhoneCall, PhoneOutgoing, UserCog, Users, Wallet,
} from 'lucide-react'
import { can, canViewPage } from '../api/permissions'

/**
 * The app's navigation, mirroring the backend's resources and the access tier
 * each one enforces. `page` keys double as the keys a company access_policy
 * can switch off (see permissions.canViewPage).
 */
export const NAV_SECTIONS = [
  {
    section: 'Overview',
    items: [
      { page: 'analytics', label: 'Analytics', icon: BarChart3, href: '/app/analytics', allow: can.viewAnalytics },
    ],
  },
  {
    section: 'Calling',
    items: [
      { page: 'place_call', label: 'Place a call', icon: PhoneOutgoing, href: '/app/calls/new', allow: can.placeCalls },
      { page: 'call_history', label: 'Call history', icon: Phone, href: '/app/calls', allow: can.viewCallHistory },
      { page: 'contacts', label: 'Contacts', icon: Users, href: '/app/contacts', allow: can.viewContacts },
    ],
  },
  {
    section: 'Configure',
    items: [
      { page: 'agents', label: 'Agents', icon: Bot, href: '/app/agents', allow: can.viewAgents },
      { page: 'prompts', label: 'Prompts', icon: FileText, href: '/app/prompts', allow: can.viewPrompts },
      { page: 'voices', label: 'Voices', icon: Mic2, href: '/app/voices', allow: can.viewVoices },
      { page: 'knowledge', label: 'Knowledge', icon: BookOpen, href: '/app/knowledge', allow: can.viewKnowledge },
    ],
  },
  {
    section: 'Administration',
    items: [
      { page: 'companies', label: 'Companies', icon: Building2, href: '/app/companies', allow: can.viewCompanies },
      { page: 'users', label: 'Users', icon: UserCog, href: '/app/users', allow: can.viewUsers },
      { page: 'telephony', label: 'Telephony', icon: PhoneCall, href: '/app/telephony', allow: can.viewTelephony },
      { page: 'credits', label: 'Credits', icon: Wallet, href: '/app/credits', allow: can.viewCredits },
    ],
  },
]

/** Nav filtered to what this user may actually open. */
export function getVisibleNav() {
  return NAV_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canViewPage(item.page, item.allow)),
    }))
    .filter((section) => section.items.length > 0)
}

/**
 * The nav href that owns a pathname — the longest one that matches.
 *
 * Nav items must not decide this individually: /app/calls/new is a prefix
 * match for /app/calls too, which would light up both "Place a call" and
 * "Call history". Picking the longest match makes exactly one item active,
 * while still keeping /app/agents/:id under "Agents".
 */
export function matchNavHref(pathname) {
  return NAV_SECTIONS
    .flatMap((section) => section.items.map((item) => item.href))
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0] ?? null
}

/** The first page the user is allowed to see — used as the post-login landing. */
export function getDefaultRoute() {
  const nav = getVisibleNav()
  return nav[0]?.items[0]?.href ?? '/app/agents'
}
