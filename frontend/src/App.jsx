import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import JobsPage from './pages/JobsPage'
import ApplicationsPage from './pages/ApplicationsPage'
import Layout from './components/Layout'

function App() {
  const [userId, setUserId] = useState(() => {
    const stored = localStorage.getItem('applyai_user_id')
    return stored ? parseInt(stored) : null
  })

  const handleUserCreated = (id) => {
    localStorage.setItem('applyai_user_id', String(id))
    setUserId(id)
  }

  const handleLogout = () => {
    localStorage.removeItem('applyai_user_id')
    setUserId(null)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          userId ? <Navigate to="/dashboard" replace /> : <LandingPage />
        } />
        <Route path="/onboarding" element={
          userId ? <Navigate to="/dashboard" replace /> :
          <OnboardingPage onUserCreated={handleUserCreated} />
        } />
        <Route element={<Layout userId={userId} onLogout={handleLogout} />}>
          <Route path="/dashboard" element={
            userId ? <DashboardPage userId={userId} /> : <Navigate to="/" replace />
          } />
          <Route path="/jobs" element={
            userId ? <JobsPage userId={userId} /> : <Navigate to="/" replace />
          } />
          <Route path="/applications" element={
            userId ? <ApplicationsPage userId={userId} /> : <Navigate to="/" replace />
          } />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
