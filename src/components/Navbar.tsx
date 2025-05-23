import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import ThemeToggle from './ThemeToggle';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { isDarkMode } = useApp();

  return (
    <nav className="w-full bg-white dark:bg-secondary-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo/Logo.png" alt="Logo Planeat" className="h-9 w-9 object-contain" />
              <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">Planeat</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {location.pathname !== '/' && location.pathname !== '/login' && location.pathname !== '/register' && (
              <Link
                to="/inicio"
                className="text-secondary-600 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                Inicio
              </Link>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 