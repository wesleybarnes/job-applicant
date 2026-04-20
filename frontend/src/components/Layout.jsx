import React, { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Briefcase, FileText, Crosshair, Zap, Crown } from 'lucide-react'
import { UserButton } from '@clerk/clerk-react'
import { useAppUser } from '../App'
import CreditsModal from './CreditsModal'
import clsx from 'clsx'

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Home' },
  { to: '/hunt',         icon: Crosshair,        label: 'Hunt', badge: 'AI' },
  { to: '/jobs',         icon: Briefcase,         label: 'Jobs' },
  { to: '/applications', icon: FileText,          label: 'Applications' },
]

export default function Layout() {
  const { appUser } = useAppUser()
  const [showCredits, setShowCredits] = useState(false)
  const credits = appUser?.credits ?? 0
  const isAdmin = appUser?.is_admin

  return (
    <div className="min-h-screen flex bg-surface-bg">
      <aside className="w-[220px] flex-shrink-0 flex flex-col border-r border-surface-border">
        {/* Brand */}
        <div className="px-4 py-4 flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-brand-500 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 32 32" fill="none"><path d="M7 15.2L25 7L17.5 25L14.5 17.5L7 15.2Z" fill="white"/></svg>
          </div>
          <span className="font-semibold text-sm text-ink-primary">Envia</span>
        </div>

        <nav className="flex-1 px-2 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label, badge }) => (
            <NavLink key={to} to={to} className={({ isActive }) =>
              clsx(
                'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors duration-100',
                isActive ? 'bg-surface-hover text-ink-primary' : 'text-ink-tertiary hover:text-ink-secondary hover:bg-surface-hover/50'
              )
            }>
              {({ isActive }) => (
                <>
                  <Icon className={clsx('w-4 h-4', isActive ? 'text-ink-primary' : 'text-ink-tertiary')} />
                  <span className="flex-1">{label}</span>
                  {badge && <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/15 text-brand-400 font-semibold">{badge}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-2 py-3 space-y-2 border-t border-surface-border">
          {isAdmin ? (
            <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-brand-400">
              <Crown className="w-3.5 h-3.5" /> Admin
            </div>
          ) : (
            <button onClick={() => setShowCredits(true)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-ink-secondary hover:bg-surface-hover transition-colors">
              <span className="flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-brand-400" />{credits} credits</span>
              <span className="text-brand-400">+</span>
            </button>
          )}
          <div className="flex items-center gap-2.5 px-2.5 py-1">
            <UserButton afterSignOutUrl="/" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-ink-primary truncate">{appUser?.full_name}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto"><Outlet /></main>
      {showCredits && <CreditsModal onClose={() => setShowCredits(false)} />}
    </div>
  )
}
