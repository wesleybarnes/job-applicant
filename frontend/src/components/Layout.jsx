import React, { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Briefcase, FileText, Crosshair, Zap, Crown, ChevronDown, Coins, AlertCircle } from 'lucide-react'
import { UserButton } from '@clerk/clerk-react'
import { useAppUser } from '../App'
import CreditsModal from './CreditsModal'
import clsx from 'clsx'

const NAV = [
  { to: '/dashboard',    label: 'Home' },
  { to: '/hunt',         label: 'Hunt' },
  { to: '/jobs',         label: 'Jobs' },
  { to: '/applications', label: 'Applications' },
]

export default function Layout() {
  const { appUser } = useAppUser()
  const [showCredits, setShowCredits] = useState(false)
  const credits = appUser?.credits ?? 0
  const isAdmin = appUser?.is_admin
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#111111' }}>
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b h-12 flex items-center px-5 flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(17,17,17,0.9)', backdropFilter: 'blur(12px)' }}>
        {/* Logo */}
        <div className="flex items-center gap-2 mr-8">
          <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: '#5E6AD2' }}>
            <svg width="10" height="10" viewBox="0 0 32 32" fill="none"><path d="M7 15.2L25 7L17.5 25L14.5 17.5L7 15.2Z" fill="white"/></svg>
          </div>
          <span className="font-medium text-[14px] text-ink-primary tracking-tight">Envia</span>
        </div>

        {/* Nav tabs */}
        <nav className="flex items-center gap-1 flex-1">
          {NAV.map(({ to, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) =>
              clsx(
                'px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors duration-100',
                isActive
                  ? 'bg-white/[0.08] text-ink-primary'
                  : 'text-ink-tertiary hover:text-ink-secondary'
              )
            }>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {isAdmin ? (
            <span className="text-[11px] text-brand-400 font-medium flex items-center gap-1"><Crown className="w-3 h-3" /> Admin</span>
          ) : (
            <button
              onClick={() => setShowCredits(true)}
              title={credits < 5 ? "Low credits — click to top up" : "Credits — click to top up"}
              className={`flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                credits < 5
                  ? 'text-amber-300 border-amber-300/30 bg-amber-300/10 hover:bg-amber-300/15'
                  : 'text-brand-300 border-brand-500/25 bg-brand-500/10 hover:bg-brand-500/15'
              }`}
            >
              {credits < 5 ? <AlertCircle className="w-3 h-3" /> : <Coins className="w-3 h-3" />}
              <span>{credits} {credits === 1 ? 'credit' : 'credits'}</span>
              {credits < 5 && <span className="text-[10px] opacity-80 ml-0.5">· Top up</span>}
            </button>
          )}
          <div className="w-px h-4 bg-white/[0.08]" />
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {showCredits && <CreditsModal onClose={() => setShowCredits(false)} />}
    </div>
  )
}
