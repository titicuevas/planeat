import { Routes, Route, Navigate, useNavigate, Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './config/supabase'
import type { Session } from '@supabase/supabase-js'
import Welcome from './pages/Welcome'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ProfileSetup from './pages/ProfileSetup'
import Cesta from './pages/Cesta'
import AuthCallback from './pages/AuthCallback'
import Receta from './pages/Receta'
import { AppProvider, useApp } from './context/AppContext'
import LoadingSpinner from './components/LoadingSpinner'
import ThemeToggle from './components/ThemeToggle'

function AppContent() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [generandoCesta, setGenerandoCesta] = useState(false)
  const { isLoading } = useApp()
  const navigate = useNavigate();
  const location = useLocation();

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
          .maybeSingle();
        if (error && error.code !== 'PGRST116') {
          await supabase.auth.signOut();
          setSession(null);
          setProfile(null);
          navigate('/', { replace: true });
          return;
        }
        setProfile(data || null);
      } else {
        setProfile(null)
      }
    }
    fetchProfile()
  }, [session, navigate])

  useEffect(() => {
    // Si el usuario está logueado y el perfil está incompleto, redirige a ProfileSetup
    if (session && profile && (!profile.name || !profile.goal || !profile.intolerances || profile.intolerances.length === 0)) {
      navigate('/perfil', { replace: true })
    }
  }, [session, profile, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-secondary-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-secondary-900 flex flex-col transition-colors duration-200">
      {isLoading && <LoadingSpinner message="Generando menú y lista de la compra..." />}
      <div className="flex-1">
        <Routes>
          <Route index element={!session ? <Welcome /> : <Navigate to="/inicio" replace />} />
          <Route path="login" element={!session ? <Login /> : <Navigate to="/inicio" replace />} />
          <Route path="register" element={!session ? <Register /> : <Navigate to="/inicio" replace />} />
          <Route path="perfil" element={session ? <ProfileSetup /> : <Navigate to="/login" replace />} />
          <Route path="inicio" element={session ? <Dashboard session={session} setGenerandoCesta={setGenerandoCesta} /> : <Navigate to="/login" replace />} />
          <Route path="cesta" element={<Cesta />} />
          <Route path="receta/:recetaId" element={<Receta />} />
          <Route path="auth/callback" element={<AuthCallback />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

export default App 