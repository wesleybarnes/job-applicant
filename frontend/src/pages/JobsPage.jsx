import React, { useState, useEffect } from 'react'
import { Search, MapPin, DollarSign, Plus, Trash2, Loader2, Building2, ExternalLink, ChevronDown, ChevronUp, X } from 'lucide-react'
import { listJobs, searchJobs, createApplication, deleteJob } from '../api/client'
import { useAppUser } from '../App'

export default function JobsPage() {
  const { appUser } = useAppUser()
  const userId = appUser?.id
  const [jobs, setJobs]             = useState([])
  const [loading, setLoading]       = useState(false)
  const [searching, setSearching]   = useState(false)
  const [query, setQuery]           = useState('')
  const [location, setLocation]     = useState('')
  const [addedJobs, setAddedJobs]   = useState(new Set())
  const [error, setError]           = useState(null)
  const [showManual, setShowManual] = useState(false)
  const [manual, setManual]         = useState({ title: '', company: '', location: '', url: '', description: '' })

  useEffect(() => { loadJobs() }, [])

  const loadJobs = async () => {
    setLoading(true)
    try { const data = await listJobs({ limit: 50 }); setJobs(data) }
    finally { setLoading(false) }
  }

  const handleSearch = async () => {
    if (!query) return
    setSearching(true); setError(null)
    try {
      const results = await searchJobs({ query, location }, userId)
      setJobs(prev => {
        const ids = new Set(prev.map(j => j.id))
        return [...prev, ...results.filter(j => !ids.has(j.id))]
      })
    } catch { setError('Search failed. Try again.') }
    finally { setSearching(false) }
  }

  const handleApply = async (jobId) => {
    try {
      await createApplication({ user_id: userId, job_id: jobId })
      setAddedJobs(prev => new Set([...prev, jobId]))
    } catch (e) {
      if (e.response?.status === 400) setAddedJobs(prev => new Set([...prev, jobId]))
    }
  }

  const handleDelete = async (jobId) => {
    await deleteJob(jobId); setJobs(prev => prev.filter(j => j.id !== jobId))
  }

  const handleManualAdd = async () => {
    const job = await import('../api/client').then(m => m.createJob({ ...manual, source: 'manual' }))
    setJobs(prev => [job, ...prev])
    setManual({ title: '', company: '', location: '', url: '', description: '' })
    setShowManual(false)
  }

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-title text-ink-primary">Find Jobs</h1>
        <p className="text-ink-secondary mt-1.5 text-sm">Search listings and add them to your application queue.</p>
      </div>

      {/* Search bar */}
      <div className="card p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
            <input
              className="input pl-10"
              placeholder="Job title, skills, keywords..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className="relative sm:w-52">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
            <input
              className="input pl-10"
              placeholder="City or Remote"
              value={location}
              onChange={e => setLocation(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button onClick={handleSearch} disabled={searching || !query} className="btn-primary whitespace-nowrap disabled:opacity-40">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
          <button onClick={() => setShowManual(v => !v)} className="btn-secondary whitespace-nowrap">
            {showManual ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showManual ? 'Cancel' : 'Add Manually'}
          </button>
        </div>
        {error && <p className="text-red-600 text-sm mt-3 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
      </div>

      {/* Manual add */}
      {showManual && (
        <div className="card p-6 mb-6 border-brand-100">
          <h3 className="font-semibold text-ink-primary mb-4">Add Job Manually</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <input className="input" placeholder="Job Title *" value={manual.title} onChange={e => setManual(m => ({ ...m, title: e.target.value }))} />
            <input className="input" placeholder="Company *" value={manual.company} onChange={e => setManual(m => ({ ...m, company: e.target.value }))} />
            <input className="input" placeholder="Location" value={manual.location} onChange={e => setManual(m => ({ ...m, location: e.target.value }))} />
            <input className="input" placeholder="Job URL" value={manual.url} onChange={e => setManual(m => ({ ...m, url: e.target.value }))} />
          </div>
          <textarea className="input min-h-[80px] resize-y mb-4" placeholder="Paste job description here..." value={manual.description} onChange={e => setManual(m => ({ ...m, description: e.target.value }))} />
          <div className="flex gap-2">
            <button onClick={handleManualAdd} disabled={!manual.title || !manual.company} className="btn-primary">Add Job</button>
            <button onClick={() => setShowManual(false)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {/* Job list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-ink-tertiary" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="card p-20 text-center">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-ink-tertiary opacity-30" />
          <p className="font-semibold text-ink-primary">No jobs yet</p>
          <p className="text-sm text-ink-secondary mt-1">Search above or add a job manually.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <div key={job.id} className="card p-5 hover:shadow-card-hover transition-all duration-200">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-ink-primary text-sm">{job.title}</h3>
                    {job.remote_type && (
                      <span className={`badge text-xs ${
                        job.remote_type === 'remote'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-blue-50 text-blue-600'
                      }`}>{job.remote_type}</span>
                    )}
                    {job.match_score >= 70 && (
                      <span className="badge bg-brand-50 text-brand-600 text-xs">{Math.round(job.match_score)}% match</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-ink-secondary">{job.company}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-ink-tertiary">
                    {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
                    {(job.salary_min || job.salary_max) && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {job.salary_min ? `$${(job.salary_min/1000).toFixed(0)}k` : ''}
                        {job.salary_min && job.salary_max ? '–' : ''}
                        {job.salary_max ? `$${(job.salary_max/1000).toFixed(0)}k` : ''}
                      </span>
                    )}
                    {job.job_type && <span>{job.job_type}</span>}
                  </div>
                  {job.description && (
                    <p className="text-ink-tertiary text-xs mt-2 line-clamp-2">{job.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {job.url && (
                    <a href={job.url} target="_blank" rel="noopener noreferrer"
                       className="btn-ghost text-xs py-1.5 px-3 border border-surface-border rounded-xl">
                      <ExternalLink className="w-3 h-3" /> View
                    </a>
                  )}
                  <button
                    onClick={() => handleApply(job.id)}
                    disabled={addedJobs.has(job.id)}
                    className={`text-xs py-2 px-4 rounded-xl font-semibold transition-all ${
                      addedJobs.has(job.id)
                        ? 'bg-emerald-50 text-emerald-700 cursor-default'
                        : 'btn-primary'
                    }`}
                  >
                    {addedJobs.has(job.id) ? '✓ Added' : 'Add to Queue'}
                  </button>
                  <button onClick={() => handleDelete(job.id)} className="p-2 text-ink-tertiary hover:text-red-500 rounded-xl transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
