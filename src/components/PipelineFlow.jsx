import { Fragment, useEffect, useRef, useState } from 'react'

const WIRE = 'bg-[#4b5563]/70'

const GREY = {
  box: 'bg-[#151a23] border-[#333d49]',
  title: 'text-[#e8edf3]',
  badge: 'bg-[#232b37] text-[#a9b4c1]',
  chip: 'bg-[#11161d] border-[#2c3540] text-[#a9b4c1]',
  dot: 'bg-[#151a23] border-[#333d49]',
}

const STEPS = [
  { n: 1, title: 'Student data', detail: [{ t: 'CSV / Excel — the study table is provided.', i: true }, { t: '71,036 rows · 15,401 unique students.' }] },
  { n: 2, title: 'Datasets loading', detail: [{ t: 'loader.py' }, { t: '12 required columns validated.' }] },
  { n: 3, title: 'Student-semester records', detail: [{ t: 'dataset_builder.py' }, { t: 'One row = one student-semester.', i: true }, { t: 'Final Grades parsed → 3 aggregates.' }] },
  { n: 4, title: 'Define prediction date', detail: [{ t: 'End of semester t — the prediction point.', i: true }, { t: 'Predictors: end-of-t information only.' }] },
  { n: 5, title: 'Define future target', detail: [{ t: 't+1: fail/drop on the NEXT record.', i: true }, { t: 'First-candidate standing rule audited → degenerate → rejected.' }] },
  { n: 6, title: 'Remove leakage variables', detail: [{ t: 't+1 outcomes never in predictors.', i: true }, { t: 'Target asserted absent from model inputs.' }] },
  { n: 7, title: 'Split dates', detail: [{ t: 'splitter.py' }, { t: 'Chronological: 2018–2023 (train) & 2024–2025 (test), no shuffling.' }] },
  { n: 8, title: 'Preprocessing', detail: [{ t: 'pipeline.py' }, { t: 'Median/scale numerics · most-frequent/one-hot categoricals.' }, { t: 'Fitted inside every fold.', i: true }] },
  { n: 9, title: '5-fold CV · student-grouped folds', detail: [{ t: 'No student appears in two folds.' }, { t: 'Identical folds for every model.', i: true }] },
  { n: 10, title: 'SMOTE', detail: [
    { t: 'k_neighbors = 5 — auto-reduced on small folds.' },
    { t: 'Blanks filled first: median (numbers), most-frequent (words).' },
    { t: 'Inside training folds only — never the temporal test.', i: true },
  ] },
  { n: 11, title: 'GridSearchCV tuning', detail: [
    { t: 'Tuned on dev folds only (Recall — primary metric).', i: true },
    { t: 'DT max_depth=10 · RF max_depth=20, 200 trees.' },
    { t: 'LR C=10.0 · NB: no grid.' },
  ] },
  { n: 12, title: 'Score & evaluate', detail: [
    { t: 'Every model × variant on the holdout (2024–2025).', i: true },
    { t: 'recall — primary · precision · F1' },
    { t: 'specificity · ROC-AUC · PR-AUC' },
    { t: '19,445 test rows · threshold 0.5.' },
  ] },
  { n: 13, title: 'Select the model', detail: [
    { t: 'Naive Bayes + SMOTE — recall 0.8114 (primary).', i: true },
    { t: 'No retrain — kept exactly as measured.' },
  ] },
  { n: 14, title: 'Export', detail: [{ t: 'model_metrics.json · feature_importance.json.', i: true }, { t: 'ONNX models + contracts (opset 14).' }] },
  { n: 15, title: 'Report results', detail: [{ t: 'Recorded for the thesis.', i: true }] },
]

const MODELS = ['Decision Tree', 'Random Forest', 'Logistic Regression', 'GaussianNB', 'Dummy (Stratified)']

const PHASE3 = { label: '3 · From models to report' }

const LEGEND = [
  { swatch: true, label: 'Pipeline stage' },
  { wire: true, label: 'Loop-back wire — the fold round runs 5×' },
]

