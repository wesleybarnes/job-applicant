import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Play, Monitor, Upload, Shield, Crosshair, Sparkles, Check, ChevronRight } from 'lucide-react'

/* ─── Animated grid background ────────────────────────────────────────── */
function GridBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ maskImage: 'radial-gradient(ellipse 60% 50% at 50% 30%, black, transparent)' }}>
      <div className="absolute inset-0" style={{
        backgroundImage: 'linear-gradient(rgba(94,106,210,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(94,106,210,0.07) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />
    </div>
  )
}

/* ─── Product mockup — shows the hunt UI ──────────────────────────────── */
function ProductMockup() {
  return (
    <div className="relative">
      {/* Glow */}
      <div className="absolute -inset-8 rounded-3xl opacity-30" style={{ background: 'radial-gradient(circle, rgba(94,106,210,0.15), transparent 70%)' }} />
      <div className="relative rounded-xl overflow-hidden border" style={{ background: '#0D0D0D', borderColor: 'rgba(255,255,255,0.08)' }}>
        {/* Browser chrome */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <div className="flex-1 mx-3 px-3 py-1 rounded text-[11px] text-ink-tertiary" style={{ background: 'rgba(255,255,255,0.04)' }}>linkedin.com/jobs</div>
        </div>
        {/* Simulated job list */}
        <div className="p-4 space-y-2">
          {[
            { title: 'ML Engineer', company: 'OpenAI', score: 94, active: true },
            { title: 'Data Scientist', company: 'Stripe', score: 87, active: false },
            { title: 'AI Researcher', company: 'Anthropic', score: 82, active: false },
          ].map((j, i) => (
            <div key={i} className={`flex items-center justify-between rounded-lg px-3.5 py-2.5 ${j.active ? 'bg-brand-500/10 border border-brand-500/20' : 'bg-white/[0.02]'}`}>
              <div>
                <p className={`text-[13px] font-medium ${j.active ? 'text-white' : 'text-ink-secondary'}`}>{j.title}</p>
                <p className="text-[11px] text-ink-tertiary">{j.company}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-medium ${j.score >= 90 ? 'text-emerald-400' : 'text-brand-400'}`}>{j.score}%</span>
                {j.active && <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />}
              </div>
            </div>
          ))}
          {/* Typing indicator */}
          <div className="px-3.5 py-2 rounded-lg bg-white/[0.02]">
            <p className="text-[11px] text-ink-tertiary mb-1">Filling: Years of experience</p>
            <div className="flex items-center">
              <span className="text-[13px] text-brand-300 font-mono">3</span>
              <span className="w-0.5 h-3.5 bg-brand-400 ml-px animate-pulse" />
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
    <div className="min-h-screen" style={{ background: '#111111' }}>
      {/* ── Sticky nav ──────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(17,17,17,0.9)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: '#5E6AD2' }}>
              <svg width="12" height="12" viewBox="0 0 32 32" fill="none"><path d="M7 15.2L25 7L17.5 25L14.5 17.5L7 15.2Z" fill="white"/></svg>
            </div>
            <span className="font-medium text-[15px] text-ink-primary tracking-tight">Envia</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/sign-in')} className="text-[13px] text-ink-secondary hover:text-ink-primary transition-colors">Log in</button>
            <button onClick={() => navigate('/sign-up')} className="btn-primary text-[13px]">Sign up free</button>
          </div>
        </div>
      </nav>

      {/* ── Hero — asymmetric split ─────────────────────────────────── */}
      <div className="relative">
        <GridBg />
        <div className="relative max-w-6xl mx-auto px-6 pt-32 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 items-center">
            {/* Left — 3 cols */}
            <div className="lg:col-span-3">
              <div className="inline-flex items-center gap-2 text-[12px] text-brand-400 border rounded-full px-3 py-1 mb-6" style={{ borderColor: 'rgba(94,106,210,0.2)', background: 'rgba(94,106,210,0.06)' }}>
                <Sparkles className="w-3 h-3" /> Claude Opus 4.6
              </div>

              <h1 className="text-[48px] lg:text-[56px] leading-[1.08] font-medium text-ink-primary tracking-heading mb-5" style={{ textWrap: 'balance' }}>
                Your AI agent that finds and applies to jobs
              </h1>

              <p className="text-[17px] text-ink-secondary leading-relaxed max-w-lg mb-8">
                Upload your resume once. Envia searches job boards, evaluates every listing, fills out applications in real time, and asks before it submits. Like having a recruiter on call.
              </p>

              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => navigate('/sign-up')} className="btn-primary px-5 py-2.5 text-[13px]">
                  Get started free <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => navigate('/sign-in')} className="btn-secondary px-5 py-2.5 text-[13px]">
                  <Play className="w-3 h-3" /> See it work
                </button>
              </div>

              <div className="flex items-center gap-4 text-[12px] text-ink-tertiary">
                <span className="flex items-center gap-1"><Check className="w-3 h-3 text-brand-400" /> 5 free credits</span>
                <span className="flex items-center gap-1"><Check className="w-3 h-3 text-brand-400" /> No card required</span>
                <span className="flex items-center gap-1"><Check className="w-3 h-3 text-brand-400" /> Cancel anytime</span>
              </div>
            </div>

            {/* Right — 2 cols: product mockup */}
            <div className="lg:col-span-2 hidden lg:block animate-slide-up" style={{ animationDelay: '0.15s' }}>
              <ProductMockup />
            </div>
          </div>
        </div>
      </div>

      {/* ── Bento feature grid ──────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 pb-32">
        <div className="grid grid-cols-6 gap-3">
          {/* Wide card — 4 cols */}
          <div className="col-span-6 md:col-span-4 rounded-xl border p-6 flex flex-col justify-between min-h-[200px]" style={{ background: '#161616', borderColor: 'rgba(255,255,255,0.06)' }}>
            <div>
              <Monitor className="w-5 h-5 text-brand-400 mb-4" />
              <h3 className="text-[17px] font-medium text-ink-primary mb-2 tracking-tight">Watch every action in real time</h3>
              <p className="text-[14px] text-ink-secondary leading-relaxed max-w-md">
                Envia streams its browser to you at 10+ fps. You see every page load, every field fill, every click — like screen sharing with an expert recruiter who works at AI speed.
              </p>
            </div>
            <div className="flex items-center gap-3 mt-4 text-[12px] text-ink-tertiary">
              <span>10+ fps streaming</span>
              <span className="w-px h-3 bg-white/10" />
              <span>Pause & take over anytime</span>
            </div>
          </div>

          {/* Tall card — 2 cols */}
          <div className="col-span-6 md:col-span-2 rounded-xl border p-6 flex flex-col min-h-[200px]" style={{ background: '#161616', borderColor: 'rgba(255,255,255,0.06)' }}>
            <Crosshair className="w-5 h-5 text-brand-400 mb-4" />
            <h3 className="text-[15px] font-medium text-ink-primary mb-2 tracking-tight">Multi-board search</h3>
            <p className="text-[13px] text-ink-secondary leading-relaxed flex-1">LinkedIn, Indeed, Google Jobs. The AI evaluates every listing against your profile and only applies to strong matches.</p>
          </div>

          {/* Two equal cards — 3 cols each */}
          <div className="col-span-6 md:col-span-3 rounded-xl border p-6" style={{ background: '#161616', borderColor: 'rgba(255,255,255,0.06)' }}>
            <Upload className="w-5 h-5 text-brand-400 mb-4" />
            <h3 className="text-[15px] font-medium text-ink-primary mb-2 tracking-tight">Upload once, apply everywhere</h3>
            <p className="text-[13px] text-ink-secondary leading-relaxed">Claude reads your entire resume — skills, experience, education. Every application is filled with precision. Cover letters are tailored per company.</p>
          </div>

          <div className="col-span-6 md:col-span-3 rounded-xl border p-6" style={{ background: '#161616', borderColor: 'rgba(255,255,255,0.06)' }}>
            <Shield className="w-5 h-5 text-brand-400 mb-4" />
            <h3 className="text-[15px] font-medium text-ink-primary mb-2 tracking-tight">Full control, zero risk</h3>
            <p className="text-[13px] text-ink-secondary leading-relaxed">The AI pauses before every submit button. Review what's been filled, edit fields directly in the browser, or skip. Nothing is sent without your explicit approval.</p>
          </div>
        </div>
      </div>

      {/* ── How it works — horizontal timeline ──────────────────────── */}
      <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6 py-28">
          <p className="text-[12px] text-ink-tertiary uppercase tracking-widest mb-12 text-center">How it works</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {[
              { n: '01', title: 'Build your profile', desc: 'Add target roles, locations, salary expectations. Upload your resume. Set up takes 3 minutes.' },
              { n: '02', title: 'Launch an AI hunt', desc: 'One click. The agent opens a browser, searches multiple job boards, and starts evaluating matches.' },
              { n: '03', title: 'Watch, approve, done', desc: 'See every action live. The AI fills forms, writes cover letters, and pauses for your approval before each submit.' },
            ].map(({ n, title, desc }, i) => (
              <div key={n} className="relative px-6 py-1">
                {/* Connector line */}
                {i < 2 && <div className="hidden md:block absolute top-5 right-0 w-6 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />}
                <p className="text-[11px] font-mono text-brand-400 mb-3">{n}</p>
                <h3 className="text-[15px] font-medium text-ink-primary mb-2 tracking-tight">{title}</h3>
                <p className="text-[13px] text-ink-tertiary leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-lg mx-auto px-6 py-28 text-center">
          <h2 className="text-[28px] font-medium text-ink-primary tracking-heading mb-3">Stop applying manually</h2>
          <p className="text-[15px] text-ink-tertiary mb-8 leading-relaxed">Every minute you spend on job forms is a minute you're not preparing for interviews.</p>
          <button onClick={() => navigate('/sign-up')} className="btn-primary px-6 py-2.5 text-[13px]">
            Get started free <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <div className="border-t py-8" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: '#5E6AD2' }}>
              <svg width="10" height="10" viewBox="0 0 32 32" fill="none"><path d="M7 15.2L25 7L17.5 25L14.5 17.5L7 15.2Z" fill="white"/></svg>
            </div>
            <span className="text-[13px] text-ink-secondary">Envia</span>
          </div>
          <span className="text-[12px] text-ink-tertiary">&copy; 2026</span>
        </div>
      </div>
    </div>
  )
}
