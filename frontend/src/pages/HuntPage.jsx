import React, { useState, useEffect } from 'react'
import { Crosshair, Zap, MapPin, Briefcase, Brain, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle, Lock, Eye, EyeOff, Sparkles } from 'lucide-react'
import { useAppUser } from '../App'
import HuntView from '../components/HuntView'
import { startHunt, listHuntSessions, getResumes } from '../api/client'

function StatusBadge({ status }) {
  const cfg = {
    running:  { color: 'bg-brand-900/30 text-brand-400 border-brand-800/50', label: 'Running', icon: Zap },
    complete: { color: 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50', label: 'Complete', icon: CheckCircle },
    stopped:  { color: 'bg-zinc-800 text-zinc-400 border-zinc-700', label: 'Stopped', icon: XCircle },
    error:    { color: 'bg-red-900/30 text-red-400 border-red-800/50', label: 'Error', icon: AlertCircle },
  }[status] || { color: 'bg-zinc-800 text-zinc-400 border-zinc-700', label: status, icon: Clock }
  const Icon = cfg.icon
  return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill border text-xs font-semibold ${cfg.color}`}><Icon className="w-3 h-3" />{cfg.label}</span>
}
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
  const skills = appUser?.skills || []
  const credits = appUser?.credits ?? 0
  const isAdmin = appUser?.is_admin
  const canHunt = hasResume && (isAdmin || credits >= 5)

  useEffect(() => { if (appUser?.id) getResumes(appUser.id).then(r => setHasResume(r.some(resume => resume.is_active))).catch(() => {}) }, [appUser?.id])
  useEffect(() => { listHuntSessions().then(setSessions).catch(() => {}).finally(() => setSessionsLoading(false)) }, [activeHuntId])

  const handleStart = async () => {
    setError(null); setLoading(true)
    try { const data = await startHunt({ linkedin_email: creds.linkedin_email || null, linkedin_password: creds.linkedin_password || null }); await refreshUser(); setActiveHuntId(data.hunt_id) }
    catch (e) { setError(e?.response?.data?.detail || 'Failed to start hunt.') }
    finally { setLoading(false) }
  }
  const handleClose = () => { setActiveHuntId(null); refreshUser(); listHuntSessions().then(setSessions).catch(() => {}) }

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/15 flex items-center justify-center border border-brand-500/20">
              <Crosshair className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-ink-primary">Autonomous Hunt</h1>
              <p className="text-ink-secondary text-sm">AI browses, decides, and applies — you watch live</p>
            </div>
          </div>
          <span className="text-xs font-bold bg-surface-hover text-ink-secondary border border-surface-border px-3 py-1.5 rounded-pill hidden sm:block">
            {isAdmin ? 'Admin · Free' : '5 credits / session'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Config — 3 cols */}
          <div className="lg:col-span-3 space-y-5">
            {/* Profile snapshot */}
            <div className="card p-5 space-y-4">
              <h3 className="text-xs font-bold text-ink-tertiary uppercase tracking-wider">Your Profile</h3>
              {[
                { icon: Briefcase, label: 'Roles', items: targetRoles, empty: 'No roles set' },
                { icon: MapPin, label: 'Locations', items: targetLocations, empty: 'No locations set' },
                { icon: Brain, label: 'Skills', items: skills.slice(0, 6), extra: skills.length > 6 ? skills.length - 6 : 0, empty: 'No skills set' },
              ].map(({ icon: Icon, label, items, extra, empty }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon className="w-4 h-4 text-ink-tertiary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-ink-tertiary mb-1">{label}</p>
                    {items.length > 0
                      ? <div className="flex flex-wrap gap-1.5">
                          {items.map(v => <span key={v} className="text-xs bg-surface-hover text-ink-primary px-2 py-0.5 rounded-md border border-surface-border">{v}</span>)}
                          {extra > 0 && <span className="text-xs text-ink-tertiary">+{extra}</span>}
                        </div>
                      : <p className="text-xs text-ink-tertiary italic">{empty}</p>
                    }
                  </div>
                </div>
              ))}
            </div>

            {/* LinkedIn */}
            <div className="card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-ink-tertiary" />
                <p className="text-sm font-semibold text-ink-primary">LinkedIn Login <span className="text-ink-tertiary font-normal text-xs">(optional)</span></p>
              </div>
              <p className="text-xs text-ink-tertiary">With login, the agent uses Easy Apply. Credentials are <strong className="text-ink-secondary">never stored</strong>.</p>
              <div className="grid grid-cols-2 gap-2">
                <input type="email" placeholder="Email" value={creds.linkedin_email} onChange={e => setCreds(c => ({ ...c, linkedin_email: e.target.value }))} className="input" />
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={creds.linkedin_password} onChange={e => setCreds(c => ({ ...c, linkedin_password: e.target.value }))} className="input pr-9" />
                  <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink-primary">
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Launch + readiness — 2 cols */}
          <div className="lg:col-span-2 space-y-5">
            {/* Readiness */}
            <div className="card overflow-hidden divide-y divide-surface-border">
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-ink-secondary">Resume</span>
                {hasResume ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <span className="text-red-400 text-xs font-semibold">Missing</span>}
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-ink-secondary">Credits</span>
                {isAdmin ? <span className="text-brand-400 text-xs font-semibold">Unlimited</span>
                  : <span className={`text-xs font-semibold ${credits >= 5 ? 'text-emerald-400' : 'text-red-400'}`}>{credits}{credits < 5 && ' (need 5)'}</span>}
              </div>
            </div>

            {error && <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{error}</div>}

            <button onClick={handleStart} disabled={!canHunt || loading}
              className="w-full btn-primary py-4 text-base font-bold rounded-2xl disabled:opacity-40 animate-glow-pulse">
              {loading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Starting...</>
                : <><Crosshair className="w-4 h-4" />Launch Hunt<ChevronRight className="w-4 h-4" /></>}
            </button>

            {/* Past hunts compact */}
            <div>
              <h3 className="text-xs font-bold text-ink-tertiary uppercase tracking-wider mb-2 px-1">History</h3>
              {sessionsLoading ? (
                <div className="flex justify-center py-6"><div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : sessions.length === 0 ? (
                <p className="text-xs text-ink-tertiary text-center py-4">No hunts yet</p>
              ) : (
                <div className="space-y-2">
                  {sessions.slice(0, 5).map(s => (
                    <div key={s.id} className="card px-4 py-3">
                      <div className="flex items-center justify-between">
                        <StatusBadge status={s.status} />
                        <span className="text-xs text-ink-tertiary">{formatDate(s.started_at)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs mt-1.5">
                        <span className="text-ink-secondary">{s.jobs_found ?? 0} found</span>
                        <span className="text-emerald-400 font-semibold">{s.jobs_applied ?? 0} applied</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {activeHuntId && <HuntView huntId={activeHuntId} onClose={handleClose} />}
    </div>
  )
}
