import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { remove as removeDiacritics } from 'diacritics';

interface Ingrediente {
  nombre: string;
  cantidad: string;
}

interface RecetaDetalle {
  nombre: string;
  ingredientes: Ingrediente[];
  pasos: string[];
}

// Normaliza el nombre: intenta poner tildes y ñ en palabras comunes
function normalizaNombre(nombre: string) {
  let n = nombre.toLowerCase();
  // Palabras comunes con tildes y ñ
  const mapa = [
    ['pina', 'piña'],
    ['nino', 'niño'],
    ['menu', 'menú'],
    ['anio', 'año'],
    ['camion', 'camión'],
    ['cana', 'caña'],
    ['manana', 'mañana'],
    ['espana', 'españa'],
    ['arandano', 'arándano'],
    ['pure', 'puré'],
    ['creme', 'crème'],
    ['cafe', 'café'],
    ['te', 'té'],
    ['limon', 'limón'],
    ['melon', 'melón'],
    ['jamon', 'jamón'],
    ['quesion', 'quesión'],
    ['pina', 'piña'],
    ['tarta', 'tarta'],
    ['pizza', 'pizza'],
    ['sopa', 'sopa'],
    ['arroz', 'arroz'],
    ['pure', 'puré'],
    ['pan', 'pan'],
    ['flan', 'flan'],
    ['cana', 'caña'],
    ['cania', 'caña'],
    ['pinia', 'piña'],
    ['pinon', 'piñón'],
    ['pinones', 'piñones'],
    ['nina', 'niña'],
    ['ninas', 'niñas'],
    ['ninos', 'niños'],
    ['tortilla', 'tortilla'],
    ['tortilla', 'tortilla'],
    ['tortilla', 'tortilla'],
  ];
  for (const [sin, con] of mapa) {
    if (n.includes(sin)) n = n.replace(sin, con);
  }
  // Capitaliza
  return n.replace(/\b\w/g, l => l.toUpperCase());
}

