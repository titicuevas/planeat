import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';

const Welcome = () => {
  useEffect(() => {
    document.title = 'Planeat - Planificador de Menús';
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-secondary-900 transition-colors duration-300">
      {/* Hero Section */}
      <div className="relative overflow-hidden flex flex-col items-center justify-center pt-12 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Fondo decorativo */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[80vw] h-[60vw] bg-gradient-to-br from-green-200/40 via-green-100/30 to-green-300/20 rounded-full blur-3xl opacity-60 dark:from-green-900/30 dark:via-green-800/20 dark:to-green-700/10"></div>
        </div>
        <main className="relative z-10 w-full max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-secondary-900 dark:text-white mb-4">
            Planifica tus comidas <span className="block text-green-600 dark:text-green-400">de manera inteligente</span>
          </h1>
          <p className="mt-3 text-lg md:text-xl text-secondary-700 dark:text-secondary-300 mb-8">
            Planeat te ayuda a organizar tus comidas semanales, crear listas de compras y descubrir nuevas recetas. <br />
            ¡Haz que la planificación de comidas sea más fácil y divertida!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Link
              to="/register"
              className="w-full sm:w-auto flex items-center justify-center px-8 py-3 border border-transparent text-base font-semibold rounded-lg text-white bg-green-600 hover:bg-green-700 shadow-lg transition-colors md:py-4 md:text-lg md:px-10"
            >
              Comenzar gratis
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto flex items-center justify-center px-8 py-3 border border-green-600 text-green-600 dark:text-green-400 dark:border-green-400 font-semibold rounded-lg bg-white dark:bg-secondary-800 hover:bg-green-50 dark:hover:bg-secondary-700 transition-colors md:py-4 md:text-lg md:px-10"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </main>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-gray-50 dark:bg-secondary-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center mb-12">
            <h2 className="text-base text-green-600 dark:text-green-400 font-semibold tracking-wide uppercase">Características</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-secondary-900 dark:text-white sm:text-4xl">
              Todo lo que necesitas para planificar tus comidas
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="flex flex-col items-center bg-white dark:bg-secondary-900 rounded-xl shadow p-6">
              <div className="flex items-center justify-center h-14 w-14 rounded-full bg-green-500 text-white mb-4">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Planificación Semanal</h3>
              <p className="mt-2 text-base text-secondary-600 dark:text-secondary-300 text-center">
                Organiza tus comidas para toda la semana de manera fácil y rápida.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col items-center bg-white dark:bg-secondary-900 rounded-xl shadow p-6">
              <div className="flex items-center justify-center h-14 w-14 rounded-full bg-green-500 text-white mb-4">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Lista de Compras</h3>
              <p className="mt-2 text-base text-secondary-600 dark:text-secondary-300 text-center">
                Genera automáticamente tu lista de compras basada en tus planes de comidas.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col items-center bg-white dark:bg-secondary-900 rounded-xl shadow p-6">
              <div className="flex items-center justify-center h-14 w-14 rounded-full bg-green-500 text-white mb-4">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Recetas</h3>
              <p className="mt-2 text-base text-secondary-600 dark:text-secondary-300 text-center">
                Descubre nuevas recetas y guarda tus favoritas para usarlas en tus planes.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="flex flex-col items-center bg-white dark:bg-secondary-900 rounded-xl shadow p-6">
              <div className="flex items-center justify-center h-14 w-14 rounded-full bg-green-500 text-white mb-4">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Saludable</h3>
              <p className="mt-2 text-base text-secondary-600 dark:text-secondary-300 text-center">
                Planifica comidas balanceadas y mantén un estilo de vida saludable.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome; 