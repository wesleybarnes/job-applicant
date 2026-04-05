import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, FileText, Bot, TrendingUp, ArrowRight, Upload, CheckCircle } from 'lucide-react'
import { listApplications, listJobs, getResumes } from '../api/client'
import { useAppUser } from '../App'

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  ready_to_submit: 'bg-purple-100 text-purple-700',
  submitted: 'bg-green-100 text-green-700',
  applied: 'bg-green-100 text-green-700',
  interviewing: 'bg-indigo-100 text-indigo-700',
  rejected: 'bg-red-100 text-red-700',
  offer: 'bg-emerald-100 text-emerald-700',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { appUser: user } = useAppUser()
  const [applications, setApplications] = useState([])
  const [jobs, setJobs] = useState([])
  const [resumes, setResumes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      try {
        const [apps, j, r] = await Promise.all([
          listApplications(user.id),
          listJobs({ limit: 5 }),
          getResumes(user.id),
        ])
        setApplications(apps)
        setJobs(j)
        setResumes(r)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  const stats = [
    { label: 'Jobs Found', value: jobs.length, icon: Briefcase, color: 'text-blue-600 bg-blue-50' },
    { label: 'Applications', value: applications.length, icon: FileText, color: 'text-purple-600 bg-purple-50' },
    { label: 'AI-Generated', value: applications.filter(a => a.cover_letter).length, icon: Bot, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Submitted', value: applications.filter(a => ['submitted', 'applied', 'interviewing'].includes(a.status)).length, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
  ]

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-gray-500 mt-1">Your job search is in good hands.</p>
      </div>

      {/* Resume alert */}
      {resumes.length === 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Upload className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800 text-sm">No resume uploaded yet</p>
              <p className="text-xs text-amber-600">Upload your resume so the AI can write better cover letters.</p>
            </div>
          </div>
          <button className="btn-primary text-sm py-1.5" onClick={() => navigate('/dashboard')}>
            Upload Now
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Applications */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Applications</h2>
            <button onClick={() => navigate('/applications')} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {applications.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No applications yet.</p>
              <button onClick={() => navigate('/jobs')} className="text-sm text-primary-600 hover:underline mt-1">
                Find jobs to apply to →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.slice(0, 5).map(app => (
                <div key={app.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{app.job?.title || 'Unknown Job'}</p>
                    <p className="text-xs text-gray-500 truncate">{app.job?.company}</p>
                  </div>
                  <span className={`badge ml-3 flex-shrink-0 ${STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-600'}`}>
                    {app.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/jobs')}
              className="w-full flex items-center gap-3 p-4 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors text-left"
            >
              <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-primary-900">Search for Jobs</p>
                <p className="text-xs text-primary-600">Find matching positions and add to your queue</p>
              </div>
              <ArrowRight className="w-4 h-4 text-primary-600 ml-auto" />
            </button>

            <button
              onClick={() => navigate('/applications')}
              className="w-full flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors text-left"
            >
              <div className="w-9 h-9 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-purple-900">Run AI Agent</p>
                <p className="text-xs text-purple-600">Let Claude analyze and prepare your applications</p>
              </div>
              <ArrowRight className="w-4 h-4 text-purple-600 ml-auto" />
            </button>

            <button
              onClick={() => navigate('/applications')}
              className="w-full flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors text-left"
            >
              <div className="w-9 h-9 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-green-900">Track Progress</p>
                <p className="text-xs text-green-600">Monitor statuses, interviews, and offers</p>
              </div>
              <ArrowRight className="w-4 h-4 text-green-600 ml-auto" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
