import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../config/supabase';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [recuerdame, setRecuerdame] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Obtener mensaje de éxito del registro si existe
  const successMessage = location.state?.message;
  // Detectar si la URL contiene ?confirmed=true
  const params = new URLSearchParams(location.search);
  const confirmed = params.get('confirmed') === 'true';

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    document.title = 'Iniciar sesión - Planeat';
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!formData.email || !formData.password) {
      setError('Por favor, completa todos los campos.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });
      if (error) throw error;
      if (!data.session) {
        setError('No se pudo iniciar sesión. Revisa tu email y contraseña, o verifica tu cuenta.');
        setLoading(false);
        return;
      }
      // Comprobar perfil tras login
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, goal, intolerances, weight, height')
        .eq('id', data.session.user.id)
        .maybeSingle();
      if (!profile || !profile.name || !profile.goal || !profile.intolerances || profile.intolerances.length === 0 || !profile.weight || !profile.height) {
        navigate('/perfil', { replace: true });
      } else {
        navigate('/inicio', { replace: true });
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100/60 via-green-200/40 to-secondary-900/80 dark:from-secondary-900 dark:via-secondary-800 dark:to-secondary-900 flex flex-col items-center justify-center py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
        <div className="w-full max-w-md mx-auto flex flex-col items-center">
          <div className="w-full bg-white dark:bg-secondary-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center">
            <h2 className="text-3xl font-extrabold text-secondary-900 dark:text-white mb-2 text-center">Ya has iniciado sesión</h2>
            <p className="text-sm text-secondary-600 dark:text-secondary-300 mb-6 text-center">
              Si deseas cambiar de cuenta, primero cierra la sesión.
            </p>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                setIsAuthenticated(false);
                navigate('/login');
              }}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors mt-2"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Si no hay sesión pero confirmed=true, mostrar mensaje claro y formulario de login
  if (confirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100/60 via-green-200/40 to-secondary-900/80 dark:from-secondary-900 dark:via-secondary-800 dark:to-secondary-900 flex flex-col items-center justify-center py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
        <div className="w-full max-w-md mx-auto flex flex-col items-center">
          <div className="w-full bg-white dark:bg-secondary-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center">
            <h2 className="text-2xl font-bold text-green-700 mb-4 text-center">¡Correo confirmado correctamente!</h2>
            <p className="mb-4 text-secondary-700 dark:text-secondary-200 text-center">Ahora puedes iniciar sesión con tu correo y contraseña.</p>
            {/* Formulario de login */}
            <form className="w-full space-y-5" onSubmit={handleSubmit} autoComplete="on">
              <div>
                <label htmlFor="email" className="sr-only">Correo electrónico</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 dark:border-secondary-600 placeholder-gray-500 dark:placeholder-secondary-400 text-secondary-900 dark:text-secondary-100 bg-white dark:bg-secondary-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-base shadow-sm"
                  placeholder="Correo electrónico"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Contraseña</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 dark:border-secondary-600 placeholder-gray-500 dark:placeholder-secondary-400 text-secondary-900 dark:text-secondary-100 bg-white dark:bg-secondary-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-base shadow-sm"
                  placeholder="Contraseña"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg font-bold text-lg bg-green-600 hover:bg-green-700 text-white shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100/60 via-green-200/40 to-secondary-900/80 dark:from-secondary-900 dark:via-secondary-800 dark:to-secondary-900 transition-colors duration-300">
      <div className="flex flex-col items-center justify-center py-8 px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-md mx-auto flex flex-col items-center">
          <div className="w-full bg-white dark:bg-secondary-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center">
            <h2 className="text-3xl font-extrabold text-secondary-900 dark:text-white mb-2 text-center">Inicia sesión en tu cuenta</h2>
            <p className="text-sm text-secondary-600 dark:text-secondary-300 mb-6 text-center">
              O{' '}
              <Link to="/register" className="font-medium text-green-600 hover:text-green-500">
                regístrate si no tienes una cuenta
              </Link>
            </p>

            {successMessage && (
              <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 text-green-600 dark:text-green-300 px-4 py-3 rounded mb-4 w-full" role="alert">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>{successMessage}</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 px-4 py-3 rounded mb-4 w-full animate-shake" role="alert">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                <span>{error}</span>
              </div>
            )}

            <form className="w-full space-y-5" onSubmit={handleSubmit} autoComplete="on">
              <div>
                <label htmlFor="email" className="sr-only">Correo electrónico</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 dark:border-secondary-600 placeholder-gray-500 dark:placeholder-secondary-400 text-secondary-900 dark:text-secondary-100 bg-white dark:bg-secondary-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-base shadow-sm"
                  placeholder="Correo electrónico"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Contraseña</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 dark:border-secondary-600 placeholder-gray-500 dark:placeholder-secondary-400 text-secondary-900 dark:text-secondary-100 bg-white dark:bg-secondary-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-base shadow-sm"
                  placeholder="Contraseña"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={recuerdame}
                    onChange={e => setRecuerdame(e.target.checked)}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-secondary-900 dark:text-secondary-100">
                    Recuérdame
                  </label>
                </div>
                <div className="text-sm">
                  <Link to="/forgot-password" className="font-medium text-green-600 hover:text-green-500">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg font-bold text-lg bg-green-600 hover:bg-green-700 text-white shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 