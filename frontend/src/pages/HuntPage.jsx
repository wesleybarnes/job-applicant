import React, { useState, useEffect } from 'react'
import {
  Crosshair, ChevronRight, CheckCircle, XCircle, Loader2, Sparkles, Pencil, X,
  Bookmark, BookmarkCheck, ExternalLink, Target,
} from 'lucide-react'
import { useAppUser } from '../App'
import HuntView from '../components/HuntView'
import {
  startHunt, listHuntSessions, getResumes,
  setUserGoals, updateMe,
  getHuntSessionDetail, saveHuntJob,
} from '../api/client'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function HuntPage() {
  const { appUser, refreshUser } = useAppUser()

  const [activeHuntId, setActiveHuntId] = useState(null)
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasResume, setHasResume] = useState(false)

  // ── Goals (editable AI summary + survey re-generation) ──────────────
  const [goalSummary, setGoalSummary] = useState(appUser?.goal_summary || '')
  const [editingGoals, setEditingGoals] = useState(false)
  const [survey, setSurvey] = useState({ what: '', where: '', deal_breakers: '' })
  const [goalsBusy, setGoalsBusy] = useState(false)
  useEffect(() => { setGoalSummary(appUser?.goal_summary || '') }, [appUser?.goal_summary])

  // ── History detail (click a past hunt to see what it looked at) ────
  const [detailId, setDetailId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saved, setSaved] = useState({})   // job url → { application_id, already_saved }
  const [savingUrl, setSavingUrl] = useState(null)

  const targetRoles = appUser?.target_roles || []
  const targetLocations = appUser?.target_locations || []
  const credits = appUser?.credits ?? 0
  const isAdmin = appUser?.is_admin
  const canHunt = hasResume && (isAdmin || credits >= 5)

  useEffect(() => { if (appUser?.id) getResumes(appUser.id).then(r => setHasResume(r.some(x => x.is_active))).catch(() => {}) }, [appUser?.id])
  useEffect(() => { listHuntSessions().then(setSessions).catch(() => {}).finally(() => setSessionsLoading(false)) }, [activeHuntId])

  const handleStart = async () => {
    setError(null); setLoading(true)
    try {
      // Per-site logins are now collected during the hunt via the credentials popup
      // (handled in HuntView). No upfront credential collection.
      const data = await startHunt({})
      await refreshUser()
      setActiveHuntId(data.hunt_id)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to start hunt.')
    } finally {
      setLoading(false)
    }
  }
  const handleClose = () => { setActiveHuntId(null); refreshUser(); listHuntSessions().then(setSessions).catch(() => {}) }

  // ── Goals handlers ──────────────────────────────────────────────────
  const handleSaveSummaryEdit = async () => {
    setGoalsBusy(true)
    try { await updateMe({ goal_summary: goalSummary }); await refreshUser(); setEditingGoals(false) }
    catch { setError('Failed to save goal summary') }
    finally { setGoalsBusy(false) }
  }
  const handleRegenerateFromSurvey = async () => {
    setGoalsBusy(true)
    const surveyDict = {
      'What are you looking for?': survey.what,
      'Where do you want to work / live?': survey.where,
      'Any deal-breakers?': survey.deal_breakers,
    }
    const goals = Object.values(survey).filter(Boolean).join('\n')
    try {
      const updated = await setUserGoals({ goals, survey: surveyDict, regenerate: true })
      setGoalSummary(updated.goal_summary || '')
      await refreshUser()
      setEditingGoals(false)
    } catch { setError('Failed to generate goal summary') }
    finally { setGoalsBusy(false) }
  }

  // ── History detail handlers ─────────────────────────────────────────
  const openDetail = async (sessionId) => {
    setDetailId(sessionId); setDetail(null); setDetailLoading(true); setSaved({})
    try { const d = await getHuntSessionDetail(sessionId); setDetail(d) } catch {}
    finally { setDetailLoading(false) }
  }
  const closeDetail = () => { setDetailId(null); setDetail(null); setSaved({}) }
  const handleSaveDecision = async (dec) => {
    if (!dec.url || saved[dec.url] || savingUrl) return
    setSavingUrl(dec.url)
    try {
      const r = await saveHuntJob(detailId, {
        url: dec.url, title: dec.title, company: dec.company, location: dec.location,
        match_score: dec.match_score, reason: dec.reason,
      })
      setSaved(prev => ({ ...prev, [dec.url]: r }))
    } catch {}
    finally { setSavingUrl(null) }
  }

  return (
    <div className="max-w-4xl mx-auto p-8 animate-fade-in">
      {/* ── Launch card ─────────────────────────────────────────────── */}
      <div className="rounded-xl border mb-6 overflow-hidden" style={{ background: '#161616', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="p-8 pb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(94,106,210,0.12)' }}>
                <Crosshair className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <h1 className="text-[20px] font-medium text-ink-primary tracking-tight">AI Hunt</h1>
                <p className="text-[13px] text-ink-tertiary">Autonomous job search and apply · signs in to each site as needed</p>
              </div>
            </div>
            <span className="text-[11px] text-ink-tertiary border rounded-full px-2.5 py-1" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              {isAdmin ? 'Admin · Free' : '5 credits'}
            </span>
          </div>

          {/* Profile tags */}
          <div className="flex flex-wrap gap-2 mb-5">
            {targetRoles.map(r => <span key={r} className="text-[11px] px-2 py-0.5 rounded bg-white/[0.05] text-ink-secondary border" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>{r}</span>)}
            {targetLocations.map(l => <span key={l} className="text-[11px] px-2 py-0.5 rounded bg-white/[0.05] text-ink-secondary border" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>{l}</span>)}
            {targetRoles.length === 0 && <span className="text-[11px] text-ink-tertiary italic">No target roles set — see Dashboard</span>}
          </div>

          {/* Goal summary — what the agent uses to pick sites + score jobs */}
          <div className="mb-5 rounded-lg border px-3.5 py-3" style={{ background: 'rgba(94,106,210,0.04)', borderColor: 'rgba(94,106,210,0.15)' }}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Target className="w-3 h-3 text-brand-400" />
                <span className="text-[11px] text-brand-400 font-medium uppercase tracking-wide">Goal summary</span>
              </div>
              {!editingGoals && (
                <button onClick={() => setEditingGoals(true)} className="flex items-center gap-1 text-[11px] text-ink-tertiary hover:text-ink-primary transition-colors">
                  <Pencil className="w-3 h-3" /> {goalSummary ? 'Edit' : 'Set'}
                </button>
              )}
            </div>

            {!editingGoals ? (
              goalSummary ? (
                <p className="text-[12.5px] text-ink-secondary leading-relaxed">{goalSummary}</p>
              ) : (
                <p className="text-[12px] text-ink-tertiary italic">No goal summary yet — set one so the agent picks the right job boards and scores jobs against what you actually want.</p>
              )
            ) : (
              <div className="space-y-3 mt-1">
                <textarea
                  value={goalSummary}
                  onChange={e => setGoalSummary(e.target.value)}
                  rows={3}
                  placeholder="e.g. I want to move to Tokyo as a backend engineer focused on Python/Go. Remote or hybrid OK; not interested in pure frontend roles."
                  className="w-full rounded-lg px-3 py-2 text-[12.5px] outline-none resize-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', caretColor: '#fff' }}
                />

                <details className="text-[11.5px] text-ink-tertiary">
                  <summary className="cursor-pointer hover:text-ink-secondary select-none">…or answer 3 questions and let AI write it</summary>
                  <div className="space-y-2 mt-2.5 pl-1">
                    <input value={survey.what} onChange={e => setSurvey(s => ({ ...s, what: e.target.value }))}
                      placeholder="What kind of role are you looking for?" className="input text-[12px] py-1.5" />
                    <input value={survey.where} onChange={e => setSurvey(s => ({ ...s, where: e.target.value }))}
                      placeholder="Where do you want to work / live?" className="input text-[12px] py-1.5" />
                    <input value={survey.deal_breakers} onChange={e => setSurvey(s => ({ ...s, deal_breakers: e.target.value }))}
                      placeholder="Any deal-breakers (salary, on-site only, industry, etc.)?" className="input text-[12px] py-1.5" />
                    <button onClick={handleRegenerateFromSurvey} disabled={goalsBusy}
                      className="flex items-center gap-1.5 mt-1 px-2.5 py-1.5 rounded-md text-[11.5px] font-medium bg-brand-500/15 hover:bg-brand-500/25 text-brand-300 border border-brand-500/20 disabled:opacity-40">
                      <Sparkles className="w-3 h-3" /> {goalsBusy ? 'Writing…' : 'Generate summary with AI'}
                    </button>
                  </div>
                </details>

                <div className="flex gap-2">
                  <button onClick={handleSaveSummaryEdit} disabled={goalsBusy} className="btn-primary text-[12px] py-1.5 px-3 disabled:opacity-40">Save</button>
                  <button onClick={() => { setEditingGoals(false); setGoalSummary(appUser?.goal_summary || '') }} className="text-[12px] py-1.5 px-3 text-ink-tertiary hover:text-ink-secondary">Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Readiness checks */}
          <div className="flex items-center gap-4 mb-4 text-[12px]">
            <span className={`flex items-center gap-1.5 ${hasResume ? 'text-emerald-400' : 'text-red-400'}`}>
              {hasResume ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} Resume
            </span>
            <span className={`flex items-center gap-1.5 ${(isAdmin || credits >= 5) ? 'text-emerald-400' : 'text-red-400'}`}>
              {(isAdmin || credits >= 5) ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} Credits ({isAdmin ? '∞' : credits})
            </span>
            <span className="text-[11px] text-ink-tertiary ml-auto">Logins prompted during the hunt</span>
          </div>

          {error && <p className="text-[12px] text-red-400 mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">{error}</p>}
        </div>

        <button onClick={handleStart} disabled={!canHunt || loading}
          className="w-full py-4 text-[14px] font-medium text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ background: '#5E6AD2' }}>
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting…</>
            : <><Crosshair className="w-4 h-4" /> Launch Autonomous Hunt <ChevronRight className="w-4 h-4" /></>
          }
        </button>
      </div>

      {/* ── History ────────────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] text-ink-tertiary uppercase tracking-widest mb-3 px-1">History — click a hunt to see jobs it looked at</p>
        {sessionsLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-4 h-4 animate-spin text-ink-tertiary" /></div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-[12px] text-ink-tertiary">No hunts yet</div>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ background: '#161616', borderColor: 'rgba(255,255,255,0.06)' }}>
            {sessions.slice(0, 12).map((s, i) => (
              <button key={s.id} onClick={() => openDetail(s.id)}
                className={`w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors text-left ${i < sessions.length - 1 ? 'border-b' : ''}`}
                style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-3">
                  <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'complete' ? 'bg-emerald-400' : s.status === 'running' ? 'bg-brand-400 animate-pulse' : 'bg-ink-tertiary'}`} />
                  <span className="text-[12px] text-ink-secondary capitalize">{s.status}</span>
                </div>
                <div className="flex items-center gap-4 text-[12px] text-ink-tertiary">
                  <span>{s.jobs_found ?? 0} found</span>
                  <span className="text-emerald-400 font-medium">{s.jobs_applied ?? 0} applied</span>
                  <span>{formatDate(s.started_at)}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-ink-tertiary" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {activeHuntId && <HuntView huntId={activeHuntId} onClose={handleClose} />}

      {/* ── History detail modal ───────────────────────────────────── */}
      {detailId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border overflow-hidden" style={{ background: '#0C1220', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
              <div>
                <p className="text-[13px] font-medium text-white">Hunt #{detailId}</p>
                {detail && <p className="text-[11px] text-ink-tertiary">
                  {detail.jobs_found ?? 0} found · <span className="text-emerald-400">{detail.jobs_applied ?? 0} applied</span> · {formatDate(detail.started_at)}
                </p>}
              </div>
              <button onClick={closeDetail} className="p-1.5 rounded-md text-ink-tertiary hover:text-ink-primary hover:bg-white/[0.05]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {detailLoading || !detail ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-4 h-4 animate-spin text-ink-tertiary" /></div>
              ) : (
                <>
                  {(detail.submitted?.length > 0) && (
                    <div className="mb-3">
                      <p className="text-[10px] uppercase tracking-widest text-emerald-400 mb-2">Submitted ({detail.submitted.length})</p>
                      <div className="space-y-1.5">
                        {detail.submitted.map((s, i) => (
                          <DecisionRow key={`sub-${i}`} dec={s} variant="submitted" saved={saved[s.url]} saving={savingUrl === s.url} onSave={() => handleSaveDecision(s)} />
                        ))}
                      </div>
                    </div>
                  )}
                  {(detail.decisions?.length > 0) ? (
                    <>
                      <p className="text-[10px] uppercase tracking-widest text-ink-tertiary mb-2">All jobs looked at ({detail.decisions.length})</p>
                      <div className="space-y-1.5">
                        {detail.decisions
                          .slice()
                          .sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
                          .map((d, i) => (
                            <DecisionRow key={`dec-${i}`} dec={d} variant={d.decision} saved={saved[d.url]} saving={savingUrl === d.url} onSave={() => handleSaveDecision(d)} />
                          ))}
                      </div>
                    </>
                  ) : (
                    !detail.submitted?.length && <p className="text-[12px] text-ink-tertiary italic text-center py-8">No decisions persisted for this hunt.</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DecisionRow({ dec, variant, saved, saving, onSave }) {
  const score = dec.match_score
  const isApply = variant === 'apply' || variant === 'submitted'
  return (
    <div className={`rounded-lg border px-3 py-2.5 flex items-start gap-3 ${variant === 'submitted' ? 'border-emerald-500/20 bg-emerald-500/[0.04]' : 'border-white/5 bg-white/[0.02]'}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-[12.5px] text-ink-primary font-medium truncate">{dec.title || '(untitled)'}</p>
          {score != null && (
            <span className={`text-[10.5px] font-medium flex-shrink-0 ${score >= 80 ? 'text-emerald-400' : score >= 70 ? 'text-brand-400' : 'text-ink-tertiary'}`}>{Math.round(score)}%</span>
          )}
        </div>
        <p className="text-[11.5px] text-ink-tertiary truncate">{dec.company}{dec.location ? ` · ${dec.location}` : ''}</p>
        {dec.reason && <p className="text-[11px] text-ink-tertiary mt-1 line-clamp-2">{dec.reason}</p>}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {dec.url && (
          <a href={dec.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md text-ink-tertiary hover:text-ink-primary hover:bg-white/[0.05]">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        {dec.url && (
          <button
            onClick={onSave}
            disabled={!!saved || saving}
            title={saved ? (saved.already_saved ? 'Already in your applications' : 'Saved to applications') : 'Save to applications'}
            className={`p-1.5 rounded-md transition-colors ${saved ? 'text-emerald-400 bg-emerald-500/10' : 'text-ink-tertiary hover:text-brand-400 hover:bg-brand-500/10'} disabled:opacity-60`}
          >
            {saving
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : (saved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />)}
          </button>
        )}
      </div>
    </div>
  )
}
