import React, { useState } from 'react'
import { ChevronRight, ChevronLeft, Check, Upload, X, Sparkles, Crosshair, Monitor, Shield } from 'lucide-react'
import { onboardMe, uploadResume } from '../api/client'

const STEPS = [
  { id: 1, title: 'Basic Info', desc: 'Your contact details', icon: '01' },
  { id: 2, title: 'Preferences', desc: 'What you\'re looking for', icon: '02' },
  { id: 3, title: 'Experience', desc: 'Skills and background', icon: '03' },
  { id: 4, title: 'Resume', desc: 'Upload your CV', icon: '04' },
  { id: 5, title: 'Answers', desc: 'Pre-fill common questions', icon: '05' },
]
const REMOTE_OPTIONS = ['Remote', 'Hybrid', 'On-site', 'Any']
const AVAILABILITY_OPTS = ['Immediately', '2 weeks', '1 month', '2+ months']
const EDUCATION_OPTS = ["High School", "Associate's", "Bachelor's", "Master's", "PhD", "Self-taught"]
const WORK_AUTH_OPTS = ["US Citizen", "Green Card", "H1-B", "OPT/CPT", "TN Visa", "Other", "Japan Work Visa"]

export default function OnboardingPage({ clerkUser, onComplete }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [resumeFile, setResumeFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [form, setForm] = useState({
    full_name: clerkUser?.fullName || '', email: clerkUser?.primaryEmailAddress?.emailAddress || '',
    phone: '', location: '', linkedin_url: '', github_url: '', portfolio_url: '',
    target_roles: [], target_industries: [], target_locations: [],
    salary_min: '', salary_max: '', work_authorization: '', willing_to_relocate: false,
    remote_preference: 'Any', years_experience: '', education_level: '', skills: [], summary: '',
    availability: 'Immediately',
    custom_answers: { why_this_role: '', biggest_strength: '', tell_me_about_yourself: '', why_leaving: '' },
  })

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))
  const addToList = (field, value) => { const v = value.trim(); if (!v || form[field].includes(v)) return; set(field, [...form[field], v]) }
  const removeFromList = (field, value) => set(field, form[field].filter(v => v !== value))

  function TagInput({ field, placeholder }) {
    const [val, setVal] = useState('')
    return (
      <div>
        <div className="flex gap-2 mb-2">
          <input className="input flex-1 text-[13px]" value={val} onChange={e => setVal(e.target.value)} placeholder={placeholder}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addToList(field, val); setVal('') } }} />
          <button type="button" className="btn-secondary text-[12px] px-3" onClick={() => { addToList(field, val); setVal('') }}>Add</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {form[field].map(v => (
            <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-ink-primary bg-white/[0.06] border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              {v}<button onClick={() => removeFromList(field, v)} className="hover:text-red-400 ml-0.5"><X className="w-2.5 h-2.5" /></button>
            </span>
          ))}
        </div>
      </div>
    )
  }

  const handleSubmit = async () => {
    setLoading(true); setError(null)
    try {
      const userData = { ...form, salary_min: form.salary_min ? parseInt(form.salary_min) : null, salary_max: form.salary_max ? parseInt(form.salary_max) : null, years_experience: form.years_experience ? parseInt(form.years_experience) : null, remote_preference: form.remote_preference.toLowerCase().replace(/[- ]/g, '') }
      const user = await onboardMe(userData)
      if (resumeFile) await uploadResume(user.id, resumeFile)
      await onComplete()
    } catch (e) { const d = e.response?.data?.detail; setError(Array.isArray(d) ? d.map(x => `${x.loc?.join('.')}: ${x.msg}`).join(' · ') : d || e.message || 'Error') }
    finally { setLoading(false) }
  }
  const canProceed = () => step === 1 ? (form.full_name && form.email) : true

  return (
    <div className="min-h-screen flex" style={{ background: '#111111' }}>
      {/* ── Left panel — progress + info ────────────────────────────── */}
      <div className="w-[320px] flex-shrink-0 border-r p-8 flex flex-col" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#0D0D0D' }}>
        {/* Logo */}
        <div className="flex items-center gap-2 mb-12">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: '#5E6AD2' }}>
            <svg width="12" height="12" viewBox="0 0 32 32" fill="none"><path d="M7 15.2L25 7L17.5 25L14.5 17.5L7 15.2Z" fill="white"/></svg>
          </div>
          <span className="font-medium text-[14px] text-ink-primary tracking-tight">Envia</span>
        </div>

        {/* Step list */}
        <div className="space-y-1 flex-1">
          {STEPS.map(s => (
            <div key={s.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${step === s.id ? 'bg-white/[0.05]' : ''}`}>
              <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-medium ${
                step > s.id ? 'bg-brand-500 text-white' :
                step === s.id ? 'bg-white/[0.1] text-ink-primary' :
                'bg-white/[0.03] text-ink-tertiary'
              }`}>
                {step > s.id ? <Check className="w-3 h-3" /> : s.icon}
              </div>
              <div>
                <p className={`text-[13px] ${step === s.id ? 'text-ink-primary font-medium' : 'text-ink-tertiary'}`}>{s.title}</p>
                {step === s.id && <p className="text-[11px] text-ink-tertiary">{s.desc}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="mt-auto pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <p className="text-[12px] text-ink-tertiary leading-relaxed">Takes about 3 minutes. You can update everything later from your dashboard.</p>
        </div>
      </div>

      {/* ── Right panel — form ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-8 flex flex-col">
        <div className="max-w-lg mx-auto w-full flex-1">
          <h2 className="text-[20px] font-medium text-ink-primary tracking-tight mb-1">{STEPS[step-1].title}</h2>
          <p className="text-[13px] text-ink-tertiary mb-8">{STEPS[step-1].desc}</p>

          {error && <div className="mb-6 p-3 rounded-lg text-[12px] text-red-400 bg-red-500/10 border border-red-500/20">{error}</div>}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Name *</label><input className="input text-[13px]" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Jane Smith" /></div>
                <div><label className="label">Email *</label><input className="input text-[13px]" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@example.com" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Phone</label><input className="input text-[13px]" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 555 1234" /></div>
                <div><label className="label">Location</label><input className="input text-[13px]" value={form.location} onChange={e => set('location', e.target.value)} placeholder="San Francisco" /></div>
              </div>
              <div><label className="label">LinkedIn</label><input className="input text-[13px]" value={form.linkedin_url} onChange={e => set('linkedin_url', e.target.value)} placeholder="linkedin.com/in/..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">GitHub</label><input className="input text-[13px]" value={form.github_url} onChange={e => set('github_url', e.target.value)} placeholder="github.com/..." /></div>
                <div><label className="label">Portfolio</label><input className="input text-[13px]" value={form.portfolio_url} onChange={e => set('portfolio_url', e.target.value)} placeholder="jane.dev" /></div>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-5">
              <div><label className="label">Target Roles</label><TagInput field="target_roles" placeholder="e.g. Software Engineer" /></div>
              <div><label className="label">Industries</label><TagInput field="target_industries" placeholder="e.g. FinTech" /></div>
              <div><label className="label">Locations</label><TagInput field="target_locations" placeholder="e.g. Tokyo, Remote" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Min Salary ($)</label><input className="input text-[13px]" type="number" value={form.salary_min} onChange={e => set('salary_min', e.target.value)} placeholder="80000" /></div>
                <div><label className="label">Max Salary ($)</label><input className="input text-[13px]" type="number" value={form.salary_max} onChange={e => set('salary_max', e.target.value)} placeholder="150000" /></div>
              </div>
              <div>
                <label className="label">Remote</label>
                <div className="flex flex-wrap gap-2">{REMOTE_OPTIONS.map(o => <button key={o} type="button" onClick={() => set('remote_preference', o)} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${form.remote_preference === o ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' : 'text-ink-tertiary border-white/[0.08] hover:bg-white/[0.03]'}`}>{o}</button>)}</div>
              </div>
              <div><label className="label">Work Auth</label><select className="input text-[13px]" value={form.work_authorization} onChange={e => set('work_authorization', e.target.value)}><option value="">Select...</option>{WORK_AUTH_OPTS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
              <div>
                <label className="label">Availability</label>
                <div className="flex flex-wrap gap-2">{AVAILABILITY_OPTS.map(o => <button key={o} type="button" onClick={() => set('availability', o)} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${form.availability === o ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' : 'text-ink-tertiary border-white/[0.08] hover:bg-white/[0.03]'}`}>{o}</button>)}</div>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={form.willing_to_relocate} onChange={e => set('willing_to_relocate', e.target.checked)} className="w-3.5 h-3.5 accent-brand-500 rounded" /><span className="text-[13px] text-ink-secondary">Willing to relocate</span></label>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Years Experience</label><input className="input text-[13px]" type="number" min="0" value={form.years_experience} onChange={e => set('years_experience', e.target.value)} placeholder="3" /></div>
                <div><label className="label">Education</label><select className="input text-[13px]" value={form.education_level} onChange={e => set('education_level', e.target.value)}><option value="">Select...</option>{EDUCATION_OPTS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
              </div>
              <div><label className="label">Skills</label><TagInput field="skills" placeholder="e.g. Python, React, AWS" /></div>
              <div><label className="label">Professional Summary</label><textarea className="input text-[13px] min-h-[120px] resize-y" value={form.summary} onChange={e => set('summary', e.target.value)} placeholder="Summarize your experience and goals..." /></div>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-4">
              <label className={`flex flex-col items-center justify-center border border-dashed rounded-xl p-10 cursor-pointer transition-all ${dragOver || resumeFile ? 'border-brand-500/40 bg-brand-500/5' : 'border-white/[0.1] hover:border-white/[0.2] hover:bg-white/[0.02]'}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={e => { e.preventDefault(); setDragOver(false); setResumeFile(e.dataTransfer.files?.[0] || null) }}>
                <Upload className={`w-6 h-6 mb-2 ${resumeFile ? 'text-brand-400' : 'text-ink-tertiary'}`} />
                {resumeFile ? (<><span className="text-[13px] font-medium text-ink-primary">{resumeFile.name}</span><span className="text-[11px] text-ink-tertiary mt-0.5">{(resumeFile.size / 1024).toFixed(0)} KB</span></>) : (<><span className="text-[13px] text-ink-secondary">Click or drop your resume</span><span className="text-[11px] text-ink-tertiary mt-0.5">PDF, DOCX, TXT · Max 10MB</span></>)}
                <input type="file" className="hidden" accept=".pdf,.docx,.doc,.txt" onChange={e => setResumeFile(e.target.files?.[0] || null)} />
              </label>
              {resumeFile && <button onClick={() => setResumeFile(null)} className="text-[12px] text-red-400 hover:text-red-300">Remove</button>}
            </div>
          )}
          {step === 5 && (
            <div className="space-y-5">
              {[
                { key: 'tell_me_about_yourself', label: 'Tell me about yourself', ph: 'Background, goals...' },
                { key: 'biggest_strength', label: 'Biggest strength?', ph: 'Problem-solving...' },
                { key: 'why_this_role', label: 'Why this type of role?', ph: 'Motivation...' },
                { key: 'why_leaving', label: 'Why looking for a new role?', ph: 'Growth...' },
              ].map(({ key, label, ph }) => (
                <div key={key}><label className="label">{label}</label><textarea className="input text-[13px] min-h-[70px] resize-y" value={form.custom_answers[key]} onChange={e => set('custom_answers', { ...form.custom_answers, [key]: e.target.value })} placeholder={ph} /></div>
              ))}
            </div>
          )}
        </div>

        {/* ── Navigation ──────────────────────────────────────────── */}
        <div className="max-w-lg mx-auto w-full flex justify-between mt-10 pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button onClick={() => setStep(s => s - 1)} disabled={step === 1} className="btn-ghost text-[13px] disabled:invisible">
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
          {step < STEPS.length ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="btn-primary text-[13px] disabled:opacity-40">
              Continue <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading || !canProceed()} className="btn-primary text-[13px] disabled:opacity-40">
              {loading ? 'Setting up...' : <><Sparkles className="w-3.5 h-3.5" /> Launch</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
