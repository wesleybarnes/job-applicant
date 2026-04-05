import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Monitor, Upload, CheckCircle, Crosshair, Zap, Shield, Sparkles } from 'lucide-react'

const FEATURES = [
  { icon: Crosshair, title: 'Autonomous Hunt',   desc: 'AI browses LinkedIn, finds matching jobs, and applies while you watch live.',  color: '#1877F2' },
  { icon: Upload,    title: 'Resume-Powered',     desc: 'Upload once. Claude reads every word and fills applications perfectly.',         color: '#0C5FD0' },
  { icon: Monitor,   title: 'Live Browser View',  desc: 'Watch every click in real time. Nothing happens without you seeing it.',         color: '#42B883' },
  { icon: Shield,    title: 'You Always Confirm', desc: 'AI pauses before every submit. Review and approve — full control, zero effort.', color: '#7B61FF' },
]

function Logo() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="10" fill="#1877F2"/>
      <path d="M11 25l5-14 5 14M13.5 19.5h6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="26" cy="11" r="3" fill="white" opacity="0.85"/>
    </svg>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div style={{ background: '#F0F2F5', minHeight: '100vh' }}>
      {/* Nav */}
      <nav style={{ background: 'white', borderBottom: '1px solid #E4E6EA' }} className="sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="font-bold text-xl text-ink-primary tracking-tight">Envia</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/sign-in')} className="btn-ghost text-sm px-4 py-2">Sign In</button>
            <button onClick={() => navigate('/sign-up')} className="btn-primary px-5 py-2">Get Started Free</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 bg-brand-50 px-4 py-1.5 rounded-pill mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Claude Opus 4.6 · Autonomous browser AI
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-ink-primary leading-tight mb-5">
          Your AI job hunter
          <br />
          <span className="text-shimmer">that actually applies</span>
        </h1>

        <p className="text-lg text-ink-secondary max-w-xl mx-auto mb-8 leading-relaxed">
          Upload your resume, set your targets, and watch Envia browse job boards,
          fill applications, and ask your approval before every submit.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
          <button
            onClick={() => navigate('/sign-up')}
            className="btn-primary flex items-center justify-center gap-2 text-base px-7 py-3"
            style={{ borderRadius: '8px', fontSize: '15px' }}
          >
            Start for Free <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/sign-in')}
            className="btn-ghost flex items-center justify-center gap-2 text-base px-7 py-3 bg-white"
            style={{ borderRadius: '8px', fontSize: '15px', border: '1px solid #E4E6EA' }}
          >
            Sign In
          </button>
        </div>
        <p className="text-ink-tertiary text-sm">5 free credits on signup · No credit card required</p>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="card p-5 hover:shadow-card-hover transition-shadow">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: color + '15' }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <h3 className="font-bold text-base text-ink-primary mb-1.5">{title}</h3>
              <p className="text-ink-secondary text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid #E4E6EA', background: 'white' }} className="text-center py-5 text-ink-tertiary text-sm">
        © 2026 Envia · Built with Claude Opus 4.6
      </div>
    </div>
  )
}
