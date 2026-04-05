import React, { useState, useEffect } from 'react'
import { Crosshair, Zap, MapPin, Briefcase, Brain, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useAppUser } from '../App'
import HuntView from '../components/HuntView'
import { startHunt, listHuntSessions } from '../api/client'

function StatusBadge({ status }) {
  const cfg = {
    running:   { color: 'bg-primary-500/20 text-primary-300 border-primary-500/30', label: 'Running', icon: Zap },
    complete:  { color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', label: 'Complete', icon: CheckCircle },
    stopped:   { color: 'bg-white/10 text-primary-400 border-white/10', label: 'Stopped', icon: XCircle },
    error:     { color: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'Error', icon: AlertCircle },
  }[status] || { color: 'bg-white/10 text-primary-400 border-white/10', label: status, icon: Clock }

  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-semibold ${cfg.color}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  )
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function HuntPage() {
  const { appUser, refreshUser } = useAppUser()
  const [activeHuntId, setActiveHuntId] = useState(null)
  const [sessions, setSessions]         = useState([])
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)
  const [sessionsLoading, setSessionsLoading] = useState(true)

  const profile = appUser?.profile || {}
  const targetRoles     = profile.target_roles     || []
  const targetLocations = profile.target_locations || []
  const skills          = profile.skills           || []
  const hasResume       = !!appUser?.resume_text
  const credits         = appUser?.credits ?? 0
  const canHunt         = hasResume && credits >= 5

  useEffect(() => {
    listHuntSessions()
      .then(setSessions)
      .catch(() => {})
      .finally(() => setSessionsLoading(false))
  }, [activeHuntId]) // refresh list when a hunt closes

  const handleStart = async () => {
    setError(null)
    setLoading(true)
    try {
      const data = await startHunt()
      await refreshUser()
      setActiveHuntId(data.hunt_id)
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to start hunt. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setActiveHuntId(null)
    refreshUser()
    // Re-fetch sessions after close
    listHuntSessions().then(setSessions).catch(() => {})
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center shadow-gold">
            <Crosshair className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-white">Autonomous Hunt</h1>
            <p className="text-primary-400 text-sm">AI browses, decides, applies — you just watch</p>
          </div>
        </div>
      </div>

      {/* Launch Card */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-white">Start a Hunt</h2>
          <span className="text-xs text-primary-400 bg-white/8 border border-white/10 px-3 py-1 rounded-full">
            Costs <span className="text-gold-400 font-bold">5 credits</span>
          </span>
        </div>

        {/* Target Profile Summary */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Briefcase className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-primary-400 uppercase tracking-wide mb-1">Target Roles</p>
              {targetRoles.length > 0
                ? <div className="flex flex-wrap gap-1.5">
                    {targetRoles.map(r => (
                      <span key={r} className="text-xs bg-primary-500/15 border border-primary-500/25 text-primary-300 px-2 py-0.5 rounded-lg">{r}</span>
                    ))}
                  </div>
                : <p className="text-sm text-primary-500 italic">No target roles set — update your profile</p>
              }
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-primary-400 uppercase tracking-wide mb-1">Locations</p>
              {targetLocations.length > 0
                ? <div className="flex flex-wrap gap-1.5">
                    {targetLocations.map(l => (
                      <span key={l} className="text-xs bg-primary-500/15 border border-primary-500/25 text-primary-300 px-2 py-0.5 rounded-lg">{l}</span>
                    ))}
                  </div>
                : <p className="text-sm text-primary-500 italic">No locations set — update your profile</p>
              }
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Brain className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-primary-400 uppercase tracking-wide mb-1">Key Skills</p>
              {skills.length > 0
                ? <div className="flex flex-wrap gap-1.5">
                    {skills.slice(0, 8).map(s => (
                      <span key={s} className="text-xs bg-white/8 border border-white/10 text-primary-300 px-2 py-0.5 rounded-lg">{s}</span>
                    ))}
                    {skills.length > 8 && <span className="text-xs text-primary-500">+{skills.length - 8} more</span>}
                  </div>
                : <p className="text-sm text-primary-500 italic">No skills set — update your profile</p>
              }
            </div>
          </div>
        </div>

        {/* Readiness checks */}
        <div className="rounded-xl border border-white/8 divide-y divide-white/8">
          <div className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="text-primary-300">Resume uploaded</span>
            {hasResume
              ? <CheckCircle className="w-4 h-4 text-emerald-400" />
              : <span className="text-red-400 text-xs font-semibold">Missing — upload in Dashboard</span>
            }
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="text-primary-300">Credits available</span>
            <span className={credits >= 5 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
              {credits} {credits < 5 && '(need 5)'}
            </span>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={!canHunt || loading}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-base transition-all ${
            canHunt && !loading
              ? 'btn-gold'
              : 'bg-white/8 text-primary-500 cursor-not-allowed border border-white/10'
          }`}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Starting Hunt...
            </>
          ) : (
            <>
              <Crosshair className="w-4 h-4" />
              Start Autonomous Hunt
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>

        {!hasResume && (
          <p className="text-center text-xs text-primary-500">
            Upload your resume from the Dashboard to enable hunting
          </p>
        )}
      </div>

      {/* Past Sessions */}
      <div>
        <h2 className="font-display font-bold text-lg text-white mb-4">Past Hunts</h2>
        {sessionsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="card p-8 text-center">
            <Crosshair className="w-10 h-10 text-primary-700 mx-auto mb-3" />
            <p className="text-primary-400 text-sm">No hunts yet. Start your first one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => (
              <div key={s.id} className="card p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={s.status} />
                    <span className="text-xs text-primary-500">{formatDate(s.started_at)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-primary-300">{s.jobs_found ?? 0} jobs found</span>
                    <span className="text-emerald-400 font-semibold">{s.jobs_applied ?? 0} applied</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Hunt Overlay */}
      {activeHuntId && (
        <HuntView huntId={activeHuntId} onClose={handleClose} />
      )}
    </div>
  )
}
