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
    if (params.get('type') === 'recovery') {
      navigate(`/reset-password${location.search}`, { replace: true });
    } else {
      let mounted = true;
      const syncSession = async () => {
        let tries = 0;
        let user = null;
        while (tries < 30 && mounted) {
          const { data } = await supabase.auth.getUser();
          user = data.user;
          if (user) break;
          await new Promise(res => setTimeout(res, 700));
          tries++;
        }
        if (!mounted) return;
        setChecking(false);
        if (user) {
          // Verificar si el perfil está completo
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, goal, intolerances')
            .eq('id', user.id)
            .maybeSingle();
          if (!profile || !profile.name || !profile.goal || !profile.intolerances || profile.intolerances.length === 0) {
            // Obtener el token de autenticación
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData?.session?.access_token;
            if (accessToken) {
              navigate(`/perfil?token=${accessToken}`, { replace: true });
            } else {
              navigate('/perfil', { replace: true });
            }
          } else {
            navigate('/inicio', { replace: true });
          }
        } else {
          setFailed(true);
        }
      };
      syncSession();
      return () => { mounted = false; };
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