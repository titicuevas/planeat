import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { generateMenuWithGemini } from '../api/gemini';
import Navbar from '../components/Navbar';
import { getTargetMondayForMenu } from '../utils/dateUtils';

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

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [objetivo, setObjetivo] = useState('');
  const [intolerancias, setIntolerancias] = useState<string[]>([]);
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNoUserMsg, setShowNoUserMsg] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Inicializar nombre si el usuario ya tiene perfil
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, goal, intolerances')
          .eq('id', user.id)
          .maybeSingle();
        if (profile) {
          setNombre(profile.name || '');
          setObjetivo(profile.goal || '');
          setIntolerancias(profile.intolerances || []);
          setIsEditing(true);
        } else {
          setIsEditing(false);
        }
      }
    };
    fetchProfile();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowNoUserMsg(false);
    // Validación estricta
    if (!nombre.trim()) {
      setError('Por favor, introduce tu nombre.');
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
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email_confirmed_at) {
        setShowNoUserMsg(true);
        setLoading(false);
        return;
      }
      // Comprobar si ya existe el perfil
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
      if (fetchError && fetchError.code !== 'PGRST116') {
        setError('Error comprobando el perfil');
        setLoading(false);
        return;
      }
      let error;
      if (existingProfile) {
        // Si existe, actualizamos
        ({ error } = await supabase
          .from('profiles')
          .update({
            name: nombre,
            goal: objetivo,
            intolerances: intolerancias,
            email: user.email
          })
          .eq('id', user.id));
      } else {
        // Si no existe, lo creamos
        ({ error } = await supabase
          .from('profiles')
          .insert([
            {
              id: user.id,
              name: nombre,
              goal: objetivo,
              intolerances: intolerancias,
              email: user.email
            }
          ]));
      }
      if (error) {
        setError(error.message || 'Error al guardar el perfil');
        setLoading(false);
        return;
      }
      // Guardar el nombre en localStorage para la navbar
      localStorage.setItem('planeat_user_name', nombre);
      // Eliminar menú y lista de la compra de la semana actual
      const monday = getTargetMondayForMenu();
      const week = monday.toISOString().slice(0, 10);
      // Eliminar menú semanal
      await supabase.from('meal_plans').delete().eq('user_id', user.id).eq('week', week);
      // Eliminar lista de la compra
      await supabase.from('shopping_list').delete().eq('user_id', user.id).eq('week', week);
      setLoading(false);
      navigate('/inicio', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Error al guardar el perfil');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100/60 via-green-200/40 to-secondary-900/80 dark:from-secondary-900 dark:via-secondary-800 dark:to-secondary-900 transition-colors duration-300">
      <Navbar />
      <div className="flex flex-col items-center justify-center py-8 px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-80px)]">
        <form onSubmit={handleSubmit} className="bg-white dark:bg-secondary-800 p-8 rounded-2xl shadow-2xl w-full max-w-md flex flex-col gap-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-green-700 dark:text-green-400 text-center mb-2">Completa tu perfil</h2>
          <div>
            <label className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 mb-1">Nombre</label>
            <input
              type="text"
              className="w-full border border-gray-300 dark:border-secondary-600 rounded-lg px-4 py-3 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 placeholder-gray-400 dark:placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-sm transition-colors"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              readOnly={isEditing}
              required
              disabled={loading}
              placeholder="Tu nombre"
            />
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
            <div className="flex flex-wrap gap-3">
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