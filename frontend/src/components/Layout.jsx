import React, { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Briefcase, FileText, Crosshair, Zap, Crown } from 'lucide-react'
import { UserButton } from '@clerk/clerk-react'
import { useAppUser } from '../App'
import CreditsModal from './CreditsModal'
import clsx from 'clsx'

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Home' },
  { to: '/hunt',         icon: Crosshair,        label: 'Hunt', badge: true },
  { to: '/jobs',         icon: Briefcase,         label: 'Jobs' },
  { to: '/applications', icon: FileText,          label: 'Apps' },
]

export default function Layout() {
  const { appUser } = useAppUser()
  const [showCredits, setShowCredits] = useState(false)
  const credits = appUser?.credits ?? 0
  const isAdmin = appUser?.is_admin

  return (
    <div className="min-h-screen bg-surface-bg relative overflow-hidden">
      {/* Ambient background */}
      <div className="orb w-[500px] h-[500px] bg-brand-500/5 top-[-100px] right-[-100px]" />
      <div className="orb w-[300px] h-[300px] bg-orange-500/4 bottom-[10%] left-[-80px]" />

      <div className="relative z-10 flex min-h-screen">
        {/* Floating sidebar */}
        <aside className="w-[200px] flex-shrink-0 p-3">
          <div className="panel h-full flex flex-col p-3">
            {/* Logo */}
            <div className="flex items-center gap-2 px-2 py-2 mb-4">
              <div className="w-5 h-5 rounded-md bg-brand-500 flex items-center justify-center">
                <svg width="11" height="11" viewBox="0 0 32 32" fill="none"><path d="M7 15.2L25 7L17.5 25L14.5 17.5L7 15.2Z" fill="black"/></svg>
              </div>
              <span className="font-semibold text-sm text-ink-primary">Envia</span>
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-0.5">
              {NAV.map(({ to, icon: Icon, label, badge }) => (
                <NavLink key={to} to={to} className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-150',
                    isActive ? 'bg-white/8 text-ink-primary' : 'text-ink-tertiary hover:text-ink-secondary hover:bg-white/4'
                  )
                }>
                  {({ isActive }) => (
                    <>
                      <Icon className={clsx('w-4 h-4', isActive ? 'text-brand-400' : '')} />
                      <span className="flex-1">{label}</span>
                      {badge && <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Bottom */}
            <div className="space-y-2 pt-3 border-t border-white/5">
              {isAdmin ? (
                <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-brand-400">
                  <Crown className="w-3.5 h-3.5" /> Admin
                </div>
              ) : (
                <button onClick={() => setShowCredits(true)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs text-ink-tertiary hover:bg-white/4 transition-colors">
                  <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-brand-400" />{credits}</span>
                  <span className="text-brand-400">+</span>
                </button>
              )}
              <div className="flex items-center gap-2 px-2">
                <UserButton afterSignOutUrl="/" />
                <span className="text-xs text-ink-secondary truncate">{appUser?.full_name?.split(' ')[0]}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-auto p-3">
          <div className="panel min-h-full p-0 overflow-hidden">
            <Outlet />
          </div>
        </main>
      </div>

      {showCredits && <CreditsModal onClose={() => setShowCredits(false)} />}
    </div>
  )
}
