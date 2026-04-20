import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Monitor, Upload, Shield, Crosshair } from 'lucide-react'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-surface-bg relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="orb w-[600px] h-[600px] bg-brand-500/8 top-[-200px] right-[-100px] animate-float" />
      <div className="orb w-[400px] h-[400px] bg-brand-600/6 bottom-[-100px] left-[-100px] animate-float-slow" />
      <div className="orb w-[300px] h-[300px] bg-orange-500/4 top-[40%] left-[20%] animate-float" style={{ animationDelay: '3s' }} />

      {/* Nav — floating pill */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <nav className="panel px-5 py-2.5 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-brand-500 flex items-center justify-center">
              <svg width="11" height="11" viewBox="0 0 32 32" fill="none"><path d="M7 15.2L25 7L17.5 25L14.5 17.5L7 15.2Z" fill="black"/></svg>
            </div>
            <span className="font-semibold text-sm text-ink-primary">Envia</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <button onClick={() => navigate('/sign-in')} className="text-xs text-ink-tertiary hover:text-ink-primary transition-colors">Sign In</button>
          <button onClick={() => navigate('/sign-up')} className="btn-primary text-xs py-1.5 px-4">Get Started</button>
        </nav>
      </div>

      {/* Hero — centered, massive */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="animate-slide-up">
          <div className="inline-flex items-center gap-2 text-xs text-brand-400 bg-brand-500/10 border border-brand-500/20 px-3 py-1 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            AI-Powered Job Applications
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold text-ink-primary leading-[1.05] tracking-tight max-w-3xl">
            Jobs applied to
            <br />
            <span className="text-shimmer">while you watch</span>
          </h1>

          <p className="text-lg text-ink-secondary max-w-lg mx-auto mt-6 leading-relaxed">
            Envia opens a browser, finds jobs that match you,
            fills every application, and waits for your OK to submit.
          </p>

          <div className="flex gap-3 justify-center mt-10">
            <button onClick={() => navigate('/sign-up')} className="btn-primary text-sm px-6 py-2.5">
              Start for Free <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => navigate('/sign-in')} className="btn-secondary text-sm px-6 py-2.5">
              Sign In
            </button>
          </div>

          <p className="text-xs text-ink-tertiary mt-5">5 free credits · No card required</p>
        </div>

        {/* Floating feature cards */}
        <div className="mt-20 w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          {[
            { icon: Crosshair, title: 'Auto-hunt', desc: 'Searches 3+ job boards' },
            { icon: Monitor, title: 'Live stream', desc: 'Watch every click' },
            { icon: Upload, title: 'Resume AI', desc: 'Fills forms perfectly' },
            { icon: Shield, title: 'You confirm', desc: 'Nothing sent without you' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="panel p-4 hover:border-white/10 transition-all duration-300 group">
              <Icon className="w-4 h-4 text-brand-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-ink-primary">{title}</p>
              <p className="text-xs text-ink-tertiary mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works — floating panels */}
      <div className="relative z-10 max-w-2xl mx-auto px-6 py-24">
        <h2 className="text-center text-sm font-medium text-ink-tertiary uppercase tracking-widest mb-12">How it works</h2>
        <div className="space-y-4">
          {[
            { n: '01', title: 'Set your profile', desc: 'Target roles, locations, salary. Upload your resume once.' },
            { n: '02', title: 'Launch the hunt', desc: 'One click. AI opens a browser and searches LinkedIn, Indeed, Google Jobs.' },
            { n: '03', title: 'Watch & approve', desc: 'Live stream of every action. Pause, edit, confirm each submission.' },
          ].map(({ n, title, desc }) => (
            <div key={n} className="panel px-6 py-5 flex items-start gap-5">
              <span className="text-brand-500 font-mono text-sm font-bold mt-0.5">{n}</span>
              <div>
                <h3 className="text-sm font-medium text-ink-primary">{title}</h3>
                <p className="text-xs text-ink-tertiary mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="relative z-10 text-center pb-24">
        <button onClick={() => navigate('/sign-up')} className="btn-primary text-sm px-8 py-3">
          Get Started Free <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Footer */}
      <div className="relative z-10 border-t border-white/5 py-6 text-center text-xs text-ink-tertiary">
        &copy; 2026 Envia
      </div>
    </div>
  )
}
