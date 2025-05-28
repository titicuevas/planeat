import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { generateMenuWithGemini } from '../api/gemini';
import { getTargetMondayForMenu } from '../utils/dateUtils';
import type { Session } from '@supabase/supabase-js';

const objetivosOpciones = [
  'Perder peso',
  'Mantener peso',
  'Ganar masa muscular',
  'Mejorar salud',
  'Otro',
];

const intoleranciasOpciones = [
  'Gluten',
  'Lactosa',
  'Frutos secos',
  'Huevo',
  'Soja',
  'Mariscos',
  'Pescado',
  'Ninguna',
];

export default function ProfileSetup({ session }: { session: Session }) {
  const navigate = useNavigate();
  const [objetivo, setObjetivo] = useState('');
  const [intolerancias, setIntolerancias] = useState<string[]>([]);
  const [nombre, setNombre] = useState('');
  const [peso, setPeso] = useState<string>('');
  const [altura, setAltura] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNoUserMsg, setShowNoUserMsg] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [profileJustSaved, setProfileJustSaved] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (!session) return;
    const fetchProfile = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, goal, intolerances, weight, height')
        .eq('id', session.user.id)
        .maybeSingle();
      
      if (profile) {
        setNombre(profile.name || '');
        setObjetivo(profile.goal || '');
        setIntolerancias(profile.intolerances || []);
        setPeso(profile.weight?.toString() || '');
        setAltura(profile.height?.toString() || '');
        
        // Verificar si el perfil está completo (nombre, objetivo y al menos una intolerancia)
        const isComplete = !!profile.name && !!profile.goal && Array.isArray(profile.intolerances) && profile.intolerances.length > 0;
        setIsProfileComplete(isComplete);
        
        // Si el perfil está completo y acaba de guardarse, mostrar bienvenida y redirigir a inicio
        if (isComplete && profileJustSaved) {
          setShowWelcome(true);
          setTimeout(() => {
            setShowWelcome(false);
            navigate('/inicio', { replace: true });
          }, 1800);
        }
      }
    };
    fetchProfile();
  }, [session, navigate, profileJustSaved]);

  useEffect(() => {
    document.title = 'Perfil - Planeat';
  }, []);

  const handleIntoleranciaChange = (intol: string) => {
    if (intol === 'Ninguna') {
      setIntolerancias(['Ninguna']);
    } else {
      setIntolerancias(prev => {
        const nuevas = prev.includes(intol)
          ? prev.filter(i => i !== intol)
          : [...prev.filter(i => i !== 'Ninguna'), intol];
        return nuevas;
      });
    }
  };

  const validateWeight = (value: string): boolean => {
    const num = parseFloat(value);
    return !isNaN(num) && num > 0 && num <= 999 && /^\d{1,3}$/.test(value);
  };

  const validateHeight = (value: string): boolean => {
    const num = parseInt(value);
    return !isNaN(num) && num > 0 && num <= 250 && /^\d{1,3}$/.test(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowNoUserMsg(false);
    
    if (!nombre.trim()) {
      setError('Por favor, introduces tu nombre.');
      return;
    }
    if (!objetivo) {
      setError('Por favor, selecciona un objetivo.');
      return;
    }
    if (intolerancias.length === 0) {
      setError('Por favor, selecciona al menos una intolerancia o "Ninguna".');
      return;
    }
    if (peso && !validateWeight(peso)) {
      setError('El peso debe ser un número entre 0 y 999 kg.');
      return;
    }
    if (altura && !validateHeight(altura)) {
      setError('La altura debe ser un número entre 0 y 250 cm.');
      return;
    }

    setLoading(true);
    try {
      if (!session || !session.user.email_confirmed_at) {
        setShowNoUserMsg(true);
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          name: nombre,
          goal: objetivo,
          intolerances: intolerancias,
          email: session.user.email,
          weight: peso ? parseFloat(peso) : null,
          height: altura ? parseInt(altura) : null
        });

      if (error) {
        setError(error.message || 'Error al guardar el perfil');
        setLoading(false);
        return;
      }

      localStorage.setItem('planeat_user_name', nombre);
      setLoading(false);
      setProfileJustSaved(true); // Forzar recarga y redirección si el perfil está completo
    } catch (err: any) {
      setError(err.message || 'Error al guardar el perfil');
      setLoading(false);
    }
  };

  if (isProfileComplete) {
    return showWelcome ? (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100/60 via-green-200/40 to-secondary-900/80 dark:from-secondary-900 dark:via-secondary-800 dark:to-secondary-900 transition-colors duration-300">
        <div className="bg-white dark:bg-secondary-800 p-10 rounded-2xl shadow-2xl flex flex-col items-center">
          <span className="text-4xl mb-4">🎉</span>
          <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">¡Perfil completado!</h2>
          <p className="text-lg text-secondary-700 dark:text-secondary-200">Bienvenido/a a Planeat, {nombre}.</p>
        </div>
      </div>
    ) : null; // No renderizar nada mientras se redirige
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100/60 via-green-200/40 to-secondary-900/80 dark:from-secondary-900 dark:via-secondary-800 dark:to-secondary-900 transition-colors duration-300">
      <div className="flex flex-col items-center justify-center py-8 px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-80px)]">
        <form onSubmit={handleSubmit} className="bg-white dark:bg-secondary-800 p-8 rounded-2xl shadow-2xl w-full max-w-md flex flex-col gap-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-green-700 dark:text-green-400 text-center mb-2">
            Completa tu perfil
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 mb-1">Nombre</label>
            <input
              type="text"
              className="w-full border border-gray-300 dark:border-secondary-600 rounded-lg px-4 py-3 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 placeholder-gray-400 dark:placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-sm transition-colors"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              required
              disabled={loading}
              placeholder="Tu nombre"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 mb-1">Peso (kg)</label>
              <input
                type="number"
                step="1"
                min="1"
                max="999"
                maxLength={3}
                pattern="\\d{1,3}"
                className="w-full border border-gray-300 dark:border-secondary-600 rounded-lg px-4 py-3 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 placeholder-gray-400 dark:placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-sm transition-colors"
                value={peso}
                onChange={e => setPeso(e.target.value.replace(/[^\d]/g, '').slice(0,3))}
                required
                disabled={loading}
                placeholder="Tu peso en kg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 mb-1">Altura (cm)</label>
              <input
                type="number"
                step="1"
                min="1"
                max="250"
                maxLength={3}
                pattern="\\d{1,3}"
                className="w-full border border-gray-300 dark:border-secondary-600 rounded-lg px-4 py-3 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 placeholder-gray-400 dark:placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-sm transition-colors"
                value={altura}
                onChange={e => setAltura(e.target.value.replace(/[^\d]/g, '').slice(0,3))}
                required
                disabled={loading}
                placeholder="Tu altura en cm"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 mb-1">Objetivo</label>
            <select
              className="w-full border border-gray-300 dark:border-secondary-600 rounded-lg px-4 py-3 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-sm transition-colors"
              value={objetivo}
              onChange={e => setObjetivo(e.target.value)}
              required
              disabled={loading}
            >
              <option value="">Selecciona tu objetivo</option>
              {objetivosOpciones.map(obj => (
                <option key={obj} value={obj}>{obj}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 mb-1">Intolerancias alimentarias</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 w-full justify-center">
              {intoleranciasOpciones.map(intol => (
                <label key={intol} className="flex items-center gap-2 text-sm font-medium text-secondary-900 dark:text-secondary-100 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={intolerancias.includes(intol)}
                    onChange={() => handleIntoleranciaChange(intol)}
                    disabled={loading}
                    className="accent-green-600 dark:accent-green-500 w-5 h-5 rounded border-gray-300 dark:border-secondary-600 focus:ring-green-500 transition-all"
                  />
                  {intol}
                </label>
              ))}
              {Array.from({ length: (4 - (intoleranciasOpciones.length % 4)) % 4 }).map((_, i) => (
                <div key={`empty-${i}`} className="invisible" />
              ))}
            </div>
          </div>

          {showNoUserMsg && (
            <div className="text-red-600 dark:text-red-300 text-sm text-center p-2 bg-red-50 dark:bg-red-900 rounded">
              Debes estar autenticado y haber confirmado tu correo electrónico para completar el perfil. Por favor, revisa tu email y confirma tu cuenta antes de continuar.
            </div>
          )}
          
          {error && (
            <div className="text-red-600 dark:text-red-300 text-sm text-center p-2 bg-red-50 dark:bg-red-900 rounded animate-shake">
              {error}
            </div>
          )}

          <button
            type="submit"
            className={`w-full py-3 rounded-lg font-bold text-lg shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 mt-2
              ${loading || !nombre.trim() || !objetivo || intolerancias.length === 0
                ? 'bg-gray-400 dark:bg-secondary-700 text-white cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 text-white'}`}
            disabled={loading || !nombre.trim() || !objetivo || intolerancias.length === 0}
          >
            {loading ? 'Guardando...' : 'Guardar y continuar'}
          </button>
        </form>
      </div>
    </div>
  );
} 