import { Routes, Route, Navigate, useNavigate, Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './config/supabase'
import type { Session } from '@supabase/supabase-js'
import Welcome from './pages/Welcome'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Cesta from './pages/Cesta'
import AuthCallback from './pages/AuthCallback'
import Receta from './pages/Receta'
import ForgotPassword from './pages/ForgotPassword'
import ResetPasswordSent from './pages/ResetPasswordSent'
import ResetPassword from './pages/ResetPassword'
import { AppProvider, useApp } from './context/AppContext'
import LoadingSpinner from './components/LoadingSpinner'
import ThemeToggle from './components/ThemeToggle'
import Navbar from './components/Navbar'
import ProfileSetup from './pages/ProfileSetup'

function AppContent() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [generandoCesta, setGenerandoCesta] = useState(false)
  const { isLoading } = useApp()
  const navigate = useNavigate();
  const location = useLocation();
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileRetry, setProfileRetry] = useState(0);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [showProfileRetry, setShowProfileRetry] = useState(false);

  // Loader global solo si está cargando sesión o perfil
  const showGlobalLoader = loading || !sessionChecked || loadingProfile;

  // Refuerzo: limpiar todo tras logout y borrar datos relacionados si el usuario es eliminado
  const handleLogout = async () => {
    try {
      // Llamar a un endpoint para borrar datos relacionados si el usuario va a ser eliminado (opcional)
      // await fetch('/api/delete-user-data', { method: 'POST', credentials: 'include' });
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error cerrando sesión:', err);
    } finally {
      setSession(null);
      setProfile(null);
      setProfileLoaded(false);
      setLoading(true);
      setSessionChecked(false);
      setLoadingProfile(false);
      setProfileRetry(0);
      localStorage.clear();
      sessionStorage.clear();
      navigate('/login', { replace: true });
    }
  };

  // Refuerzo: NO forzar reload tras login/logout, solo actualizar estado
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setSessionChecked(false);
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setLoading(false);
      setSessionChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      setSession(session);
      setSessionChecked(true);
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setProfile(null);
        setProfileLoaded(false);
        setLoading(true);
        setSessionChecked(false);
        setLoadingProfile(false);
        setProfileRetry(0);
        localStorage.clear();
        sessionStorage.clear();
        navigate('/login', { replace: true });
      }
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Solo una vez al montar

  useEffect(() => {
    let retryCount = 0;
    let retryTimeout: NodeJS.Timeout | null = null;
    const fetchProfile = async () => {
      if (session) {
        setLoadingProfile(true);
        setProfileError(null);
        setShowProfileRetry(false);
        const { data, error } = await supabase
          .from('profiles')
          .select('name, goal, intolerances, weight, height')
          .eq('id', session.user.id)
          .maybeSingle();
        if (data) {
          // Si intolerances no es array, lo parseamos
          if (data.intolerances && !Array.isArray(data.intolerances)) {
            try {
              data.intolerances = JSON.parse(data.intolerances);
            } catch {
              data.intolerances = [];
            }
          }
        }
        if (!data && !error) {
          // Si no existe perfil, lo creamos automáticamente (ahora con upsert)
          console.info('No existe perfil, creando perfil vacío para el usuario...');
          const { error: upsertError } = await supabase.from('profiles').upsert({
            id: session.user.id,
            name: '',
            goal: '',
            intolerances: [],
            weight: null,
            height: null,
            email: session.user.email
          });
          if (upsertError) {
            console.error('Error creando perfil tras registro:', upsertError?.message || upsertError);
            setProfileError('No se pudo crear tu perfil automáticamente. Por favor, contacta con soporte o reintenta más tarde.');
            setProfile(null);
            setProfileLoaded(false);
            setLoadingProfile(false);
            setShowProfileRetry(true);
            return;
          } else {
            // Volver a intentar cargar el perfil tras crearlo
            setTimeout(fetchProfile, 500);
            return;
          }
        }
        if (error && error.code !== 'PGRST116') {
          await supabase.auth.signOut();
          setSession(null);
          setProfile(null);
          setProfileLoaded(false);
          setLoadingProfile(false);
          navigate('/', { replace: true });
          return;
        }
        let profileData = data || null;
        setProfile(profileData);
        setProfileLoaded(!!profileData);
        if (!profileData && retryCount < 5) {
          retryCount++;
          setProfileRetry(retryCount);
          retryTimeout = setTimeout(fetchProfile, 500);
        } else if (!profileData && retryCount >= 5) {
          setProfileError('No se pudo cargar tu perfil. Por favor, reintenta o cierra sesión.');
          setShowProfileRetry(true);
          setLoadingProfile(false);
        } else {
          setLoadingProfile(false);
        }
      } else {
        setProfile(null);
        setProfileLoaded(true);
        setLoadingProfile(false);
      }
    };
    if (session) {
      fetchProfile();
      return () => {
        if (retryTimeout) clearTimeout(retryTimeout);
      };
    } else {
      setProfile(null);
      setProfileLoaded(true);
      setLoadingProfile(false);
    }
  }, [session, navigate]);

  function isProfileComplete(profile: any) {
    return (
      profile &&
      typeof profile.name === 'string' &&
      profile.name.trim() !== '' &&
      typeof profile.goal === 'string' &&
      profile.goal.trim() !== '' &&
      Array.isArray(profile.intolerances) &&
      profile.intolerances.length > 0
    );
  }

  useEffect(() => {
    if (!showGlobalLoader && sessionChecked && profileLoaded && !loadingProfile) {
      // Si no hay sesión y no estamos en welcome/login/register, redirigir a welcome
      if (!session && !['/', '/login', '/register', '/forgot-password', '/reset-password-sent'].includes(location.pathname)) {
        if (location.pathname !== '/') navigate('/', { replace: true });
        return;
      }
      // Si hay sesión y el perfil está cargado y no es null
      if (session && profileLoaded) {
        if (!profile || !isProfileComplete(profile)) {
          // Si no hay perfil o está incompleto, ir SIEMPRE a /perfil
          if (location.pathname !== '/perfil') {
            navigate('/perfil', { replace: true });
          }
        } else {
          // Solo si el perfil está completo, ir a /inicio si está en login, register o perfil
          if (['/', '/login', '/register', '/perfil'].includes(location.pathname) && location.pathname !== '/inicio') {
            navigate('/inicio', { replace: true });
          }
        }
        return;
      }
      // Si el perfil es null (aún cargando), no redirigir a ningún lado
    }
  }, [session, profile, profileLoaded, showGlobalLoader, sessionChecked, navigate, location.pathname, loadingProfile, profileRetry]);

  if (showGlobalLoader) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-secondary-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        {profileError && (
          <div className="fixed top-10 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-xl shadow-lg z-50 text-center mt-8">
            <div className="font-bold mb-2">{profileError}</div>
            {showProfileRetry && (
              <div className="flex flex-col gap-2 items-center">
                <button onClick={() => window.location.reload()} className="bg-green-600 text-white px-4 py-2 rounded font-semibold shadow hover:bg-green-700">Reintentar</button>
                <button onClick={handleLogout} className="bg-gray-400 text-white px-4 py-2 rounded font-semibold shadow hover:bg-gray-500">Cerrar sesión</button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-secondary-900 flex flex-col transition-colors duration-200">
      {isLoading && <LoadingSpinner message="Generando menú y lista de la compra..." />}
      <div className="flex-1">
        <Navbar profile={profile} />
        <Routes>
          <Route index element={<Welcome />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password-sent" element={<ResetPasswordSent />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="inicio" element={session && profileLoaded ? <Dashboard session={session} profile={profile} setGenerandoCesta={setGenerandoCesta} handleLogout={handleLogout} /> : <Navigate to="/" replace />} />
          <Route path="cesta" element={session && profileLoaded ? <Cesta session={session} profile={profile} /> : <Navigate to="/" replace />} />
          <Route path="receta/:recetaId" element={<Receta />} />
          <Route path="auth/callback" element={<AuthCallback />} />
          <Route path="perfil" element={session ? <ProfileSetup session={session} /> : <Navigate to="/" replace />} />
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