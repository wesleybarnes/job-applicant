import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Monitor, Upload, Sparkles, CheckCircle, Crosshair } from 'lucide-react'

const FEATURES = [
  {
    icon: Crosshair,
    title: 'Autonomous Hunt',
    desc: 'One click. The AI browses LinkedIn and Indeed, finds matching jobs, and applies — while you watch live.',
    accent: 'from-gold-500 to-gold-600',
  },
  {
    icon: Upload,
    title: 'Resume-Powered',
    desc: 'Upload your resume once. Claude reads every word and uses it to fill applications perfectly.',
    accent: 'from-primary-500 to-primary-600',
  },
  {
    icon: Monitor,
    title: 'Watch It Happen',
    desc: 'Live browser stream so you see every click, every field, every page the AI visits in real time.',
    accent: 'from-emerald-500 to-emerald-600',
  },
  {
    icon: CheckCircle,
    title: 'You Confirm, It Submits',
    desc: 'The AI pauses before every submit. You review, then approve or skip. Full control, zero effort.',
    accent: 'from-violet-500 to-violet-600',
  },
]

function EnviaLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="16,2 28,9 28,23 16,30 4,23 4,9" fill="rgba(255,255,255,0.2)"/>
      <polygon points="20,9 13,15.5 17,15.5 12,23 19,16.5 15,16.5" fill="#f59e0b"/>
    </svg>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen text-white" style={{ background: 'linear-gradient(135deg, #120630 0%, #3b0764 50%, #1e0a4a 100%)' }}>
      <div className="hero-glow" />

      {/* Nav */}
      <nav className="relative flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <EnviaLogo />
          <span className="font-display font-bold text-xl tracking-tight">Envia</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/sign-in')}
            className="text-primary-200 hover:text-white text-sm font-medium transition-colors px-4 py-2"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/sign-up')}
            className="btn-gold text-sm px-5 py-2"
          >
            Get Started Free
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative max-w-5xl mx-auto px-8 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm mb-8 border border-white/20">
          <Sparkles className="w-3.5 h-3.5 text-gold-400" />
          <span>Powered by Claude Opus 4.6 · Autonomous browser AI</span>
        </div>

        <h1 className="font-display text-6xl md:text-7xl font-extrabold leading-tight mb-6">
          AI that hunts jobs
          <br />
          <span className="text-shimmer">and applies for you</span>
        </h1>

        <p className="text-xl text-primary-200 max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload your resume. Set your targets. Watch Envia browse LinkedIn,
          find matching jobs, fill applications, and wait for your approval before
          every submit — all in real time.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <button
            onClick={() => navigate('/sign-up')}
            className="btn-gold flex items-center justify-center gap-2 text-base"
          >
            Start Hunting Free <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/sign-in')}
            className="flex items-center justify-center gap-2 bg-white/10 border border-white/25 backdrop-blur-sm text-white px-8 py-3 rounded-2xl font-semibold text-base hover:bg-white/20 transition-colors"
          >
            Sign In
          </button>
        </div>
        <p className="text-primary-300 text-sm">5 free credits on signup · No credit card required</p>
      </div>

      {/* Features */}
      <div className="relative max-w-5xl mx-auto px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc, accent }) => (
            <div
              key={title}
              className="rounded-2xl p-6 border border-white/15 backdrop-blur-sm transition-all duration-200 hover:border-white/25 hover:bg-white/8"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <div className={`w-11 h-11 bg-gradient-to-br ${accent} rounded-xl flex items-center justify-center mb-4`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-display font-bold text-lg mb-2">{title}</h3>
              <p className="text-primary-200 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="relative text-center pb-8 text-primary-400 text-sm border-t border-white/10 pt-6">
        © 2026 Envia · Built with Claude Opus 4.6 · FastAPI · React
      </div>
    </div>
  )
}
