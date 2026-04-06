import React, { useState } from 'react'
import { ChevronRight, ChevronLeft, Check, Upload, X, Sparkles } from 'lucide-react'
import { onboardMe, uploadResume } from '../api/client'

const STEPS = [
  { id: 1, title: 'Basic Info',         desc: 'Confirm your details' },
  { id: 2, title: 'Job Preferences',    desc: 'What are you looking for?' },
  { id: 3, title: 'Skills & Experience',desc: 'Your background' },
  { id: 4, title: 'Upload Resume',      desc: 'Your resume or CV' },
  { id: 5, title: 'Quick Answers',      desc: 'Pre-fill common questions' },
]

const REMOTE_OPTIONS    = ['Remote', 'Hybrid', 'On-site', 'Any']
const AVAILABILITY_OPTS = ['Immediately', '2 weeks', '1 month', '2+ months']
const EDUCATION_OPTS    = ["High School", "Associate's", "Bachelor's", "Master's", "PhD", "Self-taught"]
const WORK_AUTH_OPTS    = ["US Citizen", "Green Card", "H1-B", "OPT/CPT", "TN Visa", "Other", "Japan Work Visa"]

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="10" fill="url(#onb-logo)"/>
      <path d="M11 25l5-14 5 14M13.5 19.5h6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="26" cy="11" r="3" fill="white" opacity="0.85"/>
      <defs><linearGradient id="onb-logo" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#8B5CF6"/><stop offset="1" stopColor="#6D28D9"/></linearGradient></defs>
    </svg>
  )
}

