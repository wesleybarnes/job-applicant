import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, FileText, Crosshair, CheckCircle, ArrowRight, Upload, X, TrendingUp, Zap } from 'lucide-react'
import { listApplications, listJobs, getResumes, uploadResume, deleteResume } from '../api/client'
import { useAppUser } from '../App'

const STATUS_COLORS = {
  pending:       'bg-zinc-100 text-zinc-600',
  in_progress:   'bg-brand-50 text-brand-600',
  submitted:     'bg-emerald-50 text-emerald-700',
  applied:       'bg-emerald-50 text-emerald-700',
  interviewing:  'bg-violet-50 text-violet-700',
  rejected:      'bg-red-50 text-red-600',
  offer:         'bg-emerald-50 text-emerald-700',
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
    try {
      const [apps, r] = await Promise.all([listApplications(user.id), getResumes(user.id)])
      setApplications(apps)
      setResumes(r)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [user?.id])

  const doUpload = async (file) => {
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      await uploadResume(user.id, file)
      await load()
    } catch (err) {
      setUploadError(err.response?.data?.detail || 'Upload failed. Try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (e) => { doUpload(e.target.files?.[0]); e.target.value = '' }
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); doUpload(e.dataTransfer.files?.[0]) }

  const handleDelete = async (id) => {
    try { await deleteResume(id); setResumes(prev => prev.filter(r => r.id !== id)) } catch {}
  }

  const stats = [
    { label: 'Active Applications', value: applications.length,          icon: FileText,    gradient: 'from-blue-500 to-indigo-500' },
    { label: 'In Progress',         value: applications.filter(a => a.status === 'in_progress').length, icon: TrendingUp, gradient: 'from-amber-500 to-orange-500' },
    { label: 'Submitted',           value: applications.filter(a => ['submitted','applied','interviewing'].includes(a.status)).length, icon: CheckCircle, gradient: 'from-emerald-500 to-teal-500' },
    { label: 'Interviews',          value: applications.filter(a => a.status === 'interviewing').length, icon: Briefcase, gradient: 'from-violet-500 to-purple-500' },
  ]

  const firstName = user?.full_name?.split(' ')[0]

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-ink-primary tracking-tight">
          Good to see you{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="text-ink-secondary mt-2 text-base">Here's where your job search stands.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
        {stats.map(({ label, value, icon: Icon, gradient }) => (
          <div key={label} className="card p-6 group hover:shadow-card-hover transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-3xl font-extrabold text-ink-primary tabular-nums">{value}</span>
            </div>
            <p className="text-xs text-ink-tertiary font-medium uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resume Card */}
        <div className="lg:col-span-1 card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-ink-primary flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-500" /> Resume
            </h2>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn-primary py-1.5 text-xs px-3">
              <Upload className="w-3 h-3" /> {uploading ? 'Uploading...' : 'Upload'}
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden" onChange={handleFileChange} />
          </div>

          {uploadError && <p className="text-xs text-red-600 mb-3 bg-red-50 rounded-xl px-3 py-2">{uploadError}</p>}

          {resumes.length === 0 ? (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                dragOver ? 'border-brand-400 bg-brand-50' : 'border-surface-border hover:border-brand-300 hover:bg-brand-50/30'
              }`}
            >
              <Upload className="w-7 h-7 mx-auto mb-2 text-ink-tertiary" />
              <p className="text-sm font-medium text-ink-secondary">Drop your resume here</p>
              <p className="text-xs text-ink-tertiary mt-1">PDF, DOCX, TXT · Max 10MB</p>
            </div>
          ) : (
            <div className="space-y-2">
              {resumes.map(r => (
                <div key={r.id} className={`flex items-center justify-between p-3 rounded-xl transition-all ${r.is_active ? 'bg-brand-50 border border-brand-100' : 'bg-surface-hover'}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${r.is_active ? 'bg-gradient-to-br from-brand-500 to-brand-700' : 'bg-surface-border'}`}>
                      <FileText className={`w-3.5 h-3.5 ${r.is_active ? 'text-white' : 'text-ink-tertiary'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-ink-primary truncate">{r.filename}</p>
                      <p className="text-xs text-ink-tertiary">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(r.id)} className="p-1.5 text-ink-tertiary hover:text-red-500 rounded-lg transition-colors flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick actions */}
          <div className="card p-6">
            <h2 className="font-bold text-ink-primary mb-5">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { to: '/hunt', icon: Crosshair, label: 'AI Hunt Jobs', sub: 'Autonomous browser applies while you watch', gradient: 'from-violet-500 to-purple-600' },
                { to: '/jobs', icon: Briefcase, label: 'Browse Jobs',   sub: 'Search listings and add to your queue',       gradient: 'from-blue-500 to-cyan-500' },
                { to: '/applications', icon: Zap, label: 'Applications', sub: 'Track status, review cover letters',           gradient: 'from-amber-500 to-orange-500' },
              ].map(({ to, icon: Icon, label, sub, gradient }) => (
                <button
                  key={to}
                  onClick={() => navigate(to)}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-surface-hover transition-all duration-200 text-left group"
                >
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink-primary">{label}</p>
                    <p className="text-xs text-ink-tertiary">{sub}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-ink-tertiary group-hover:text-brand-500 group-hover:translate-x-1 transition-all duration-200" />
                </button>
              ))}
            </div>
          </div>

          {/* Recent applications */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-ink-primary">Recent Applications</h2>
              <button onClick={() => navigate('/applications')} className="text-xs text-brand-500 hover:text-brand-600 font-semibold flex items-center gap-1 transition-colors">
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-12 text-ink-tertiary">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">No applications yet</p>
                <p className="text-xs mt-1">Start hunting to see your applications here.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {applications.slice(0, 6).map(app => (
                  <div key={app.id} className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-surface-hover transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink-primary truncate">{app.job?.title || 'Unknown Job'}</p>
                      <p className="text-xs text-ink-tertiary truncate">{app.job?.company}</p>
                    </div>
                    <span className={`badge ml-3 flex-shrink-0 text-xs ${STATUS_COLORS[app.status] || 'bg-surface-hover text-ink-tertiary'}`}>
                      {app.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
