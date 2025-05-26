import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import ThemeToggle from './ThemeToggle';
import { supabase } from '../config/supabase';
import type { Profile } from '../types/dashboard';

const Navbar: React.FC<{ profile?: Profile }> = ({ profile }) => {
  const location = useLocation();
  const { isDarkMode } = useApp();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true);
        // Buscar el nombre en la tabla de perfiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profile?.name) {
          setUserName(profile.name);
          localStorage.setItem('planeat_user_name', profile.name);
        } else {
          setUserName(user.email || 'Usuario');
          localStorage.setItem('planeat_user_name', user.email || 'Usuario');
        }
      } else {
        setIsLoggedIn(false);
        setUserName('');
        localStorage.removeItem('planeat_user_name');
      }
    };

    checkUser();

    // Escuchar cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUserMenuOpen(false);
      setUserName('');
      setIsLoggedIn(false);
      localStorage.removeItem('planeat_user_name');
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <nav className="w-full bg-white dark:bg-secondary-800 shadow-md sticky top-0 z-40 border-b border-green-100 dark:border-secondary-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <Link to={isLoggedIn ? "/inicio" : "/"} className="flex items-center gap-2">
              <img src="/logo/Logo.png" alt="Logo Planeat" className="h-9 w-9 object-contain" />
              <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">Planeat</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            {location.pathname !== '/perfil' && location.pathname !== '/profile' && (
              <>
                {location.pathname !== '/' && location.pathname !== '/login' && location.pathname !== '/register' && (
                  <Link
                    to="/inicio"
                    className="text-secondary-600 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-semibold"
                  >
                    Inicio
                  </Link>
                )}
                {isLoggedIn && (
                  <div className="relative">
                    <button
                      onClick={() => setUserMenuOpen((v) => !v)}
                      className="flex items-center gap-2 px-3 py-1 rounded hover:bg-green-100 dark:hover:bg-secondary-700 transition-colors text-secondary-700 dark:text-secondary-200 font-semibold focus:outline-none"
                      aria-label="Menú de usuario"
                    >
                      {isLoggedIn && <span className="hidden sm:inline">{userName || 'Usuario'}</span>}
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-secondary-800 rounded-lg shadow-lg border border-green-100 dark:border-secondary-700 z-50">
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-secondary-700 rounded-b-lg"
                        >
                          Cerrar sesión
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 