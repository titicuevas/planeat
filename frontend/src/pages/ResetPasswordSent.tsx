import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function ResetPasswordSent() {
  useEffect(() => {
    document.title = 'Correo enviado - Planeat';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100/60 via-green-200/40 to-secondary-900/80 dark:from-secondary-900 dark:via-secondary-800 dark:to-secondary-900 transition-colors duration-300 flex items-center justify-center">
      <div className="w-full max-w-md mx-auto flex flex-col items-center">
        <div className="w-full bg-white dark:bg-secondary-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-4 text-center">¡Revisa tu correo!</h2>
          <p className="mb-2 text-secondary-700 dark:text-secondary-200 text-center">
            Si el correo está registrado, te hemos enviado un email para restablecer tu contraseña.
          </p>
          <p className="mb-6 text-sm text-secondary-600 dark:text-secondary-300 text-center">
            Sigue el enlace del correo para crear una nueva contraseña.
          </p>
          <Link 
            to="/login" 
            className="w-full py-3 rounded-lg font-bold text-lg bg-green-600 hover:bg-green-700 text-white shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-center"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
} 