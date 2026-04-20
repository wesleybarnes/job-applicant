import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Monitor, Upload, Shield, Crosshair, CheckCircle } from 'lucide-react'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-surface-bg">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-surface-border" style={{ background: 'rgba(9,9,11,0.8)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-brand-500 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 32 32" fill="none"><path d="M7 15.2L25 7L17.5 25L14.5 17.5L7 15.2Z" fill="white"/></svg>
            </div>
            <span className="font-semibold text-sm text-ink-primary">Envia</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/sign-in')} className="btn-ghost text-xs">Sign In</button>
            <button onClick={() => navigate('/sign-up')} className="btn-primary text-xs">Get Started</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-3xl mx-auto px-6 pt-32 pb-24 text-center">
        <p className="text-xs font-medium text-brand-400 mb-6 tracking-wide uppercase">AI-powered job applications</p>
        <h1 className="text-4xl sm:text-5xl font-bold text-ink-primary leading-tight tracking-tight mb-5">
          Apply to jobs while you watch
        </h1>
        <p className="text-base text-ink-secondary max-w-lg mx-auto mb-10 leading-relaxed">
          Envia opens a real browser, finds matching jobs, fills every field with your resume data, and pauses for your approval before each submit.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('/sign-up')} className="btn-primary px-6 py-2.5 text-sm">
            Start for Free <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => navigate('/sign-in')} className="btn-secondary px-6 py-2.5 text-sm">Sign In</button>
        </div>
        <p className="text-xs text-ink-tertiary mt-4">5 free credits · No card required</p>
      </div>

      {/* Features */}
      <div className="max-w-4xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { icon: Crosshair, title: 'Autonomous hunt', desc: 'AI searches LinkedIn, Indeed, and Google Jobs. Scores each listing against your profile.' },
            { icon: Monitor, title: 'Live browser stream', desc: 'Watch every click at 10+ fps. Like screen sharing with an expert recruiter.' },
            { icon: Upload, title: 'Resume-powered', desc: 'Upload once. Claude reads every word and fills applications accurately.' },
            { icon: Shield, title: 'You always confirm', desc: 'AI pauses before submit. Review, edit, approve. Nothing sent without you.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-5 hover:bg-surface-hover/50 transition-colors">
              <Icon className="w-4 h-4 text-brand-400 mb-3" />
              <h3 className="text-sm font-medium text-ink-primary mb-1">{title}</h3>
              <p className="text-xs text-ink-tertiary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="border-t border-surface-border py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-lg font-semibold text-ink-primary text-center mb-12">How it works</h2>
          <div className="space-y-6">
            {[
              { n: '1', title: 'Create your profile', desc: 'Target roles, locations, salary range. Upload your resume.' },
              { n: '2', title: 'Start a hunt', desc: 'One click. AI opens a browser and searches multiple job boards.' },
              { n: '3', title: 'Watch and approve', desc: 'See every action live. Approve each submission. 5+ apps in 5 minutes.' },
            ].map(({ n, title, desc }) => (
              <div key={n} className="flex items-start gap-4">
                <div className="w-7 h-7 rounded-lg bg-surface-hover flex items-center justify-center flex-shrink-0 text-xs font-semibold text-ink-secondary">{n}</div>
                <div>
                  <h3 className="text-sm font-medium text-ink-primary">{title}</h3>
                  <p className="text-xs text-ink-tertiary mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-surface-border py-16">
        <div className="max-w-lg mx-auto px-6 text-center">
          <h2 className="text-xl font-semibold text-ink-primary mb-3">Stop applying manually</h2>
          <p className="text-sm text-ink-tertiary mb-6">Every minute on forms is a minute not preparing for interviews.</p>
          <button onClick={() => navigate('/sign-up')} className="btn-primary px-6 py-2.5 text-sm">
            Get Started Free <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-surface-border py-6 text-center text-xs text-ink-tertiary">
        &copy; 2026 Envia
      </div>
    </div>
  )
}
