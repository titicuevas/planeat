import React from 'react';

export default function ResetPasswordSent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100/60 via-green-200/40 to-secondary-900/80 dark:from-secondary-900 dark:via-secondary-800 dark:to-secondary-900 transition-colors duration-300 flex items-center justify-center">
      <div className="w-full max-w-md mx-auto flex flex-col items-center">
        <div className="w-full bg-white dark:bg-secondary-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center">
          <h2 className="text-2xl font-bold text-green-700 mb-4 text-center">¡Revisa tu correo!</h2>
          <p className="mb-2 text-secondary-700 dark:text-secondary-200 text-center">
            Si el correo está registrado, te hemos enviado un email para restablecer tu contraseña.
          </p>
          <p className="mb-4 text-sm text-secondary-600 dark:text-secondary-300 text-center">
            Sigue el enlace del correo para crear una nueva contraseña.
          </p>
        </div>
      </div>
    </div>
  );
} 