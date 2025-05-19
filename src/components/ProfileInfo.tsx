import React from 'react';
import type { Profile } from '../types/dashboard';

interface ProfileInfoProps {
  profile: Profile | null;
  onLogout: () => void;
}

export function ProfileInfo({ profile, onLogout }: ProfileInfoProps) {
  if (!profile) return null;

  return (
    <div className="w-full max-w-2xl bg-white rounded-xl shadow p-6 mb-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-green-700 mb-2">
            ¡Bienvenido{profile.name ? `, ${profile.name}` : ''}!
          </h1>
          <div className="text-gray-700 mb-2">
            <span className="font-semibold">Objetivo:</span> {profile.goal || 'No especificado'}
          </div>
          <div className="text-gray-700 mb-2">
            <span className="font-semibold">Intolerancias:</span>{' '}
            {profile.intolerances && profile.intolerances.length > 0
              ? profile.intolerances.join(', ')
              : 'Ninguna'}
          </div>
        </div>
        <button
          onClick={onLogout}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
} 