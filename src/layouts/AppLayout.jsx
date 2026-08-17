import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  LogOut, Menu, X, ChevronLeft, ChevronDown, CircleAlert, RefreshCw,
  Sun, Moon, Bell, UserCircle,
} from 'lucide-react'
import { logout, getCurrentUser } from '../api/auth/authService'
import { useTheme } from '../hooks/useTheme'
import { BrandDisc } from '../components/BrandLogo'
import { getVisibleNav, matchNavHref } from './navConfig'
import { ROLE_LABELS, currentRole } from '../api/permissions'
import { SPRING } from '../components/ui/motion'


/**
 * The active item is a soft accent panel that slides between entries via a
 * shared layoutId, rather than a solid gradient block on every selection.
 */
function NavItem({ icon: Icon, label, href, collapsed, onClick }) {
  const location = useLocation()
  const reduced = useReducedMotion()
  const active = matchNavHref(location.pathname) === href

  return (
    <Link
      to={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`group relative mx-1 flex items-center gap-3 rounded-xl px-3 py-2.5 ${collapsed ? 'justify-center' : ''}`}
      style={{ color: active ? 'var(--ui-accent-strong)' : 'var(--ui-text-2)' }}
    >
      {active ? (
        <motion.span
          layoutId={reduced ? undefined : 'nav-active'}
          transition={SPRING}
          className="absolute inset-0 rounded-xl"
          style={{ background: 'var(--ui-accent-soft)' }}
        />
      ) : (
        <span className="absolute inset-0 rounded-xl opacity-0 transition-opacity group-hover:opacity-100"
          style={{ background: 'var(--ui-surface-2)' }}
        />
      )}
      <Icon size={17} className="relative shrink-0" />
      {!collapsed && (
        <span className="relative text-[13.5px]" style={{ fontWeight: active ? 600 : 500 }}>
          {label}
        </span>
      )}
    </Link>
  )
}

