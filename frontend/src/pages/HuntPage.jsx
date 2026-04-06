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
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill border text-xs font-semibold ${cfg.color}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  )
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

  useEffect(() => {
    if (!appUser?.id) return
    getResumes(appUser.id)
      .then(r => setHasResume(r.some(resume => resume.is_active)))
      .catch(() => {})
  }, [appUser?.id])

  useEffect(() => {
    listHuntSessions()
      .then(setSessions).catch(() => {})
      .finally(() => setSessionsLoading(false))
  }, [activeHuntId])

  const handleStart = async () => {
    setError(null); setLoading(true)
    try {
      const data = await startHunt({
        linkedin_email:    creds.linkedin_email    || null,
        linkedin_password: creds.linkedin_password || null,
      })
      await refreshUser()
      setActiveHuntId(data.hunt_id)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to start hunt. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setActiveHuntId(null)
    refreshUser()
    listHuntSessions().then(setSessions).catch(() => {})
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-ink-primary flex items-center justify-center">
          <Crosshair className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-title text-ink-primary">Autonomous Hunt</h1>
          <p className="text-ink-secondary text-sm">AI browses, decides, and applies — you just watch live</p>
        </div>
      </div>

      {/* Launch card */}
      <div className="card p-7 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-ink-primary">Start a Hunt</h2>
          <span className="text-xs font-semibold bg-surface-hover text-ink-secondary border border-surface-border px-3 py-1.5 rounded-pill">
            {isAdmin ? <><Sparkles className="w-3 h-3 inline mr-1" />Admin · Free</> : <>Costs <span className="font-bold text-ink-primary">5 credits</span></>}
          </span>
        </div>

        {/* Profile summary */}
        <div className="space-y-4 p-5 bg-surface-bg rounded-2xl border border-surface-border">
          <div className="flex items-start gap-3">
            <Briefcase className="w-4 h-4 text-ink-tertiary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-1.5">Target Roles</p>
              {targetRoles.length > 0
                ? <div className="flex flex-wrap gap-1.5">{targetRoles.map(r => <span key={r} className="text-xs bg-white border border-surface-border text-ink-primary px-2.5 py-0.5 rounded-pill font-medium">{r}</span>)}</div>
                : <p className="text-sm text-ink-tertiary italic">No target roles set — update in onboarding</p>
              }
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-ink-tertiary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-1.5">Locations</p>
              {targetLocations.length > 0
                ? <div className="flex flex-wrap gap-1.5">{targetLocations.map(l => <span key={l} className="text-xs bg-white border border-surface-border text-ink-primary px-2.5 py-0.5 rounded-pill font-medium">{l}</span>)}</div>
                : <p className="text-sm text-ink-tertiary italic">No locations set</p>
              }
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Brain className="w-4 h-4 text-ink-tertiary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-1.5">Key Skills</p>
              {skills.length > 0
                ? <div className="flex flex-wrap gap-1.5">
                    {skills.slice(0, 8).map(s => <span key={s} className="text-xs bg-white border border-surface-border text-ink-secondary px-2 py-0.5 rounded-pill">{s}</span>)}
                    {skills.length > 8 && <span className="text-xs text-ink-tertiary">+{skills.length - 8} more</span>}
                  </div>
                : <p className="text-sm text-ink-tertiary italic">No skills set</p>
              }
            </div>
          </div>
        </div>

        {/* LinkedIn credentials */}
        <div className="rounded-2xl border border-surface-border p-5 space-y-3 bg-white">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-ink-tertiary" />
            <p className="text-sm font-semibold text-ink-primary">LinkedIn Login <span className="text-ink-tertiary font-normal text-xs">(optional but recommended)</span></p>
          </div>
          <p className="text-xs text-ink-tertiary leading-relaxed">
            Without login the agent sees public listings only. With login it uses LinkedIn Easy Apply to submit applications directly.
            Credentials are used only for this session and <strong className="text-ink-secondary">never stored</strong>.
          </p>
          <div className="space-y-2">
            <input
              type="email"
              placeholder="LinkedIn email"
              value={creds.linkedin_email}
              onChange={e => setCreds(c => ({ ...c, linkedin_email: e.target.value }))}
              className="input"
            />
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="LinkedIn password"
                value={creds.linkedin_password}
                onChange={e => setCreds(c => ({ ...c, linkedin_password: e.target.value }))}
                className="input pr-10"
              />
              <button type="button" onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink-primary transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Readiness checklist */}
        <div className="rounded-2xl border border-surface-border divide-y divide-surface-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 text-sm">
            <span className="text-ink-secondary">Resume uploaded</span>
            {hasResume
              ? <CheckCircle className="w-4 h-4 text-emerald-500" />
              : <span className="text-red-500 text-xs font-semibold">Missing — upload from Dashboard</span>
            }
          </div>
          <div className="flex items-center justify-between px-5 py-3.5 text-sm">
            <span className="text-ink-secondary">Credits available</span>
            {isAdmin
              ? <span className="text-brand-600 font-semibold text-xs">Admin · Unlimited</span>
              : <span className={`font-semibold text-xs ${credits >= 5 ? 'text-emerald-600' : 'text-red-500'}`}>{credits} {credits < 5 && '(need 5)'}</span>
            }
          </div>
        </div>

        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <button
          onClick={handleStart}
          disabled={!canHunt || loading}
          className="w-full btn-primary py-3.5 text-base font-bold rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading
            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Starting Hunt...</>
            : <><Crosshair className="w-4 h-4" />Start Autonomous Hunt<ChevronRight className="w-4 h-4" /></>
          }
        </button>
      </div>

      {/* Past sessions */}
      <div>
        <h2 className="font-bold text-lg text-ink-primary mb-4">Past Hunts</h2>
        {sessionsLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-ink-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="card p-12 text-center">
            <Crosshair className="w-10 h-10 text-ink-tertiary mx-auto mb-3 opacity-30" />
            <p className="text-ink-secondary text-sm">No hunts yet. Start one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => (
              <div key={s.id} className="card p-5 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={s.status} />
                    <span className="text-xs text-ink-tertiary">{formatDate(s.started_at)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-ink-secondary">{s.jobs_found ?? 0} jobs evaluated</span>
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
