import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { generateMenuWithGemini } from '../api/gemini';

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
      if (!user) {
        setError('No se encontró el usuario');
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
      setLoading(false);
      navigate('/inicio', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Error al guardar el perfil');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-green-700 text-center">Completa tu perfil</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Objetivo</label>
          <select
            className="w-full border rounded px-3 py-2"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Intolerancias alimentarias</label>
          <div className="flex flex-wrap gap-2">
            {intoleranciasOpciones.map(intol => (
              <label key={intol} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={intolerancias.includes(intol)}
                  onChange={() => handleIntoleranciaChange(intol)}
                  disabled={loading}
                />
                {intol}
              </label>
            ))}
          </div>
        </div>
        {error && (
          <div className="text-red-600 text-sm text-center p-2 bg-red-50 rounded">
            {error}
          </div>
        )}
        <button
          type="submit"
          className={`w-full py-2 rounded font-bold transition-colors ${
            loading || !nombre.trim() || !objetivo || intolerancias.length === 0
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
          disabled={loading || !nombre.trim() || !objetivo || intolerancias.length === 0}
        >
          {loading ? 'Guardando...' : 'Guardar y continuar'}
        </button>
      </form>
    </div>
  );
} 