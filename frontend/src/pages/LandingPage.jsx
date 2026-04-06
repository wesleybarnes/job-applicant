import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Monitor, Upload, CheckCircle, Crosshair, Shield, Sparkles, Zap, Eye, Bot, MousePointer, Clock } from 'lucide-react'

function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="10" fill="url(#lg)"/>
      <path d="M11 25l5-14 5 14M13.5 19.5h6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="26" cy="11" r="3" fill="white" opacity="0.85"/>
      <defs><linearGradient id="lg" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#06B6D4"/><stop offset="1" stopColor="#0891B2"/></linearGradient></defs>
    </svg>
  )
}

function AnimatedNumber({ target }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let start = 0
    const step = Math.max(1, Math.floor(target / 30))
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setVal(target); clearInterval(timer) }
      else setVal(start)
    }, 40)
    return () => clearInterval(timer)
  }, [target])
  return <span>{val.toLocaleString()}</span>
}

function BrowserMockup() {
  return (
    <div className="relative">
      {/* Glow behind */}
      <div className="absolute -inset-4 bg-gradient-to-r from-brand-500/20 via-pink-500/10 to-blue-500/20 rounded-3xl blur-2xl" />
      <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-float" style={{ background: '#0c0a14' }}>
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
            <div className="w-3 h-3 rounded-full bg-green-400/80" />
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-white/10 rounded-lg px-3 py-1 text-xs text-zinc-400 font-mono">linkedin.com/jobs/search</div>
          </div>
        </div>
        {/* Content area */}
        <div className="p-6 space-y-3">
          {['Senior Data Scientist — Google', 'ML Engineer — OpenAI', 'AI Research — Anthropic', 'Data Scientist — Stripe'].map((job, i) => (
            <div key={i} className={`flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-500 ${i === 0 ? 'bg-brand-500/15 border border-brand-500/30' : 'bg-white/5 border border-white/5'}`}
              style={{ animationDelay: `${i * 0.15}s` }}>
              <div>
                <p className={`text-sm font-medium ${i === 0 ? 'text-white' : 'text-zinc-300'}`}>{job}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{i === 0 ? 'Filling application...' : 'Match score: ' + (95 - i * 7) + '%'}</p>
              </div>
              {i === 0 ? (
                <div className="flex items-center gap-1.5 text-brand-400 text-xs font-semibold">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" /> Applying
                </div>
              ) : (
                <span className={`text-xs font-bold ${i < 3 ? 'text-emerald-400' : 'text-zinc-500'}`}>{95 - i * 7}%</span>
              )}
            </div>
          ))}
          {/* Typing animation */}
          <div className="mt-2 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            <p className="text-xs text-zinc-500 mb-1">Filling: Years of experience</p>
            <div className="flex items-center gap-2">
              <div className="h-6 bg-brand-500/20 border border-brand-500/30 rounded px-2 flex items-center">
                <span className="text-sm text-brand-400 font-mono">5</span>
                <span className="w-0.5 h-3.5 bg-brand-400 ml-0.5 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-surface-bg overflow-hidden">
      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="font-bold text-xl text-ink-primary tracking-tight">Envia</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/sign-in')} className="btn-ghost text-sm">Sign In</button>
            <button onClick={() => navigate('/sign-up')} className="btn-primary text-sm">Get Started <ArrowRight className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </nav>

      {/* ── Hero — split layout ──────────────────────────────────────── */}
      <div className="relative pt-24">
        <div className="absolute inset-0 bg-hero-mesh" />
        <div className="absolute top-40 right-0 w-[500px] h-[500px] bg-brand-400/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-pink-400/8 rounded-full blur-[80px]" />

        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left — copy */}
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-brand-400 bg-brand-900/30 backdrop-blur border border-brand-700/30 px-4 py-2 rounded-pill mb-8 tracking-wide uppercase animate-fade-in">
                <Sparkles className="w-3.5 h-3.5" /> Claude Opus 4.6
              </div>

              <h1 className="text-5xl lg:text-6xl font-black tracking-tight text-ink-primary leading-[1.05] mb-6 animate-slide-up">
                AI that applies<br />to jobs
                <span className="text-shimmer block mt-1">while you watch</span>
              </h1>

              <p className="text-lg text-ink-secondary max-w-lg mb-10 leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
                Upload your resume once. Envia opens a real browser, finds matching jobs,
                fills every field, and pauses for your approval before each submit.
              </p>

              <div className="flex flex-wrap gap-4 mb-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <button onClick={() => navigate('/sign-up')} className="btn-primary text-base px-8 py-4 rounded-2xl">
                  Start for Free <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={() => navigate('/sign-in')} className="btn-secondary text-base px-8 py-4 rounded-2xl">
                  Sign In
                </button>
              </div>

              <p className="text-ink-tertiary text-sm animate-fade-in" style={{ animationDelay: '0.3s' }}>
                5 free credits · No credit card required
              </p>
            </div>

            {/* Right — browser mockup */}
            <div className="hidden lg:block animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <BrowserMockup />
            </div>
          </div>
        </div>
      </div>

      {/* ── Metrics strip ────────────────────────────────────────────── */}
      <div className="border-y border-surface-border bg-surface-card/50">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: 5, suffix: '+', label: 'Applications per session' },
            { value: 5, suffix: ' fps', label: 'Live screenshot stream' },
            { value: 30, suffix: 's', label: 'Average time per apply' },
            { value: 100, suffix: '%', label: 'You confirm every submit' },
          ].map(({ value, suffix, label }) => (
            <div key={label} className="text-center">
              <p className="text-4xl font-black text-ink-primary tracking-tight">
                <AnimatedNumber target={value} /><span className="text-brand-500">{suffix}</span>
              </p>
              <p className="text-sm text-ink-tertiary mt-1 font-medium">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bento grid features ──────────────────────────────────────── */}
      <div className="py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-brand-500 uppercase tracking-[0.2em] mb-4">How it works</p>
            <h2 className="text-4xl md:text-5xl font-black text-ink-primary tracking-tight">
              Not another job board.<br />
              <span className="text-ink-tertiary">An AI that does the work.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Large card — spans 2 cols */}
            <div className="md:col-span-2 gradient-border group">
              <div className="bg-surface-card rounded-card p-8 h-full flex flex-col">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-xl text-ink-primary mb-2">Watch every action live</h3>
                <p className="text-ink-secondary leading-relaxed mb-6">
                  Envia opens a real browser and streams it to you at 5fps. You see every page load, every field fill, every click —
                  like screen sharing with an expert recruiter who works at AI speed.
                </p>
                <div className="mt-auto flex items-center gap-4 text-sm text-ink-tertiary">
                  <span className="flex items-center gap-1.5"><Monitor className="w-4 h-4 text-brand-500" /> Real-time stream</span>
                  <span className="flex items-center gap-1.5"><MousePointer className="w-4 h-4 text-brand-500" /> Pause & take over</span>
                </div>
              </div>
            </div>

            {/* Small card */}
            <div className="gradient-border group">
              <div className="bg-surface-card rounded-card p-8 h-full flex flex-col">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-lg text-ink-primary mb-2">Upload once, apply everywhere</h3>
                <p className="text-ink-secondary text-sm leading-relaxed">
                  Claude reads your entire resume — skills, experience, education. Every application is filled with perfect accuracy.
                </p>
              </div>
            </div>

            {/* Small card */}
            <div className="gradient-border group">
              <div className="bg-surface-card rounded-card p-8 h-full flex flex-col">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-lg text-ink-primary mb-2">AI scores every match</h3>
                <p className="text-ink-secondary text-sm leading-relaxed">
                  Before applying, Claude evaluates each job against your profile. Only applies to roles that are a genuine fit.
                </p>
              </div>
            </div>

            {/* Large card — spans 2 cols */}
            <div className="md:col-span-2 gradient-border group">
              <div className="bg-surface-card rounded-card p-8 h-full flex flex-col">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-xl text-ink-primary mb-2">You're always in control</h3>
                <p className="text-ink-secondary leading-relaxed mb-6">
                  The AI pauses before every submission. Review what's been filled, make edits directly in the browser,
                  or skip — nothing gets submitted without your explicit approval.
                </p>
                <div className="mt-auto flex items-center gap-4 text-sm text-ink-tertiary">
                  <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-brand-500" /> Confirm each submit</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-brand-500" /> Pause & edit anytime</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Steps ────────────────────────────────────────────────────── */}
      <div className="bg-surface-card/30 py-28">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-brand-500 uppercase tracking-[0.2em] mb-4">Get started</p>
            <h2 className="text-4xl font-black text-ink-primary tracking-tight">Up and running in minutes</h2>
          </div>

          <div className="space-y-6">
            {[
              { num: '01', title: 'Create your profile', desc: 'Sign up, fill in your target roles, locations, and salary range. Upload your resume.', icon: Upload },
              { num: '02', title: 'Start an autonomous hunt', desc: 'Click one button. The AI opens a browser, searches LinkedIn, and starts finding matching jobs.', icon: Crosshair },
              { num: '03', title: 'Watch, approve, done', desc: 'See every action live. The AI pauses for your approval, then submits. 5+ applications in 5 minutes.', icon: CheckCircle },
            ].map(({ num, title, desc, icon: Icon }) => (
              <div key={num} className="card p-6 flex items-start gap-6 hover:shadow-card-hover transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-500/20">
                  <span className="text-white font-black text-lg">{num}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-ink-primary mb-1">{title}</h3>
                  <p className="text-ink-secondary text-sm leading-relaxed">{desc}</p>
                </div>
                <Icon className="w-5 h-5 text-ink-tertiary flex-shrink-0 mt-1 hidden sm:block" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <div className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#050A15] via-[#0A1628] to-[#0C1A2E]" />
        <div className="absolute inset-0 bg-hero-mesh opacity-20" />
        <div className="absolute top-10 left-10 w-80 h-80 bg-brand-500/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-10 right-10 w-60 h-60 bg-pink-500/10 rounded-full blur-[80px]" />

        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-5xl font-black text-white mb-6 tracking-tight leading-tight">
            Stop applying manually.<br />
            <span className="text-brand-400">Let AI do it.</span>
          </h2>
          <p className="text-brand-400/70 mb-10 text-lg leading-relaxed">
            Every minute you spend filling forms is a minute you're not preparing for interviews.
          </p>
          <button
            onClick={() => navigate('/sign-up')}
            className="inline-flex items-center gap-2 bg-white text-brand-400 font-bold text-lg px-10 py-5 rounded-2xl hover:bg-brand-900/30 transition-all duration-200 hover:shadow-float cursor-pointer"
          >
            Start for Free <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-brand-400/50 text-sm mt-6">5 free credits · No credit card</p>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div className="border-t border-surface-border bg-surface-bg py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={20} />
            <span className="font-bold text-ink-primary text-sm">Envia</span>
          </div>
          <p className="text-ink-tertiary text-xs">&copy; 2026 Envia &middot; Built with Claude Opus 4.6</p>
        </div>
      </div>
    </div>
  )
}
