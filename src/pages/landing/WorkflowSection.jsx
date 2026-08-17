import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  GraduationCap, PhoneCall, Users, Sparkles, Zap, Bot,
  Play, Clock, CalendarRange,
} from 'lucide-react'

const A = '#4F46E5'
const A_DARK = '#818CF8'
const GRAD = 'linear-gradient(135deg,#4F46E5,#7C3AED)'
const GRAD_DARK = 'linear-gradient(135deg,#818CF8,#C084FC)'
const GREEN = 'linear-gradient(135deg,#10b981,#059669)'

const DATA = [
  {
    step: 'Step 1 of 5', title: 'Select Agent',
    nodeLabel: 'AGENT', placeholder: 'Choose Agent',
    opts: [
      { Icon: GraduationCap, name: 'College Admission Agent', sub: 'Admissions & enrolment support' },
      { Icon: PhoneCall, name: 'Follow-up Agent', sub: 'Re-engagement & callbacks' },
      { Icon: Users, name: 'Counselor Agent', sub: 'Campus visits & guidance' },
    ],
    short: n => n.length > 18 ? n.slice(0, 16) + '…' : n,
  },
  {
    step: 'Step 2 of 5', title: 'Select LLM',
    nodeLabel: 'LLM', placeholder: 'Choose LLM',
    opts: [
      { Icon: Sparkles, name: 'Claude Sonnet 4', sub: 'Smart · Nuanced responses' },
      { Icon: Zap, name: 'GPT-4o Mini', sub: 'Fast · Cost effective' },
      { Icon: Bot, name: 'PurLLM Luma', sub: 'Optimised · High accuracy' },
    ],
    short: n => n,
  },
  {
    step: 'Step 3 of 5', title: 'Select Voice',
    nodeLabel: 'VOICE', placeholder: 'Choose Voice',
    isVoice: true,
    opts: [
      { icon: 'Pr', grad: 'linear-gradient(135deg,#f59e0b,#ef4444)', name: 'Priya', sub: 'Warm Hindi / English' },
      { icon: 'Ar', grad: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', name: 'Arjun', sub: 'Clear English Male' },
      { icon: 'Me', grad: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', name: 'Meera', sub: 'Tamil / English Female' },
    ],
    short: n => n,
  },
  {
    step: 'Step 4 of 5', title: 'Select Telephony',
    nodeLabel: 'TELEPHONY', placeholder: 'Provider',
    opts: [
      { Icon: PhoneCall, name: 'Plivo', sub: 'Reliable · India-first' },
      { Icon: PhoneCall, name: 'Twilio', sub: 'Global · Programmable' },
      { Icon: PhoneCall, name: 'Exotel', sub: 'Enterprise · Cloud' },
    ],
    short: n => n,
  },
  {
    step: 'Step 5 of 5', title: 'Schedule Campaign',
    nodeLabel: 'CAMPAIGN', placeholder: 'Schedule',
    opts: [
      { Icon: Play, name: 'Start Now', sub: 'Immediate · All leads' },
      { Icon: Clock, name: '9 AM to 6 PM', sub: 'Business hours only' },
      { Icon: CalendarRange, name: 'Custom Schedule', sub: 'Set your own date & time' },
    ],
    short: n => n === 'Start Now' ? 'Now' : n === '9 AM to 6 PM' ? '9 to 6 PM' : 'Custom',
  },
]

const N = DATA.length
const delay = ms => new Promise(r => setTimeout(r, ms))

const STEP_META = [
  { label: 'Agent', desc: 'AI role & persona' },
  { label: 'LLM', desc: 'Language model' },
  { label: 'Voice', desc: 'Voice profile' },
  { label: 'Telephony', desc: 'Call provider' },
  { label: 'Campaign', desc: 'Schedule & launch' },
]

const NATURAL_W = 920

export default function WorkflowAnimation() {
  const containerRef = useRef(null)
  const cursorRef = useRef(null)
  const cancelRef = useRef(false)
  const cursorPos = useRef({ x: 0, y: 0 })
  const startPlusRef = useRef(null)
  const plusRefs = useRef([])
  const nodeBoxRefs = useRef([])
  const saveBtnRef = useRef(null)

  const [containerW, setContainerW] = useState(NATURAL_W)
  const [nodes, setNodes] = useState(Array(N).fill(null).map(() => ({ state: 'hidden', value: '', typedValue: '', selectedIdx: 0 })))
  const [lines, setLines] = useState(Array(N).fill(false))
  const [startGlow, setStartGlow] = useState(false)
  const [plusGlow, setPlusGlow] = useState(Array(N).fill(false))
  const [cardOpen, setCardOpen] = useState(false)
  const [cardClosing, setCardClosing] = useState(false)
  const [cardData, setCardData] = useState(null)
  const [optsIn, setOptsIn] = useState([false, false, false])
  const [saveBtnIn, setSaveBtnIn] = useState(false)
  const [selectedOpt, setSelectedOpt] = useState(-1)
  const [saveDone, setSaveDone] = useState(false)
  const [cursorClick, setCursorClick] = useState(false)
  const [showSave, setShowSave] = useState(false)
  const [saveClicked, setSaveClicked] = useState(false)
  const [isDark, setIsDark] = useState(false)

  const scale = Math.min(1, containerW / NATURAL_W)

  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(([entry]) => setContainerW(entry.contentRect.width))
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  const accent = isDark ? A_DARK : A
  const grad = isDark ? GRAD_DARK : GRAD
  /* accent tint helper so every wash tracks the active accent */
  const rgb = isDark ? '129,140,248' : '79,70,229'
  const tint = (a) => `rgba(${rgb},${a})`
  const accentGlow = tint(isDark ? 0.22 : 0.18)
  const bg = isDark ? '#080B18' : '#F7F8FC'
  const surface = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.92)'
  const ink = isDark ? '#EEF1FA' : '#0F172A'
  const ink3 = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'
  const lineBase = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'

  const getCenter = useCallback(el => {
    if (!el || !containerRef.current) return { x: 0, y: 0 }
    const cr = containerRef.current.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    return { x: r.left - cr.left + r.width / 2, y: r.top - cr.top + r.height / 2 }
  }, [])

  const moveTo = useCallback(async (tx, ty, dur = 620) => {
    const el = cursorRef.current
    if (!el) return
    const sx = cursorPos.current.x, sy = cursorPos.current.y
    const t0 = performance.now()
    return new Promise(res => {
      const frame = now => {
        if (cancelRef.current) { res(); return }
        const t = Math.min((now - t0) / dur, 1)
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
        const cx = sx + (tx - sx) * e, cy = sy + (ty - sy) * e
        cursorPos.current = { x: cx, y: cy }
        el.style.left = cx + 'px'; el.style.top = cy + 'px'
        if (t < 1) requestAnimationFrame(frame); else res()
      }
      requestAnimationFrame(frame)
    })
  }, [])

  const click = useCallback(async () => {
    setCursorClick(true); await delay(200); setCursorClick(false)
  }, [])

  const typeIn = useCallback(async (idx, text) => {
    for (let c = 1; c <= text.length; c++) {
      if (cancelRef.current) return
      setNodes(p => { const n = [...p]; n[idx] = { ...n[idx], typedValue: text.slice(0, c) }; return n })
      await delay(48)
    }
  }, [])

  useEffect(() => {
    let alive = true
    cancelRef.current = false
    const d = ms => cancelRef.current ? Promise.resolve() : delay(ms)

    const run = async () => {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect()
        cursorPos.current = { x: r.width * 0.12, y: r.height * 0.65 }
        if (cursorRef.current) {
          cursorRef.current.style.left = cursorPos.current.x + 'px'
          cursorRef.current.style.top = cursorPos.current.y + 'px'
        }
      }

      await d(700)
      setStartGlow(true)
      await d(600)

      for (let step = 0; step < N; step++) {
        if (cancelRef.current || !alive) return
        const data = DATA[step]
        const sel = data.short(data.opts[0].name)

        const plusEl = step === 0 ? startPlusRef.current : plusRefs.current[step - 1]
        if (plusEl) { const p = getCenter(plusEl); await moveTo(p.x, p.y, 500) }
        await click()
        if (step === 0) setStartGlow(false)
        else setPlusGlow(p => { const n = [...p]; n[step - 1] = false; return n })
        await d(100)

        setLines(p => { const n = [...p]; n[step] = true; return n })
        await d(80)
        setNodes(p => { const n = [...p]; n[step] = { state: 'empty', value: '', typedValue: '', selectedIdx: 0 }; return n })
        await d(320)

        const box = nodeBoxRefs.current[step]
        if (box) { const p = getCenter(box); await moveTo(p.x, p.y, 460) }
        await click()
        await d(100)

        setCardData(data); setSelectedOpt(-1); setSaveDone(false)
        setSaveBtnIn(false); setOptsIn([false, false, false])
        await d(30)
        setCardOpen(true); setCardClosing(false)
        for (let i = 0; i < data.opts.length; i++) {
          await d(60); setOptsIn(p => { const n = [...p]; n[i] = true; return n })
        }
        await d(70); setSaveBtnIn(true); await d(180)

        const optEl = containerRef.current?.querySelector('[data-opt="0"]')
        if (optEl) { const p = getCenter(optEl); await moveTo(p.x, p.y, 540) }
        await d(100); await click(); setSelectedOpt(0); await d(360)

        const saveEl = containerRef.current?.querySelector('[data-save]')
        if (saveEl) { const p = getCenter(saveEl); await moveTo(p.x, p.y, 440) }
        await d(100); await click(); setSaveDone(true); await d(260)

        setCardClosing(true); setCardOpen(false); await d(280)
        setCardClosing(false); setCardData(null); await d(50)

        setNodes(p => { const n = [...p]; n[step] = { state: 'typing', value: sel, typedValue: '', selectedIdx: 0 }; return n })
        await typeIn(step, sel); await d(100)
        setNodes(p => { const n = [...p]; n[step] = { state: 'filled', value: sel, typedValue: sel, selectedIdx: 0 }; return n })
        await d(260)

        if (step < N - 1) {
          setPlusGlow(p => { const n = [...p]; n[step] = true; return n })
          await d(400)
        }
      }

      await d(320); setShowSave(true); await d(420)
      if (saveBtnRef.current) { const p = getCenter(saveBtnRef.current); await moveTo(p.x, p.y, 480) }
      await d(160); await click(); setSaveClicked(true); await d(3500)
      if (!alive || cancelRef.current) return

      setNodes(Array(N).fill(null).map(() => ({ state: 'hidden', value: '', typedValue: '', selectedIdx: 0 })))
      setLines(Array(N).fill(false))
      setStartGlow(false); setPlusGlow(Array(N).fill(false))
      setCardOpen(false); setCardClosing(false); setCardData(null)
      setSelectedOpt(-1); setSaveDone(false); setSaveBtnIn(false)
      setOptsIn([false, false, false])
      setShowSave(false); setSaveClicked(false)
      await d(500)
      if (alive && !cancelRef.current) run()
    }

    run()
    return () => { alive = false; cancelRef.current = true }
  }, [moveTo, click, getCenter, typeIn])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: isDark
          ? `radial-gradient(ellipse 70% 55% at 50% 45%, ${tint(0.07)} 0%, transparent 65%), ${bg}`
          : `radial-gradient(ellipse 70% 55% at 50% 45%, ${tint(0.05)} 0%, transparent 65%), ${bg}`,
      }}
    >
      {/* ── Scaled inner scene (everything except cursor) ── */}
      <div style={{
        position: 'absolute', inset: 0,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        pointerEvents: scale < 1 ? 'none' : undefined,
      }}>

      {/* Grid background */}
      <svg
        aria-hidden
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: isDark ? 0.07 : 0.045 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="wf-grid" width="52" height="52" patternUnits="userSpaceOnUse">
            <path d="M 52 0 L 0 0 0 52" fill="none" stroke={isDark ? '#fff' : '#000'} strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#wf-grid)" />
      </svg>

      {/* Ambient glow blobs */}
      <div style={{
        position: 'absolute', top: '20%', left: '20%',
        width: 360, height: 260,
        background: `radial-gradient(ellipse, ${accentGlow} 0%, transparent 70%)`,
        filter: 'blur(40px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '25%', right: '18%',
        width: 280, height: 200,
        background: `radial-gradient(ellipse, ${isDark ? 'rgba(192,132,252,0.10)' : 'rgba(168,85,247,0.07)'} 0%, transparent 70%)`,
        filter: 'blur(40px)', pointerEvents: 'none',
      }} />

      {/* ── Step progress strip (pinned under the eyebrow so the dropdown
             card, which grows upward from the pipeline, can't cover it) ── */}
      <div style={{
        position: 'absolute', top: 62, left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 0,
        zIndex: 20,
      }}>
        {STEP_META.map((s, i) => {
          const done = nodes[i]?.state === 'filled'
          const active = nodes[i]?.state !== 'hidden'
          return (
            <React.Fragment key={s.label}>
              {i > 0 && (
                <div style={{
                  width: 48, height: 1.5,
                  background: done
                    ? accent
                    : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  transition: 'background 0.5s',
                  margin: '0 4px',
                }} />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done
                    ? grad
                    : active
                      ? `${accent}18`
                      : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                  border: `1.5px solid ${done ? 'transparent' : active ? accent : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  fontSize: 11, fontWeight: 700,
                  color: done ? '#fff' : active ? accent : ink3,
                  boxShadow: done ? `0 4px 14px ${accentGlow}` : 'none',
                  transition: 'all 0.4s cubic-bezier(.34,1.2,.64,1)',
                }}>
                  {done ? '✓' : i + 1}
                </div>
                <div style={{
                  fontSize: 10, fontWeight: 600,
                  color: done ? accent : ink3,
                  whiteSpace: 'nowrap',
                  transition: 'color 0.3s',
                  letterSpacing: '0.01em',
                }}>
                  {s.label}
                </div>
              </div>
            </React.Fragment>
          )
        })}
      </div>

      {/* ── Eyebrow label ── */}
      <div style={{
        position: 'absolute', top: 28, left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center', pointerEvents: 'none', zIndex: 10,
        whiteSpace: 'nowrap',
      }}>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.2em',
          textTransform: 'uppercase', color: accent, opacity: 0.75,
          fontFamily: 'var(--mono)',
        }}>
          Campaign Pipeline Builder
        </div>
      </div>

      {/* ── Save Workflow button (bottom-right) ── */}
      <div
        ref={saveBtnRef}
        style={{
          position: 'absolute', bottom: 28, right: 28, zIndex: 40,
          padding: '9px 22px', borderRadius: 12,
          fontSize: 12, fontWeight: 700, color: '#fff',
          background: saveClicked ? GREEN : grad,
          opacity: showSave ? 1 : 0,
          transform: showSave ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.88)',
          transition: 'all 0.35s cubic-bezier(.34,1.1,.64,1)',
          pointerEvents: showSave ? 'all' : 'none',
          boxShadow: showSave ? `0 6px 24px ${accentGlow}` : 'none',
          cursor: 'pointer',
          letterSpacing: '0.01em',
        }}
      >
        {saveClicked ? '✓ Workflow Saved!' : 'Save Workflow'}
      </div>

      {/* ── Dropdown card - above the pipeline ── */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        bottom: '45%',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0 16px 24px',
        zIndex: 30,
        pointerEvents: 'none',
      }}>
        {cardData && (
          <div style={{
            background: isDark
              ? 'rgba(12,18,30,0.92)'
              : 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
            borderRadius: 20,
            boxShadow: isDark
              ? '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)'
              : '0 24px 80px rgba(0,0,0,0.14)',
            width: 300,
            overflow: 'hidden',
            opacity: cardOpen ? 1 : 0,
            transform: cardOpen
              ? 'scale(1) translateY(0)'
              : cardClosing
                ? 'scale(1.02) translateY(-10px)'
                : 'scale(0.9) translateY(16px)',
            transition: 'all 0.32s cubic-bezier(.34,1.1,.64,1)',
            pointerEvents: cardOpen ? 'all' : 'none',
          }}>
            {/* Card header */}
            <div style={{
              padding: '12px 16px 10px',
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: accent, marginBottom: 3, fontFamily: 'var(--mono)' }}>
                  {cardData.step}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: ink, fontFamily: 'var(--display)', letterSpacing: '-0.01em' }}>
                  {cardData.title}
                </div>
              </div>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '3px 8px',
                borderRadius: 7,
                background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                color: ink3,
              }}>
                {cardData.opts.length} options
              </span>
            </div>

            {/* Options */}
            <div style={{ padding: '10px 10px 6px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {cardData.opts.map((o, i) => {
                const isSel = selectedOpt === i
                const OIcon = o.Icon
                return (
                  <div
                    key={i}
                    data-opt={i}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 12,
                      background: isSel
                        ? isDark ? `${accent}20` : `${accent}0e`
                        : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      border: `1.5px solid ${isSel ? accent : 'transparent'}`,
                      opacity: optsIn[i] ? 1 : 0,
                      transform: optsIn[i] ? 'translateX(0)' : 'translateX(-12px)',
                      transition: 'all 0.26s ease',
                      boxShadow: isSel ? `0 0 16px ${accentGlow}` : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {cardData.isVoice ? (
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: o.grad, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 800, color: '#fff',
                      }}>
                        {o.icon}
                      </div>
                    ) : OIcon ? (
                      <div style={{
                        width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                        background: isSel ? `${accent}22` : isDark ? 'rgba(255,255,255,0.07)' : `${accent}10`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.2s',
                      }}>
                        <OIcon size={13} style={{ color: accent }} />
                      </div>
                    ) : null}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.name}</div>
                      <div style={{ fontSize: 10, color: ink3, marginTop: 1 }}>{o.sub}</div>
                    </div>

                    <div style={{
                      width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${isSel ? accent : isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}`,
                      background: isSel ? accent : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, color: isSel ? '#fff' : 'transparent',
                      transition: 'all 0.2s',
                    }}>✓</div>
                  </div>
                )
              })}

              <button
                data-save=""
                style={{
                  width: '100%', padding: '9px 0', borderRadius: 12, border: 'none',
                  fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer',
                  background: saveDone ? GREEN : grad,
                  opacity: saveBtnIn ? 1 : 0,
                  transform: saveBtnIn ? 'translateY(0)' : 'translateY(6px)',
                  marginTop: 4,
                  transition: 'all 0.3s ease',
                  boxShadow: `0 4px 16px ${accentGlow}`,
                  letterSpacing: '0.01em',
                }}
              >
                {saveDone
                  ? '✓ Saved!'
                  : cardData?.step === 'Step 5 of 5'
                    ? 'Launch Campaign'
                    : 'Save & Continue →'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Pipeline track ── */}
      {/* ── Pipeline track: no overflow so × badges never get clipped ── */}
      <div style={{
        position: 'absolute', left: 0, right: 0,
        top: '55%', transform: 'translateY(-50%)',
        zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 40px',
        gap: 0,
      }}>
        {/* START node */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 54, height: 54, borderRadius: '50%',
            border: `2px solid ${accent}`,
            background: isDark ? tint(0.12) : tint(0.08),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8, fontWeight: 800, letterSpacing: '0.18em', color: accent,
            boxShadow: `0 0 28px ${accentGlow}, 0 0 0 6px ${isDark ? tint(0.06) : tint(0.04)}`,
          }}>
            START
          </div>
          {/* Start + */}
          <div
            ref={startPlusRef}
            style={{
              position: 'absolute', right: -12, top: '50%', transform: 'translateY(-50%)',
              width: 24, height: 24, borderRadius: '50%',
              border: `2px solid ${startGlow ? accent : isDark ? 'rgba(255,255,255,0.15)' : '#d1d5db'}`,
              background: startGlow
                ? isDark ? tint(0.2) : tint(0.1)
                : isDark ? 'rgba(255,255,255,0.05)' : '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 500,
              color: startGlow ? accent : isDark ? 'rgba(255,255,255,0.3)' : '#9ca3af',
              boxShadow: startGlow ? `0 0 14px ${accentGlow}` : isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.08)',
              transition: 'all 0.28s',
              zIndex: 5, cursor: 'pointer',
            }}
          >+</div>
        </div>

        {/* Step nodes */}
        {Array.from({ length: N }, (_, i) => {
          const node = nodes[i]
          const lineVis = lines[i]
          const isVis = node.state !== 'hidden'
          const isEmpty = node.state === 'empty'
          const isTyping = node.state === 'typing'
          const isFilled = node.state === 'filled'
          const showVal = isTyping || isFilled
          const opt0 = DATA[i].opts[0]

          return (
            <React.Fragment key={i}>
              {/* Connector */}
              <div style={{
                width: lineVis ? 36 : 0,
                height: 2,
                flexShrink: 0,
                overflow: 'hidden',
                borderRadius: 1,
                background: lineBase,
                opacity: lineVis ? 1 : 0,
                transition: 'width 0.32s ease, opacity 0.25s',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: isFilled ? grad : 'transparent',
                  width: isFilled ? '100%' : '0%',
                  transition: 'width 0.5s ease',
                }} />
              </div>

              {/* Node */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div
                  ref={el => nodeBoxRefs.current[i] = el}
                  style={{
                    borderRadius: 16,
                    border: `1.5px ${isEmpty ? 'dashed' : 'solid'} ${isFilled
                        ? accent
                        : isTyping
                          ? accent
                          : isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)'
                      }`,
                    background: isFilled
                      ? isDark ? tint(0.1) : tint(0.05)
                      : surface,
                    padding: '10px 16px',
                    minWidth: 110,
                    minHeight: 72,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 3,
                    boxShadow: isFilled
                      ? `0 0 0 1px ${accent}30, 0 6px 28px ${accentGlow}`
                      : isDark
                        ? '0 2px 8px rgba(0,0,0,0.3)'
                        : '0 2px 10px rgba(0,0,0,0.06)',
                    opacity: isVis ? 1 : 0,
                    transform: isVis ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.86)',
                    transition: 'all 0.4s cubic-bezier(.34,1.2,.64,1)',
                    cursor: 'pointer',
                  }}
                >
                  {/* × badge */}
                  {isFilled && (
                    <div style={{
                      position: 'absolute', top: -7, right: -7,
                      width: 16, height: 16, borderRadius: '50%',
                      background: '#ef4444', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, zIndex: 3,
                      boxShadow: '0 2px 6px rgba(239,68,68,0.4)',
                    }}>×</div>
                  )}

                  {/* Icon when filled */}
                  {isFilled && !DATA[i].isVoice && opt0.Icon && (
                    <opt0.Icon size={15} style={{ color: accent, flexShrink: 0 }} />
                  )}
                  {isFilled && DATA[i].isVoice && (
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: opt0.grad, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 8, fontWeight: 800, color: '#fff',
                    }}>
                      {opt0.icon}
                    </div>
                  )}

                  {/* Label */}
                  <div style={{
                    fontSize: 8, fontWeight: 800, letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: isFilled ? accent : ink3,
                    fontFamily: 'var(--mono)',
                  }}>
                    {DATA[i].nodeLabel}
                  </div>

                  {/* Value */}
                  {showVal ? (
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: ink,
                      whiteSpace: 'nowrap', maxWidth: 100,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {node.typedValue}
                      {isTyping && (
                        <span style={{
                          display: 'inline-block', width: 1, height: '0.85em',
                          background: ink, marginLeft: 1, verticalAlign: 'text-bottom',
                          animation: 'wf-blink 0.8s step-end infinite',
                        }} />
                      )}
                    </div>
                  ) : isEmpty ? (
                    <div style={{ fontSize: 10, color: ink3, fontStyle: 'italic' }}>
                      {DATA[i].placeholder}
                    </div>
                  ) : null}
                </div>

                {/* + button */}
                {isFilled && i < N - 1 && (
                  <div
                    ref={el => plusRefs.current[i] = el}
                    style={{
                      position: 'absolute', right: -12, top: '50%', transform: 'translateY(-50%)',
                      width: 24, height: 24, borderRadius: '50%',
                      border: `2px solid ${plusGlow[i] ? accent : isDark ? 'rgba(255,255,255,0.15)' : '#d1d5db'}`,
                      background: plusGlow[i]
                        ? isDark ? tint(0.22) : tint(0.1)
                        : isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, fontWeight: 500,
                      color: plusGlow[i] ? accent : isDark ? 'rgba(255,255,255,0.3)' : '#9ca3af',
                      boxShadow: plusGlow[i] ? `0 0 14px ${accentGlow}` : isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.08)',
                      transition: 'all 0.28s',
                      zIndex: 5, cursor: 'pointer',
                    }}
                  >+</div>
                )}
              </div>
            </React.Fragment>
          )
        })}
      </div>

      </div>{/* end scaled inner scene */}

      {/* ── Cursor dot with ring — lives outside scaled div so coordinate math is unaffected ── */}
      <div
        ref={cursorRef}
        style={{
          position: 'absolute', zIndex: 9999, pointerEvents: 'none',
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Outer ring */}
        <div style={{
          position: 'absolute',
          width: cursorClick ? 18 : 26,
          height: cursorClick ? 18 : 26,
          borderRadius: '50%',
          border: `1.5px solid ${cursorClick ? accent : isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)'}`,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          transition: 'all 0.14s ease',
          opacity: 0.7,
        }} />
        {/* Inner dot */}
        <div style={{
          position: 'absolute',
          width: cursorClick ? 8 : 6,
          height: cursorClick ? 8 : 6,
          borderRadius: '50%',
          background: cursorClick ? accent : isDark ? '#fff' : '#0f172a',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          boxShadow: cursorClick ? `0 0 12px ${accentGlow}` : 'none',
          transition: 'all 0.12s ease',
        }} />
      </div>

      <style>{`@keyframes wf-blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  )
}
