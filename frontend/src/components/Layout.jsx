import React, { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Briefcase, FileText, Crosshair, Zap, Crown } from 'lucide-react'
import { UserButton } from '@clerk/clerk-react'
import { useAppUser } from '../App'
import CreditsModal from './CreditsModal'
import clsx from 'clsx'

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/hunt',         icon: Crosshair,        label: 'Hunt Jobs' },
  { to: '/jobs',         icon: Briefcase,         label: 'Find Jobs' },
  { to: '/applications', icon: FileText,          label: 'Applications' },
]

function EnviaLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa"/>
          <stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
      </defs>
      <polygon points="16,2 28,9 28,23 16,30 4,23 4,9" fill="url(#logoGrad)"/>
      <polygon points="20,9 13,15.5 17,15.5 12,23 19,16.5 15,16.5" fill="#f59e0b"/>
    </svg>
  )
}

export default function Layout() {
  const { appUser } = useAppUser()
  const [showCredits, setShowCredits] = useState(false)

  const credits = appUser?.credits ?? 0
  const isAdmin = appUser?.is_admin

  return (
    <div className="min-h-screen flex">
      <aside
        className="w-64 flex flex-col flex-shrink-0"
        style={{ background: 'linear-gradient(180deg, #120630 0%, #1e0a4a 100%)' }}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <EnviaLogo />
            <div>
              <span className="font-display font-bold text-lg text-white tracking-tight">Envia</span>
              <p className="text-xs text-primary-300 mt-0.5">Powered by Claude</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-primary-300 hover:bg-white/8 hover:text-white'
              )
            }>
              {({ isActive }) => (
                <>
                  <Icon className={clsx('w-4 h-4', isActive ? 'text-gold-400' : '')} />
                  {label}
                  {to === '/hunt' && (
                    <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full bg-gold-500/20 text-gold-400 font-semibold">NEW</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Credits + User */}
        <div className="p-4 border-t border-white/10 space-y-3">
          {isAdmin ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-gold-500/15 rounded-xl border border-gold-500/25">
              <Crown className="w-4 h-4 text-gold-400" />
              <span className="text-sm font-semibold text-gold-300">Admin — Unlimited</span>
            </div>
          ) : (
            <button
              onClick={() => setShowCredits(true)}
              className="w-full flex items-center justify-between px-3 py-2 bg-white/8 hover:bg-white/15 rounded-xl border border-white/15 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-gold-400" />
                <span className="text-sm font-medium text-white">
                  {credits} credit{credits !== 1 ? 's' : ''}
                </span>
              </div>
              <span className="text-xs text-gold-400 font-semibold">+ Add</span>
            </button>
          )}

          <div className="flex items-center gap-3 px-1">
            <UserButton afterSignOutUrl="/" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{appUser?.full_name}</p>
              <p className="text-xs text-primary-300 truncate">{appUser?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-gray-50">
        <Outlet />
      </main>

      {showCredits && <CreditsModal onClose={() => setShowCredits(false)} />}
    </div>
  )
}
