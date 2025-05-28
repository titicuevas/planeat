import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../config/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get('type');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    // Siempre, tras confirmación, cerrar sesión y redirigir a login
    if (type === 'signup' && accessToken && refreshToken) {
      supabase.auth.signOut().then(() => {
        window.location.replace('/login?confirmed=true');
      });
    } else {
      supabase.auth.signOut().then(() => {
        window.location.replace('/login?confirmed=true');
      });
    }
  }, [location, navigate]);

  // Mostrar solo loader y mensaje profesional
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-secondary-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
        <p className="text-green-700 font-semibold text-xl">Redirigiendo al login...</p>
        <p className="text-gray-600 text-sm mt-2">Por favor, espera unos segundos.</p>
      </div>
    </div>
  );
} 