import React, { useState, useEffect } from 'react'
import { Search, MapPin, DollarSign, Plus, Trash2, Loader2, Building2, ExternalLink, X } from 'lucide-react'
import { listJobs, searchJobs, createApplication, deleteJob } from '../api/client'
import { useAppUser } from '../App'

export default function JobsPage() {
  const { appUser } = useAppUser()
  const userId = appUser?.id
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [addedJobs, setAddedJobs] = useState(new Set())
  const [error, setError] = useState(null)
  const [showManual, setShowManual] = useState(false)
  const [manual, setManual] = useState({ title: '', company: '', location: '', url: '', description: '' })

  useEffect(() => { loadJobs() }, [])
  const loadJobs = async () => { setLoading(true); try { setJobs(await listJobs({ limit: 50 })) } finally { setLoading(false) } }
  const handleSearch = async () => { if (!query) return; setSearching(true); setError(null); try { const results = await searchJobs({ query, location }, userId); setJobs(prev => { const ids = new Set(prev.map(j => j.id)); return [...prev, ...results.filter(j => !ids.has(j.id))] }) } catch { setError('Search failed.') } finally { setSearching(false) } }
  const handleApply = async (jobId) => { try { await createApplication({ user_id: userId, job_id: jobId }); setAddedJobs(prev => new Set([...prev, jobId])) } catch (e) { if (e.response?.status === 400) setAddedJobs(prev => new Set([...prev, jobId])) } }
  const handleDelete = async (jobId) => { await deleteJob(jobId); setJobs(prev => prev.filter(j => j.id !== jobId)) }
  const handleManualAdd = async () => { const job = await import('../api/client').then(m => m.createJob({ ...manual, source: 'manual' })); setJobs(prev => [job, ...prev]); setManual({ title: '', company: '', location: '', url: '', description: '' }); setShowManual(false) }

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">Find Jobs</h1>
          <p className="text-ink-secondary mt-1 text-sm">{jobs.length} listings</p>
        </div>
        <button onClick={() => setShowManual(v => !v)} className="btn-secondary text-sm">
          {showManual ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {showManual ? 'Cancel' : 'Add Manual'}
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
          <input className="input pl-10" placeholder="Job title, skills..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
        </div>
        <div className="relative w-48">
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
          <input className="input pl-10" placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
        </div>
        <button onClick={handleSearch} disabled={searching || !query} className="btn-primary disabled:opacity-40">
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Search
        </button>
      </div>
      {error && <p className="text-red-400 text-sm mb-4 bg-red-500/10 rounded-xl px-3 py-2 border border-red-500/20">{error}</p>}

      {showManual && (
        <div className="card p-5 mb-6">
          <h3 className="font-semibold text-ink-primary mb-3 text-sm">Add Manually</h3>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input className="input" placeholder="Job Title *" value={manual.title} onChange={e => setManual(m => ({ ...m, title: e.target.value }))} />
            <input className="input" placeholder="Company *" value={manual.company} onChange={e => setManual(m => ({ ...m, company: e.target.value }))} />
            <input className="input" placeholder="Location" value={manual.location} onChange={e => setManual(m => ({ ...m, location: e.target.value }))} />
            <input className="input" placeholder="Job URL" value={manual.url} onChange={e => setManual(m => ({ ...m, url: e.target.value }))} />
          </div>
          <textarea className="input min-h-[60px] resize-y mb-3" placeholder="Description..." value={manual.description} onChange={e => setManual(m => ({ ...m, description: e.target.value }))} />
          <button onClick={handleManualAdd} disabled={!manual.title || !manual.company} className="btn-primary text-sm">Add</button>
        </div>
      )}

      {/* Job table */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-brand-400" /></div>
      ) : jobs.length === 0 ? (
        <div className="card p-16 text-center">
          <Building2 className="w-10 h-10 mx-auto mb-3 text-ink-tertiary opacity-20" />
          <p className="font-semibold text-ink-primary">No jobs yet</p>
          <p className="text-sm text-ink-secondary mt-1">Search or add manually.</p>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-surface-border">
          {jobs.map(job => (
            <div key={job.id} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-hover/50 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-ink-primary text-sm">{job.title}</h3>
                  {job.remote_type && <span className={`badge text-xs ${job.remote_type === 'remote' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-blue-900/30 text-blue-400'}`}>{job.remote_type}</span>}
                  {job.match_score >= 70 && <span className="badge bg-brand-900/30 text-brand-400 text-xs">{Math.round(job.match_score)}%</span>}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-ink-tertiary">
                  <span>{job.company}</span>
                  {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
                  {(job.salary_min || job.salary_max) && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{job.salary_min ? `$${(job.salary_min/1000).toFixed(0)}k` : ''}–{job.salary_max ? `$${(job.salary_max/1000).toFixed(0)}k` : ''}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {job.url && <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs py-1.5 px-2"><ExternalLink className="w-3 h-3" /></a>}
                <button onClick={() => handleApply(job.id)} disabled={addedJobs.has(job.id)}
                  className={`text-xs py-1.5 px-3 rounded-lg font-semibold transition-all ${addedJobs.has(job.id) ? 'bg-emerald-900/30 text-emerald-400 cursor-default' : 'btn-primary py-1.5'}`}>
                  {addedJobs.has(job.id) ? '✓' : 'Queue'}
                </button>
                <button onClick={() => handleDelete(job.id)} className="p-1.5 text-ink-tertiary hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
