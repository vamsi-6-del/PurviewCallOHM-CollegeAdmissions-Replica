import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Bot, Plus, Search, Trash2, AlertCircle, X } from 'lucide-react'
import { listAgents, deleteAgent } from '../../api/resources/agents'
import { can } from '../../api/permissions'
import { stagger, fadeUp, SPRING, EASE, resolveMotion } from '../../components/ui/motion'
import { CardGrid, GhostButton, ConfirmDialog, Pagination } from '../../components/resource/ResourceKit'

const LIMIT = 20

export default function AgentsListPage() {
  const navigate = useNavigate()
  const reduced = useReducedMotion()

  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listAgents({ limit: LIMIT, offset })
      setRows(data.items)
      setTotal(data.total)
    } catch (e) {
      setError(e.message || 'Could not load agents.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [offset])

  useEffect(() => { load() }, [load])

  async function handleDelete() {
    setBusy(true)
    try {
      await deleteAgent(deleting.agentID)
      setDeleting(null)
      await load()
    } catch (e) {
      setError(e.message || 'Could not delete the agent.')
    } finally {
      setBusy(false)
    }
  }

  // Filtering the loaded page keeps typing instant; the backend's own search
  // is only needed once there is more than one page.
  const visible = query.trim()
    ? rows.filter((r) => (r.agentName || '').toLowerCase().includes(query.trim().toLowerCase()))
    : rows

  const card = (agent) => ({
    initial: (agent.agentName || '?').charAt(0).toUpperCase(),
    title: agent.agentName || 'Untitled agent',
    subtitle: agent.agentID,
    badge: (
      <span className={`ui-chip ${agent.is_active ? 'ui-chip-active' : 'ui-chip-idle'}`}>
        <span className="ui-chip-dot" />
        {agent.is_active ? 'Active' : 'Inactive'}
      </span>
    ),
    meta: [
      { label: 'Model', value: agent.modelName || agent.llmID || '—' },
      { label: 'Voice', value: agent.purviewVoiceName || agent.voiceID || '—' },
    ],
    actions: can.manageAgents() ? (
      <GhostButton icon={Trash2} onClick={() => setDeleting(agent)}>Delete</GhostButton>
    ) : null,
  })

  return (
    <div className="ui relative">
      <div className="relative mx-auto max-w-[1120px] px-4 py-6 sm:px-8 sm:py-9">
        <motion.div
          variants={resolveMotion(reduced, stagger(0, 0.05))}
          initial="hidden"
          animate="show"
        >
          {/* Header */}
          <motion.header
            variants={resolveMotion(reduced, fadeUp)}
            className="mb-7 flex flex-wrap items-end justify-between gap-4"
          >
            <div>
              <h1 className="ui-title">Agents</h1>
              <p className="ui-sub mt-1">
                {loading ? 'Loading…' : (
                  <>
                    <span className="ui-mono">{total}</span> {total === 1 ? 'agent' : 'agents'} in your company
                  </>
                )}
              </p>
            </div>

            {can.manageAgents() ? (
              <div className="flex flex-wrap items-center gap-2">
                <Link to="/app/agents/trash" className="ui-btn">
                  <Trash2 size={13} />
                  Trash
                </Link>
                <motion.button
                  type="button"
                  whileHover={reduced ? undefined : { y: -1 }}
                  whileTap={reduced ? undefined : { y: 1 }}
                  transition={SPRING}
                  className="ui-btn-primary"
                  onClick={() => navigate('/app/agents/new')}
                >
                  <Plus size={15} />
                  New agent
                </motion.button>
              </div>
            ) : null}
          </motion.header>

          {/* Error */}
          <AnimatePresence>
            {error ? (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.24, ease: EASE }}
                className="overflow-hidden"
              >
                <div
                  className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-[12.5px]"
                  style={{
                    background: 'rgba(244,63,94,0.07)',
                    border: '1px solid rgba(244,63,94,0.20)',
                    color: '#e11d48',
                  }}
                >
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span className="flex-1">{error}</span>
                  <button type="button" onClick={() => setError('')}><X size={13} /></button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Search */}
          <motion.div variants={resolveMotion(reduced, fadeUp)} className="mb-4 max-w-xs">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--ui-text-3)' }}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter agents"
                className="ui-input ui-input-icon"
              />
            </div>
          </motion.div>

          {/* Cards */}
          <CardGrid
            rows={visible}
            card={card}
            loading={loading}
            rowKey={(a) => a.agentID}
            onCardClick={(a) => navigate(`/app/agents/${a.agentID}`)}
            emptyIcon={Bot}
            empty={query
              ? 'No agents match that filter. Try a different name.'
              : can.manageAgents()
                ? 'No agents yet. Create your first agent to start placing calls.'
                : 'No agents have been set up for your company yet.'}
            emptyAction={!query && can.manageAgents() ? (
              <button
                type="button"
                className="ui-btn-primary"
                onClick={() => navigate('/app/agents/new')}
              >
                <Plus size={15} />
                New agent
              </button>
            ) : null}
          />

          {/* The shared control, rather than this page's own Previous/Next pair:
              it adds the page counter and hides itself on a single page, so the
              paging on every list now behaves and reads the same way. */}
          <Pagination total={total} limit={LIMIT} offset={offset} onChange={setOffset} hasMore={rows.length >= LIMIT} />
        </motion.div>
      </div>

      <ConfirmDialog
        open={Boolean(deleting)}
        busy={busy}
        title="Delete this agent?"
        message={`"${deleting?.agentName}" moves to the trash. You can restore it from Agents → Trash.`}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
