import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ChevronRight, ChevronLeft, Check, Upload, X } from 'lucide-react'
import { createUser, uploadResume } from '../api/client'

const STEPS = [
  { id: 1, title: 'Basic Info', desc: 'Tell us about yourself' },
  { id: 2, title: 'Job Preferences', desc: 'What are you looking for?' },
  { id: 3, title: 'Skills & Experience', desc: 'Your background' },
  { id: 4, title: 'Upload Resume', desc: 'Your resume or CV' },
  { id: 5, title: 'Application Answers', desc: 'Pre-fill common questions' },
]

const REMOTE_OPTIONS = ['Remote', 'Hybrid', 'On-site', 'Any']
const AVAILABILITY_OPTIONS = ['Immediately', '2 weeks', '1 month', '2+ months']
const EDUCATION_OPTIONS = ["High School", "Associate's", "Bachelor's", "Master's", "PhD", "Self-taught"]
const WORK_AUTH_OPTIONS = ["US Citizen", "Green Card", "H1-B", "OPT/CPT", "TN Visa", "Other"]

export default function OnboardingPage({ onUserCreated }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [resumeFile, setResumeFile] = useState(null)
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', location: '',
    linkedin_url: '', github_url: '', portfolio_url: '',
    target_roles: [], target_industries: [], target_locations: [],
    salary_min: '', salary_max: '',
    work_authorization: '', willing_to_relocate: false,
    remote_preference: 'Any', years_experience: '',
    education_level: '', skills: [], summary: '',
    availability: 'Immediately',
    custom_answers: {
      why_this_role: '',
      biggest_strength: '',
      tell_me_about_yourself: '',
      why_leaving: '',
    },
  })

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const addToList = (field, value) => {
    const trimmed = value.trim()
    if (!trimmed || form[field].includes(trimmed)) return
    set(field, [...form[field], trimmed])
  }

  const removeFromList = (field, value) => {
    set(field, form[field].filter(v => v !== value))
  }

  const TagInput = ({ field, placeholder }) => {
    const [val, setVal] = useState('')
    return (
      <div>
        <div className="flex gap-2 mb-2">
          <input
            className="input flex-1"
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder={placeholder}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); addToList(field, val); setVal('') }
            }}
          />
          <button
            type="button"
            className="btn-secondary px-3"
            onClick={() => { addToList(field, val); setVal('') }}
          >Add</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {form[field].map(v => (
            <span key={v} className="badge bg-primary-100 text-primary-700 gap-1">
              {v}
              <button onClick={() => removeFromList(field, v)} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>
    )
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      const userData = {
        ...form,
        salary_min: form.salary_min ? parseInt(form.salary_min) : null,
        salary_max: form.salary_max ? parseInt(form.salary_max) : null,
        years_experience: form.years_experience ? parseInt(form.years_experience) : null,
        remote_preference: form.remote_preference.toLowerCase().replace('-', ''),
      }
      const user = await createUser(userData)
      if (resumeFile) {
        await uploadResume(user.id, resumeFile)
      }
      onUserCreated(user.id)
      navigate('/dashboard')
    } catch (e) {
      setError(e.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const canProceed = () => {
    if (step === 1) return form.full_name && form.email
    if (step === 2) return form.remote_preference
    return true
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center gap-2 max-w-2xl mx-auto">
          <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900">ApplyAI</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              {STEPS.map((s, i) => (
                <React.Fragment key={s.id}>
                  <div className={`flex flex-col items-center ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                      step > s.id ? 'bg-primary-600 border-primary-600 text-white' :
                      step === s.id ? 'border-primary-600 text-primary-600 bg-white' :
                      'border-gray-300 text-gray-400 bg-white'
                    }`}>
                      {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                    </div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${step > s.id ? 'bg-primary-600' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="text-center">
              <h2 className="font-bold text-xl text-gray-900">{STEPS[step - 1].title}</h2>
              <p className="text-sm text-gray-500">{STEPS[step - 1].desc}</p>
            </div>
          </div>

          {/* Card */}
          <div className="card">
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
                {error}
              </div>
            )}

            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Full Name *</label>
                    <input className="input" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Jane Smith" />
                  </div>
                  <div>
                    <label className="label">Email *</label>
                    <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@example.com" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Phone</label>
                    <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 123-4567" />
                  </div>
                  <div>
                    <label className="label">Location</label>
                    <input className="input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="San Francisco, CA" />
                  </div>
                </div>
                <div>
                  <label className="label">LinkedIn URL</label>
                  <input className="input" value={form.linkedin_url} onChange={e => set('linkedin_url', e.target.value)} placeholder="linkedin.com/in/janesmith" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">GitHub URL</label>
                    <input className="input" value={form.github_url} onChange={e => set('github_url', e.target.value)} placeholder="github.com/janesmith" />
                  </div>
                  <div>
                    <label className="label">Portfolio URL</label>
                    <input className="input" value={form.portfolio_url} onChange={e => set('portfolio_url', e.target.value)} placeholder="janesmith.dev" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Job Preferences */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <label className="label">Target Job Titles</label>
                  <TagInput field="target_roles" placeholder="e.g. Software Engineer" />
                </div>
                <div>
                  <label className="label">Target Industries</label>
                  <TagInput field="target_industries" placeholder="e.g. FinTech, Healthcare" />
                </div>
                <div>
                  <label className="label">Preferred Locations</label>
                  <TagInput field="target_locations" placeholder="e.g. New York, Remote" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Min Salary ($)</label>
                    <input className="input" type="number" value={form.salary_min} onChange={e => set('salary_min', e.target.value)} placeholder="80000" />
                  </div>
                  <div>
                    <label className="label">Max Salary ($)</label>
                    <input className="input" type="number" value={form.salary_max} onChange={e => set('salary_max', e.target.value)} placeholder="150000" />
                  </div>
                </div>
                <div>
                  <label className="label">Remote Preference</label>
                  <div className="flex flex-wrap gap-2">
                    {REMOTE_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => set('remote_preference', opt)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          form.remote_preference === opt
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                        }`}
                      >{opt}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="relocate" checked={form.willing_to_relocate} onChange={e => set('willing_to_relocate', e.target.checked)} className="rounded" />
                  <label htmlFor="relocate" className="text-sm text-gray-700">Willing to relocate</label>
                </div>
                <div>
                  <label className="label">Work Authorization</label>
                  <select className="input" value={form.work_authorization} onChange={e => set('work_authorization', e.target.value)}>
                    <option value="">Select...</option>
                    {WORK_AUTH_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Availability</label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABILITY_OPTIONS.map(opt => (
                      <button key={opt} type="button" onClick={() => set('availability', opt)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          form.availability === opt ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                        }`}>{opt}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Skills & Experience */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Years of Experience</label>
                    <input className="input" type="number" min="0" max="50" value={form.years_experience} onChange={e => set('years_experience', e.target.value)} placeholder="5" />
                  </div>
                  <div>
                    <label className="label">Education Level</label>
                    <select className="input" value={form.education_level} onChange={e => set('education_level', e.target.value)}>
                      <option value="">Select...</option>
                      {EDUCATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Skills & Technologies</label>
                  <TagInput field="skills" placeholder="e.g. Python, React, AWS" />
                </div>
                <div>
                  <label className="label">Professional Summary</label>
                  <textarea
                    className="input min-h-[120px] resize-y"
                    value={form.summary}
                    onChange={e => set('summary', e.target.value)}
                    placeholder="Briefly describe your experience, strengths, and what you're looking for..."
                  />
                </div>
              </div>
            )}

            {/* Step 4: Resume Upload */}
            {step === 4 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Upload your resume so the AI can tailor cover letters to each job. Supported formats: PDF, DOCX, TXT.</p>
                <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 cursor-pointer transition-colors ${
                  resumeFile ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
                }`}>
                  <Upload className={`w-10 h-10 mb-3 ${resumeFile ? 'text-primary-600' : 'text-gray-400'}`} />
                  {resumeFile ? (
                    <>
                      <span className="font-medium text-primary-700">{resumeFile.name}</span>
                      <span className="text-xs text-gray-500 mt-1">{(resumeFile.size / 1024).toFixed(0)} KB</span>
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-gray-700">Click to upload resume</span>
                      <span className="text-xs text-gray-400 mt-1">PDF, DOCX, or TXT · Max 10MB</span>
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={e => setResumeFile(e.target.files?.[0] || null)}
                  />
                </label>
                {resumeFile && (
                  <button type="button" onClick={() => setResumeFile(null)} className="text-sm text-red-500 hover:text-red-700">
                    Remove file
                  </button>
                )}
                <p className="text-xs text-gray-400">You can also skip this and add your resume later from the dashboard.</p>
              </div>
            )}

            {/* Step 5: Custom Answers */}
            {step === 5 && (
              <div className="space-y-5">
                <p className="text-sm text-gray-600">These answers will be used by the AI to personalize your applications. The more detail you give, the better.</p>
                {[
                  { key: 'tell_me_about_yourself', label: 'Tell me about yourself', placeholder: 'Summarize your background, strengths, and goals...' },
                  { key: 'biggest_strength', label: "What's your biggest strength?", placeholder: 'Problem-solving, communication, technical depth...' },
                  { key: 'why_this_role', label: 'Why are you interested in this type of role?', placeholder: 'What drives your interest in this work...' },
                  { key: 'why_leaving', label: 'Why are you leaving / looking for a new role?', placeholder: 'Looking for growth, new challenges, relocation...' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="label">{label}</label>
                    <textarea
                      className="input min-h-[80px] resize-y"
                      value={form.custom_answers[key]}
                      onChange={e => set('custom_answers', { ...form.custom_answers, [key]: e.target.value })}
                      placeholder={placeholder}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                disabled={step === 1}
                className="btn-secondary flex items-center gap-2 disabled:invisible"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              {step < STEPS.length ? (
                <button
                  type="button"
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canProceed()}
                  className="btn-primary flex items-center gap-2"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !canProceed()}
                  className="btn-primary flex items-center gap-2"
                >
                  {loading ? 'Creating profile...' : 'Launch Dashboard'} <Sparkles className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
