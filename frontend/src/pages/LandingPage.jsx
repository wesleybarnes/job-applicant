import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Monitor, Upload, Sparkles, CheckCircle, Crosshair, Zap, Shield } from 'lucide-react'

const FEATURES = [
  { icon: Crosshair, title: 'Autonomous Hunt', desc: 'One click. AI browses LinkedIn, finds matching jobs, and applies while you watch live.', color: 'bg-primary-500' },
  { icon: Upload,    title: 'Resume-Powered', desc: 'Upload your resume once. Claude reads every word and uses it to fill applications perfectly.', color: 'bg-sky-500' },
  { icon: Monitor,   title: 'Live Browser View', desc: 'Watch every click and keystroke in real time. Nothing happens without you seeing it.', color: 'bg-emerald-500' },
  { icon: Shield,    title: 'You Always Confirm', desc: 'The AI pauses before every submit. Review, approve, or skip — full control, zero effort.', color: 'bg-violet-500' },
]

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#4B9CD3"/>
      <path d="M10 22l4-12 4 12M12.5 17h5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="23" cy="10" r="2.5" fill="white" opacity="0.9"/>
    </svg>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFF' }}>
      {/* Nav */}
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="font-bold text-xl text-slate-900 tracking-tight">Envia</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/sign-in')} className="btn-ghost text-sm">Sign In</button>
            <button onClick={() => navigate('/sign-up')} className="btn-primary text-sm px-4 py-2">Get Started Free</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-8 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-200 text-primary-700 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
          <Zap className="w-3.5 h-3.5" />
          Powered by Claude Opus 4.6 · Autonomous browser AI
        </div>

        <h1 className="text-6xl md:text-7xl font-extrabold leading-tight tracking-tight mb-6 text-slate-900">
          AI that hunts jobs
          <br />
          <span className="text-shimmer">and applies for you</span>
        </h1>

        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload your resume. Set your targets. Watch Envia browse LinkedIn,
          find matching jobs, fill applications, and ask before every submit.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-5">
          <button onClick={() => navigate('/sign-up')} className="btn-primary flex items-center justify-center gap-2 text-base px-8 py-3.5 rounded-2xl">
            Start Hunting Free <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={() => navigate('/sign-in')} className="btn-secondary flex items-center justify-center gap-2 text-base px-8 py-3.5 rounded-2xl">
            Sign In
          </button>
        </div>
        <p className="text-slate-400 text-sm">5 free credits on signup · No credit card required</p>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="card hover:shadow-card-hover p-6">
              <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center mb-4`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 text-center py-6 text-slate-400 text-sm">
        © 2026 Envia · Built with Claude Opus 4.6 · FastAPI · React
      </div>
    </div>
  )
}
