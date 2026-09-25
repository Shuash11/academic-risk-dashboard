const RISK_LEVELS = [
  {
    level: 'High Risk',
    band: 'High (P ≥ 0.70)',
    color: 'bg-red-50 border-red-200 text-red-900',
    iconBg: 'bg-red-600',
    urgency: 'Immediate',
    timeframe: 'Within 1 week',
    actions: [
      { area: 'Academic Advising', action: 'Schedule an immediate one-on-one meeting with the student to review current standing, identify specific courses causing difficulty, and develop an academic recovery plan with measurable milestones.' },
      { area: 'Counseling', action: 'Refer to the guidance counselor for psychosocial assessment. High-risk students often face compounding personal and academic stressors that require holistic support.' },
      { area: 'Faculty Intervention', action: 'Notify instructors of at-risk courses to provide supplementary materials, schedule review sessions, or adjust deadlines where policy permits.' },
      { area: 'Peer Support', action: 'Connect the student with a peer tutor or study group from the same program. Peer-led review sessions have shown effectiveness in improving course completion rates.' },
      { area: 'Monitoring', action: 'Set weekly check-ins for the remainder of the semester. Track attendance, quiz scores, and submission rates as leading indicators of improvement or decline.' },
    ],
  },
  {
    level: 'Medium Risk',
    band: 'Medium (0.40 ≤ P < 0.70)',
    color: 'bg-amber-50 border-amber-200 text-amber-900',
    iconBg: 'bg-amber-600',
    urgency: 'Proactive',
    timeframe: 'Within 2 weeks',
    actions: [
      { area: 'Academic Advising', action: 'Conduct a mid-semester academic review. Discuss course load adequacy, study habits, and time management. Recommend adjustments to enrollment load if overloading is detected.' },
      { area: 'Skill Building', action: 'Refer to workshops on study skills, test-taking strategies, and academic writing. Many medium-risk students benefit from structured skill development rather than content remediation.' },
      { area: 'Faculty Communication', action: 'Share aggregate (non-identifying) risk trends with department heads to inform instructional adjustments. Encourage early feedback mechanisms in courses.' },
      { area: 'Self-Directed Resources', action: 'Provide access to online learning resources, recorded lectures, and practice materials. Empower the student with tools for self-paced improvement.' },
      { area: 'Follow-Up', action: 'Schedule a follow-up meeting in 3-4 weeks to reassess risk level. Track GPA trajectory and failed course count as primary indicators.' },
    ],
  },
  {
    level: 'Low Risk',
    band: 'Low (P < 0.40)',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    iconBg: 'bg-emerald-600',
    urgency: 'Preventive',
    timeframe: 'Semester-long',
    actions: [
      { area: 'General Advising', action: 'Include predictive results as part of regular semester advising. Discuss academic goals, course planning for the next term, and long-term program trajectory.' },
      { area: 'Early Alert Awareness', action: 'Inform students that predictive monitoring is in place and encourage them to seek help proactively if circumstances change (e.g., health issues, family emergencies).' },
      { area: 'Program-Level Trends', action: 'Use aggregate low-risk data to validate program effectiveness. If certain programs consistently show lower risk, study their practices for institutional learning.' },
      { area: 'Enrichment Opportunities', action: 'Recommend honors courses, research assistantships, or leadership roles to keep low-risk students engaged and growing academically.' },
      { area: 'Preventive Monitoring', action: 'Continue periodic re-screening each semester. Risk levels can change as academic demands increase, especially in upper year levels.' },
    ],
  },
]

const WORKFLOW_STEPS = [
  {
    step: 1,
    title: 'Data Collection',
    desc: 'Import student academic records (GWA, failed/dropped courses, enrollment history, program, year level) at the start of each semester or grading period.',
    icon: '1',
  },
  {
    step: 2,
    title: 'Risk Prediction',
    desc: 'Run the imported data through the trained classification models in the dashboard. Each student receives a risk probability (0–1) and a band assignment (Low / Medium / High).',
    icon: '2',
  },
  {
    step: 3,
    title: 'Review & Prioritize',
    desc: 'Academic advisors review the results dashboard. Focus first on High-risk students, then Medium-risk. Use the drilldown feature to inspect individual student profiles.',
    icon: '3',
  },
  {
    step: 4,
    title: 'Intervention',
    desc: 'Execute the appropriate intervention actions based on risk level. Document actions taken, responsible personnel, and timelines in the intervention tracking system.',
    icon: '4',
  },
  {
    step: 5,
    title: 'Monitor & Reassess',
    desc: 'Track student progress through follow-up check-ins. Re-run predictions after each grading period to update risk levels and adjust interventions accordingly.',
    icon: '5',
  },
]

const GUIDING_PRINCIPLES = [
  { title: 'Supportive, Not Punitive', desc: 'Predictive results are used exclusively to provide academic support. They are never used as the sole basis for disciplinary action, grade modification, or enrollment decisions.' },
  { title: 'Confidentiality', desc: 'Student risk data is accessible only to authorized academic advisors and administrators. Individual results are never disclosed publicly or to unauthorized personnel.' },
  { title: 'Human-in-the-Loop', desc: 'Predictive models inform — never replace — human judgment. All intervention decisions must be made by qualified academic professionals who consider the full context of each student.' },
  { title: 'Continuous Improvement', desc: 'The intervention framework is iteratively refined based on outcome data. If interventions consistently fail for certain risk profiles, the approach is reassessed and adapted.' },
  { title: 'Transparency', desc: 'Students are informed that predictive analytics support their academic success. They may request clarification about how risk assessments are used in their advising process.' },
]

