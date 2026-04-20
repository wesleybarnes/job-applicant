import React, { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Briefcase, FileText, Crosshair, Zap, Crown } from 'lucide-react'
import { UserButton } from '@clerk/clerk-react'
import { useAppUser } from '../App'
import CreditsModal from './CreditsModal'
import clsx from 'clsx'

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Home' },
  { to: '/hunt',         icon: Crosshair,        label: 'Hunt' },
  { to: '/jobs',         icon: Briefcase,         label: 'Jobs' },
  { to: '/applications', icon: FileText,          label: 'Applications' },
]

export default function Layout() {
  const { appUser } = useAppUser()
  const [showCredits, setShowCredits] = useState(false)
  const credits = appUser?.credits ?? 0
  const isAdmin = appUser?.is_admin

  return (
    <div className="min-h-screen flex" style={{ background: '#111111' }}>
      <aside className="w-[220px] flex-shrink-0 flex flex-col border-r" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="px-4 py-4 flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: '#5E6AD2' }}>
            <svg width="12" height="12" viewBox="0 0 32 32" fill="none"><path d="M7 15.2L25 7L17.5 25L14.5 17.5L7 15.2Z" fill="white"/></svg>
          </div>
          <span className="font-medium text-[15px] text-ink-primary tracking-tight">Envia</span>
        </div>

        <nav className="flex-1 px-2 space-y-px">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) =>
              clsx(
                'flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] transition-colors duration-100',
                isActive
                  ? 'bg-white/[0.06] text-ink-primary font-medium'
                  : 'text-ink-tertiary hover:text-ink-secondary hover:bg-white/[0.03]'
              )
            }>
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-3 space-y-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {isAdmin ? (
            <div className="flex items-center gap-2 px-2 py-1 text-xs text-brand-400">
              <Crown className="w-3.5 h-3.5" /><span className="font-medium">Admin</span>
            </div>
          ) : (
            <button onClick={() => setShowCredits(true)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-ink-tertiary hover:bg-white/[0.03] transition-colors">
              <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-brand-400" />{credits} credits</span>
              <span className="text-brand-400 text-[11px]">Add</span>
            </button>
          )}
          <div className="flex items-center gap-2.5 px-2 py-1">
            <UserButton afterSignOutUrl="/" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-ink-primary truncate">{appUser?.full_name}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto"><Outlet /></main>
      {showCredits && <CreditsModal onClose={() => setShowCredits(false)} />}
    </div>
  )
}
