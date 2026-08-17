import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic2, Play, Pause } from 'lucide-react'
import { listVoices, getVoiceAudio, listVoiceLanguages } from '../../api/resources/catalog'
import {
  PageShell, PageHeader, Pagination, Banner, SearchBox, Badge, SelectField,
} from '../../components/resource/ResourceKit'
import { SearchSelect } from '../../components/resource/SearchSelect'

const LIMIT = 24

/**
 * Voice catalog. Read-only in the app: creating or editing a voice is a
 * super-admin operation that needs an audio upload, which the backend expects
 * through its own tooling.
 */
export default function VoicesPage() {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [language, setLanguage] = useState('')
  const [gender, setGender] = useState('')
  const [languages, setLanguages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [playingId, setPlayingId] = useState('')
  const audioRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listVoices({
        limit: LIMIT,
        offset,
        search: search.trim() || undefined,
        languageCode: language || undefined,
        gender: gender || undefined,
      })
      setRows(data.items)
      setTotal(data.total)
    } catch (e) {
      setError(e.message || 'Could not load voices.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [offset, search, language, gender])

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [load, search])

  useEffect(() => {
    listVoiceLanguages()
      .then(setLanguages)
      // Reported rather than swallowed: an empty filter is indistinguishable
      // from a backend with no languages, so a failure here has to say so.
      .catch((e) => setError(e.message || 'Could not load the language list.'))
  }, [])

  useEffect(() => () => { audioRef.current?.pause() }, [])

  async function togglePlay(voice) {
    const id = voice.voiceID
    if (playingId === id) {
      audioRef.current?.pause()
      setPlayingId('')
      return
    }
    try {
      audioRef.current?.pause()
      const blob = await getVoiceAudio(id)
      const audio = new Audio(URL.createObjectURL(blob))
      audio.onended = () => setPlayingId('')
      audioRef.current = audio
      await audio.play()
      setPlayingId(id)
    } catch (e) {
      setError(e.message || 'No sample available for this voice.')
      setPlayingId('')
    }
  }

  return (
    <PageShell>
      <PageHeader
        icon={Mic2}
        title="Voices"
        subtitle={total ? `${total} voice${total === 1 ? '' : 's'} available` : 'Voices your agents can speak with'}
      />

      <Banner onDismiss={() => setError('')}>{error}</Banner>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchBox value={search} onChange={(v) => { setOffset(0); setSearch(v) }} placeholder="Search voices..." />
        <div className="w-full sm:w-52">
          <SearchSelect
            value={language}
            onChange={(v) => { setOffset(0); setLanguage(v) }}
            placeholder="All languages"
            allOption="All languages"
            searchPlaceholder="Search language or code"
            emptyText="No language matches"
            options={languages.map((l) => ({
              id: l.code,
              label: l.name,
              hint: l.name === l.code ? '' : l.code,
            }))}
          />
        </div>
        <div className="w-[calc(50%-6px)] sm:w-36">
          <SelectField
            value={gender}
            onChange={(v) => { setOffset(0); setGender(v) }}
            placeholder="Any gender"
            options={[{ id: 'male', label: 'Male' }, { id: 'female', label: 'Female' }]}
          />
        </div>
      </div>

      {loading ? (
        <div className="ui-card p-12 text-center text-[13px]" style={{ color: 'var(--ui-text-3)' }}>
          Loading voices...
        </div>
      ) : !rows.length ? (
        <div className="ui-card p-12 text-center text-[13px]" style={{ color: 'var(--ui-text-3)' }}>
          No voices match these filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((voice) => (
            <div key={voice.voiceID} className="ui-card flex items-center gap-3 p-4">
              <button
                type="button"
                onClick={() => togglePlay(voice)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white"
                title="Play sample"
              >
                {playingId === voice.voiceID ? <Pause size={15} /> : <Play size={15} />}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold" style={{ color: 'var(--ui-text)' }}>
                  {voice.purviewVoiceName || voice.voiceID}
                </p>
                <p className="truncate text-[11.5px]" style={{ color: 'var(--ui-text-3)' }}>
                  {voice.description || voice.provider_name || '—'}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {voice.language_code ? <Badge>{voice.language_code}</Badge> : null}
                  {voice.gender ? <Badge tone="info">{voice.gender}</Badge> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination total={total} limit={LIMIT} offset={offset} onChange={setOffset} hasMore={rows.length >= LIMIT} />
    </PageShell>
  )
}
