import { Fragment, useEffect, useRef } from 'react'

const WIRE = 'bg-[#4b5563]/70'

const GREY = {
  box: 'bg-[#151a23] border-[#333d49]',
  title: 'text-[#e8edf3]',
  badge: 'bg-[#232b37] text-[#a9b4c1]',
  chip: 'bg-[#11161d] border-[#2c3540] text-[#a9b4c1]',
  dot: 'bg-[#151a23] border-[#333d49]',
}

const STEPS = [
  { n: 1, title: 'Student data', detail: [{ t: 'CSV / Excel — the study table is provided.', i: true }] },
  { n: 2, title: 'Datasets loading', detail: [{ t: 'loader.py' }, { t: 'File is opened and read.' }] },
  { n: 3, title: 'Dataset inspection', detail: [{ t: 'inspector.py' }, { t: 'Summarizes rows, columns and types.' }] },
  {
    n: 4,
    title: 'Quality checking',
    detail: [
      { t: 'quality.py' },
      { t: 'Audits the table, flags problems.' },
      { t: 'Issues only (never deletes):', i: true },
      { t: 'duplicates · missing values' },
      { t: 'impossible values · IQR outliers' },
      { t: 'constant columns' },
    ],
  },
  { n: 5, title: 'Processing', detail: [{ t: 'processing.py' }, { t: 'States what each algorithm needs.' }] },
  { n: 6, title: 'Split dates', detail: [{ t: 'splitter.py' }, { t: 'Separates dates 2019–2023 (training) & 2024–2025 (final check).' }] },
  { n: 7, title: '5-fold CV · stratified slices', detail: [{ t: 'Slice the table rows 5 times (fair slices).' }] },


  { n: 8, title: 'SMOTE', detail: [
    { t: 'Risk — synthetic rows invented from the sliced table.' },
    { t: 'Non-risk — original rows from the sliced table.' },
  ] },

  { n: 9, title: 'Score every model', detail: [
    { t: 'accuracy — overall correctness' },
    { t: 'precision — share of alerts that were right' },
    { t: 'recall — share of at-risk students found' },
    { t: 'F1 — balance of correct alerts' },
    { t: 'ROC-AUC — ability to tell groups apart' },
  ] },
  { n: 10, title: 'Average the 5 scores', detail: [{ t: 'One trustworthy result per model' }, { t: '(saved for the Wilcoxon test).', i: true }] },
  { n: 11, title: 'Compare the models', detail: [{ t: 'Same folds for every model.', i: true }, { t: 'Rank them on identical folds.' }] },
  { n: 12, title: 'Wilcoxon test', detail: [{ t: 'Holm correction, α = 0.05' }, { t: 'Checks if the differences are real — or just luck.' }] },
  { n: 13, title: 'Select the model', detail: [{ t: 'No retrain.', i: true }, { t: 'Pick the winner based on evidence.' }] },
  { n: 14, title: 'Final evaluation', detail: [{ t: 'On the holdout data (2024–2025).', i: true }, { t: 'Final test on students never seen in training.' }] },
  { n: 15, title: 'Report results', detail: [{ t: 'Recorded for the thesis.', i: true }] },
]

const MODELS = ['Decision Tree', 'Random Forest', 'Logistic Regression', 'GaussianNB']

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
      <h3 className={`font-serif font-bold uppercase tracking-wide text-[0.85rem] leading-snug ${t.title}`}>{step.title}</h3>
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
        <div ref={bracketRef} className="absolute left-6 right-1/2 top-0 bottom-0 border-l-2 border-t-2 border-b-2 rounded-l-2xl border-[#4b5563]/70 hidden sm:block" aria-hidden="true" />
      {steps.map((s, idx) => (
          <Fragment key={s.n}>
            {idx > 0 && <Wire />}
            <FlowNode step={s} boxRef={reg(6 + idx)} />
          </Fragment>
      ))}
    </div>
  )
}

function ModelBox({ name, boxRef }) {
  return (
    <div ref={boxRef} className="flow-box relative z-10 rounded-xl border bg-[#151a23] border-[#333d49] px-1.5 sm:px-2 py-3 text-center">
      <h3 className="font-serif font-bold tracking-wide text-[0.8rem] sm:text-[0.85rem] leading-snug text-[#e8edf3] break-words">{name}</h3>
    </div>
  )
}

function WireRow({ busAt }) {
  return (
    <div className="relative">
      <div className="grid grid-cols-4 gap-3">
        {MODELS.map((m, i) => (
          <div key={i} className="flex justify-center"><div className={`w-0.5 h-6 ${WIRE}`} /></div>
        ))}
      </div>
      <div className={`absolute ${busAt === 'top' ? 'top-0' : 'bottom-0'} h-0.5 ${WIRE}`} style={{ left: 'calc(12.5% - 4.5px)', right: 'calc(12.5% - 4.5px)' }} aria-hidden="true" />
    </div>
  )
}

function ModelBranch({ models, reg }) {
  return (
    <div className="relative z-10 w-full max-w-[720px] mx-auto">
      <WireRow busAt="top" />
      <div className="grid grid-cols-4 gap-3">
        {models.map((name) => <ModelBox key={name} name={name} boxRef={reg(8)} />)}
      </div>
      <WireRow busAt="bottom" />
      <Wire h="h-5" />
    </div>
  )
}

