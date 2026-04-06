import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, FileText, Crosshair, CheckCircle, ArrowRight, Upload, X, TrendingUp, Zap, Sparkles } from 'lucide-react'
import { listApplications, getResumes, uploadResume, deleteResume } from '../api/client'
import { useAppUser } from '../App'

const STATUS_COLORS = {
  pending:       'bg-zinc-800 text-zinc-400',
  in_progress:   'bg-brand-900/30 text-brand-400',
  submitted:     'bg-emerald-900/30 text-emerald-400',
  applied:       'bg-emerald-900/30 text-emerald-400',
  interviewing:  'bg-blue-900/30 text-blue-400',
  rejected:      'bg-red-900/30 text-red-400',
  offer:         'bg-emerald-900/30 text-emerald-400',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { appUser: user } = useAppUser()
  const [applications, setApplications] = useState([])
  const [resumes, setResumes]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [uploading, setUploading]       = useState(false)
  const [uploadError, setUploadError]   = useState(null)
  const [dragOver, setDragOver]         = useState(false)
  const fileInputRef = useRef()

  const load = async () => {
    if (!user) return
    try { const [apps, r] = await Promise.all([listApplications(user.id), getResumes(user.id)]); setApplications(apps); setResumes(r) } catch {} finally { setLoading(false) }
  }
  useEffect(() => { load() }, [user?.id])

  const doUpload = async (file) => { if (!file) return; setUploading(true); setUploadError(null); try { await uploadResume(user.id, file); await load() } catch (err) { setUploadError(err.response?.data?.detail || 'Upload failed.') } finally { setUploading(false) } }
  const handleFileChange = (e) => { doUpload(e.target.files?.[0]); e.target.value = '' }
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); doUpload(e.dataTransfer.files?.[0]) }
  const handleDelete = async (id) => { try { await deleteResume(id); setResumes(prev => prev.filter(r => r.id !== id)) } catch {} }

  const stats = [
    { label: 'Total', value: applications.length, icon: FileText },
    { label: 'In Progress', value: applications.filter(a => a.status === 'in_progress').length, icon: TrendingUp },
    { label: 'Submitted', value: applications.filter(a => ['submitted','applied','interviewing'].includes(a.status)).length, icon: CheckCircle },
    { label: 'Interviews', value: applications.filter(a => a.status === 'interviewing').length, icon: Briefcase },
  ]
  const firstName = user?.full_name?.split(' ')[0]

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl mb-8 p-8" style={{ background: 'linear-gradient(135deg, #0C1A2E 0%, #111827 50%, #0A1628 100%)' }}>
        <div className="absolute inset-0 bg-hero-mesh opacity-50" />
        <div className="absolute top-0 right-0 w-60 h-60 bg-brand-500/10 rounded-full blur-[80px]" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink-primary mb-1">Welcome back{firstName ? `, ${firstName}` : ''}</h1>
            <p className="text-ink-secondary text-sm">Your job search at a glance.</p>
          </div>
          <button onClick={() => navigate('/hunt')} className="btn-primary px-6 py-3 hidden sm:flex">
            <Crosshair className="w-4 h-4" /> Start Hunt
          </button>
        </div>

        {/* Stats inline */}
        <div className="relative grid grid-cols-4 gap-4 mt-6">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/5">
              <Icon className="w-4 h-4 text-brand-400" />
              <div>
                <p className="text-xl font-bold text-ink-primary tabular-nums">{value}</p>
                <p className="text-[11px] text-ink-tertiary uppercase tracking-wider">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Quick actions + Resume — 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick actions */}
          <div>
            <h2 className="text-xs font-bold text-ink-tertiary uppercase tracking-wider mb-3 px-1">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { to: '/hunt', icon: Crosshair, label: 'AI Hunt', sub: 'Autonomous apply', color: 'text-brand-400', bg: 'bg-brand-500/10' },
                { to: '/jobs', icon: Briefcase, label: 'Find Jobs', sub: 'Search & queue', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { to: '/applications', icon: Zap, label: 'Applications', sub: 'Track progress', color: 'text-amber-400', bg: 'bg-amber-500/10' },
              ].map(({ to, icon: Icon, label, sub, color, bg }) => (
                <button key={to} onClick={() => navigate(to)}
                  className="w-full card flex items-center gap-3 px-4 py-3 hover:border-brand-500/30 transition-all duration-200 text-left group">
                  <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink-primary">{label}</p>
                    <p className="text-xs text-ink-tertiary">{sub}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-ink-tertiary group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </div>

          {/* Resume */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-xs font-bold text-ink-tertiary uppercase tracking-wider">Resume</h2>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="text-xs text-brand-400 hover:text-brand-300 font-semibold">
                {uploading ? 'Uploading...' : '+ Upload'}
              </button>
              <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden" onChange={handleFileChange} />
            </div>
            {uploadError && <p className="text-xs text-red-400 mb-2 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">{uploadError}</p>}
            {resumes.length === 0 ? (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`card border-dashed cursor-pointer p-6 text-center transition-all ${dragOver ? 'border-brand-500/50 bg-brand-500/5' : 'hover:border-brand-500/30'}`}
              >
                <Upload className="w-6 h-6 mx-auto mb-2 text-ink-tertiary" />
                <p className="text-sm text-ink-secondary">Drop resume here</p>
                <p className="text-xs text-ink-tertiary mt-1">PDF, DOCX, TXT</p>
              </div>
            ) : (
              <div className="space-y-2">
                {resumes.map(r => (
                  <div key={r.id} className={`card flex items-center justify-between px-4 py-3 ${r.is_active ? 'border-brand-500/30' : ''}`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className={`w-4 h-4 flex-shrink-0 ${r.is_active ? 'text-brand-400' : 'text-ink-tertiary'}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink-primary truncate">{r.filename}</p>
                        <p className="text-xs text-ink-tertiary">{new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(r.id)} className="p-1 text-ink-tertiary hover:text-red-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent applications — 3 cols */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold text-ink-tertiary uppercase tracking-wider">Recent Applications</h2>
            <button onClick={() => navigate('/applications')} className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1">
              All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : applications.length === 0 ? (
            <div className="card p-12 text-center">
              <Sparkles className="w-8 h-8 mx-auto mb-3 text-ink-tertiary opacity-30" />
              <p className="text-sm text-ink-secondary font-medium">No applications yet</p>
              <p className="text-xs text-ink-tertiary mt-1">Start a hunt to see applications here.</p>
            </div>
          ) : (
            <div className="card overflow-hidden divide-y divide-surface-border">
              {applications.slice(0, 8).map(app => (
                <div key={app.id} className="flex items-center justify-between px-4 py-3 hover:bg-surface-hover/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-primary truncate">{app.job?.title || 'Unknown Job'}</p>
                    <p className="text-xs text-ink-tertiary truncate">{app.job?.company}</p>
                  </div>
                  <span className={`badge ml-3 flex-shrink-0 text-xs ${STATUS_COLORS[app.status] || 'bg-zinc-800 text-zinc-400'}`}>
                    {app.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
