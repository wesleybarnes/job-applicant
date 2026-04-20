import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, FileText, Crosshair, ArrowRight, Upload, X, Zap } from 'lucide-react'
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

  const load = async () => { if (!user) return; try { const [a, r] = await Promise.all([listApplications(user.id), getResumes(user.id)]); setApplications(a); setResumes(r) } catch {} finally { setLoading(false) } }
  useEffect(() => { load() }, [user?.id])
  const doUpload = async (f) => { if (!f) return; setUploading(true); try { await uploadResume(user.id, f); await load() } catch {} finally { setUploading(false) } }

  const stats = [
    { label: 'Applications', value: applications.length },
    { label: 'Applied', value: applications.filter(a => ['submitted','applied'].includes(a.status)).length },
    { label: 'Interviews', value: applications.filter(a => a.status === 'interviewing').length },
  ]

  return (
    <div className="p-6 max-w-3xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-ink-primary">
          {user?.full_name ? `Hey, ${user.full_name.split(' ')[0]}` : 'Dashboard'}
        </h1>
        <p className="text-sm text-ink-tertiary mt-1">Here's your job search overview.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {stats.map(({ label, value }) => (
          <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-4">
            <p className="text-3xl font-bold text-ink-primary tabular-nums">{value}</p>
            <p className="text-xs text-ink-tertiary mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="space-y-2 mb-8">
        {[
          { to: '/hunt', icon: Crosshair, label: 'Start AI Hunt', desc: 'Browse and apply autonomously', accent: 'text-brand-400' },
          { to: '/jobs', icon: Briefcase, label: 'Discover Jobs', desc: 'Based on your profile', accent: 'text-blue-400' },
          { to: '/applications', icon: FileText, label: 'Applications', desc: 'Track and manage', accent: 'text-emerald-400' },
        ].map(({ to, icon: Icon, label, desc, accent }) => (
          <button key={to} onClick={() => navigate(to)}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all text-left group">
            <Icon className={`w-4 h-4 ${accent}`} />
            <div className="flex-1">
              <p className="text-sm font-medium text-ink-primary">{label}</p>
              <p className="text-xs text-ink-tertiary">{desc}</p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-ink-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>

      {/* Resume + Recent in a row */}
      <div className="grid grid-cols-5 gap-4">
        {/* Resume */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-ink-tertiary">Resume</span>
            <button onClick={() => fileInputRef.current?.click()} className="text-xs text-brand-400 hover:text-brand-300">{uploading ? '...' : 'Upload'}</button>
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden" onChange={e => { doUpload(e.target.files?.[0]); e.target.value = '' }} />
          </div>
          {resumes.length === 0 ? (
            <div onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); doUpload(e.dataTransfer.files?.[0]) }}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${dragOver ? 'border-brand-500/50 bg-brand-500/5' : 'border-white/10 hover:border-white/20'}`}>
              <Upload className="w-4 h-4 mx-auto mb-1 text-ink-tertiary" />
              <p className="text-xs text-ink-tertiary">Drop or click</p>
            </div>
          ) : resumes.map(r => (
            <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className={`w-3.5 h-3.5 ${r.is_active ? 'text-brand-400' : 'text-ink-tertiary'}`} />
                <span className="text-xs text-ink-primary truncate">{r.filename}</span>
              </div>
              <button onClick={async () => { try { await deleteResume(r.id); setResumes(p => p.filter(x => x.id !== r.id)) } catch {} }}><X className="w-3 h-3 text-ink-tertiary hover:text-red-400" /></button>
            </div>
          ))}
        </div>

        {/* Recent */}
        <div className="col-span-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-ink-tertiary">Recent</span>
            {applications.length > 0 && <button onClick={() => navigate('/applications')} className="text-xs text-brand-400 hover:text-brand-300">All</button>}
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><div className="w-4 h-4 border-2 border-white/20 border-t-brand-400 rounded-full animate-spin" /></div>
          ) : applications.length === 0 ? (
            <p className="text-xs text-ink-tertiary text-center py-6">No applications yet</p>
          ) : (
            <div className="space-y-1">
              {applications.slice(0, 5).map(app => (
                <div key={app.id} className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-ink-primary truncate">{app.job?.title}</p>
                    <p className="text-[11px] text-ink-tertiary">{app.job?.company}</p>
                  </div>
                  <span className="text-[11px] text-ink-tertiary">{app.status.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
