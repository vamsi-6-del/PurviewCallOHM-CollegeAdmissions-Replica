import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, RotateCcw, ChevronLeft, AlertTriangle } from 'lucide-react'
import { listTrashedAgents, restoreAgent, permanentlyDeleteAgent } from '../../api/resources/agents'
import { can } from '../../api/permissions'
import {
  PageShell, PageHeader, GhostButton, CardGrid, Pagination, ConfirmDialog, Banner,
} from '../../components/resource/ResourceKit'
import { formatDate } from '../../utils/datetime'

const LIMIT = 20

/**
 * Deleted agents, and the way back.
 *
 * Deleting an agent is a soft delete on this backend, and the delete dialog
 * promises it "can be restored later" — this is where that promise is kept.
 *
 * Purging is irreversible, so it is a separate action from Restore with its own
 * confirmation, and the server is treated as the authority on who may do it:
 * /agents/{id}/permanent documents no role rule, so a 403 is surfaced verbatim
 * rather than pre-empted by hiding the control from everyone but a super admin.
 */
export default function AgentTrashPage() {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const [purging, setPurging] = useState(null)

  const canRestore = can.manageAgents()
  const canPurge = can.purgeAgents()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listTrashedAgents({ limit: LIMIT, offset })
      setRows(data.items)
      setTotal(data.total)
    } catch (e) {
      setError(e.message || 'Could not load the trash.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [offset])

  useEffect(() => { load() }, [load])

  async function handleRestore(agent) {
    setBusy(true)
    setError('')
    try {
      await restoreAgent(agent.agentID)
      setSuccess(`"${agent.agentName || 'Agent'}" restored.`)
      await load()
    } catch (e) {
      setError(e.message || 'Could not restore the agent.')
    } finally {
      setBusy(false)
    }
  }

  async function handlePurge() {
    const name = purging.agentName || 'Agent'
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await permanentlyDeleteAgent(purging.agentID)
      setPurging(null)
      setSuccess(`"${name}" was permanently deleted.`)
      await load()
    } catch (e) {
      // The route documents no role requirement, so a refusal is reported as
      // what it is rather than as a generic failure the user cannot act on.
      setError(e.status === 403
        ? 'Your role cannot permanently delete agents. Ask a super admin to empty the trash.'
        : (e.message || 'Could not permanently delete the agent.'))
      setPurging(null)
    } finally {
      setBusy(false)
    }
  }

  const card = (agent) => ({
    initial: (agent.agentName || '?').charAt(0).toUpperCase(),
    title: agent.agentName || 'Untitled agent',
    subtitle: agent.agentID,
    meta: [
      { label: 'Model', value: agent.modelName || agent.llmID || '—' },
      {
        label: 'Deleted',
        value: agent.deleted_at || agent.last_modified_at
          ? formatDate(agent.deleted_at || agent.last_modified_at)
          : '—',
      },
    ],
    actions: (
      <>
        {canRestore ? (
          <GhostButton icon={RotateCcw} busy={busy} onClick={() => handleRestore(agent)}>Restore</GhostButton>
        ) : null}
        {canPurge ? (
          <GhostButton icon={Trash2} onClick={() => setPurging(agent)}>Delete forever</GhostButton>
        ) : null}
      </>
    ),
  })

  return (
    <PageShell>
      <Link
        to="/app/agents"
        className="mb-4 inline-flex items-center gap-1 text-[12.5px] font-semibold"
        style={{ color: 'var(--ui-text-3)' }}
      >
        <ChevronLeft size={14} /> Agents
      </Link>

      <PageHeader
        icon={Trash2}
        title="Deleted agents"
        subtitle={total
          ? `${total} agent${total === 1 ? '' : 's'} in the trash`
          : 'Agents you delete land here and can be restored'}
      />

      <Banner onDismiss={() => setError('')}>{error}</Banner>
      {success ? <Banner tone="success" onDismiss={() => setSuccess('')}>{success}</Banner> : null}

      <CardGrid
        rows={rows}
        card={card}
        loading={loading}
        rowKey={(a) => a.agentID}
        emptyIcon={Trash2}
        empty="The trash is empty."
      />

      <Pagination total={total} limit={LIMIT} offset={offset} onChange={setOffset} hasMore={rows.length >= LIMIT} />

      <ConfirmDialog
        open={Boolean(purging)}
        busy={busy}
        title="Delete forever?"
        confirmLabel="Delete forever"
        message={`"${purging?.agentName || 'This agent'}" will be permanently removed. This cannot be undone and the agent cannot be restored afterwards.`}
        onClose={() => setPurging(null)}
        onConfirm={handlePurge}
      />

      {canPurge ? (
        <p className="mt-4 flex items-start gap-2 text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          Deleting forever is irreversible. Calls and history referencing the agent may lose their link to it.
        </p>
      ) : null}
    </PageShell>
  )
}
