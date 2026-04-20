import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, FileText, Crosshair, ArrowRight, Upload, X } from 'lucide-react'
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

  const firstName = user?.full_name?.split(' ')[0]

  return (
    <div className="p-8 max-w-4xl animate-fade-in">
      <h1 className="text-[22px] font-medium text-ink-primary tracking-heading mb-1">
        {firstName ? `Welcome back, ${firstName}` : 'Dashboard'}
      </h1>
      <p className="text-[13px] text-ink-tertiary mb-8">Your job search at a glance.</p>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-px rounded-card overflow-hidden mb-8" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {[
          { label: 'Total', value: applications.length },
          { label: 'In Progress', value: applications.filter(a => a.status === 'in_progress').length },
          { label: 'Applied', value: applications.filter(a => ['submitted','applied'].includes(a.status)).length },
          { label: 'Interviews', value: applications.filter(a => a.status === 'interviewing').length },
        ].map(({ label, value }) => (
          <div key={label} className="px-5 py-4" style={{ background: '#191919' }}>
            <p className="text-2xl font-medium text-ink-primary tabular-nums">{value}</p>
            <p className="text-[11px] text-ink-tertiary mt-0.5 uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left — actions + resume */}
        <div className="col-span-2 space-y-6">
          {/* Quick actions */}
          <div>
            <p className="text-[11px] text-ink-tertiary uppercase tracking-widest mb-3 px-0.5">Actions</p>
            <div className="space-y-1">
              {[
                { to: '/hunt', icon: Crosshair, label: 'Start AI Hunt', desc: 'Autonomous browsing and applying' },
                { to: '/jobs', icon: Briefcase, label: 'Discover Jobs', desc: 'Auto-populated from your profile' },
                { to: '/applications', icon: FileText, label: 'Applications', desc: 'Track and manage submissions' },
              ].map(({ to, icon: Icon, label, desc }) => (
                <button key={to} onClick={() => navigate(to)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors text-left group">
                  <Icon className="w-4 h-4 text-ink-tertiary group-hover:text-brand-400 transition-colors" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink-primary">{label}</p>
                    <p className="text-[12px] text-ink-tertiary">{desc}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-ink-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>

          {/* Recent applications */}
          {!loading && applications.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3 px-0.5">
                <p className="text-[11px] text-ink-tertiary uppercase tracking-widest">Recent</p>
                <button onClick={() => navigate('/applications')} className="text-[11px] text-brand-400 hover:text-brand-300">View all</button>
              </div>
              <div className="card overflow-hidden divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                {applications.slice(0, 6).map(app => (
                  <div key={app.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition-colors" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <div className="min-w-0">
                      <p className="text-[13px] text-ink-primary truncate">{app.job?.title || 'Unknown'}</p>
                      <p className="text-[11px] text-ink-tertiary">{app.job?.company}</p>
                    </div>
                    <span className="text-[11px] text-ink-tertiary capitalize">{app.status.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — resume */}
        <div>
          <div className="flex items-center justify-between mb-3 px-0.5">
            <p className="text-[11px] text-ink-tertiary uppercase tracking-widest">Resume</p>
            <button onClick={() => fileInputRef.current?.click()} className="text-[11px] text-brand-400 hover:text-brand-300">
              {uploading ? '...' : 'Upload'}
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden" onChange={e => { doUpload(e.target.files?.[0]); e.target.value = '' }} />
          </div>
          {resumes.length === 0 ? (
            <div onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); doUpload(e.dataTransfer.files?.[0]) }}
              onClick={() => fileInputRef.current?.click()}
              className={`card cursor-pointer p-8 text-center transition-all ${dragOver ? 'border-brand-500/30' : 'hover:bg-white/[0.02]'}`}>
              <Upload className="w-5 h-5 mx-auto mb-2 text-ink-tertiary" />
              <p className="text-[13px] text-ink-tertiary">Drop resume here</p>
              <p className="text-[11px] text-ink-tertiary mt-0.5">PDF, DOCX, TXT</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {resumes.map(r => (
                <div key={r.id} className="card flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${r.is_active ? 'text-brand-400' : 'text-ink-tertiary'}`} />
                    <span className="text-[12px] text-ink-primary truncate">{r.filename}</span>
                  </div>
                  <button onClick={async () => { try { await deleteResume(r.id); setResumes(p => p.filter(x => x.id !== r.id)) } catch {} }}>
                    <X className="w-3 h-3 text-ink-tertiary hover:text-red-400 transition-colors" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
