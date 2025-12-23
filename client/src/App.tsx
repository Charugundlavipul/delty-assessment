import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { supabase } from './supabaseClient'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard.tsx'
import PatientProfile from './pages/PatientProfile'
import './index.css'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div>Loading...</div>
  if (!session) return <Navigate to="/auth" />

  return <>{children}</>
}

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patients/:id"
          element={
            <ProtectedRoute>
              <PatientProfile />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  )
}

export default App
