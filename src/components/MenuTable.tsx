import React, { useState } from 'react';
import { format } from 'date-fns';
import { WEEK_DAYS } from '../types/dashboard';
import { getBaseMondayForDisplay } from '../utils/dateUtils';
import { getSnackSaludable } from '../utils/menuUtils';
import type { DiaComidas } from '../types/dashboard';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';

interface MenuTableProps {
  menu: Record<string, DiaComidas>;
  onSuggestAlternative: (dia: string, tipo: keyof DiaComidas, platoActual: string) => Promise<string>;
  intolerances?: string[] | null;
  verSemanaCompleta?: boolean;
}

const TIPOS_COMIDA: (keyof DiaComidas)[] = [
  'Desayuno',
  'Comida',
  'Cena',
  'Snack mañana',
  'Snack tarde',
];

export function MenuTable({ menu, onSuggestAlternative, intolerances, verSemanaCompleta = false }: MenuTableProps) {
  const diasAMostrar = verSemanaCompleta ? WEEK_DAYS : WEEK_DAYS.slice(new Date().getDay() - 1);
  const [loadingCell, setLoadingCell] = useState<{dia: string, tipo: keyof DiaComidas} | null>(null);
  const [menuLocal, setMenuLocal] = useState<Record<string, DiaComidas>>(menu);

  React.useEffect(() => {
    setMenuLocal(menu);
  }, [menu]);

  // Lógica para sugerir alternativa y actualizar menú local
  const handleSuggestAlternative = async (dia: string, tipo: keyof DiaComidas, platoActual: string) => {
    setLoadingCell({ dia, tipo });
    try {
      const alternativa = await onSuggestAlternative(dia, tipo, platoActual);
      const result = await Swal.fire({
        title: '¿Quieres cambiar el plato?',
        text: `Sugerencia: ${alternativa}`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, cambiar',
        cancelButtonText: 'No',
        confirmButtonColor: '#22c55e',
      });
      if (result.isConfirmed) {
        const nuevoMenu = { ...menuLocal };
        nuevoMenu[dia] = { ...nuevoMenu[dia], [tipo]: alternativa };
        setMenuLocal(nuevoMenu);
      }
    } catch (err) {
      Swal.fire('Error', 'No se pudo sugerir alternativa', 'error');
    } finally {
      setLoadingCell(null);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border text-sm">
        <thead>
          <tr className="bg-green-50">
            <th className="p-2 border">Día</th>
            <th className="p-2 border"><span role="img" aria-label="desayuno">🍳</span> Desayuno</th>
            <th className="p-2 border"><span role="img" aria-label="comida">🍽️</span> Comida</th>
            <th className="p-2 border"><span role="img" aria-label="cena">🌙</span> Cena</th>
            <th className="p-2 border"><span role="img" aria-label="snack mañana">☀️</span> Snack mañana</th>
            <th className="p-2 border"><span role="img" aria-label="snack tarde">🌆</span> Snack tarde</th>
          </tr>
        </thead>
        <tbody>
          {diasAMostrar.map((dia, idx) => {
            const baseMonday = getBaseMondayForDisplay();
            const planDate = new Date(baseMonday);
            planDate.setDate(baseMonday.getDate() + idx);
            const fechaStr = `${dia.charAt(0).toUpperCase() + dia.slice(1)} ${planDate.getDate().toString().padStart(2, '0')}/${(planDate.getMonth() + 1).toString().padStart(2, '0')}/${planDate.getFullYear()}`;
            const today = new Date();
            const isToday = today.toDateString() === planDate.toDateString();
            const comidas = menuLocal[dia] || {
              Desayuno: '',
              Comida: '',
              Cena: '',
              'Snack mañana': '',
              'Snack tarde': '',
            };

            return (
              <tr key={dia} className={isToday ? 'bg-green-100 font-bold' : 'hover:bg-green-50'}>
                <td className="p-2 border font-semibold capitalize">{fechaStr}</td>
                {TIPOS_COMIDA.map((tipo) => {
                  const valor = comidas[tipo] || '';
                  const isLoading = loadingCell && loadingCell.dia === dia && loadingCell.tipo === tipo;
                  return (
                    <td key={tipo} className="p-2 border">
                      {isLoading ? (
                        <span className="text-green-600 animate-pulse">Buscando...</span>
                      ) : (
                        <>
                          {valor === '-' || valor === '' ? '' : (
                            <Link
                              to={`/receta/${valor.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9\-]/g, '')}`}
                              className="text-green-700 hover:underline font-semibold"
                              title={`Ver receta de ${valor}`}
                            >
                              {valor}
                            </Link>
                          )}
                          <button
                            className="ml-2 text-xs text-blue-600 underline"
                            onClick={() => handleSuggestAlternative(dia, tipo, valor)}
                            title="Sugerir alternativa"
                            disabled={!!loadingCell}
                          >
                            ¿Otra?
                          </button>
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
} 