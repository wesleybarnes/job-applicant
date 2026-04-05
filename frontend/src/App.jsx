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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
    </div>
  )
}

function AuthPage({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 to-indigo-800 flex items-center justify-center p-4">
      {children}
    </div>
  )
}

// Gate: redirect to /sign-in if not authenticated, show spinner while loading
function RequireAuth({ children }) {
  const { isSignedIn, isLoaded } = useAuth()
  const location = useLocation()
  if (!isLoaded) return <Spinner />
  if (!isSignedIn) return <Navigate to="/sign-in" state={{ from: location }} replace />
  return children
}

// Gate: redirect to /dashboard if already authenticated
function RequireGuest({ children }) {
  const { isSignedIn, isLoaded } = useAuth()
  if (!isLoaded) return <Spinner />
  if (isSignedIn) return <Navigate to="/dashboard" replace />
  return children
}

// Inner app — only rendered when signed in, handles backend user fetch
function InnerApp() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const { user: clerkUser } = useUser()
  const [appUser, setAppUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setupAuthInterceptor(() => getToken())
  }, [getToken])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let cancelled = false

    const fetchUser = async () => {
      // Retry up to 8 times with backoff — token may not be ready immediately after redirect
      for (let i = 0; i < 8; i++) {
        if (cancelled) return
        try {
          const token = await getToken()
          if (!token) { await new Promise(r => setTimeout(r, 500)); continue }
          const u = await getMe()
          if (!cancelled) { setAppUser(u); setLoading(false) }
          return
        } catch {
          await new Promise(r => setTimeout(r, 500))
        }
      }
      if (!cancelled) setLoading(false)
    }

    fetchUser()
    return () => { cancelled = true }
  }, [isLoaded, isSignedIn])

  const refreshUser = async () => {
    const u = await getMe()
    setAppUser(u)
    return u
  }

  if (loading) return <Spinner />

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
        {/* Public routes */}
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

        {/* Protected routes */}
        <Route path="/*" element={
          <RequireAuth>
            <InnerApp />
          </RequireAuth>
        } />
      </Routes>
    </BrowserRouter>
  )
}
