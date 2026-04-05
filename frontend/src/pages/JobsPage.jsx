import React, { useState, useEffect } from 'react'
import { Search, MapPin, DollarSign, Plus, Trash2, Loader2, Building2 } from 'lucide-react'
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

  useEffect(() => {
    loadJobs()
  }, [])

  const loadJobs = async () => {
    setLoading(true)
    try {
      const data = await listJobs({ limit: 50 })
      setJobs(data)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    setSearching(true)
    setError(null)
    try {
      const results = await searchJobs({ query, location }, userId)
      setJobs(prev => {
        const existingIds = new Set(prev.map(j => j.id))
        return [...prev, ...results.filter(j => !existingIds.has(j.id))]
      })
    } catch (e) {
      setError('Search failed. Check your API key or try again.')
    } finally {
      setSearching(false)
    }
  }

  const handleApply = async (jobId) => {
    try {
      await createApplication({ user_id: userId, job_id: jobId })
      setAddedJobs(prev => new Set([...prev, jobId]))
    } catch (e) {
      if (e.response?.status === 400) {
        setAddedJobs(prev => new Set([...prev, jobId]))
      }
    }
  }

  const handleDelete = async (jobId) => {
    await deleteJob(jobId)
    setJobs(prev => prev.filter(j => j.id !== jobId))
  }

  const handleManualAdd = async () => {
    const job = await import('../api/client').then(m => m.createJob({ ...manual, source: 'manual' }))
    setJobs(prev => [job, ...prev])
    setManual({ title: '', company: '', location: '', url: '', description: '' })
    setShowManual(false)
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Find Jobs</h1>
        <p className="text-gray-500 mt-1">Search for positions and add them to your application queue.</p>
      </div>

      {/* Search */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Job title, skills, or keywords"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="City, state, or Remote"
              value={location}
              onChange={e => setLocation(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button onClick={handleSearch} disabled={searching} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search Jobs
          </button>
          <button onClick={() => setShowManual(v => !v)} className="btn-secondary flex items-center gap-2 whitespace-nowrap">
            <Plus className="w-4 h-4" /> Add Manually
          </button>
        </div>
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
      </div>

      {/* Manual add form */}
      {showManual && (
        <div className="card mb-6 border-primary-200 bg-primary-50">
          <h3 className="font-semibold text-gray-900 mb-4">Add Job Manually</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input className="input" placeholder="Job Title *" value={manual.title} onChange={e => setManual(m => ({ ...m, title: e.target.value }))} />
            <input className="input" placeholder="Company *" value={manual.company} onChange={e => setManual(m => ({ ...m, company: e.target.value }))} />
            <input className="input" placeholder="Location" value={manual.location} onChange={e => setManual(m => ({ ...m, location: e.target.value }))} />
            <input className="input" placeholder="Job URL" value={manual.url} onChange={e => setManual(m => ({ ...m, url: e.target.value }))} />
          </div>
          <textarea className="input min-h-[80px] resize-y mb-3" placeholder="Job description (paste here)" value={manual.description} onChange={e => setManual(m => ({ ...m, description: e.target.value }))} />
          <div className="flex gap-2">
            <button onClick={handleManualAdd} disabled={!manual.title || !manual.company} className="btn-primary">Add Job</button>
            <button onClick={() => setShowManual(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Job list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-gray-600">No jobs found yet</p>
          <p className="text-sm mt-1">Search above or add a job manually to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <div key={job.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-gray-900">{job.title}</h3>
                    {job.remote_type && (
                      <span className={`badge ${job.remote_type === 'remote' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {job.remote_type}
                      </span>
                    )}
                    {job.source === 'demo' && (
                      <span className="badge bg-gray-100 text-gray-500">demo</span>
                    )}
                  </div>
                  <p className="text-gray-700 text-sm font-medium">{job.company}</p>
                  <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-gray-500">
                    {job.location && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                    )}
                    {(job.salary_min || job.salary_max) && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {job.salary_min ? `$${(job.salary_min/1000).toFixed(0)}k` : ''}
                        {job.salary_min && job.salary_max ? ' – ' : ''}
                        {job.salary_max ? `$${(job.salary_max/1000).toFixed(0)}k` : ''}
                      </span>
                    )}
                    {job.job_type && <span>{job.job_type}</span>}
                  </div>
                  {job.description && (
                    <p className="text-gray-500 text-xs mt-2 line-clamp-2">{job.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {job.url && (
                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs py-1.5 px-3">
                      View
                    </a>
                  )}
                  <button
                    onClick={() => handleApply(job.id)}
                    disabled={addedJobs.has(job.id)}
                    className={`text-xs py-1.5 px-3 rounded-lg font-medium transition-colors ${
                      addedJobs.has(job.id)
                        ? 'bg-green-100 text-green-700 cursor-default'
                        : 'btn-primary'
                    }`}
                  >
                    {addedJobs.has(job.id) ? '✓ Added' : 'Apply'}
                  </button>
                  <button onClick={() => handleDelete(job.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors">
                    <Trash2 className="w-4 h-4" />
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
