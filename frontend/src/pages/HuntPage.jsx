import React, { useState, useEffect } from 'react'
import { Crosshair, Zap, MapPin, Briefcase, Brain, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle, Lock, Eye, EyeOff, Sparkles } from 'lucide-react'
import { useAppUser } from '../App'
import HuntView from '../components/HuntView'
import { startHunt, listHuntSessions, getResumes } from '../api/client'

function formatDate(iso) { if (!iso) return '—'; return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }

export default function HuntPage() {
  const { appUser, refreshUser } = useAppUser()
  const [activeHuntId, setActiveHuntId] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [hasResume, setHasResume] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [creds, setCreds] = useState({ linkedin_email: '', linkedin_password: '' })

  const targetRoles = appUser?.target_roles || []
  const targetLocations = appUser?.target_locations || []
  const credits = appUser?.credits ?? 0
  const isAdmin = appUser?.is_admin
  const canHunt = hasResume && (isAdmin || credits >= 5)

  useEffect(() => { if (appUser?.id) getResumes(appUser.id).then(r => setHasResume(r.some(x => x.is_active))).catch(() => {}) }, [appUser?.id])
  useEffect(() => { listHuntSessions().then(setSessions).catch(() => {}).finally(() => setSessionsLoading(false)) }, [activeHuntId])

  const handleStart = async () => {
    setError(null); setLoading(true)
    try { const data = await startHunt({ linkedin_email: creds.linkedin_email || null, linkedin_password: creds.linkedin_password || null }); await refreshUser(); setActiveHuntId(data.hunt_id) }
    catch (e) { setError(e?.response?.data?.detail || 'Failed to start hunt.') }
    finally { setLoading(false) }
  }
  const handleClose = () => { setActiveHuntId(null); refreshUser(); listHuntSessions().then(setSessions).catch(() => {}) }

  return (
    <div className="max-w-4xl mx-auto p-8 animate-fade-in">
      {/* ── Launch section — full-width immersive card ──────────────── */}
      <div className="rounded-xl border mb-8 overflow-hidden" style={{ background: '#161616', borderColor: 'rgba(255,255,255,0.06)' }}>
        {/* Top section */}
        <div className="p-8 pb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(94,106,210,0.12)' }}>
                <Crosshair className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <h1 className="text-[20px] font-medium text-ink-primary tracking-tight">AI Hunt</h1>
                <p className="text-[13px] text-ink-tertiary">Autonomous job search and apply</p>
              </div>
            </div>
            <span className="text-[11px] text-ink-tertiary border rounded-full px-2.5 py-1" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              {isAdmin ? 'Admin · Free' : '5 credits'}
            </span>
          </div>

          {/* Profile tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {targetRoles.map(r => <span key={r} className="text-[11px] px-2 py-0.5 rounded bg-white/[0.05] text-ink-secondary border" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>{r}</span>)}
            {targetLocations.map(l => <span key={l} className="text-[11px] px-2 py-0.5 rounded bg-white/[0.05] text-ink-secondary border" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>{l}</span>)}
            {targetRoles.length === 0 && <span className="text-[11px] text-ink-tertiary italic">No target roles set</span>}
          </div>

          {/* LinkedIn creds — inline */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <input type="email" placeholder="LinkedIn email (optional)" value={creds.linkedin_email}
              onChange={e => setCreds(c => ({ ...c, linkedin_email: e.target.value }))} className="input text-[12px] py-2" />
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} placeholder="LinkedIn password" value={creds.linkedin_password}
                onChange={e => setCreds(c => ({ ...c, linkedin_password: e.target.value }))} className="input text-[12px] py-2 pr-8" />
              <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink-secondary">
                {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Readiness checks */}
          <div className="flex items-center gap-4 mb-4 text-[12px]">
            <span className={`flex items-center gap-1.5 ${hasResume ? 'text-emerald-400' : 'text-red-400'}`}>
              {hasResume ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} Resume
            </span>
            <span className={`flex items-center gap-1.5 ${(isAdmin || credits >= 5) ? 'text-emerald-400' : 'text-red-400'}`}>
              {(isAdmin || credits >= 5) ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} Credits ({isAdmin ? '∞' : credits})
            </span>
          </div>

          {error && <p className="text-[12px] text-red-400 mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">{error}</p>}
        </div>

        {/* Launch button — full width, prominent */}
        <button onClick={handleStart} disabled={!canHunt || loading}
          className="w-full py-4 text-[14px] font-medium text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ background: '#5E6AD2' }}>
          {loading
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Starting...</>
            : <><Crosshair className="w-4 h-4" /> Launch Autonomous Hunt <ChevronRight className="w-4 h-4" /></>
          }
        </button>
      </div>

      {/* ── Past hunts — compact table ─────────────────────────────── */}
      <div>
        <p className="text-[11px] text-ink-tertiary uppercase tracking-widest mb-3 px-1">History</p>
        {sessionsLoading ? (
          <div className="flex justify-center py-8"><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#5E6AD2' }} /></div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-[12px] text-ink-tertiary">No hunts yet</div>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ background: '#161616', borderColor: 'rgba(255,255,255,0.06)' }}>
            {sessions.slice(0, 8).map((s, i) => (
              <div key={s.id} className={`flex items-center justify-between px-4 py-3 ${i < sessions.length - 1 ? 'border-b' : ''}`} style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-3">
                  <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'complete' ? 'bg-emerald-400' : s.status === 'running' ? 'bg-brand-400 animate-pulse' : 'bg-ink-tertiary'}`} />
                  <span className="text-[12px] text-ink-secondary capitalize">{s.status}</span>
                </div>
                <div className="flex items-center gap-4 text-[12px] text-ink-tertiary">
                  <span>{s.jobs_found ?? 0} found</span>
                  <span className="text-emerald-400 font-medium">{s.jobs_applied ?? 0} applied</span>
                  <span>{formatDate(s.started_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeHuntId && <HuntView huntId={activeHuntId} onClose={handleClose} />}
    </div>
  )
}
