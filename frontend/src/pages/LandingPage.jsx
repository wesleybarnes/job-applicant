import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Monitor, Upload, Shield, Crosshair, Sparkles } from 'lucide-react'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen" style={{ background: '#111111' }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(17,17,17,0.85)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: '#5E6AD2' }}>
              <svg width="12" height="12" viewBox="0 0 32 32" fill="none"><path d="M7 15.2L25 7L17.5 25L14.5 17.5L7 15.2Z" fill="white"/></svg>
            </div>
            <span className="font-medium text-[15px] text-ink-primary tracking-tight">Envia</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/sign-in')} className="text-sm text-ink-secondary hover:text-ink-primary transition-colors">Log in</button>
            <button onClick={() => navigate('/sign-up')} className="btn-primary text-sm">Sign up</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-3xl mx-auto px-6 pt-32 pb-28 text-center">
        <div className="inline-flex items-center gap-2 text-xs text-brand-400 border rounded-full px-3 py-1 mb-8" style={{ borderColor: 'rgba(94,106,210,0.3)', background: 'rgba(94,106,210,0.06)' }}>
          <Sparkles className="w-3 h-3" />
          Powered by Claude
        </div>

        <h1 className="text-[52px] leading-[1.1] font-medium text-ink-primary tracking-heading mb-5 text-balance">
          AI that applies to jobs<br />while you watch
        </h1>

        <p className="text-[17px] text-ink-secondary max-w-md mx-auto leading-relaxed mb-10">
          Upload your resume, pick your targets. Envia finds matching roles,
          fills every application, and asks before submitting.
        </p>

        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('/sign-up')} className="btn-primary text-sm px-5 py-2.5">
            Get started free <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => navigate('/sign-in')} className="btn-secondary text-sm px-5 py-2.5">
            Log in
          </button>
        </div>
      </div>

      {/* Feature grid */}
      <div className="max-w-4xl mx-auto px-6 pb-32">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-card overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          {[
            { icon: Crosshair, title: 'Autonomous', desc: 'Searches LinkedIn, Indeed, and more without you lifting a finger' },
            { icon: Monitor, title: 'Live view', desc: 'Watch every click in real time — like a screen share with a recruiter' },
            { icon: Upload, title: 'One resume', desc: 'Upload once. AI reads every detail and fills forms with precision' },
            { icon: Shield, title: 'You decide', desc: 'Nothing gets submitted without your explicit approval. Full control' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-6" style={{ background: '#191919' }}>
              <Icon className="w-5 h-5 text-brand-400 mb-4" />
              <h3 className="text-sm font-medium text-ink-primary mb-1.5">{title}</h3>
              <p className="text-[13px] text-ink-tertiary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-2xl mx-auto px-6 py-28">
          <p className="text-xs text-ink-tertiary uppercase tracking-widest mb-10 text-center">How it works</p>
          <div className="space-y-8">
            {[
              { n: '1', t: 'Create your profile', d: 'Add your target roles, preferred locations, salary range. Upload your resume.' },
              { n: '2', t: 'Start a hunt', d: 'One click. The AI launches a browser and searches multiple job boards for matches.' },
              { n: '3', t: 'Watch and approve', d: 'See every action live. The AI pauses before each submit for your approval.' },
            ].map(({ n, t, d }) => (
              <div key={n} className="flex gap-5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-medium text-brand-400" style={{ background: 'rgba(94,106,210,0.1)' }}>{n}</div>
                <div>
                  <h3 className="text-sm font-medium text-ink-primary mb-1">{t}</h3>
                  <p className="text-[13px] text-ink-tertiary leading-relaxed">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-lg mx-auto px-6 py-24 text-center">
          <h2 className="text-2xl font-medium text-ink-primary tracking-heading mb-3">Stop applying manually</h2>
          <p className="text-sm text-ink-tertiary mb-8">5 free credits. No card required.</p>
          <button onClick={() => navigate('/sign-up')} className="btn-primary text-sm px-5 py-2.5">
            Get started <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t py-6 text-center text-xs text-ink-tertiary" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        &copy; 2026 Envia
      </div>
    </div>
  )
}
