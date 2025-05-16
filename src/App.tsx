import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './config/supabase'
import type { Session } from '@supabase/supabase-js'
import Welcome from './pages/Welcome'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ProfileSetup from './pages/ProfileSetup'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const navigate = useNavigate();

  useEffect(() => {
    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Escuchar cambios en la autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const fetchProfile = async () => {
      if (session) {
        const { data, error } = await supabase
          .from('profiles')
          .select('name, goal, intolerances')
          .eq('id', session.user.id)
          .single()
        setProfile(data)
      } else {
        setProfile(null)
      }
    }
    fetchProfile()
  }, [session])

  useEffect(() => {
    // Si el usuario está logueado y el perfil está incompleto, redirige a ProfileSetup
    if (session && profile && (!profile.name || !profile.goal || !profile.intolerances || profile.intolerances.length === 0)) {
      navigate('/perfil', { replace: true })
    }
  }, [session, profile, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route index element={!session ? <Welcome /> : <Navigate to="/inicio" replace />} />
        <Route path="login" element={!session ? <Login /> : <Navigate to="/inicio" replace />} />
        <Route path="register" element={!session ? <Register /> : <Navigate to="/inicio" replace />} />
        <Route path="perfil" element={session ? <ProfileSetup /> : <Navigate to="/login" replace />} />
        <Route path="inicio" element={session ? <Dashboard session={session} /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App 