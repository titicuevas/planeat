import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { format } from 'date-fns';
import { WEEK_DAYS } from '../types/dashboard';
import { getBaseMondayForDisplay } from '../utils/dateUtils';
import { analizarMenu, normalizaMenuConSnacks } from '../utils/menuUtils';
import type { MealPlan, DiaComidas } from '../types/dashboard';
import Swal from 'sweetalert2';

interface MenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: MealPlan | null;
  menu: Record<string, DiaComidas> | null;
  onSuggestAlternative: (dia: string, tipo: keyof DiaComidas, platoActual: string) => Promise<string>;
  onUpdatePlan: (planId: string, updates: Partial<MealPlan>) => Promise<boolean>;
  intolerances?: string[] | null;
}

const TIPOS_COMIDA: (keyof DiaComidas)[] = [
  'Desayuno',
  'Comida',
  'Cena',
  'Snack mañana',
  'Snack tarde',
];

export function MenuModal({
  isOpen,
  onClose,
  plan,
  menu,
  onSuggestAlternative,
  onUpdatePlan,
  intolerances
}: MenuModalProps) {
  const [savingEdit, setSavingEdit] = useState(false);
  const [verSemanaCompleta, setVerSemanaCompleta] = useState(false);
  const [menuLocal, setMenuLocal] = useState<Record<string, DiaComidas>>(() => menu ? normalizaMenuConSnacks(menu) : {});
  const [loadingCell, setLoadingCell] = useState<{dia: string, tipo: keyof DiaComidas} | null>(null);

  React.useEffect(() => {
    setMenuLocal(menu ? normalizaMenuConSnacks(menu) : {});
  }, [menu]);

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
      if (result.isConfirmed && plan) {
        const nuevoMenu = { ...menuLocal };
        nuevoMenu[dia] = { ...nuevoMenu[dia], [tipo]: alternativa };
        const menuNormalizado = normalizaMenuConSnacks(nuevoMenu);
        setMenuLocal(menuNormalizado);
        await onUpdatePlan(plan.id, { meals: menuNormalizado as unknown as Record<string, Record<string, string>> });
      }
    } catch (err) {
      Swal.fire('Error', 'No se pudo sugerir alternativa', 'error');
    } finally {
      setLoadingCell(null);
    }
  };

  if (!menuLocal || !plan) return null;

  const analisis = analizarMenu(menuLocal);
  const totalMacros = analisis.carbohidratos + analisis.proteinas + analisis.grasas;

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-30" aria-hidden="true" />
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full mx-auto p-6 z-10">
          {/* Análisis nutricional */}
          <div className="mb-4 p-4 bg-green-50 rounded-lg shadow flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="text-green-800 font-semibold mb-2 md:mb-0">
              Análisis nutricional estimado de la semana:
            </div>
            <div className="flex flex-wrap gap-4">
              <div>
                <span className="font-bold">Carbohidratos:</span> {analisis.carbohidratos}g
                ({totalMacros > 0 ? Math.round(analisis.carbohidratos/totalMacros*100) : 0}%)
              </div>
              <div>
                <span className="font-bold">Proteínas:</span> {analisis.proteinas}g
                ({totalMacros > 0 ? Math.round(analisis.proteinas/totalMacros*100) : 0}%)
              </div>
              <div>
                <span className="font-bold">Grasas:</span> {analisis.grasas}g
                ({totalMacros > 0 ? Math.round(analisis.grasas/totalMacros*100) : 0}%)
              </div>
              <div>
                <span className="font-bold">Calorías estimadas:</span> {analisis.calorias} kcal
              </div>
            </div>
          </div>

          {/* Botón para ver semana completa */}
          <div className="flex justify-end mb-2">
            <button
              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm font-semibold text-gray-700 transition-colors"
              onClick={() => setVerSemanaCompleta(v => !v)}
            >
              {verSemanaCompleta ? 'Ver días restantes' : 'Ver toda la semana'}
            </button>
          </div>

          {/* Tabla del menú */}
          <div className="overflow-x-auto">
            <table className="min-w-full border text-xs md:text-sm rounded-xl overflow-hidden shadow">
              <thead>
                <tr className="bg-green-50">
                  <th className="p-2 border font-semibold">Comida</th>
                  {WEEK_DAYS.map((dia, idx) => {
                    const baseMonday = getBaseMondayForDisplay();
                    const planDate = new Date(baseMonday);
                    planDate.setDate(baseMonday.getDate() + idx);
                    const fechaStr = `${dia.charAt(0).toUpperCase() + dia.slice(1)} ${planDate.getDate().toString().padStart(2, '0')}/${(planDate.getMonth() + 1).toString().padStart(2, '0')}/${planDate.getFullYear()}`;
                    const today = new Date();
                    const isToday = today.toDateString() === planDate.toDateString();
                    return (
                      <th key={dia} className={`p-2 border font-semibold capitalize${isToday ? ' bg-green-300 text-green-900' : ''}`}>
                        {fechaStr}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {TIPOS_COMIDA.map(tipo => (
                  <tr key={tipo} className="hover:bg-green-50 transition-colors">
                    <td className="p-2 border font-semibold capitalize bg-green-50">
                      {tipo === 'Desayuno' && '🍳 Desayuno'}
                      {tipo === 'Comida' && '🍽️ Comida'}
                      {tipo === 'Cena' && '🌙 Cena'}
                      {tipo === 'Snack mañana' && '☀️ Snack mañana'}
                      {tipo === 'Snack tarde' && '🌆 Snack tarde'}
                    </td>
                    {WEEK_DAYS.map((dia) => {
                      const comidas = menuLocal[dia] || {
                        Desayuno: '-',
                        Comida: '-',
                        Cena: '-',
                        'Snack mañana': '-',
                        'Snack tarde': '-',
                      };
                      const valor = comidas[tipo] || '-';
                      const isLoading = loadingCell && loadingCell.dia === dia && loadingCell.tipo === tipo;
                      return (
                        <td key={dia} className="p-2 border text-xs md:text-sm" style={{ minWidth: 120 }}>
                          {isLoading ? (
                            <span className="text-green-600 animate-pulse">Buscando...</span>
                          ) : (
                            <>
                              {valor}
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
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={onClose}
            className="mt-6 w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Dialog>
  );
} 