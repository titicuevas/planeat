import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface Ingrediente {
  nombre: string;
  cantidad: string;
}

interface RecetaDetalle {
  nombre: string;
  ingredientes: Ingrediente[];
  pasos: string[];
}

export default function Receta() {
  const navigate = useNavigate();
  const { recetaId } = useParams();
  const [receta, setReceta] = useState<RecetaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReceta() {
      setLoading(true);
      setError(null);
      try {
        let nombrePlato = recetaId?.replace(/-/g, ' ') || '';
        nombrePlato = nombrePlato.replace(/\b\w/g, l => l.toUpperCase());
        const res = await fetch('/api/receta-detalle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: nombrePlato })
        });
        if (!res.ok) throw new Error('No se pudo obtener la receta');
        const data = await res.json();
        setReceta(data);
      } catch (err: any) {
        setError(err.message || 'Error desconocido');
      } finally {
        setLoading(false);
      }
    }
    if (recetaId) fetchReceta();
  }, [recetaId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
        <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center">
          <span className="text-lg font-semibold text-green-700 mb-2">Cargando receta...</span>
        </div>
      </div>
    );
  }

  if (error || !receta) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
        <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center">
          <span className="text-2xl font-bold text-red-700 mb-2">No se pudo cargar la receta</span>
          <span className="text-gray-600 mb-2">{error}</span>
          <button
            onClick={() => navigate('/inicio')}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-semibold shadow"
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex flex-col items-center py-8">
      <div className="w-full max-w-2xl flex items-center mb-4">
        <button
          onClick={() => navigate('/inicio')}
          className="flex items-center gap-2 bg-white border border-green-200 text-green-700 px-5 py-2 rounded-xl shadow hover:bg-green-50 hover:text-green-800 font-bold text-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-300"
        >
          <svg xmlns='http://www.w3.org/2000/svg' className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Volver
        </button>
      </div>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-8 border border-green-200">
        <h1 className="text-4xl font-extrabold text-green-700 mb-6 text-center drop-shadow">{receta.nombre}</h1>
        <h2 className="text-2xl font-semibold text-green-600 mb-4 border-b border-green-100 pb-2">Ingredientes</h2>
        <ul className="mb-8 divide-y divide-green-50">
          {receta.ingredientes.map((ing, idx) => (
            <li key={idx} className="flex justify-between items-center py-2 text-lg">
              <span className="font-medium text-gray-700">{ing.nombre}</span>
              <span className="font-bold text-green-700">{ing.cantidad}</span>
            </li>
          ))}
        </ul>
        <h2 className="text-2xl font-semibold text-green-600 mb-4 border-b border-green-100 pb-2">Elaboración</h2>
        <ol className="list-decimal list-inside space-y-3 text-gray-800 text-lg">
          {receta.pasos.map((paso, idx) => (
            <li key={idx} className="pl-2">{paso}</li>
          ))}
        </ol>
      </div>
    </div>
  );
} 