export default function Receta() {
  const navigate = useNavigate();
  const { recetaId } = useParams();
  const [receta, setReceta] = useState<RecetaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nombreBuscado, setNombreBuscado] = useState('');

  useEffect(() => {
    async function fetchReceta() {
      setLoading(true);
      setError(null);
      let nombrePlato = recetaId?.replace(/-/g, ' ') || '';
      nombrePlato = nombrePlato.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
      nombrePlato = normalizaNombre(nombrePlato);
      setNombreBuscado(nombrePlato);
      if (nombrePlato === 'No Disponible') {
        setError('No hay receta disponible para este plato.');
        setReceta(null);
        setLoading(false);
        return;
      }
      // Generar variantes para buscar (con/sin tildes, minúsculas, etc.)
      let variantes = [
        nombrePlato,
        removeDiacritics(nombrePlato),
        nombrePlato.toLowerCase(),
        removeDiacritics(nombrePlato).toLowerCase(),
        nombrePlato.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ ]/g, '').trim(),
        removeDiacritics(nombrePlato.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ ]/g, '').trim())
      ];
      let recetaEncontrada = null;
      let errorFinal = '';
      for (let intento of variantes) {
        try {
          console.log('Buscando receta con nombre:', intento);
          const res = await fetch('/api/receta-detalle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: intento })
          });
          if (res.ok) {
            const data = await res.json();
            recetaEncontrada = data;
            break;
          }
        } catch (err: any) {
          errorFinal = err.message || 'Error desconocido';
        }
      }
      if (recetaEncontrada) {
        setReceta(recetaEncontrada);
      } else {
        console.warn('No se encontró la receta para ninguno de los nombres probados:', variantes);
        // Receta de ejemplo por defecto si no se encuentra
        setReceta({
          nombre: nombrePlato,
          ingredientes: [
            { nombre: 'Ingrediente 1', cantidad: '1 unidad' },
            { nombre: 'Ingrediente 2', cantidad: '100 g' }
          ],
          pasos: [
            'Paso 1: Preparar los ingredientes.',
            'Paso 2: Cocinar según la receta.'
          ]
        });
        setError('No se pudo obtener la receta original. Se muestra una receta de ejemplo.');
      }
      setLoading(false);
    }
    if (recetaId) fetchReceta();
  }, [recetaId]);

  useEffect(() => {
    document.title = 'Recetas - Planeat';
  }, []);

  // Botón de reintentar
  function handleRetry() {
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/80 via-green-100/60 to-green-200/40 dark:from-secondary-900 dark:via-secondary-800 dark:to-secondary-900 flex flex-col items-center py-0 transition-colors duration-300 relative overflow-x-auto">
      {loading ? (
        <div className="flex flex-col items-center justify-center w-full flex-1 mt-24">
          <div className="bg-white/80 dark:bg-secondary-800/90 rounded-2xl shadow-2xl p-10 flex flex-col items-center animate-fade-in scale-100 border border-green-200 dark:border-secondary-700">
            <span className="text-5xl mb-4 animate-bounce">🍽️</span>
            <div className="flex items-center gap-4 mb-2">
              <span className="inline-block w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin"></span>
              <span className="text-xl font-semibold text-green-700 dark:text-green-400">
                {nombreBuscado ? `Cargando "${nombreBuscado}"...` : 'Cargando receta...'}
              </span>
            </div>
            <span className="text-secondary-500 dark:text-secondary-300 text-sm mt-2">Por favor, espera unos segundos</span>
          </div>
        </div>
      ) : error || !receta ? (
        <div className="flex flex-col items-center justify-center w-full flex-1 mt-24">
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-lg p-8 flex flex-col items-center">
            <span className="text-2xl font-bold text-red-700 dark:text-red-400 mb-2">No se pudo cargar la receta</span>
            <span className="text-gray-600 dark:text-secondary-200 mb-2">{error}</span>
            <span className="text-xs text-secondary-500 dark:text-secondary-300 mt-2">¿Nombre enviado? <b>{nombreBuscado}</b></span>
            <button
              onClick={handleRetry}
              className="mt-4 bg-green-600 dark:bg-green-500 text-white px-4 py-2 rounded hover:bg-green-700 dark:hover:bg-green-600 font-semibold shadow"
            >
              Reintentar
            </button>
            <button
              onClick={() => navigate('/inicio')}
              className="mt-4 bg-green-600 dark:bg-green-500 text-white px-4 py-2 rounded hover:bg-green-700 dark:hover:bg-green-600 font-semibold shadow"
            >
              ← Volver
            </button>
            <span className="text-secondary-500 dark:text-secondary-300 text-sm mt-4">¿Buscabas "piña" o "piñón"?</span>
          </div>
        </div>
      ) : (
        <>
          <div className="w-full max-w-2xl flex items-center mb-4 mt-8 px-4">
            <button
              onClick={() => navigate('/inicio')}
              className="flex items-center gap-2 bg-white dark:bg-secondary-800 border border-green-200 dark:border-secondary-700 text-green-700 dark:text-green-400 px-5 py-2 rounded-xl shadow hover:bg-green-50 dark:hover:bg-secondary-700 hover:text-green-800 dark:hover:text-green-300 font-bold text-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-300 dark:focus:ring-green-700"
            >
              <svg xmlns='http://www.w3.org/2000/svg' className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Volver
            </button>
          </div>
          {/* Cabecera receta */}
          <div className="w-full max-w-2xl flex flex-col items-center mb-4 px-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">🍽️</span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-green-700 dark:text-green-400 text-center drop-shadow break-words">{receta.nombre}</h1>
            </div>
          </div>
          <div className="w-full max-w-2xl bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl p-6 sm:p-8 border border-green-200 dark:border-secondary-700 mx-2 sm:mx-0">
            <h2 className="text-2xl font-semibold text-green-600 dark:text-green-400 mb-4 border-b border-green-100 dark:border-secondary-700 pb-2 flex items-center gap-2">
              <span role="img" aria-label="ingredientes">🧾</span> Ingredientes
            </h2>
            <ul className="mb-8 divide-y divide-green-50 dark:divide-secondary-800">
              {receta.ingredientes.map((ing, idx) => (
                <li key={idx} className="flex justify-between items-center py-2 text-base sm:text-lg flex-wrap">
                  <span className="font-medium text-gray-700 dark:text-secondary-100 break-words max-w-[60%] flex items-center gap-2">
                    <span className="text-lg">🥗</span> {ing.nombre}
                  </span>
                  <span className="font-bold text-green-700 dark:text-green-400 break-words text-right">{ing.cantidad}</span>
                </li>
              ))}
            </ul>
            <h2 className="text-2xl font-semibold text-green-600 dark:text-green-400 mb-4 border-b border-green-100 dark:border-secondary-700 pb-2 flex items-center gap-2">
              <span role="img" aria-label="elaboración">👨‍🍳</span> Elaboración
            </h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-800 dark:text-secondary-100 text-base sm:text-lg">
              {receta.pasos.map((paso, idx) => (
                <li key={idx} className="pl-2 break-words flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 mt-1">🍴</span>
                  <span>{paso}</span>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}
    </div>
  );
} 