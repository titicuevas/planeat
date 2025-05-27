import React from 'react';
import { useNavigate } from 'react-router-dom';

interface Profile {
  id: string;
  name?: string;
  full_name?: string;
  email?: string;
  avatar_url?: string | null;
  goal?: string | null;
  intolerances?: string[] | null;
  weight?: number | null;
  height?: number | null;
}

interface ProfileInfoProps {
  profile: Profile;
  onLogout: () => void;
}

const objetivoIcono: Record<string, string> = {
  'Perder peso': '/avatar/Perder.png',
  'Mantener peso': '/avatar/Mantener.png',
  'Ganar masa muscular': '/avatar/masa_muscular.png',
  'Mejorar salud': '/avatar/Salud.png',
  'Otro': '/avatar/Otro.png'
};

const ProfileInfo: React.FC<ProfileInfoProps> = ({ profile, onLogout }) => {
  const navigate = useNavigate();
  const icono = profile.goal ? objetivoIcono[profile.goal] : undefined;

  return (
    <div className="w-full max-w-2xl card mb-8 relative flex flex-col items-center justify-center">
      <div className="flex flex-col items-center w-full">
        <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center relative overflow-hidden mb-4">
          {icono && !profile.avatar_url && (
            <img
              src={icono}
              alt={profile.goal || 'Objetivo'}
              className="absolute inset-0 w-full h-full object-cover opacity-80"
            />
          )}
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.name || 'Avatar'}
              className="w-full h-full rounded-full object-cover relative z-10"
            />
          ) : !icono ? (
            <span className="text-3xl text-primary-600 dark:text-primary-400 relative z-10">
              {profile.name?.[0]?.toUpperCase() || '?'}
            </span>
          ) : null}
        </div>
        <div className="flex-1 text-center">
          <h2 className="text-2xl font-bold text-secondary-900 dark:text-white">
            {profile.name || 'Usuario'}
          </h2>
          <p className="text-secondary-600 dark:text-secondary-400">
            {profile.email}
          </p>
          {profile.goal && (
            <p className="mt-2 text-sm text-secondary-700 dark:text-secondary-300">
              Objetivo: {profile.goal}
            </p>
          )}
          {(profile.weight || profile.height) && (
            <p className="mt-1 text-sm text-secondary-700 dark:text-secondary-300">
              {profile.weight ? `Peso: ${profile.weight} kg` : ''}
              {profile.weight && profile.height ? ' · ' : ''}
              {profile.height ? `Altura: ${profile.height} cm` : ''}
            </p>
          )}
          {profile.intolerances && profile.intolerances.length > 0 && (
            <p className="mt-1 text-sm text-secondary-700 dark:text-secondary-300">
              Intolerancias: {profile.intolerances.join(', ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileInfo; 