function LogoutConfirmModal({ open, onClose, onConfirm, busy }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[70] bg-slate-950/35 backdrop-blur-sm"
            onClick={() => !busy && onClose()}
          />
          <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-md overflow-hidden rounded-2xl shadow-[var(--shadow-xl)] ring-1 ring-[var(--hair)]"
              style={{ background: 'var(--surface)' }}
              onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-4 border-b px-6 py-5" style={{ borderColor: 'var(--hair)' }}>
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600">
                      <CircleAlert size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>Are you sure you want to end this session?</h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={busy}
                    className="shrink-0 rounded-md border p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ borderColor: 'var(--hair)', color: 'var(--ink-3)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    aria-label="Close logout dialog"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="px-6 py-5">
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={busy}
                      className="flex-1 rounded-md border py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ borderColor: 'var(--hair)', color: 'var(--ink-2)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      Cancel
                    </button>
                  <motion.button
                    type="button"
                    onClick={onConfirm}
                    disabled={busy}
                    whileHover={busy ? undefined : { scale: 1.01 }}
                    whileTap={busy ? undefined : { scale: 0.98 }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ background: '#DC2626' }}
                  >
                    {busy ? <RefreshCw size={14} className="animate-spin" /> : <LogOut size={14} />}
                    {busy ? 'Logging out…' : 'Log out'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

function Sidebar({ collapsed, setCollapsed, onClose, mobile, onRequestLogout }) {
  const navSections = getVisibleNav()
  const me = getCurrentUser()
  const roleLabel = ROLE_LABELS[currentRole()] || 'Member'
  const isCollapsed = collapsed && !mobile
  const initial = (me?.email?.[0] || 'U').toUpperCase()

  return (
    <aside
      className="relative flex h-full flex-col overflow-hidden"
      style={{
        background: 'color-mix(in srgb, var(--ui-surface) 82%, transparent)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--ui-border)',
        width: mobile ? 264 : (collapsed ? 76 : 256),
        transition: 'width 0.25s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      {/* Logo / header */}
      <div
        className="relative flex shrink-0 items-center"
        style={{ borderBottom: '1px solid var(--ui-border)', minHeight: 60, padding: '0 18px' }}
      >
        {isCollapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="mx-auto flex items-center justify-center transition-opacity hover:opacity-90"
            title="Expand sidebar"
          >
            <BrandDisc />
          </button>
        ) : (
          <>
            <BrandDisc />
            <div className="ml-3 flex-1 overflow-hidden">
              <p className="text-base font-extrabold leading-none tracking-tight" style={{ color: 'var(--ink)' }}>
                Edu<span className="text-indigo-600">Guide</span>
              </p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--ink-4)]">
                Admissions
              </p>
            </div>
            {mobile ? (
              <button onClick={onClose}
                className="rounded-md p-1.5 transition-colors text-[var(--ink-3)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
              >
                <X size={16} />
              </button>
            ) : (
              <button
                onClick={() => setCollapsed(true)}
                className="rounded-md p-1.5 transition-colors text-[var(--ink-3)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                title="Collapse sidebar"
              >
                <ChevronLeft size={15} />
              </button>
            )}
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="relative flex-1 overflow-y-auto px-3 py-5">
        <div className="flex flex-col gap-5">
          {navSections.map((group) => (
            <div key={group.section} className="flex flex-col gap-1">
              {!isCollapsed && (
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--ink-4)]">
                  {group.section}
                </p>
              )}
              {group.items.map((item) => (
                <NavItem key={item.href} {...item} collapsed={isCollapsed} onClick={mobile ? onClose : undefined} />
              ))}
            </div>
          ))}
        </div>
      </nav>

      <div className="relative shrink-0 p-3" style={{ borderTop: '1px solid var(--hair)' }}>
        {!isCollapsed && (
          <div
            className="mb-2 flex items-center gap-3 rounded-2xl p-2.5"
            style={{ border: '1px solid var(--hair)', background: 'color-mix(in srgb, var(--surface-2) 70%, transparent)' }}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white shadow-sm">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                {me?.email?.split('@')[0] || 'User'}
              </p>
              <p className="truncate text-xs" style={{ color: 'var(--ink-3)' }}>{roleLabel}</p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onRequestLogout}
          title={isCollapsed ? 'Log out' : undefined}
          className={`flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10 ${
            isCollapsed ? 'justify-center' : 'gap-2.5'
          }`}
        >
          <LogOut size={16} />
          {!isCollapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  )
}

function TopBar({ onMenuClick, onRequestLogout, theme, toggleTheme }) {
  const [profileOpen, setProfileOpen] = useState(false)
  const me = getCurrentUser()
  const initial = (me?.email?.[0] || 'U').toUpperCase()

  return (
    <header
      className="relative flex shrink-0 items-center gap-4 px-4 sm:px-6"
      style={{
        height: 60,
        /*
         * Above the scrolling content, so the profile menu is not painted over.
         * `backdrop-filter` makes this header its own stacking context, and
         * without a z-index it takes its turn in DOM order — which puts every
         * positioned card inside <main> on top of a menu that had already
         * opened. The menu was rendering; it was simply behind the page.
         */
        zIndex: 30,
        background: 'color-mix(in srgb, var(--ui-surface) 82%, transparent)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--ui-border)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.55), rgba(139,92,246,0.55), transparent)' }}
      />

      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 transition-colors text-[var(--ink-3)] hover:bg-[var(--surface-2)] lg:hidden"
      >
        <Menu size={18} />
      </button>

      <div className="flex-1" />

      <button
        type="button"
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[var(--surface-2)]"
        style={{ color: 'var(--ink-3)' }}
        title="Notifications"
      >
        <Bell size={17} />
        <span
          className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500"
          style={{ boxShadow: '0 0 0 2px var(--surface)' }}
        />
      </button>

      <button
        type="button"
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[var(--surface-2)]"
        style={{ color: 'var(--ink-3)' }}
      >
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      <div className="hidden h-6 w-px sm:block" style={{ background: 'var(--hair)' }} />

      <div className="relative">
        <button
          type="button"
          onClick={() => setProfileOpen(!profileOpen)}
          className="flex items-center gap-2.5 rounded-full p-1 pr-3 transition-colors hover:bg-[var(--surface-2)]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white shadow-md shadow-indigo-500/20">
            {initial}
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-sm font-semibold" style={{ color: 'var(--ink)' }}>{me?.email?.split('@')[0] || 'User'}</span>
            <span className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
              {ROLE_LABELS[currentRole()] || 'Member'}
            </span>
          </span>
          <ChevronDown size={14} style={{ color: 'var(--ink-3)' }} />
        </button>

        <AnimatePresence>
          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-60 origin-top-right overflow-hidden rounded-2xl z-50"
                style={{ background: 'var(--surface)', border: '1px solid var(--hair)', boxShadow: 'var(--shadow-lg)' }}
              >
                <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--hair)' }}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-base font-bold text-white shadow-sm">
                    {initial}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                      {me?.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="truncate text-xs" style={{ color: 'var(--ink-3)' }}>{me?.email || 'user@example.com'}</p>
                  </div>
                </div>
                <div className="p-1">
                  <Link
                    to="/app/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors"
                    style={{ color: 'var(--ink-2)' }}
                  >
                    <UserCircle size={16} />
                    Your account
                  </Link>
                  <button
                    onClick={() => { setProfileOpen(false); onRequestLogout(); }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-500/10"
                  >
                    <LogOut size={16} />
                    Log out
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}

export default function AppLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const mainRef = useRef(null)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [theme, toggleTheme] = useTheme()

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0 })
  }, [location.pathname])

  function openLogoutConfirm() {
    if (!loggingOut) setLogoutConfirmOpen(true)
  }

  function closeLogoutConfirm() {
    if (!loggingOut) setLogoutConfirmOpen(false)
  }

  async function handleConfirmLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    await logout().catch(() => {})
    setLogoutConfirmOpen(false)
    setMobileOpen(false)
    setLoggingOut(false)
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Desktop sidebar */}
      <div className="hidden h-full shrink-0 flex-col lg:flex" style={{ transition: 'width 0.25s', width: collapsed ? 76 : 256 }}>
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} onRequestLogout={openLogoutConfirm} />
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 lg:hidden"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              key="drawer"
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className="fixed bottom-0 left-0 top-0 z-50 flex flex-col lg:hidden"
            >
              <Sidebar
                collapsed={false}
                setCollapsed={setCollapsed}
                mobile
                onClose={() => setMobileOpen(false)}
                onRequestLogout={openLogoutConfirm}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={() => setMobileOpen(true)} onRequestLogout={openLogoutConfirm} theme={theme} toggleTheme={toggleTheme} />
        <main ref={mainRef} className="flex-1 overflow-y-auto">{children}</main>
      </div>

      <LogoutConfirmModal
        open={logoutConfirmOpen}
        onClose={closeLogoutConfirm}
        onConfirm={handleConfirmLogout}
        busy={loggingOut}
      />
    </div>
  )
}