function FlowNode({ step, boxRef }) {
  const t = GREY
  return (
    <div ref={boxRef} className={`flow-box relative z-10 w-full max-w-[300px] mx-auto rounded-xl border px-4 py-3 text-center ${t.box}`}>
      <span className={`absolute top-2 left-2 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${t.badge}`}>{step.n}</span>
      <h3 className={`font-serif font-bold uppercase tracking-wide text-[0.85rem] leading-snug px-6 ${t.title}`}>{step.title}</h3>
      <div className="mt-1.5 space-y-0.5">
        {step.detail.map((d, idx) => (
          <p key={idx} className={`text-[0.72rem] leading-relaxed ${d.i ? 'italic text-slate-500' : 'text-slate-400'}`}>{d.t}</p>
        ))}
      </div>
    </div>
  )
}

function Wire({ h = 'h-6' }) {
  return (
    <div className="relative z-10 flex justify-center py-0.5" aria-hidden="true">
      <div className={`w-0.5 ${h} ${WIRE}`} />
    </div>
  )
}

function PhaseChip({ label, icon }) {
  const t = GREY
  return (
    <span className={`inline-flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] px-3 py-1 rounded-full border ${t.chip}`}>
      {icon && (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-3-6.7" />
          <path d="M21 3v5h-5" />
        </svg>
      )}
      {label}
    </span>
  )
}

function ChipRow({ chip, rowRef }) {
  return (
    <div ref={rowRef} className="relative z-10 flex justify-center py-2">
      <PhaseChip label={chip.label} icon={chip.icon} />
    </div>
  )
}

function FoldLoop({ steps, reg, bracketRef }) {
  return (
    <div className="relative w-full max-w-[460px] mx-auto">
        <div ref={bracketRef} className="absolute left-2 sm:left-6 right-1/2 top-0 bottom-0 border-l-2 border-t-2 border-b-2 rounded-l-2xl border-[#4b5563]/70" aria-hidden="true" />
      {steps.map((s, idx) => (
          <Fragment key={s.n}>
            {idx > 0 && <Wire />}
            <FlowNode step={s} boxRef={reg(8 + idx)} />
          </Fragment>
      ))}
    </div>
  )
}

function ModelBox({ name, boxRef }) {
  return (
    <div ref={boxRef} className="flow-box relative z-10 min-w-0 rounded-xl border bg-[#151a23] border-[#333d49] px-1 sm:px-2 py-2 sm:py-3 text-center">
      <h3 className="font-serif font-bold tracking-wide text-[0.6rem] sm:text-[0.85rem] leading-snug text-[#e8edf3] break-words">{name}</h3>
    </div>
  )
}

function WireRow({ busAt }) {
  return (
    <div className="relative">
      <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
        {MODELS.map((m, i) => (
          <div key={i} className="flex justify-center"><div className={`w-0.5 h-6 ${WIRE}`} /></div>
        ))}
      </div>
      <div className={`absolute ${busAt === 'top' ? 'top-0' : 'bottom-0'} h-0.5 ${WIRE}`} style={{ left: 'calc(10% - 4.5px)', right: 'calc(10% - 4.5px)' }} aria-hidden="true" />
    </div>
  )
}

function ModelBranch({ models, reg }) {
  return (
    <div className="relative z-10 w-full max-w-[720px] mx-auto">
      <WireRow busAt="top" />
      <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
        {models.map((name) => <ModelBox key={name} name={name} boxRef={reg(11)} />)}
      </div>
      <WireRow busAt="bottom" />
      <Wire h="h-5" />
    </div>
  )
}

