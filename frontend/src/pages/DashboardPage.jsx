import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, FileText, Crosshair, ArrowRight, Upload, X, Zap, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import { listApplications, getResumes, uploadResume, deleteResume } from '../api/client'
import { useAppUser } from '../App'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { appUser: user } = useAppUser()
  const [applications, setApplications] = useState([])
  const [resumes, setResumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef()

  const load = async () => { if (!user) return; try { const [a, r] = await Promise.all([listApplications(user.id), getResumes(user.id)]); setApplications(a); setResumes(r) } catch {} finally { setLoading(false) } }
  useEffect(() => { load() }, [user?.id])
  const doUpload = async (f) => { if (!f) return; setUploading(true); try { await uploadResume(user.id, f); await load() } catch {} finally { setUploading(false) } }

  const applied = applications.filter(a => ['submitted','applied'].includes(a.status)).length
  const interviews = applications.filter(a => a.status === 'interviewing').length
  const pending = applications.filter(a => a.status === 'pending').length

  return (
    <div className="max-w-5xl mx-auto p-8 animate-fade-in">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-[22px] font-medium text-ink-primary tracking-heading">
          {user?.full_name ? `${user.full_name.split(' ')[0]}'s workspace` : 'Dashboard'}
        </h1>
      </div>

      {/* ── Bento grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-6 gap-3">

        {/* ── Hunt CTA — large, 4 cols ─────────────────────────────── */}
        <button onClick={() => navigate('/hunt')}
          className="col-span-6 md:col-span-4 rounded-xl border p-6 text-left group transition-all duration-200 hover:border-brand-500/30"
          style={{ background: '#161616', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-4" style={{ background: 'rgba(94,106,210,0.12)' }}>
                <Crosshair className="w-4 h-4 text-brand-400" />
              </div>
              <h2 className="text-[17px] font-medium text-ink-primary tracking-tight mb-1">Start AI Hunt</h2>
              <p className="text-[13px] text-ink-secondary leading-relaxed max-w-sm">
                Launch an autonomous agent that searches job boards, evaluates every listing, and fills applications while you watch live.
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-ink-tertiary group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all mt-1" />
          </div>
        </button>

        {/* ── Stats — 2 cols, stacked ──────────────────────────────── */}
        <div className="col-span-6 md:col-span-2 grid grid-rows-3 gap-3">
          {[
            { icon: FileText, label: 'Applications', value: applications.length },
            { icon: CheckCircle, label: 'Applied', value: applied },
            { icon: TrendingUp, label: 'Interviews', value: interviews },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl border px-4 py-3 flex items-center justify-between" style={{ background: '#161616', borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2.5">
                <Icon className="w-3.5 h-3.5 text-ink-tertiary" />
                <span className="text-[12px] text-ink-secondary">{label}</span>
              </div>
              <span className="text-[15px] font-medium text-ink-primary tabular-nums">{value}</span>
            </div>
          ))}
        </div>

        {/* ── Quick nav — 2 cols ────────────────────────────────────── */}
        <div className="col-span-6 md:col-span-2 rounded-xl border p-5" style={{ background: '#161616', borderColor: 'rgba(255,255,255,0.06)' }}>
          <p className="text-[11px] text-ink-tertiary uppercase tracking-widest mb-3">Navigate</p>
          <div className="space-y-1">
            {[
              { to: '/jobs', icon: Briefcase, label: 'Find Jobs' },
              { to: '/applications', icon: FileText, label: 'Applications' },
            ].map(({ to, icon: Icon, label }) => (
              <button key={to} onClick={() => navigate(to)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-ink-secondary hover:text-ink-primary hover:bg-white/[0.04] transition-colors text-left">
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Resume — 2 cols ──────────────────────────────────────── */}
        <div className="col-span-6 md:col-span-2 rounded-xl border p-5" style={{ background: '#161616', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] text-ink-tertiary uppercase tracking-widest">Resume</p>
            <button onClick={() => fileInputRef.current?.click()} className="text-[11px] text-brand-400 hover:text-brand-300 font-medium">
              {uploading ? '...' : '+ Upload'}
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden" onChange={e => { doUpload(e.target.files?.[0]); e.target.value = '' }} />
          </div>
          {resumes.length === 0 ? (
            <button onClick={() => fileInputRef.current?.click()} className="w-full border border-dashed rounded-lg p-4 text-center hover:bg-white/[0.02] transition-colors" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <Upload className="w-4 h-4 mx-auto mb-1 text-ink-tertiary" />
              <p className="text-[11px] text-ink-tertiary">Drop or click</p>
            </button>
          ) : (
            <div className="space-y-1.5">
              {resumes.map(r => (
                <div key={r.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.03]">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className={`w-3 h-3 ${r.is_active ? 'text-brand-400' : 'text-ink-tertiary'}`} />
                    <span className="text-[11px] text-ink-primary truncate">{r.filename}</span>
                  </div>
                  <button onClick={async () => { try { await deleteResume(r.id); setResumes(p => p.filter(x => x.id !== r.id)) } catch {} }}>
                    <X className="w-3 h-3 text-ink-tertiary hover:text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Activity feed — 2 cols ───────────────────────────────── */}
        <div className="col-span-6 md:col-span-2 rounded-xl border p-5 max-h-[240px] overflow-y-auto" style={{ background: '#161616', borderColor: 'rgba(255,255,255,0.06)' }}>
          <p className="text-[11px] text-ink-tertiary uppercase tracking-widest mb-3">Recent Activity</p>
          {loading ? (
            <div className="flex justify-center py-4"><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#5E6AD2' }} /></div>
          ) : applications.length === 0 ? (
            <p className="text-[12px] text-ink-tertiary py-4 text-center">No activity yet</p>
          ) : (
            <div className="space-y-2">
              {applications.slice(0, 8).map(app => (
                <div key={app.id} className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-ink-tertiary mt-1.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[12px] text-ink-primary truncate">{app.job?.title}</p>
                    <p className="text-[11px] text-ink-tertiary">{app.job?.company} · {app.status.replace(/_/g, ' ')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
