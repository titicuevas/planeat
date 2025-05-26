import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Cargando...' }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-secondary-800 rounded-lg p-8 flex flex-col items-center space-y-4 shadow-xl">
        <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin-slow" role="status"></div>
        <p className="text-lg font-medium text-secondary-700 dark:text-secondary-200">{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner; 