export function InterventionFramework() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-[72ch]">
        <h1 className="text-[1.7rem] sm:text-2xl font-extrabold tracking-tight text-slate-900">Academic Intervention Support Framework</h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-slate-600">A structured approach for using predictive model outputs to support at-risk students through timely, targeted academic interventions.</p>
      </div>

      <div className="mt-6 rounded-2xl bg-slate-900 text-white p-6 sm:p-8">
        <h2 className="text-lg font-bold">Purpose</h2>
        <p className="mt-2 text-sm text-slate-300 leading-relaxed max-w-[72ch]">
          This framework translates the predictive outputs of the academic risk classification models into actionable intervention strategies. It provides a structured process for academic advisors, faculty, and support staff to identify, prioritize, and assist students who may be at risk of academic failure.
        </p>
        <p className="mt-3 text-xs text-slate-400">Based on the study: <em>Machine Learning-Based Predictive Modeling for Identifying Students at Risk of Academic Failure</em></p>
      </div>

      <h2 className="mt-8 text-lg font-bold tracking-tight text-slate-900">Workflow</h2>
      <p className="mt-1 text-sm text-slate-600">The recommended process for integrating predictive risk assessment into academic support operations.</p>
      <div className="mt-4 space-y-3">
        {WORKFLOW_STEPS.map((s) => (
          <div key={s.step} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5">
            <span className="shrink-0 w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-sm font-bold">{s.icon}</span>
            <div>
              <h3 className="font-bold text-slate-900">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-bold tracking-tight text-slate-900">Intervention by Risk Level</h2>
      <p className="mt-1 text-sm text-slate-600">Specific actions organized by the model's risk band assignment. Each level requires a different intensity and urgency of response.</p>
      <div className="mt-4 space-y-6">
        {RISK_LEVELS.map((rl) => (
          <div key={rl.level} className={`rounded-2xl border ${rl.color} p-6`}>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`w-10 h-10 rounded-xl ${rl.iconBg} text-white flex items-center justify-center text-sm font-bold`}>{rl.level.charAt(0)}</span>
              <div>
                <h3 className="font-bold text-lg">{rl.level}</h3>
                <p className="text-xs opacity-70">{rl.band} · {rl.urgency} · {rl.timeframe}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {rl.actions.map((a) => (
                <div key={a.area} className="rounded-xl bg-white/60 border border-white/40 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide opacity-70">{a.area}</p>
                  <p className="mt-1 text-sm leading-relaxed">{a.action}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-bold tracking-tight text-slate-900">Guiding Principles</h2>
      <p className="mt-1 text-sm text-slate-600">Core principles that govern the ethical and effective use of predictive analytics in academic support.</p>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {GUIDING_PRINCIPLES.map((p) => (
          <div key={p.title} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-bold text-slate-900">{p.title}</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-bold tracking-tight text-slate-900">Key Predictors to Monitor</h2>
      <p className="mt-1 text-sm text-slate-600">Based on the feature importance analysis, these are the variables that most strongly predict academic risk. Advisors should pay special attention to these indicators.</p>
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl bg-red-50 border border-red-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-red-700">Primary predictor</p>
            <p className="mt-1 text-lg font-bold text-red-900">Number of Failed Courses</p>
            <p className="mt-1 text-sm text-red-800">Recorded failures co-occur with at-risk outputs in the retrained models. Importance reflects model reliance — not causal significance; see the Predictors tab for per-model importance rankings.</p>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Secondary predictor</p>
            <p className="mt-1 text-lg font-bold text-amber-900">GWA (General Weighted Average)</p>
            <p className="mt-1 text-sm text-amber-800">GWA sits on the Philippine 1.0–5.0 scale (only exactly 5.0 denotes a failed subject). Higher GWA values co-occur with at-risk outputs — monitor students whose GWA is worsening, especially alongside failed courses.</p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Contributing factor</p>
            <p className="mt-1 text-lg font-bold text-slate-900">Number of Dropped Courses</p>
            <p className="mt-1 text-sm text-slate-700">Dropped courses indicate potential disengagement or overwhelming workload. Even 1 drop warrants attention.</p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Contextual indicator</p>
            <p className="mt-1 text-lg font-bold text-slate-900">Previous Academic Standing</p>
            <p className="mt-1 text-sm text-slate-700">A history of "With Failed Courses" or "With Dropped Courses" co-occurs with at-risk outputs in the retrained models. Track longitudinal patterns.</p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-white border border-slate-200 p-6">
        <h3 className="font-bold text-slate-900">Disclaimer</h3>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          This framework is advisory in nature. Predictive model outputs are probabilistic estimates, not certainties. All intervention decisions must be made in consultation with qualified academic advisors who consider the complete context of each student's situation. Model outputs should never be the sole basis for punitive academic decisions.
        </p>
      </div>
    </div>
  )
}
