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

    if (type === 'signup' && accessToken && refreshToken) {
      setChecking(true);
      const handleAuth = async () => {
        try {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          if (error) throw error;
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('No se pudo obtener el usuario tras el login');
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, goal, intolerances, weight, height')
            .eq('id', user.id)
            .maybeSingle();
          if (!profile || !profile.name || !profile.goal || !profile.intolerances || profile.intolerances.length === 0 || !profile.weight || !profile.height) {
            navigate('/perfil', { replace: true });
          } else {
            navigate('/inicio', { replace: true });
          }
        } catch (err) {
          console.error('Error al activar la sesión:', err);
          setFailed(true);
        } finally {
          setChecking(false);
        }
      };
      handleAuth();
    } else {
      // Si no hay tokens, limpiar cualquier sesión y redirigir a login con mensaje de confirmación
      supabase.auth.signOut();
      navigate('/login?confirmed=true', { replace: true });
    }
  }, [location, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
        <p className="text-green-700 font-semibold">
          {checking ? 'Confirmando tu cuenta...' : failed ? 'No se pudo activar la sesión automáticamente.' : 'Redirigiendo...'}
        </p>
        <p className="text-gray-600 text-sm mt-2">
          {checking
            ? 'Por favor, espera unos segundos.'
            : failed
            ? 'Haz clic en el botón para ir al login e inicia sesión manualmente.'
            : 'Ya puedes continuar.'}
        </p>
        {failed && (
          <button
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            onClick={() => navigate('/login', { replace: true })}
          >
            Ir al login
          </button>
        )}
      </div>
    </div>
  );
} 