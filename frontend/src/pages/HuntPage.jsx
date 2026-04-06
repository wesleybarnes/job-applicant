import React, { useState, useEffect } from 'react'
import { Crosshair, Zap, MapPin, Briefcase, Brain, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle, Lock, Eye, EyeOff, Sparkles } from 'lucide-react'
import { useAppUser } from '../App'
import HuntView from '../components/HuntView'
import { startHunt, listHuntSessions, getResumes } from '../api/client'

function StatusBadge({ status }) {
  const cfg = {
    running:  { color: 'bg-brand-50 text-brand-600 border-brand-100',       label: 'Running',  icon: Zap },
    complete: { color: 'bg-emerald-50 text-emerald-700 border-emerald-100',  label: 'Complete', icon: CheckCircle },
    stopped:  { color: 'bg-zinc-100 text-zinc-500 border-zinc-200',          label: 'Stopped',  icon: XCircle },
    error:    { color: 'bg-red-50 text-red-600 border-red-100',              label: 'Error',    icon: AlertCircle },
  }[status] || { color: 'bg-zinc-100 text-zinc-500 border-zinc-200', label: status, icon: Clock }
  const Icon = cfg.icon
  return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill border text-xs font-semibold ${cfg.color}`}><Icon className="w-3 h-3" />{cfg.label}</span>
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function HuntPage() {
  const { appUser, refreshUser }     = useAppUser()
  const [activeHuntId, setActiveHuntId] = useState(null)
  const [sessions, setSessions]         = useState([])
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [hasResume, setHasResume]       = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [creds, setCreds] = useState({ linkedin_email: '', linkedin_password: '' })

  const targetRoles     = appUser?.target_roles     || []
  const targetLocations = appUser?.target_locations || []
  const skills          = appUser?.skills           || []
  const credits         = appUser?.credits ?? 0
  const isAdmin         = appUser?.is_admin
  const canHunt         = hasResume && (isAdmin || credits >= 5)

  useEffect(() => { if (appUser?.id) getResumes(appUser.id).then(r => setHasResume(r.some(resume => resume.is_active))).catch(() => {}) }, [appUser?.id])
  useEffect(() => { listHuntSessions().then(setSessions).catch(() => {}).finally(() => setSessionsLoading(false)) }, [activeHuntId])

  const handleStart = async () => {
    setError(null); setLoading(true)
    try {
      const data = await startHunt({ linkedin_email: creds.linkedin_email || null, linkedin_password: creds.linkedin_password || null })
      await refreshUser()
      setActiveHuntId(data.hunt_id)
    } catch (e) { setError(e?.response?.data?.detail || 'Failed to start hunt.') }
    finally { setLoading(false) }
  }

  const handleClose = () => { setActiveHuntId(null); refreshUser(); listHuntSessions().then(setSessions).catch(() => {}) }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/20">
          <Crosshair className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-ink-primary tracking-tight">Autonomous Hunt</h1>
          <p className="text-ink-secondary text-base">AI browses, decides, and applies — you watch live</p>
        </div>
      </div>

      {/* Launch card */}
      <div className="card p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-xl text-ink-primary">Start a Hunt</h2>
          <span className="text-xs font-bold bg-brand-50 text-brand-700 border border-brand-100 px-4 py-1.5 rounded-pill">
            {isAdmin ? <><Sparkles className="w-3 h-3 inline mr-1" />Admin · Free</> : <>Costs <span className="text-brand-600">5 credits</span></>}
          </span>
        </div>

        {/* Profile summary */}
        <div className="space-y-4 p-5 bg-surface-bg rounded-2xl border border-surface-border">
          {[
            { icon: Briefcase, label: 'Target Roles', items: targetRoles, empty: 'No target roles set' },
            { icon: MapPin, label: 'Locations', items: targetLocations, empty: 'No locations set' },
            { icon: Brain, label: 'Key Skills', items: skills.slice(0, 8), extra: skills.length > 8 ? skills.length - 8 : 0, empty: 'No skills set' },
          ].map(({ icon: Icon, label, items, extra, empty }) => (
            <div key={label} className="flex items-start gap-3">
              <Icon className="w-4 h-4 text-ink-tertiary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-ink-tertiary uppercase tracking-wider mb-1.5">{label}</p>
                {items.length > 0
                  ? <div className="flex flex-wrap gap-1.5">
                      {items.map(v => <span key={v} className="text-xs bg-white border border-surface-border text-ink-primary px-2.5 py-0.5 rounded-pill font-medium shadow-sm">{v}</span>)}
                      {extra > 0 && <span className="text-xs text-ink-tertiary">+{extra} more</span>}
                    </div>
                  : <p className="text-sm text-ink-tertiary italic">{empty}</p>
                }
              </div>
            </div>
          ))}
        </div>

        {/* LinkedIn credentials */}
        <div className="rounded-2xl border border-surface-border p-5 space-y-3 bg-white">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-ink-tertiary" />
            <p className="text-sm font-bold text-ink-primary">LinkedIn Login <span className="text-ink-tertiary font-normal text-xs">(optional but recommended)</span></p>
          </div>
          <p className="text-xs text-ink-tertiary leading-relaxed">Without login the agent sees public listings only. With login it uses LinkedIn Easy Apply. Credentials are <strong className="text-ink-secondary">never stored</strong>.</p>
          <div className="space-y-2">
            <input type="email" placeholder="LinkedIn email" value={creds.linkedin_email} onChange={e => setCreds(c => ({ ...c, linkedin_email: e.target.value }))} className="input" />
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} placeholder="LinkedIn password" value={creds.linkedin_password} onChange={e => setCreds(c => ({ ...c, linkedin_password: e.target.value }))} className="input pr-10" />
              <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink-primary transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Readiness */}
        <div className="rounded-2xl border border-surface-border divide-y divide-surface-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 text-sm">
            <span className="text-ink-secondary">Resume uploaded</span>
            {hasResume ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <span className="text-red-500 text-xs font-semibold">Missing</span>}
          </div>
          <div className="flex items-center justify-between px-5 py-3.5 text-sm">
            <span className="text-ink-secondary">Credits available</span>
            {isAdmin ? <span className="text-brand-600 font-semibold text-xs">Unlimited</span> : <span className={`font-semibold text-xs ${credits >= 5 ? 'text-emerald-600' : 'text-red-500'}`}>{credits} {credits < 5 && '(need 5)'}</span>}
          </div>
        </div>

        {error && <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</div>}

        <button onClick={handleStart} disabled={!canHunt || loading}
          className="w-full btn-primary py-4 text-base font-bold rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed">
          {loading
            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Starting Hunt...</>
            : <><Crosshair className="w-4 h-4" />Start Autonomous Hunt<ChevronRight className="w-4 h-4" /></>}
        </button>
      </div>

      {/* Past sessions */}
      <div>
        <h2 className="font-bold text-xl text-ink-primary mb-4">Past Hunts</h2>
        {sessionsLoading ? (
          <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : sessions.length === 0 ? (
          <div className="card p-12 text-center">
            <Crosshair className="w-10 h-10 text-ink-tertiary mx-auto mb-3 opacity-20" />
            <p className="text-ink-secondary text-sm">No hunts yet. Start one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => (
              <div key={s.id} className="card p-5 flex items-center justify-between gap-4 hover:shadow-card-hover transition-all duration-300">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1"><StatusBadge status={s.status} /><span className="text-xs text-ink-tertiary">{formatDate(s.started_at)}</span></div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-ink-secondary">{s.jobs_found ?? 0} evaluated</span>
                    <span className="text-emerald-600 font-semibold">{s.jobs_applied ?? 0} applied</span>
                  </div>
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
