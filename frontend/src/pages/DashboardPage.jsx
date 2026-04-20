import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, FileText, Crosshair, CheckCircle, ArrowRight, Upload, X, TrendingUp, Zap } from 'lucide-react'
import { listApplications, getResumes, uploadResume, deleteResume } from '../api/client'
import { useAppUser } from '../App'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { appUser: user } = useAppUser()
  const [applications, setApplications] = useState([])
  const [resumes, setResumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef()

  const load = async () => { if (!user) return; try { const [apps, r] = await Promise.all([listApplications(user.id), getResumes(user.id)]); setApplications(apps); setResumes(r) } catch {} finally { setLoading(false) } }
  useEffect(() => { load() }, [user?.id])
  const doUpload = async (file) => { if (!file) return; setUploading(true); try { await uploadResume(user.id, file); await load() } catch {} finally { setUploading(false) } }

  const stats = [
    { label: 'Total', value: applications.length },
    { label: 'In Progress', value: applications.filter(a => a.status === 'in_progress').length },
    { label: 'Applied', value: applications.filter(a => ['submitted','applied','interviewing'].includes(a.status)).length },
    { label: 'Interviews', value: applications.filter(a => a.status === 'interviewing').length },
  ]

  return (
    <div className="p-6 max-w-4xl animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-lg font-semibold text-ink-primary">{user?.full_name ? `Welcome, ${user.full_name.split(' ')[0]}` : 'Dashboard'}</h1>
        <p className="text-sm text-ink-tertiary mt-0.5">Your job search overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {stats.map(({ label, value }) => (
          <div key={label} className="card px-4 py-3">
            <p className="text-2xl font-semibold text-ink-primary tabular-nums">{value}</p>
            <p className="text-xs text-ink-tertiary mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Actions */}
        <div className="col-span-2 space-y-2">
          {[
            { to: '/hunt', icon: Crosshair, label: 'Start AI Hunt', sub: 'Browse and apply autonomously' },
            { to: '/jobs', icon: Briefcase, label: 'Find Jobs', sub: 'Discover based on your profile' },
            { to: '/applications', icon: FileText, label: 'Applications', sub: 'Track and manage' },
          ].map(({ to, icon: Icon, label, sub }) => (
            <button key={to} onClick={() => navigate(to)}
              className="w-full card flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors text-left group">
              <Icon className="w-4 h-4 text-ink-tertiary group-hover:text-brand-400 transition-colors" />
              <div className="flex-1">
                <p className="text-sm font-medium text-ink-primary">{label}</p>
                <p className="text-xs text-ink-tertiary">{sub}</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-ink-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}

          {/* Recent apps */}
          {!loading && applications.length > 0 && (
            <div className="card mt-4 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-surface-border flex items-center justify-between">
                <span className="text-xs font-medium text-ink-tertiary uppercase tracking-wider">Recent</span>
                <button onClick={() => navigate('/applications')} className="text-xs text-brand-400 hover:text-brand-300">View all</button>
              </div>
              {applications.slice(0, 5).map(app => (
                <div key={app.id} className="px-4 py-2.5 border-b border-surface-border last:border-0 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm text-ink-primary truncate">{app.job?.title}</p>
                    <p className="text-xs text-ink-tertiary">{app.job?.company}</p>
                  </div>
                  <span className="text-xs text-ink-tertiary">{app.status.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resume */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-ink-tertiary uppercase tracking-wider">Resume</span>
            <button onClick={() => fileInputRef.current?.click()} className="text-xs text-brand-400 hover:text-brand-300">
              {uploading ? '...' : 'Upload'}
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden" onChange={e => { doUpload(e.target.files?.[0]); e.target.value = '' }} />
          </div>
          {resumes.length === 0 ? (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); doUpload(e.dataTransfer.files?.[0]) }}
              onClick={() => fileInputRef.current?.click()}
              className={`card border-dashed cursor-pointer p-6 text-center ${dragOver ? 'border-brand-500' : ''}`}
            >
              <Upload className="w-5 h-5 mx-auto mb-1.5 text-ink-tertiary" />
              <p className="text-xs text-ink-tertiary">Drop or click</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {resumes.map(r => (
                <div key={r.id} className="card flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className={`w-3.5 h-3.5 ${r.is_active ? 'text-brand-400' : 'text-ink-tertiary'}`} />
                    <span className="text-xs text-ink-primary truncate">{r.filename}</span>
                  </div>
                  <button onClick={async () => { try { await deleteResume(r.id); setResumes(prev => prev.filter(x => x.id !== r.id)) } catch {} }} className="text-ink-tertiary hover:text-red-400"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
