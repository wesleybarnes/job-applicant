import React, { useEffect, useState, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth, useUser, SignIn, SignUp } from '@clerk/clerk-react'
import { setupAuthInterceptor, getMe } from './api/client'
import LandingPage from './pages/LandingPage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import JobsPage from './pages/JobsPage'
import ApplicationsPage from './pages/ApplicationsPage'
import HuntPage from './pages/HuntPage'
import Layout from './components/Layout'

export const AppUserContext = createContext(null)
export const useAppUser = () => useContext(AppUserContext)

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
    </div>
  )
}

function BackendError({ error, onRetry }) {
  const { signOut } = useAuth()
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="text-center max-w-md bg-white rounded-2xl p-8 shadow-card border border-slate-100">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h2 className="font-bold text-slate-900 text-xl mb-2">Can't reach the server</h2>
        <p className="text-slate-500 text-sm mb-3 leading-relaxed">
          The backend isn't responding. Try again, or sign out and back in.
        </p>
        {error && (
          <p className="text-red-500 text-xs font-mono bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-6 break-all">
            {String(error)}
          </p>
        )}
        <div className="flex flex-col gap-3">
          <button onClick={onRetry} className="btn-primary px-8 w-full">Retry</button>
          <button onClick={() => signOut({ redirectUrl: '/' })} className="text-sm text-slate-400 hover:text-slate-700 transition-colors">
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

function AuthPage({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 hero-gradient">
      {children}
    </div>
  )
}

function RequireAuth({ children }) {
  const { isSignedIn, isLoaded } = useAuth()
  const location = useLocation()
  if (!isLoaded) return <Spinner />
  if (!isSignedIn) return <Navigate to="/sign-in" state={{ from: location }} replace />
  return children
}

function RequireGuest({ children }) {
  const { isSignedIn, isLoaded } = useAuth()
  if (!isLoaded) return <Spinner />
  if (isSignedIn) return <Navigate to="/dashboard" replace />
  return children
}

function InnerApp() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const { user: clerkUser } = useUser()
  const [appUser, setAppUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    setupAuthInterceptor(() => getToken())
  }, [getToken])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let cancelled = false
    setFetchError(false)
    setLoading(true)

    const fetchUser = async () => {
      let lastError = null
      for (let i = 0; i < 4; i++) {
        if (cancelled) return
        try {
          const token = await getToken()
          if (!token) { await new Promise(r => setTimeout(r, 500)); continue }
          const u = await getMe()
          if (!cancelled) {
            setAppUser(u)
            setFetchError(false)
            setLoading(false)
          }
          return
        } catch (e) {
          // 404 = no profile yet (new user) → go to onboarding, not an error
          if (e?.response?.status === 404) {
            if (!cancelled) { setAppUser(null); setFetchError(false); setLoading(false) }
            return
          }
          lastError = e?.response?.data?.detail || e?.message || `HTTP ${e?.response?.status || 'network error'}`
          if (i < 3) await new Promise(r => setTimeout(r, 800))
        }
      }
      // All retries exhausted — show error page, never redirect to onboarding
      if (!cancelled) {
        setFetchError(lastError || 'Could not connect to backend')
        setLoading(false)
      }
    }

    fetchUser()
    return () => { cancelled = true }
  }, [isLoaded, isSignedIn, retryCount])

  const refreshUser = async () => {
    const u = await getMe()
    setAppUser(u)
    return u
  }

  if (loading) return <Spinner />

  // Backend unreachable — show error page, never redirect to onboarding
  if (fetchError) {
    return <BackendError error={fetchError} onRetry={() => setRetryCount(c => c + 1)} />
  }

  // Onboarding not complete (new user or 404 from backend)
  if (!appUser?.onboarding_complete) {
    return (
      <AppUserContext.Provider value={{ appUser, refreshUser }}>
        <Routes>
          <Route path="/onboarding" element={
            <OnboardingPage clerkUser={clerkUser} onComplete={refreshUser} />
          } />
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </Routes>
      </AppUserContext.Provider>
    )
  }

  return (
    <AppUserContext.Provider value={{ appUser, refreshUser }}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/hunt" element={<HuntPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppUserContext.Provider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/sign-in/*" element={
          <RequireGuest>
            <AuthPage>
              <SignIn routing="path" path="/sign-in" afterSignInUrl="/dashboard" />
            </AuthPage>
          </RequireGuest>
        } />
        <Route path="/sign-up/*" element={
          <RequireGuest>
            <AuthPage>
              <SignUp routing="path" path="/sign-up" afterSignUpUrl="/onboarding" />
            </AuthPage>
          </RequireGuest>
        } />
        <Route path="/*" element={
          <RequireAuth>
            <InnerApp />
          </RequireAuth>
        } />
      </Routes>
    </BrowserRouter>
  )
}
