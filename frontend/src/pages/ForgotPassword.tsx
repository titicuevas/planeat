import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: import.meta.env.PROD 
          ? 'https://planeat.up.railway.app/auth/callback'
          : `${window.location.origin}/auth/callback`
      });

      if (error) throw error;
      
      // Siempre redirigir a la página de confirmación
      navigate('/reset-password-sent');
    } catch (err: any) {
      setError(err.message || 'Error al enviar el correo de recuperación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100/60 via-green-200/40 to-secondary-900/80 dark:from-secondary-900 dark:via-secondary-800 dark:to-secondary-900 transition-colors duration-300">
      <div className="flex flex-col items-center justify-center py-8 px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-md mx-auto flex flex-col items-center">
          <div className="w-full bg-white dark:bg-secondary-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center">
            <h2 className="text-3xl font-extrabold text-secondary-900 dark:text-white mb-2 text-center">Recuperar contraseña</h2>
            <p className="text-sm text-secondary-600 dark:text-secondary-300 mb-6 text-center">
              Introduce tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
            </p>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 px-4 py-3 rounded mb-4 w-full animate-shake" role="alert">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="w-full space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 sr-only">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 dark:border-secondary-600 placeholder-gray-500 dark:placeholder-secondary-400 text-secondary-900 dark:text-secondary-100 bg-white dark:bg-secondary-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-base shadow-sm"
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg font-bold text-lg bg-green-600 hover:bg-green-700 text-white shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? 'Enviando...' : 'Enviar correo de recuperación'}
              </button>

              <div className="text-center">
                <Link to="/login" className="text-sm text-green-600 hover:text-green-500">
                  Volver al inicio de sesión
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 