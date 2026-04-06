import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Monitor, Upload, CheckCircle, Crosshair, Shield, Sparkles, Zap, Play, Star } from 'lucide-react'

const FEATURES = [
  { icon: Crosshair, title: 'Autonomous Hunt',   desc: 'AI browses LinkedIn, finds matching jobs, and applies while you watch every click live.', gradient: 'from-violet-500 to-purple-600' },
  { icon: Upload,    title: 'Resume-Powered',     desc: 'Upload once. Claude reads every word and fills applications with perfect accuracy.',       gradient: 'from-blue-500 to-cyan-500' },
  { icon: Monitor,   title: 'Live Browser View',  desc: 'Watch every action in real time — like screen sharing with your own AI assistant.',        gradient: 'from-emerald-500 to-teal-500' },
  { icon: Shield,    title: 'You Always Confirm', desc: 'AI pauses before every submit. Review, edit, approve — full control with zero effort.',   gradient: 'from-pink-500 to-rose-500' },
]

const STEPS = [
  { num: '01', title: 'Upload your resume', desc: 'PDF, DOCX, or TXT. Claude parses every section, skill, and qualification.' },
  { num: '02', title: 'Set your preferences', desc: 'Target roles, locations, salary range — the AI knows exactly what you want.' },
  { num: '03', title: 'Watch it apply', desc: 'Live browser streaming. Human-like browsing. You approve each submission.' },
]

function Logo({ size = 32 }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 blur-lg opacity-40" />
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className="relative">
        <rect width="36" height="36" rx="10" fill="url(#logo-grad)"/>
        <path d="M11 25l5-14 5 14M13.5 19.5h6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="26" cy="11" r="3" fill="white" opacity="0.85"/>
        <defs>
          <linearGradient id="logo-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8B5CF6"/>
            <stop offset="1" stopColor="#6D28D9"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* ── Nav ────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 glass border-b border-white/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="font-bold text-xl text-ink-primary tracking-tight">Envia</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/sign-in')} className="btn-ghost text-sm">Sign In</button>
            <button onClick={() => navigate('/sign-up')} className="btn-primary text-sm">
              Get Started Free <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <div className="relative">
        {/* Background mesh gradient */}
        <div className="absolute inset-0 bg-hero-mesh opacity-80" />
        <div className="absolute top-20 right-20 w-72 h-72 bg-violet-400/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-blue-400/15 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />

        <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-24 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 bg-brand-50/80 backdrop-blur border border-brand-200/50 px-4 py-2 rounded-pill mb-8 tracking-wide uppercase animate-fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            Powered by Claude Opus 4.6
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-ink-primary leading-[1.05] mb-6 animate-slide-up">
            Your AI job hunter
            <br />
            <span className="text-shimmer">that actually applies</span>
          </h1>

          <p className="text-lg md:text-xl text-ink-secondary max-w-2xl mx-auto mb-12 leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Upload your resume, set your targets, and watch Envia browse job boards,
            fill applications in real-time, and ask your approval before every submit.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <button
              onClick={() => navigate('/sign-up')}
              className="btn-primary text-base px-8 py-4 rounded-2xl"
            >
              Start for Free <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/sign-in')}
              className="btn-secondary text-base px-8 py-4 rounded-2xl"
            >
              <Play className="w-4 h-4" /> Watch Demo
            </button>
          </div>
          <p className="text-ink-tertiary text-sm animate-fade-in" style={{ animationDelay: '0.3s' }}>
            5 free credits on signup · No credit card required
          </p>
        </div>
      </div>

      {/* ── Social proof strip ─────────────────────────────────────────── */}
      <div className="border-y border-surface-border bg-surface-bg/50">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-center gap-8 flex-wrap text-sm text-ink-tertiary">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-brand-500" />
            <span className="font-semibold text-ink-secondary">5+ applications</span> per session
          </div>
          <div className="w-px h-4 bg-surface-border" />
          <div className="flex items-center gap-1.5">
            <Monitor className="w-4 h-4 text-brand-500" />
            <span className="font-semibold text-ink-secondary">Real-time</span> browser streaming
          </div>
          <div className="w-px h-4 bg-surface-border" />
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-brand-500" />
            <span className="font-semibold text-ink-secondary">You confirm</span> every submission
          </div>
        </div>
      </div>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <div className="py-28">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-20">
            <p className="text-xs font-bold text-brand-500 uppercase tracking-[0.2em] mb-4">How it works</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-ink-primary tracking-tight">
              Three steps to autopilot
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {STEPS.map(({ num, title, desc }, i) => (
              <div key={num} className="relative text-center group">
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-surface-border to-transparent" />
                )}
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white text-lg font-bold mb-6 shadow-lg shadow-brand-500/20 group-hover:scale-110 transition-transform duration-300">
                  {num}
                </div>
                <h3 className="font-bold text-ink-primary text-lg mb-2">{title}</h3>
                <p className="text-ink-secondary text-sm leading-relaxed max-w-xs mx-auto">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <div className="bg-surface-bg py-28">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-20">
            <p className="text-xs font-bold text-brand-500 uppercase tracking-[0.2em] mb-4">Features</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-ink-primary tracking-tight">
              Built for real job seekers
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, gradient }) => (
              <div key={title} className="gradient-border group cursor-default">
                <div className="bg-white rounded-card p-8 h-full">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-lg text-ink-primary mb-2">{title}</h3>
                  <p className="text-ink-secondary text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <div className="relative py-28 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-brand-800 to-purple-900" />
        <div className="absolute inset-0 bg-hero-mesh opacity-30" />
        <div className="absolute top-10 left-10 w-80 h-80 bg-brand-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-60 h-60 bg-pink-500/15 rounded-full blur-3xl" />

        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-5 tracking-tight">
            Ready to automate<br />your job search?
          </h2>
          <p className="text-brand-200/80 mb-10 text-lg leading-relaxed">
            Join Envia and let AI handle the tedious part while you focus on what matters.
          </p>
          <button
            onClick={() => navigate('/sign-up')}
            className="inline-flex items-center gap-2 bg-white text-brand-700 font-bold text-base px-10 py-4 rounded-2xl hover:bg-brand-50 transition-all duration-200 hover:shadow-float cursor-pointer"
          >
            Get Started Free <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div className="border-t border-surface-border bg-white text-center py-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Logo size={20} />
          <span className="font-bold text-ink-primary text-sm">Envia</span>
        </div>
        <p className="text-ink-tertiary text-xs">&copy; 2026 Envia &middot; Built with Claude Opus 4.6</p>
      </div>
    </div>
  )
}
