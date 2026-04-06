import React, { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Briefcase, FileText, Crosshair, Zap, Crown, Settings } from 'lucide-react'
import { UserButton } from '@clerk/clerk-react'
import { useAppUser } from '../App'
import CreditsModal from './CreditsModal'
import clsx from 'clsx'

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Home' },
  { to: '/hunt',         icon: Crosshair,        label: 'Hunt Jobs', badge: 'AI' },
  { to: '/jobs',         icon: Briefcase,         label: 'Find Jobs' },
  { to: '/applications', icon: FileText,          label: 'Applications' },
]

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="10" fill="url(#sidebar-logo-grad)"/>
      <path d="M11 25l5-14 5 14M13.5 19.5h6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="26" cy="11" r="3" fill="white" opacity="0.85"/>
      <defs>
        <linearGradient id="sidebar-logo-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B5CF6"/>
          <stop offset="1" stopColor="#6D28D9"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function Layout() {
  const { appUser } = useAppUser()
  const [showCredits, setShowCredits] = useState(false)

  const credits = appUser?.credits ?? 0
  const isAdmin = appUser?.is_admin

  return (
    <div className="min-h-screen flex bg-surface-bg">
      {/* Sidebar */}
      <aside className="w-[260px] flex-shrink-0 flex flex-col bg-white border-r border-surface-border">
        {/* Brand */}
        <div className="px-5 py-6 flex items-center gap-3">
          <Logo />
          <div>
            <p className="font-bold text-lg leading-none text-ink-primary tracking-tight">Envia</p>
            <p className="text-[11px] text-ink-tertiary mt-0.5 font-medium">AI Job Hunter</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-1 space-y-1">
          {NAV.map(({ to, icon: Icon, label, badge }) => (
            <NavLink key={to} to={to} className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-brand-50 text-brand-700 font-semibold shadow-sm'
                  : 'text-ink-secondary hover:bg-surface-hover hover:text-ink-primary'
              )
            }>
              {({ isActive }) => (
                <>
                  <div className={clsx(
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-br from-brand-500 to-brand-700 shadow-sm shadow-brand-500/20'
                      : 'bg-transparent'
                  )}>
                    <Icon className={clsx('w-[16px] h-[16px]', isActive ? 'text-white' : 'text-ink-tertiary')} />
                  </div>
                  <span className="flex-1">{label}</span>
                  {badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-sm shadow-brand-500/20">{badge}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-4 py-5 space-y-3 border-t border-surface-border">
          {/* Credits */}
          {isAdmin ? (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-brand-50 to-purple-50 border border-brand-100">
              <Crown className="w-4 h-4 text-brand-500 flex-shrink-0" />
              <span className="text-sm font-semibold text-brand-700">Admin · Unlimited</span>
            </div>
          ) : (
            <button
              onClick={() => setShowCredits(true)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-surface-hover hover:bg-surface-border transition-all duration-200 group"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                  <Zap className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm font-semibold text-ink-primary">{credits} credits</span>
              </div>
              <span className="text-xs text-brand-500 font-semibold group-hover:text-brand-600">+ Add</span>
            </button>
          )}

          {/* User */}
          <div className="flex items-center gap-3 px-2 py-1">
            <UserButton afterSignOutUrl="/" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-primary truncate">{appUser?.full_name}</p>
              <p className="text-xs text-ink-tertiary truncate">{appUser?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {showCredits && <CreditsModal onClose={() => setShowCredits(false)} />}
    </div>
  )
}
