import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../config/supabase';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    document.title = 'Nueva contraseña - Planeat';
  }, []);

  // Detectar si hay token de recuperación en la URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('type') !== 'recovery' || !params.get('access_token')) {
      setError('Enlace inválido o expirado. Solicita un nuevo correo de recuperación.');
    }
  }, [location.search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100/60 via-green-200/40 to-secondary-900/80 dark:from-secondary-900 dark:via-secondary-800 dark:to-secondary-900 transition-colors duration-300 flex items-center justify-center">
      <div className="w-full max-w-md mx-auto flex flex-col items-center">
        <div className="w-full bg-white dark:bg-secondary-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0-1.104.896-2 2-2s2 .896 2 2v1h-4v-1zm-2 4h8v2a2 2 0 01-2 2H8a2 2 0 01-2-2v-2h4zm-2-4a2 2 0 012-2h4a2 2 0 012 2v1a2 2 0 01-2 2h-4a2 2 0 01-2-2v-1z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-4 text-center">Nueva contraseña</h2>
          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 px-4 py-3 rounded mb-4 w-full animate-shake" role="alert">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              <span>{error}</span>
            </div>
          )}
          {success ? (
            <div className="flex flex-col items-center w-full">
              <div className="flex items-center justify-center mb-2">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span className="ml-2 text-green-700 dark:text-green-400 font-semibold">¡Contraseña actualizada!</span>
              </div>
              <p className="text-secondary-700 dark:text-secondary-200 text-center mb-2">Redirigiendo al inicio de sesión...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full space-y-5">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 mb-1">Nueva contraseña</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 dark:border-secondary-600 placeholder-gray-500 dark:placeholder-secondary-400 text-secondary-900 dark:text-secondary-100 bg-white dark:bg-secondary-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-base shadow-sm"
                  placeholder="Nueva contraseña"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 mb-1">Repite la contraseña</label>
                <input
                  id="confirm"
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 dark:border-secondary-600 placeholder-gray-500 dark:placeholder-secondary-400 text-secondary-900 dark:text-secondary-100 bg-white dark:bg-secondary-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-base shadow-sm"
                  placeholder="Repite la contraseña"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg font-bold text-lg bg-green-600 hover:bg-green-700 text-white shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Guardando...
                  </span>
                ) : 'Guardar nueva contraseña'}
              </button>
              <div className="text-center">
                <Link to="/login" className="text-sm text-green-600 hover:text-green-500">
                  Volver al inicio de sesión
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
} 