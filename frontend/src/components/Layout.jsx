import React, { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Briefcase, FileText, Crosshair, Zap, Crown } from 'lucide-react'
import { UserButton } from '@clerk/clerk-react'
import { useAppUser } from '../App'
import CreditsModal from './CreditsModal'
import clsx from 'clsx'

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/hunt',         icon: Crosshair,        label: 'Hunt Jobs', badge: 'NEW' },
  { to: '/jobs',         icon: Briefcase,         label: 'Find Jobs' },
  { to: '/applications', icon: FileText,          label: 'Applications' },
]

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#4B9CD3"/>
      <path d="M10 22l4-12 4 12M12.5 17h5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="23" cy="10" r="2.5" fill="white" opacity="0.9"/>
    </svg>
  )
}

export default function Layout() {
  const { appUser } = useAppUser()
  const [showCredits, setShowCredits] = useState(false)

  const credits = appUser?.credits ?? 0
  const isAdmin = appUser?.is_admin

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 flex flex-col flex-shrink-0 bg-white border-r border-slate-100" style={{ boxShadow: '1px 0 0 #F1F5F9' }}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Logo />
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">Envia</span>
              <p className="text-xs text-slate-400">Powered by Claude</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label, badge }) => (
            <NavLink key={to} to={to} className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )
            }>
              {({ isActive }) => (
                <>
                  <Icon className={clsx('w-4 h-4 flex-shrink-0', isActive ? 'text-primary-500' : 'text-slate-400')} />
                  {label}
                  {badge && (
                    <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-600 font-semibold">{badge}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Credits + User */}
        <div className="px-3 py-4 border-t border-slate-100 space-y-3">
          {isAdmin ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 rounded-xl border border-primary-100">
              <Crown className="w-4 h-4 text-primary-500" />
              <span className="text-sm font-semibold text-primary-700">Admin — Unlimited</span>
            </div>
          ) : (
            <button
              onClick={() => setShowCredits(true)}
              className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-primary-50 rounded-xl border border-slate-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary-500" />
                <span className="text-sm font-medium text-slate-700">{credits} credit{credits !== 1 ? 's' : ''}</span>
              </div>
              <span className="text-xs text-primary-600 font-semibold">+ Add</span>
            </button>
          )}

          <div className="flex items-center gap-2.5 px-1">
            <UserButton afterSignOutUrl="/" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{appUser?.full_name}</p>
              <p className="text-xs text-slate-400 truncate">{appUser?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {showCredits && <CreditsModal onClose={() => setShowCredits(false)} />}
    </div>
  )
}