export function PipelineFlow() {
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const pre = STEPS.slice(0, 8)
  const loopSteps = STEPS.slice(8, 10)
  const tuningStep = STEPS[10]
  const post = STEPS.slice(11)
  const containerRef = useRef(null)
  const dotRef = useRef(null)
  const phase3Ref = useRef(null)
  const bracketRef = useRef(null)
  const miniRefs = useRef([])
  const stopEls = useRef({})
  const reg = (stop) => (el) => {
    if (!stopEls.current[stop]) stopEls.current[stop] = []
    if (el && !stopEls.current[stop].includes(el)) stopEls.current[stop].push(el)
  }

  useEffect(() => {
    if (!playing) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const dot = dotRef.current
    const container = containerRef.current
    if (!dot || !container) return
    const GLOW_MS = 3000 / speed
    const PX_PER_SEC = 160 * speed
    const LOOP_PX_PER_SEC = 200 * speed
    let cancelled = false
    const rafs = []
    const timers = []
    const later = (ms) => new Promise((res) => { timers.push(setTimeout(res, ms)) })
    const dotP = { x: container.clientWidth / 2, y: 0 }
    const setDot = (x, y) => { dotP.x = x; dotP.y = y; dot.style.left = `${x}px`; dot.style.top = `${y}px` }
    const rect = (el) => {
      const c = container.getBoundingClientRect()
      const r = el.getBoundingClientRect()
      return { x: r.left - c.left + r.width / 2, y: r.top - c.top + r.height / 2, top: r.top - c.top }
    }
    const moveTo = (x, y, speed = PX_PER_SEC) => new Promise((resolve) => {
      const fx = dotP.x
      const fy = dotP.y
      const dx = x - fx
      const dy = y - fy
      const dist = Math.hypot(dx, dy)
      if (dist < 1) { setDot(x, y); return resolve() }
      const dur = (dist / speed) * 1000
      let start = -1
      const frame = (t) => {
        if (cancelled) return resolve()
        if (start < 0) start = t
        const p = Math.min((t - start) / dur, 1)
        setDot(fx + dx * p, fy + dy * p)
        if (p < 1) rafs.push(requestAnimationFrame(frame))
        else resolve()
      }
      rafs.push(requestAnimationFrame(frame))
    })
    const moveEl = (d, st, x, y, speed = PX_PER_SEC) => new Promise((resolve) => {
      const fx = st.x
      const fy = st.y
      const dx = x - fx
      const dy = y - fy
      const dist = Math.hypot(dx, dy)
      if (dist < 1) { st.x = x; st.y = y; d.style.left = `${x}px`; d.style.top = `${y}px`; return resolve() }
      const dur = (dist / speed) * 1000
      let start = -1
      const frame = (t) => {
        if (cancelled) return resolve()
        if (start < 0) start = t
        const p = Math.min((t - start) / dur, 1)
        st.x = fx + dx * p
        st.y = fy + dy * p
        d.style.left = `${st.x}px`
        d.style.top = `${st.y}px`
        if (p < 1) rafs.push(requestAnimationFrame(frame))
        else resolve()
      }
      rafs.push(requestAnimationFrame(frame))
    })
    const setGlow = (els, on) => {
      els.forEach((el) => {
        el.style.borderColor = on ? 'rgba(110,231,183,0.9)' : ''
        el.style.boxShadow = on ? '0 0 22px 3px rgba(52,211,153,0.35), 0 0 6px 1px rgba(52,211,153,0.25)' : ''
      })
    }
    const live = (s) => (stopEls.current[s] || []).filter((el) => el.isConnected)
    ;(async () => {
      const minis = miniRefs.current.filter(Boolean)
      dot.style.opacity = '1'
      while (!cancelled) {
        for (let s = 0; s <= 7; s++) {
          if (cancelled) return
          const els = live(s)
          if (!els.length) continue
          const p = rect(els[0])
          await moveTo(p.x, p.y)
          if (cancelled) return
          setGlow(els, true)
          await later(GLOW_MS)
          setGlow(els, false)
        }
        if (cancelled) return
        for (let round = 0; round < 5; round++) {
          if (cancelled) return
          for (let s = 8; s <= 8; s++) {
            if (cancelled) return
            const els = live(s)
            if (!els.length) continue
            const p = rect(els[0])
            await moveTo(p.x, p.y)
            if (cancelled) return
            setGlow(els, true)
            await later(GLOW_MS)
            setGlow(els, false)
          }
          if (cancelled) return
        const smoteStep = live(9)
        if (smoteStep.length) {
          const p = rect(smoteStep[0])
          await moveTo(p.x, p.y)
          if (cancelled) return
          setGlow(smoteStep, true)
          await later(GLOW_MS)
          if (cancelled) { setGlow(smoteStep, false); return }
        }
        const tuning = live(10)
        if (tuning.length) {
          const p = rect(tuning[0])
          await moveTo(p.x, p.y)
          if (cancelled) { setGlow(smoteStep, false); return }
          setGlow(tuning, true)
          await later(GLOW_MS)
          if (cancelled) { setGlow(tuning, false); setGlow(smoteStep, false); return }
          setGlow(tuning, false)
        }
        const models = live(11)
        const chip = phase3Ref.current
        const bracket = bracketRef.current
        const canBranch = Boolean(chip && models.length === 5)
        const canLoop = canBranch && Boolean(bracket && bracket.getBoundingClientRect().width > 0)
        if (canBranch) {
          const pc = rect(chip)
          await moveTo(pc.x, pc.y)
          if (cancelled) { setGlow(smoteStep, false); return }
          await later(800 / speed)
          if (cancelled) { setGlow(smoteStep, false); return }
          const bus = { x: container.clientWidth / 2, y: rect(models[0]).top - 24 }
          await moveTo(bus.x, bus.y)
          if (cancelled) { setGlow(smoteStep, false); return }
          const targets = models.map((m) => rect(m))
          const miniState = targets.map(() => ({ x: bus.x, y: bus.y }))
          minis.forEach((d, i) => {
            if (d && targets[i]) { d.style.left = `${bus.x}px`; d.style.top = `${bus.y}px`; d.style.opacity = '1' }
          })
          dot.style.opacity = '0'
          await later(350 / speed)
          if (cancelled) { setGlow(smoteStep, false); return }
          await Promise.all(targets.map((t, i) => {
            const d = minis[i]
            if (!d) return Promise.resolve()
            return moveEl(d, miniState[i], t.x, bus.y)
              .then(() => { if (!cancelled) return moveEl(d, miniState[i], t.x, t.y) })
          }))
          if (cancelled) { setGlow(smoteStep, false); return }
          setGlow(models, true)
          await later(GLOW_MS)
          setGlow(models, false)
          setGlow(smoteStep, false)
          await Promise.all(targets.map((t, i) => {
            const d = minis[i]
            if (!d) return Promise.resolve()
            return moveEl(d, miniState[i], t.x, bus.y)
              .then(() => { if (!cancelled) return moveEl(d, miniState[i], bus.x, bus.y) })
          }))
          minis.forEach((d) => { if (d) d.style.opacity = '0' })
          dot.style.opacity = '1'
          await later(350 / speed)
          if (cancelled) return
        } else {
          setGlow(smoteStep, false)
        }
        if (canLoop && round < 4) {
          dot.style.opacity = '0'
          await later(350 / speed)
          if (cancelled) return
          const cr = container.getBoundingClientRect()
          const br = bracket.getBoundingClientRect()
          const railX = br.left - cr.left + 1
          const topY = br.top - cr.top + 1
          const botY = br.bottom - cr.top - 1
          const cx = container.clientWidth / 2
          setDot(cx, botY)
          dot.style.opacity = '1'
          await later(350 / speed)
          if (cancelled) return
          await moveTo(railX, botY, LOOP_PX_PER_SEC)
          if (cancelled) return
          await moveTo(railX, topY, LOOP_PX_PER_SEC)
          if (cancelled) return
          await moveTo(cx, topY, LOOP_PX_PER_SEC)
          if (cancelled) return
          const cvStep = live(8)
          if (cvStep.length) {
            const p = rect(cvStep[0])
            await moveTo(p.x, p.y)
            if (cancelled) return
          }
          } else {
            dot.style.opacity = '0'
            await later(350 / speed)
            if (cancelled) return
          }
        }
        const tail0 = live(12)
        if (tail0.length) {
          const p = rect(tail0[0])
          setDot(p.x, p.y)
        }
        dot.style.opacity = '1'
        await later(450 / speed)
        if (cancelled) return
        for (let s = 12; s <= 15; s++) {
          if (cancelled) return
          const els = live(s)
          if (!els.length) continue
          const p = rect(els[0])
          await moveTo(p.x, p.y)
          if (cancelled) return
          setGlow(els, true)
          await later(GLOW_MS)
          setGlow(els, false)
        }
        if (cancelled) return
        dot.style.opacity = '0'
        await later(450 / speed)
        if (cancelled) return
        const first = live(0)
        if (first.length) {
          const p = rect(first[0])
          setDot(p.x, p.y)
        }
        dot.style.opacity = '1'
        await later(450 / speed)
      }
    })()
    return () => {
      cancelled = true
      rafs.forEach((id) => cancelAnimationFrame(id))
      timers.forEach(clearTimeout)
      if (dotRef.current) dotRef.current.style.opacity = '0'
      miniRefs.current.forEach((d) => { if (d) d.style.opacity = '0' })
      Object.values(stopEls.current).forEach((els) => {
        els.forEach((el) => { if (el) { el.style.borderColor = ''; el.style.boxShadow = '' } })
      })
    }
  }, [playing, speed])
  return (
    <>
      <div className="mb-3 flex items-center justify-end gap-3">
        {!reduceMotion && (
          <>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-pressed={playing}
              aria-label={playing ? 'Pause the training flow animation' : 'Play the training flow animation'}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#333d49] bg-[#151a23] px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-[#a9b4c1] transition hover:border-emerald-300/60 hover:text-emerald-200 hover:shadow-[0_0_16px_2px_rgba(52,211,153,0.25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"
            >
              {playing ? (
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
              ) : (
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15c0 .8.9 1.3 1.6.9l12-7.5c.6-.4.6-1.4 0-1.8l-12-7.5c-.7-.4-1.6.1-1.6.9z" /></svg>
              )}
              {playing ? 'Pause' : 'Play'}
            </button>
            <div role="group" aria-label="Animation speed" className="inline-flex shrink-0 items-stretch overflow-hidden rounded-full border border-[#333d49] bg-[#151a23]">
              {[1, 2, 3].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  aria-pressed={speed === s}
                  aria-label={`${s}x animation speed`}
                  className={`px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.12em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 ${s > 1 ? 'border-l border-[#333d49]' : ''} ${speed === s ? 'bg-emerald-300/15 text-emerald-200' : 'text-[#a9b4c1] hover:text-emerald-200'}`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    <div className="flow-dark overflow-hidden rounded-2xl bg-[#0a0e14] border border-white/10 p-5 sm:p-8">
      <p className="text-center font-serif font-bold uppercase tracking-wide text-[0.85rem] text-[#c3ccd7]">Flow for training the models</p>
      <div ref={containerRef} className="relative mt-5">
        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[#4b5563]/0 via-[#4b5563]/60 to-[#4b5563]/0" aria-hidden="true" />
        <div ref={dotRef} className="flow-travel-dot absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-emerald-300 shadow-[0_0_14px_5px_rgba(52,211,153,0.45)] opacity-0 transition-opacity duration-300" aria-hidden="true" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} ref={(el) => { if (el) miniRefs.current[i] = el }} className="flow-travel-dot absolute w-2.5 h-2.5 rounded-full bg-emerald-300 shadow-[0_0_14px_5px_rgba(52,211,153,0.45)] opacity-0 transition-opacity duration-300 -translate-x-1/2 -translate-y-1/2" aria-hidden="true" />
        ))}
        <div className="flex flex-col">
          {pre.map((s, idx) => (
            <Fragment key={s.n}>
              {s.chip && <ChipRow chip={s.chip} />}
              {idx > 0 && <Wire />}
              <FlowNode step={s} boxRef={reg(idx)} />
            </Fragment>
          ))}
          <Wire h="h-5" />
          <FoldLoop steps={loopSteps} reg={reg} bracketRef={bracketRef} />
          <Wire h="h-5" />
          <FlowNode step={tuningStep} boxRef={reg(10)} />
          <Wire h="h-5" />
          <ChipRow chip={PHASE3} rowRef={phase3Ref} />
          <ModelBranch models={MODELS} reg={reg} />
          {post.map((s, idx) => (
            <Fragment key={s.n}>
              {idx > 0 && <Wire />}
              <FlowNode step={s} boxRef={reg(12 + idx)} />
            </Fragment>
          ))}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-white/10 pt-4">
        {LEGEND.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-2 text-xs text-slate-400">
            {l.wire ? (
              <span className="w-4 h-0.5 bg-[#4b5563]/70" aria-hidden="true" />
            ) : (
              <span className="w-3 h-3 rounded border bg-[#151a23] border-[#333d49]" aria-hidden="true" />
            )}
            {l.label}
          </span>
        ))}
      </div>
    </div>
    </>
  )
}
