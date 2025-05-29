import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { format } from 'date-fns';
import { WEEK_DAYS } from '../types/dashboard';
import { getBaseMondayForDisplay } from '../utils/dateUtils';
import { analizarMenu, normalizaMenuConSnacks, calcularMacrosReales } from '../utils/menuUtils';
import type { MealPlan, DiaComidas } from '../types/dashboard';
import Swal from 'sweetalert2';
import { es } from 'date-fns/locale';
import { getIngredientesPlatoGemini } from '../api/gemini';

interface MenuModalProps {
  plan: MealPlan;
  menuDetail: Record<string, DiaComidas>;
  onClose: () => void;
  onDelete: () => Promise<void>;
  onSuggestAlternative: (dia: string, tipo: keyof DiaComidas, platoActual: string) => Promise<string>;
  loadingAlternative: { dia: string; tipo: keyof DiaComidas } | null;
  fechaInicio?: Date;
  verSemanaCompleta?: boolean;
}

const TIPOS_COMIDA: (keyof DiaComidas)[] = [
  'Desayuno',
  'Comida',
  'Cena',
  'Snack mañana',
  'Snack tarde',
];

const MenuModal: React.FC<MenuModalProps> = ({
  plan,
  menuDetail,
  onClose,
  onDelete,
  onSuggestAlternative,
  loadingAlternative,
  fechaInicio,
  verSemanaCompleta = false
}: MenuModalProps) => {
  const [savingEdit, setSavingEdit] = useState(false);
  const [menuLocal, setMenuLocal] = useState<Record<string, DiaComidas>>(() => menuDetail ? normalizaMenuConSnacks(menuDetail) : {});
  const [macrosReales, setMacrosReales] = useState<{carbohidratos:number,proteinas:number,grasas:number,calorias:number}|null>(null);
  const [loadingMacros, setLoadingMacros] = useState(false);

  React.useEffect(() => {
    setMenuLocal(menuDetail ? normalizaMenuConSnacks(menuDetail) : {});
  }, [menuDetail]);

  // Nuevo: calcular macros reales al abrir el modal o cambiar el menú
  React.useEffect(() => {
    async function calcularMacrosSemana() {
      setLoadingMacros(true);
      try {
        const menu = normalizaMenuConSnacks(menuLocal);
        let ingredientesSemana: {nombre:string,cantidad:string}[] = [];
        for (const dia of Object.keys(menu)) {
          const comidas = menu[dia];
          for (const tipo of Object.keys(comidas) as (keyof DiaComidas)[]) {
            const plato = comidas[tipo];
            if (plato && plato !== 'Por definir') {
              try {
                const ingredientes = await getIngredientesPlatoGemini(plato);
                if (Array.isArray(ingredientes)) {
                  ingredientesSemana = ingredientesSemana.concat(ingredientes);
                }
              } catch (e) {
                // Si falla, ignora ese plato
              }
            }
          }
        }
        const macros = calcularMacrosReales(ingredientesSemana);
        setMacrosReales(macros);
      } catch {
        setMacrosReales(null);
      } finally {
        setLoadingMacros(false);
      }
    }
    calcularMacrosSemana();
  }, [menuLocal]);

  const handleSuggestAlternative = async (dia: string, tipo: keyof DiaComidas, platoActual: string) => {
    console.log('Handler de alternativa llamado:', dia, tipo, platoActual);
    try {
      const alternativa = await onSuggestAlternative(dia, tipo, platoActual);
      if (typeof alternativa !== 'string') {
        throw new Error('La alternativa debe ser un string');
      }
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
        if (!nuevoMenu[dia]) {
          nuevoMenu[dia] = {
            Desayuno: '',
            Comida: '',
            Cena: '',
            'Snack mañana': '',
            'Snack tarde': ''
          };
        }
        nuevoMenu[dia] = { ...nuevoMenu[dia], [tipo]: alternativa };
        const menuNormalizado = normalizaMenuConSnacks(nuevoMenu);
        setMenuLocal(menuNormalizado);
      }
    } catch (err: any) {
      if (err.message && err.message.includes('overloaded')) {
        await Swal.fire('IA saturada', 'El modelo de IA está saturado, inténtalo de nuevo en unos minutos.', 'warning');
      } else {
        await Swal.fire('Error', 'No se pudo sugerir alternativa. Intenta de nuevo.', 'error');
      }
    }
  };

  if (!menuLocal || !plan) return null;

  // Log para depuración de valores nutricionales
  const menuAnalizar = normalizaMenuConSnacks(menuLocal);
  console.log('Menú recibido para análisis nutricional:', menuAnalizar);
  const analisis = analizarMenu(menuAnalizar);
  const totalMacros = analisis.carbohidratos + analisis.proteinas + analisis.grasas;
  if (analisis.carbohidratos === 0 && analisis.proteinas === 0 && analisis.grasas === 0) {
    console.warn('El menú recibido para análisis nutricional está vacío o mal formateado.');
  }

  // Calcular los días a mostrar según el estado verSemanaCompleta
  const fechaInicioMenu = new Date(plan.week);
  let diasAMostrar: Date[] = [];
  if (verSemanaCompleta) {
    // Menú de la semana completa: lunes a domingo
    for (let i = 0; i < 7; i++) {
      const d = new Date(fechaInicioMenu);
      d.setDate(fechaInicioMenu.getDate() + i);
      diasAMostrar.push(d);
    }
  } else if (fechaInicio) {
    // Menú creado a mitad de semana: desde el día de creación hasta domingo
    const diaSemana = fechaInicio.getDay() === 0 ? 6 : fechaInicio.getDay() - 1; // 0=lunes, 6=domingo
    const diasRestantes = 7 - diaSemana;
    for (let i = 0; i < diasRestantes; i++) {
      const d = new Date(fechaInicio);
      d.setDate(fechaInicio.getDate() + i);
      diasAMostrar.push(d);
    }
  } else {
    // Fallback: mostrar todos los días del menú
    for (let i = 0; i < Object.keys(menuLocal).length; i++) {
      const d = new Date(fechaInicioMenu);
      d.setDate(fechaInicioMenu.getDate() + i);
      diasAMostrar.push(d);
    }
  }

  // Calcular rango de fechas para la cabecera
  let fechaInicioSemana: Date, fechaFinSemana: Date;
  if (verSemanaCompleta) {
    fechaInicioSemana = new Date(plan.week);
    fechaFinSemana = new Date(plan.week);
    fechaFinSemana.setDate(fechaInicioSemana.getDate() + 6);
  } else if (fechaInicio) {
    fechaInicioSemana = new Date(fechaInicio);
    fechaFinSemana = new Date(fechaInicio);
    fechaFinSemana.setDate(fechaInicioSemana.getDate() + diasAMostrar.length - 1);
  } else {
    fechaInicioSemana = new Date(plan.week);
    fechaFinSemana = new Date(plan.week);
    fechaFinSemana.setDate(fechaInicioSemana.getDate() + diasAMostrar.length - 1);
  }

  // Mostrar loader o valores reales
  let macrosContent = null;
  if (loadingMacros) {
    macrosContent = <div className="text-center text-green-600 dark:text-green-400">Calculando valores nutricionales reales...</div>;
  } else if (macrosReales) {
    macrosContent = (
      <div className="text-center text-green-700 dark:text-green-400 mt-2">
        <b>Valores estimados para toda la semana (reales):</b><br/>
        🥖 Carbohidratos: {macrosReales.carbohidratos} g &nbsp; 🍗 Proteínas: {macrosReales.proteinas} g &nbsp; 🥑 Grasas: {macrosReales.grasas} g<br/>
        🔥 Calorías estimadas: {macrosReales.calorias} kcal
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-secondary-200 dark:border-secondary-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-secondary-900 dark:text-white">
                Menú del {format(fechaInicioSemana, 'dd/MM/yyyy')} al {format(fechaFinSemana, 'dd/MM/yyyy')}
              </h2>
              <p className="text-secondary-600 dark:text-secondary-300 text-sm mt-1">Semana completa</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="btn btn-primary"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {diasAMostrar.map((fecha, idx) => {
              const nombreDia = fecha.toLocaleDateString('es-ES', { weekday: 'long' });
              const nombreDiaCapital = nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1);
              const fechaStr = `${nombreDiaCapital} ${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()}`;
              // Buscar el nombre del día en el objeto menuLocal (puede ser Lunes, Martes, etc.)
              const keyMenu = Object.keys(menuLocal)[idx];
              return (
                <div key={fechaStr} className="bg-green-50 dark:bg-secondary-900 rounded-xl shadow-md p-4 flex flex-col gap-2 border border-green-100 dark:border-secondary-700">
                  <h3 className="text-lg font-semibold text-primary-600 dark:text-primary-400 mb-2 border-b border-green-200 dark:border-secondary-700 pb-1">
                    {fechaStr}
                  </h3>
                  <div className="space-y-3">
                    {TIPOS_COMIDA.map((tipo) => (
                      <div key={tipo} className="space-y-1">
                        <h4 className="text-xs font-medium text-secondary-600 dark:text-secondary-400 capitalize">
                          {tipo}
                        </h4>
                        <div className="flex items-center gap-2">
                          <p className="flex-1 text-secondary-900 dark:text-secondary-100 text-sm">
                            {menuLocal[keyMenu]?.[tipo] || 'No especificado'}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleSuggestAlternative(keyMenu, tipo, menuLocal[keyMenu]?.[tipo] || '')}
                            disabled={!!loadingAlternative}
                            className="p-1 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 disabled:opacity-50"
                            title="Sugerir alternativa"
                          >
                            {loadingAlternative && loadingAlternative.dia === keyMenu && loadingAlternative.tipo === tipo ? (
                              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin-slow" />
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {macrosContent}
      </div>
    </div>
  );
}

export default MenuModal; 