export default function OnboardingPage({ clerkUser, onComplete }) {
  const [step, setStep]           = useState(1)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [resumeFile, setResumeFile] = useState(null)
  const [dragOver, setDragOver]   = useState(false)
  const [form, setForm] = useState({
    full_name: clerkUser?.fullName || '',
    email: clerkUser?.primaryEmailAddress?.emailAddress || '',
    phone: '', location: '',
    linkedin_url: '', github_url: '', portfolio_url: '',
    target_roles: [], target_industries: [], target_locations: [],
    salary_min: '', salary_max: '',
    work_authorization: '', willing_to_relocate: false,
    remote_preference: 'Any', years_experience: '',
    education_level: '', skills: [], summary: '',
    availability: 'Immediately',
    custom_answers: {
      why_this_role: '', biggest_strength: '',
      tell_me_about_yourself: '', why_leaving: '',
    },
  })

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))
  const addToList = (field, value) => {
    const v = value.trim()
    if (!v || form[field].includes(v)) return
    set(field, [...form[field], v])
  }
  const removeFromList = (field, value) => set(field, form[field].filter(v => v !== value))

  function TagInput({ field, placeholder }) {
    const [val, setVal] = useState('')
    return (
      <div>
        <div className="flex gap-2 mb-2">
          <input
            className="input flex-1"
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder={placeholder}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addToList(field, val); setVal('') } }}
          />
          <button type="button" className="btn-secondary px-4" onClick={() => { addToList(field, val); setVal('') }}>Add</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {form[field].map(v => (
            <span key={v} className="inline-flex items-center gap-1 px-3 py-1 rounded-pill bg-brand-50 text-brand-700 text-xs font-medium border border-brand-100">
              {v}
              <button onClick={() => removeFromList(field, v)} className="hover:text-red-500 ml-0.5"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      </div>
    )
  }

  const handleSubmit = async () => {
    setLoading(true); setError(null)
    try {
      const userData = {
        ...form,
        salary_min:       form.salary_min       ? parseInt(form.salary_min)       : null,
        salary_max:       form.salary_max       ? parseInt(form.salary_max)       : null,
        years_experience: form.years_experience ? parseInt(form.years_experience) : null,
        remote_preference: form.remote_preference.toLowerCase().replace(/[- ]/g, ''),
      }
      const user = await onboardMe(userData)
      if (resumeFile) await uploadResume(user.id, resumeFile)
      await onComplete()
    } catch (e) {
      const detail = e.response?.data?.detail
      if (Array.isArray(detail)) setError(detail.map(d => `${d.loc?.join('.')}: ${d.msg}`).join(' · '))
      else setError(detail || e.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const canProceed = () => step === 1 ? (form.full_name && form.email) : true
  const progress = ((step - 1) / (STEPS.length - 1)) * 100

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="bg-white border-b border-surface-border px-6 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-2.5">
          <Logo />
          <span className="font-bold text-lg text-ink-primary tracking-tight">Envia</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="h-1.5 bg-surface-border rounded-full overflow-hidden mb-6">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between mb-2">
              {STEPS.map((s) => (
                <div key={s.id} className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    step > s.id  ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm shadow-brand-500/20' :
                    step === s.id ? 'bg-brand-50 text-brand-600 border-2 border-brand-500' :
                    'bg-surface-hover text-ink-tertiary'
                  }`}>
                    {step > s.id ? <Check className="w-3.5 h-3.5" /> : s.id}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-4">
              <h2 className="font-bold text-xl text-ink-primary tracking-tight">{STEPS[step - 1].title}</h2>
              <p className="text-sm text-ink-secondary mt-1">{STEPS[step - 1].desc}</p>
            </div>
          </div>

          <div className="card p-8">
            {error && (
              <div className="mb-5 p-3.5 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100">{error}</div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Full Name *</label><input className="input" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Jane Smith" /></div>
                  <div><label className="label">Email *</label><input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@example.com" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 (555) 123-4567" /></div>
                  <div><label className="label">Location</label><input className="input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="San Francisco, CA" /></div>
                </div>
                <div><label className="label">LinkedIn URL</label><input className="input" value={form.linkedin_url} onChange={e => set('linkedin_url', e.target.value)} placeholder="linkedin.com/in/janesmith" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">GitHub URL</label><input className="input" value={form.github_url} onChange={e => set('github_url', e.target.value)} placeholder="github.com/janesmith" /></div>
                  <div><label className="label">Portfolio URL</label><input className="input" value={form.portfolio_url} onChange={e => set('portfolio_url', e.target.value)} placeholder="janesmith.dev" /></div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div><label className="label">Target Job Titles</label><TagInput field="target_roles" placeholder="e.g. Software Engineer" /></div>
                <div><label className="label">Target Industries</label><TagInput field="target_industries" placeholder="e.g. FinTech, Healthcare" /></div>
                <div><label className="label">Preferred Locations</label><TagInput field="target_locations" placeholder="e.g. Tokyo, Remote" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Min Salary ($)</label><input className="input" type="number" value={form.salary_min} onChange={e => set('salary_min', e.target.value)} placeholder="80,000" /></div>
                  <div><label className="label">Max Salary ($)</label><input className="input" type="number" value={form.salary_max} onChange={e => set('salary_max', e.target.value)} placeholder="150,000" /></div>
                </div>
                <div>
                  <label className="label">Remote Preference</label>
                  <div className="flex flex-wrap gap-2">
                    {REMOTE_OPTIONS.map(opt => (
                      <button key={opt} type="button" onClick={() => set('remote_preference', opt)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
                          form.remote_preference === opt
                            ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white border-brand-500 shadow-sm shadow-brand-500/20'
                            : 'bg-white text-ink-secondary border-surface-border hover:border-brand-300'
                        }`}>{opt}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Work Authorization</label>
                  <select className="input" value={form.work_authorization} onChange={e => set('work_authorization', e.target.value)}>
                    <option value="">Select...</option>
                    {WORK_AUTH_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Availability</label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABILITY_OPTS.map(opt => (
                      <button key={opt} type="button" onClick={() => set('availability', opt)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
                          form.availability === opt
                            ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white border-brand-500 shadow-sm shadow-brand-500/20'
                            : 'bg-white text-ink-secondary border-surface-border hover:border-brand-300'
                        }`}>{opt}</button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.willing_to_relocate} onChange={e => set('willing_to_relocate', e.target.checked)} className="w-4 h-4 accent-brand-500 rounded" />
                  <span className="text-sm text-ink-primary">Willing to relocate</span>
                </label>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Years of Experience</label><input className="input" type="number" min="0" max="50" value={form.years_experience} onChange={e => set('years_experience', e.target.value)} placeholder="5" /></div>
                  <div><label className="label">Education Level</label><select className="input" value={form.education_level} onChange={e => set('education_level', e.target.value)}><option value="">Select...</option>{EDUCATION_OPTS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                </div>
                <div><label className="label">Skills & Technologies</label><TagInput field="skills" placeholder="e.g. Python, React, AWS" /></div>
                <div><label className="label">Professional Summary</label><textarea className="input min-h-[120px] resize-y" value={form.summary} onChange={e => set('summary', e.target.value)} placeholder="Summarize your experience, strengths, and what you're looking for..." /></div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <p className="text-sm text-ink-secondary">Upload your resume so the AI can tailor cover letters and fill out applications on your behalf.</p>
                <label
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-12 cursor-pointer transition-all duration-200 ${
                    dragOver ? 'border-brand-400 bg-brand-50' :
                    resumeFile ? 'border-brand-400 bg-brand-50' :
                    'border-surface-border hover:border-brand-300 hover:bg-brand-50/30'
                  }`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); setResumeFile(e.dataTransfer.files?.[0] || null) }}
                >
                  <Upload className={`w-10 h-10 mb-3 ${resumeFile ? 'text-brand-500' : 'text-ink-tertiary'}`} />
                  {resumeFile ? (<><span className="font-semibold text-ink-primary">{resumeFile.name}</span><span className="text-xs text-ink-tertiary mt-1">{(resumeFile.size / 1024).toFixed(0)} KB</span></>) : (<><span className="font-medium text-ink-primary">Click or drop your resume</span><span className="text-xs text-ink-tertiary mt-1">PDF, DOCX, or TXT · Max 10MB</span></>)}
                  <input type="file" className="hidden" accept=".pdf,.docx,.doc,.txt" onChange={e => setResumeFile(e.target.files?.[0] || null)} />
                </label>
                {resumeFile && <button type="button" onClick={() => setResumeFile(null)} className="text-sm text-red-500 hover:text-red-600 font-medium">Remove file</button>}
                <p className="text-xs text-ink-tertiary">You can also upload or update your resume later from the Dashboard.</p>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-5">
                <p className="text-sm text-ink-secondary">These pre-loaded answers help the AI personalize every application. You can update them anytime.</p>
                {[
                  { key: 'tell_me_about_yourself', label: 'Tell me about yourself', placeholder: 'Summarize your background and goals...' },
                  { key: 'biggest_strength',        label: "What's your biggest strength?",   placeholder: 'e.g. Problem-solving, leadership...' },
                  { key: 'why_this_role',            label: 'Why are you interested in this type of role?', placeholder: 'What motivates you...' },
                  { key: 'why_leaving',              label: 'Why are you looking for a new role?',          placeholder: 'Seeking growth, new challenges...' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}><label className="label">{label}</label><textarea className="input min-h-[80px] resize-y" value={form.custom_answers[key]} onChange={e => set('custom_answers', { ...form.custom_answers, [key]: e.target.value })} placeholder={placeholder} /></div>
                ))}
              </div>
            )}

            <div className="flex justify-between mt-8 pt-6 border-t border-surface-border">
              <button type="button" onClick={() => setStep(s => s - 1)} disabled={step === 1} className="btn-ghost flex items-center gap-2 disabled:invisible">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              {step < STEPS.length ? (
                <button type="button" onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="btn-primary flex items-center gap-2 disabled:opacity-40">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button type="button" onClick={handleSubmit} disabled={loading || !canProceed()} className="btn-primary flex items-center gap-2 disabled:opacity-40">
                  {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Setting up...</> : <><Sparkles className="w-4 h-4" />Launch Dashboard</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