export function PipelineFlow() {
  const pre = STEPS.slice(0, 6)
  const loopSteps = STEPS.slice(6, 8)
  const post = STEPS.slice(8)
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
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const dot = dotRef.current
    const container = containerRef.current
    if (!dot || !container) return
    const GLOW_MS = 3000
    const PX_PER_SEC = 160
    const LOOP_PX_PER_SEC = 200
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
        for (let s = 0; s <= 5; s++) {
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
          for (let s = 6; s <= 6; s++) {
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
        const step11 = live(7)
        if (step11.length) {
          const p = rect(step11[0])
          await moveTo(p.x, p.y)
          if (cancelled) return
          setGlow(step11, true)
          await later(GLOW_MS)
          if (cancelled) { setGlow(step11, false); return }
        }
        const models = live(8)
        const chip = phase3Ref.current
        const bracket = bracketRef.current
        const canBranch = Boolean(chip && models.length === 4)
        const canLoop = canBranch && Boolean(bracket && bracket.getBoundingClientRect().width > 0)
        if (canBranch) {
          const pc = rect(chip)
          await moveTo(pc.x, pc.y)
          if (cancelled) { setGlow(step11, false); return }
          await later(800)
          if (cancelled) { setGlow(step11, false); return }
          const bus = { x: container.clientWidth / 2, y: rect(models[0]).top - 24 }
          await moveTo(bus.x, bus.y)
          if (cancelled) { setGlow(step11, false); return }
          const targets = models.map((m) => rect(m))
          const miniState = targets.map(() => ({ x: bus.x, y: bus.y }))
          minis.forEach((d, i) => {
            if (d && targets[i]) { d.style.left = `${bus.x}px`; d.style.top = `${bus.y}px`; d.style.opacity = '1' }
          })
          dot.style.opacity = '0'
          await later(350)
          if (cancelled) { setGlow(step11, false); return }
          await Promise.all(targets.map((t, i) => {
            const d = minis[i]
            if (!d) return Promise.resolve()
            return moveEl(d, miniState[i], t.x, bus.y)
              .then(() => { if (!cancelled) return moveEl(d, miniState[i], t.x, t.y) })
          }))
          if (cancelled) { setGlow(step11, false); return }
          setGlow(models, true)
          await later(GLOW_MS)
          setGlow(models, false)
          setGlow(step11, false)
          await Promise.all(targets.map((t, i) => {
            const d = minis[i]
            if (!d) return Promise.resolve()
            return moveEl(d, miniState[i], t.x, bus.y)
              .then(() => { if (!cancelled) return moveEl(d, miniState[i], bus.x, bus.y) })
          }))
          minis.forEach((d) => { if (d) d.style.opacity = '0' })
          dot.style.opacity = '1'
          await later(350)
          if (cancelled) return
        } else {
          setGlow(step11, false)
        }
        if (canLoop && round < 4) {
          dot.style.opacity = '0'
          await later(350)
          if (cancelled) return
          const cr = container.getBoundingClientRect()
          const br = bracket.getBoundingClientRect()
          const railX = br.left - cr.left + 1
          const topY = br.top - cr.top + 1
          const botY = br.bottom - cr.top - 1
          const cx = container.clientWidth / 2
          setDot(cx, botY)
          dot.style.opacity = '1'
          await later(350)
          if (cancelled) return
          await moveTo(railX, botY, LOOP_PX_PER_SEC)
          if (cancelled) return
          await moveTo(railX, topY, LOOP_PX_PER_SEC)
          if (cancelled) return
          await moveTo(cx, topY, LOOP_PX_PER_SEC)
          if (cancelled) return
          const step7 = live(6)
          if (step7.length) {
            const p = rect(step7[0])
            await moveTo(p.x, p.y)
            if (cancelled) return
          }
          } else {
            dot.style.opacity = '0'
            await later(350)
            if (cancelled) return
          }
        }
        const tail0 = live(9)
        if (tail0.length) {
          const p = rect(tail0[0])
          setDot(p.x, p.y)
        }
        dot.style.opacity = '1'
        await later(450)
        if (cancelled) return
        for (let s = 9; s <= 15; s++) {
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
        await later(450)
        if (cancelled) return
        const first = live(0)
        if (first.length) {
          const p = rect(first[0])
          setDot(p.x, p.y)
        }
        dot.style.opacity = '1'
        await later(450)
      }
    })()
    return () => { cancelled = true; rafs.forEach((id) => cancelAnimationFrame(id)); timers.forEach(clearTimeout) }
  }, [])
  return (
    <div className="flow-dark rounded-2xl bg-[#0a0e14] border border-white/10 p-5 sm:p-8">
      <p className="text-center font-serif font-bold uppercase tracking-wide text-[0.85rem] text-[#c3ccd7]">Flow for training the models</p>
      <div ref={containerRef} className="relative mt-5">
        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[#4b5563]/0 via-[#4b5563]/60 to-[#4b5563]/0" aria-hidden="true" />
        <div ref={dotRef} className="flow-travel-dot absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-emerald-300 shadow-[0_0_14px_5px_rgba(52,211,153,0.45)] opacity-0 transition-opacity duration-300" aria-hidden="true" />
        {[0, 1, 2, 3].map((i) => (
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
          <ChipRow chip={PHASE3} rowRef={phase3Ref} />
          <ModelBranch models={MODELS} reg={reg} />
          {post.map((s, idx) => (
            <Fragment key={s.n}>
              {idx > 0 && <Wire />}
              <FlowNode step={s} boxRef={reg(9 + idx)} />
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
  )
}
