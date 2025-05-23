import React from 'react';
import { useApp } from '../context/AppContext';

const ThemeToggle: React.FC = () => {
  const { isDarkMode, toggleDarkMode } = useApp();

  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 rounded-lg bg-secondary-100 dark:bg-secondary-700 hover:bg-secondary-200 dark:hover:bg-secondary-600 transition-colors"
      title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {isDarkMode ? (
        <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-secondary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
};

export default ThemeToggle; 