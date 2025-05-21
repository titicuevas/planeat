import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const syncSession = async () => {
      let tries = 0;
      let session = null;
      // Esperar hasta que la sesión esté activa o agotar intentos
      while (tries < 10) {
        const { data } = await supabase.auth.getSession();
        session = data.session;
        if (session) break;
        await new Promise(res => setTimeout(res, 500));
        tries++;
      }
      setChecking(false);
      if (session) {
        navigate('/login', { replace: true });
      } else {
        setFailed(true);
      }
    };
    syncSession();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
        <p className="text-green-700 font-semibold">
          {checking ? 'Confirmando tu cuenta...' : failed ? 'No se pudo activar la sesión automáticamente.' : 'Redirigiendo al login...'}
        </p>
        <p className="text-gray-600 text-sm mt-2">
          {checking
            ? 'Por favor, espera unos segundos.'
            : failed
            ? 'Haz clic en el botón para ir al login e inicia sesión manualmente.'
            : 'Ya puedes iniciar sesión.'}
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