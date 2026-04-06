import React, { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Briefcase, FileText, Crosshair, Zap, Crown } from 'lucide-react'
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
    <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="url(#sl)"/>
      <path d="M7 15.2L25 7L17.5 25L14.5 17.5L7 15.2Z" fill="white" opacity="0.95"/>
      <path d="M14.5 17.5L25 7" stroke="white" strokeWidth="1" opacity="0.4"/>
      <defs><linearGradient id="sl" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse"><stop stopColor="#06B6D4"/><stop offset="1" stopColor="#0E7490"/></linearGradient></defs>
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
      <aside className="w-[240px] flex-shrink-0 flex flex-col border-r border-surface-border bg-surface-card">
        <div className="px-5 py-5 flex items-center gap-2.5">
          <Logo />
          <span className="font-bold text-lg leading-none text-ink-primary tracking-tight">Envia</span>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label, badge }) => (
            <NavLink key={to} to={to} className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-brand-500/10 text-brand-400'
                  : 'text-ink-secondary hover:bg-surface-hover hover:text-ink-primary'
              )
            }>
              {({ isActive }) => (
                <>
                  <Icon className={clsx('w-[17px] h-[17px]', isActive ? 'text-brand-400' : 'text-ink-tertiary')} />
                  <span className="flex-1">{label}</span>
                  {badge && <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-brand-500/20 text-brand-400">{badge}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 space-y-3 border-t border-surface-border">
          {isAdmin ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-500/10 border border-brand-500/20">
              <Crown className="w-4 h-4 text-brand-400 flex-shrink-0" />
              <span className="text-sm font-semibold text-brand-400">Admin</span>
            </div>
          ) : (
            <button onClick={() => setShowCredits(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-surface-hover hover:bg-surface-border/50 transition-colors">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-brand-400" />
                <span className="text-sm font-semibold text-ink-primary">{credits}</span>
              </div>
              <span className="text-xs text-brand-400 font-semibold">+ Add</span>
            </button>
          )}
          <div className="flex items-center gap-3 px-2 py-1">
            <UserButton afterSignOutUrl="/" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-primary truncate">{appUser?.full_name}</p>
              <p className="text-xs text-ink-tertiary truncate">{appUser?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto"><Outlet /></main>
      {showCredits && <CreditsModal onClose={() => setShowCredits(false)} />}
    </div>
  )
}
