import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Upload, Bot, BarChart3, CheckCircle, ArrowRight } from 'lucide-react'

const FEATURES = [
  {
    icon: Upload,
    title: 'Upload Your Resume',
    desc: 'PDF or Word — we parse and understand your full work history automatically.',
  },
  {
    icon: Bot,
    title: 'AI Writes Cover Letters',
    desc: 'Claude Opus analyzes each job and crafts a unique, compelling cover letter.',
  },
  {
    icon: BarChart3,
    title: 'Match Scoring',
    desc: 'See exactly how well you fit each role before applying. Skip the long shots.',
  },
  {
    icon: CheckCircle,
    title: 'Track Everything',
    desc: 'One dashboard for all your applications, statuses, and next steps.',
  },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-700 to-indigo-800 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl">ApplyAI</span>
        </div>
        <button
          onClick={() => navigate('/onboarding')}
          className="bg-white text-primary-700 px-5 py-2 rounded-lg font-semibold text-sm hover:bg-primary-50 transition-colors"
        >
          Get Started Free
        </button>
      </nav>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-8 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-1.5 rounded-full text-sm mb-6 border border-white/20">
          <Sparkles className="w-3.5 h-3.5" />
          Powered by Claude Opus 4.6
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6">
          Let AI apply to jobs
          <br />
          <span className="text-indigo-200">while you sleep</span>
        </h1>
        <p className="text-xl text-indigo-100 max-w-2xl mx-auto mb-10">
          Upload your resume, answer a quick survey, and let our AI agent hunt for
          jobs, score your fit, and write personalized cover letters — automatically.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/onboarding')}
            className="flex items-center justify-center gap-2 bg-white text-primary-700 px-8 py-3.5 rounded-xl font-bold text-base hover:bg-indigo-50 transition-colors shadow-lg"
          >
            Start Applying <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{title}</h3>
              <p className="text-indigo-200 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-8 text-indigo-300 text-sm">
        Built with Claude Opus 4.6 · FastAPI · React
      </div>
    </div>
  )
}
