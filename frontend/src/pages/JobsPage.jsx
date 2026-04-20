import React, { useState, useEffect } from 'react'
import { MapPin, DollarSign, Loader2, Building2, ExternalLink, RefreshCw, Bookmark, BookmarkCheck, Plus, X, Search } from 'lucide-react'
import { discoverJobs, searchJobs, listJobs, createApplication, deleteJob, createJob } from '../api/client'
import { useAppUser } from '../App'

export default function JobsPage() {
  const { appUser } = useAppUser()
  const userId = appUser?.id
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [savedIds, setSavedIds] = useState(new Set())
  const [selectedJob, setSelectedJob] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)

  useEffect(() => { discover() }, [userId])
  useEffect(() => { if (jobs.length > 0 && !selectedJob) setSelectedJob(jobs[0]) }, [jobs])

  const discover = async () => { setLoading(true); try { const d = await discoverJobs(); setJobs(d) } catch { try { setJobs(await listJobs({ limit: 50 })) } catch {} } finally { setLoading(false) } }
  const handleRefresh = async () => { setRefreshing(true); try { const d = await discoverJobs(); setJobs(prev => { const ids = new Set(prev.map(j => j.id)); return [...d.filter(j => !ids.has(j.id)), ...prev] }) } catch {} finally { setRefreshing(false) } }
  const handleSearch = async () => { if (!searchQuery) return; setSearching(true); try { const r = await searchJobs({ query: searchQuery }, userId); setJobs(prev => { const ids = new Set(prev.map(j => j.id)); return [...r.filter(j => !ids.has(j.id)), ...prev] }); setSearchQuery('') } catch {} finally { setSearching(false) } }
  const handleSave = async (jobId) => { if (savedIds.has(jobId)) return; try { await createApplication({ user_id: userId, job_id: jobId }); setSavedIds(prev => new Set([...prev, jobId])) } catch (e) { if (e.response?.status === 400) setSavedIds(prev => new Set([...prev, jobId])) } }

  return (
    <div className="h-[calc(100vh-48px)] flex animate-fade-in">
      {/* ── Left panel: job list ────────────────────────────────────── */}
      <div className="w-[360px] flex-shrink-0 border-r flex flex-col" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {/* Search + controls */}
        <div className="p-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-tertiary" />
            <input className="input py-1.5 pl-8 text-[12px]" placeholder="Search jobs..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          </div>
          <button onClick={handleRefresh} disabled={refreshing} className="p-1.5 rounded-md hover:bg-white/[0.05] text-ink-tertiary hover:text-ink-secondary transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Job list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-4 h-4 animate-spin text-ink-tertiary" /></div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="w-6 h-6 mx-auto mb-2 text-ink-tertiary opacity-30" />
              <p className="text-[12px] text-ink-tertiary">No jobs found</p>
            </div>
          ) : (
            <div>
              {jobs.map(job => (
                <button key={job.id} onClick={() => setSelectedJob(job)}
                  className={`w-full text-left px-4 py-3 border-b transition-colors ${selectedJob?.id === job.id ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}
                  style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className={`text-[13px] font-medium truncate ${selectedJob?.id === job.id ? 'text-ink-primary' : 'text-ink-secondary'}`}>{job.title}</p>
                      <p className="text-[11px] text-ink-tertiary truncate mt-0.5">{job.company}{job.location ? ` · ${job.location}` : ''}</p>
                    </div>
                    {job.match_score >= 70 && <span className="text-[10px] text-brand-400 font-medium flex-shrink-0">{Math.round(job.match_score)}%</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t text-center" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <p className="text-[11px] text-ink-tertiary">{jobs.length} jobs · Based on your profile</p>
        </div>
      </div>

      {/* ── Right panel: job detail ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {selectedJob ? (
          <div className="max-w-2xl p-8 animate-fade-in" key={selectedJob.id}>
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-[20px] font-medium text-ink-primary tracking-tight mb-1">{selectedJob.title}</h1>
                <p className="text-[14px] text-ink-secondary">{selectedJob.company}</p>
                <div className="flex items-center gap-3 mt-2 text-[12px] text-ink-tertiary">
                  {selectedJob.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{selectedJob.location}</span>}
                  {selectedJob.remote_type && <span className="px-1.5 py-0.5 rounded text-[11px] bg-white/[0.05]">{selectedJob.remote_type}</span>}
                  {(selectedJob.salary_min || selectedJob.salary_max) && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {selectedJob.salary_min ? `${Math.round(selectedJob.salary_min/1000)}k` : ''}
                      {selectedJob.salary_min && selectedJob.salary_max ? '–' : ''}
                      {selectedJob.salary_max ? `${Math.round(selectedJob.salary_max/1000)}k` : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {selectedJob.url && (
                  <a href={selectedJob.url} target="_blank" rel="noopener noreferrer" className="btn-secondary text-[12px] py-1.5 px-3">
                    <ExternalLink className="w-3 h-3" /> View
                  </a>
                )}
                <button onClick={() => handleSave(selectedJob.id)} disabled={savedIds.has(selectedJob.id)}
                  className={`p-2 rounded-lg transition-colors ${savedIds.has(selectedJob.id) ? 'text-brand-400 bg-brand-500/10' : 'text-ink-tertiary hover:text-brand-400 hover:bg-brand-500/10'}`}>
                  {savedIds.has(selectedJob.id) ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Match score */}
            {selectedJob.match_score > 0 && (
              <div className="mb-6 px-4 py-3 rounded-lg" style={{ background: 'rgba(94,106,210,0.06)', border: '1px solid rgba(94,106,210,0.12)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-brand-400 font-medium">Match Score</span>
                  <span className="text-[14px] font-medium text-brand-400">{Math.round(selectedJob.match_score)}%</span>
                </div>
              </div>
            )}

            {/* Description */}
            {selectedJob.description && (
              <div>
                <p className="text-[11px] text-ink-tertiary uppercase tracking-widest mb-2">Description</p>
                <p className="text-[13px] text-ink-secondary leading-relaxed whitespace-pre-wrap">{selectedJob.description}</p>
              </div>
            )}

            {/* Requirements */}
            {selectedJob.requirements && (
              <div className="mt-6">
                <p className="text-[11px] text-ink-tertiary uppercase tracking-widest mb-2">Requirements</p>
                <p className="text-[13px] text-ink-secondary leading-relaxed whitespace-pre-wrap">{selectedJob.requirements}</p>
              </div>
            )}

            {/* Source */}
            <div className="mt-6 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="text-[11px] text-ink-tertiary">Source: {selectedJob.source || 'unknown'} · Added {selectedJob.created_at ? new Date(selectedJob.created_at).toLocaleDateString() : ''}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-ink-tertiary text-[13px]">
            Select a job to view details
          </div>
        )}
      </div>
    </div>
  )
}
