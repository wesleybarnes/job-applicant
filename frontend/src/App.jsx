import React, { useEffect, useState, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth, useUser, SignIn, SignUp } from '@clerk/clerk-react'
import { setupAuthInterceptor, getMe, onboardMe } from './api/client'
import LandingPage from './pages/LandingPage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import JobsPage from './pages/JobsPage'
import ApplicationsPage from './pages/ApplicationsPage'
import Layout from './components/Layout'

// ─── App-wide user context ────────────────────────────────────────────────────
export const AppUserContext = createContext(null)
export const useAppUser = () => useContext(AppUserContext)

function AuthedApp() {
  const { getToken, isSignedIn, isLoaded } = useAuth()
  const { user: clerkUser } = useUser()
  const [appUser, setAppUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Wire Clerk token into every API call
  useEffect(() => {
    setupAuthInterceptor(() => getToken())
  }, [getToken])

  // Fetch/create backend user whenever Clerk auth is ready
  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { setLoading(false); return }

    getMe()
      .then(u => setAppUser(u))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isLoaded, isSignedIn])

  const refreshUser = async () => {
    const u = await getMe()
    setAppUser(u)
    return u
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/sign-in" element={
            <AuthPage>
              <SignIn routing="path" path="/sign-in" afterSignInUrl="/dashboard" />
            </AuthPage>
          } />
          <Route path="/sign-up" element={
            <AuthPage>
              <SignUp routing="path" path="/sign-up" afterSignUpUrl="/onboarding" />
            </AuthPage>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    )
  }

  // Signed in but not onboarded yet
  if (!appUser?.onboarding_complete) {
    return (
      <AppUserContext.Provider value={{ appUser, refreshUser }}>
        <BrowserRouter>
          <Routes>
            <Route path="/onboarding" element={
              <OnboardingPage clerkUser={clerkUser} onComplete={refreshUser} />
            } />
            <Route path="*" element={<Navigate to="/onboarding" replace />} />
          </Routes>
        </BrowserRouter>
      </AppUserContext.Provider>
    )
  }

  return (
    <AppUserContext.Provider value={{ appUser, refreshUser }}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AppUserContext.Provider>
  )
}

function AuthPage({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 to-indigo-800 flex items-center justify-center p-4">
      {children}
    </div>
  )
}

export default function App() {
  return <AuthedApp />
}
