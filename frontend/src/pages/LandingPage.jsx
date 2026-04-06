import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Monitor, Upload, CheckCircle, Crosshair, Zap, Shield, Sparkles } from 'lucide-react'

const FEATURES = [
  { icon: Crosshair, title: 'Autonomous Hunt',   desc: 'AI browses LinkedIn, finds matching jobs, and applies while you watch live.' },
  { icon: Upload,    title: 'Resume-Powered',     desc: 'Upload once. Claude reads every word and fills applications perfectly.' },
  { icon: Monitor,   title: 'Live Browser View',  desc: 'Watch every click in real time. Nothing happens without you seeing it.' },
  { icon: Shield,    title: 'You Always Confirm', desc: 'AI pauses before every submit. Review and approve — full control, zero effort.' },
]

const STEPS = [
  { num: '01', title: 'Upload your resume', desc: 'PDF, DOCX, or TXT. Claude parses every detail.' },
  { num: '02', title: 'Set your preferences', desc: 'Roles, locations, salary — the AI knows what you want.' },
  { num: '03', title: 'Watch it apply', desc: 'Live browser streaming. Approve each submission.' },
]

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="10" fill="#18181B"/>
      <path d="M11 25l5-14 5 14M13.5 19.5h6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="26" cy="11" r="3" fill="white" opacity="0.85"/>
    </svg>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-surface-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="font-bold text-xl text-ink-primary tracking-tight">Envia</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/sign-in')} className="btn-ghost text-sm">Sign In</button>
            <button onClick={() => navigate('/sign-up')} className="btn-primary text-sm">Get Started Free</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-100 px-4 py-1.5 rounded-pill mb-8 tracking-wide uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          Powered by Claude Opus 4.6
        </div>

        <h1 className="text-hero text-ink-primary mb-6">
          Your AI job hunter
          <br />
          <span className="text-shimmer">that actually applies</span>
        </h1>

        <p className="text-lg text-ink-secondary max-w-xl mx-auto mb-10 leading-relaxed">
          Upload your resume, set your targets, and watch Envia browse job boards,
          fill applications, and ask your approval before every submit.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-5">
          <button
            onClick={() => navigate('/sign-up')}
            className="btn-primary text-base px-8 py-3.5"
          >
            Start for Free <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/sign-in')}
            className="btn-secondary text-base px-8 py-3.5"
          >
            Sign In
          </button>
        </div>
        <p className="text-ink-tertiary text-sm">5 free credits on signup · No credit card required</p>
      </div>

      {/* How it works */}
      <div className="bg-surface-bg py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-title text-ink-primary">Three steps to autopilot</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-ink-primary text-white text-sm font-bold mb-5">
                  {num}
                </div>
                <h3 className="font-semibold text-ink-primary text-base mb-2">{title}</h3>
                <p className="text-ink-secondary text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">Features</p>
          <h2 className="text-title text-ink-primary">Built for real job seekers</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-6 hover:shadow-card-hover transition-all duration-200 group">
              <div className="w-11 h-11 rounded-2xl bg-surface-hover flex items-center justify-center mb-4 group-hover:bg-brand-50 transition-colors">
                <Icon className="w-5 h-5 text-ink-tertiary group-hover:text-brand-500 transition-colors" />
              </div>
              <h3 className="font-semibold text-base text-ink-primary mb-2">{title}</h3>
              <p className="text-ink-secondary text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-ink-primary py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Ready to automate your job search?</h2>
          <p className="text-zinc-400 mb-8 text-base">Join Envia and let AI handle the tedious part while you focus on what matters.</p>
          <button
            onClick={() => navigate('/sign-up')}
            className="inline-flex items-center gap-2 bg-white text-ink-primary font-semibold text-base px-8 py-3.5 rounded-xl hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            Get Started Free <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-surface-border bg-white text-center py-6 text-ink-tertiary text-sm">
        &copy; 2026 Envia &middot; Built with Claude Opus 4.6
      </div>
    </div>
  )
}
