import React, { useState } from 'react';
import { format } from 'date-fns';
import { WEEK_DAYS } from '../types/dashboard';
import { getMondayOfCurrentWeek } from '../utils/dateUtils';
import { getSnackSaludable } from '../utils/menuUtils';
import type { DiaComidas } from '../types/dashboard';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';

interface MenuTableProps {
  menu: Record<string, DiaComidas>;
  onSuggestAlternative: (dia: string, tipo: keyof DiaComidas, platoActual: string) => Promise<string>;
  intolerances?: string[] | null;
  verSemanaCompleta?: boolean;
  fechaInicio?: Date;
}

const TIPOS_COMIDA: (keyof DiaComidas)[] = [
  'Desayuno',
  'Comida',
  'Cena',
  'Snack mañana',
  'Snack tarde',
];

// Añadir función para crear slug de receta
function slugReceta(nombre: string) {
  return nombre
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar tildes
    .replace(/[^a-z0-9\s-]/g, '') // quitar caracteres especiales
    .replace(/\s+/g, '-') // espacios a guiones
    .replace(/-+/g, '-') // varios guiones a uno
    .replace(/^-+|-+$/g, ''); // quitar guiones al inicio/fin
}

export function MenuTable({ menu, onSuggestAlternative, intolerances, verSemanaCompleta = false, fechaInicio }: MenuTableProps) {
  // Calcular el día de inicio real del menú
  let fechaInicioMenu: Date;
  if (fechaInicio) {
    fechaInicioMenu = new Date(fechaInicio);
  } else {
    fechaInicioMenu = getMondayOfCurrentWeek();
  }
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
    for (let i = 0; i < Object.keys(menu).length; i++) {
      const d = new Date(fechaInicioMenu);
      d.setDate(fechaInicioMenu.getDate() + i);
      diasAMostrar.push(d);
    }
  }
  const [loadingCell, setLoadingCell] = useState<{dia: string, tipo: keyof DiaComidas} | null>(null);
  const [menuLocal, setMenuLocal] = useState<Record<string, DiaComidas>>(menu);

  React.useEffect(() => {
    setMenuLocal(menu);
  }, [menu]);

  // Lógica para sugerir alternativa y actualizar menú local
  const handleSuggestAlternative = async (dia: string, tipo: keyof DiaComidas, platoActual: string) => {
    if (loadingCell) return; // Evitar múltiples solicitudes simultáneas
    setLoadingCell({ dia, tipo });
    try {
      let alternativasMostradas: Set<string> = new Set([platoActual]);
      let alternativa = platoActual;
      let seguir = true;
      while (seguir) {
        alternativa = await onSuggestAlternative(dia, tipo, alternativa);
        if (typeof alternativa !== 'string') {
          throw new Error('La alternativa debe ser un string');
        }
        // Evitar mostrar la misma alternativa varias veces
        if (alternativasMostradas.has(alternativa)) {
          await Swal.fire('Sin más alternativas', 'No se encontraron más alternativas diferentes. Intenta más tarde.', 'info');
          break;
        }
        alternativasMostradas.add(alternativa);
        const result = await Swal.fire({
          title: '¿Quieres cambiar el plato?',
          html: `
            <div class="text-left">
              <p class="mb-2"><b>Plato actual:</b> ${platoActual}</p>
              <p><b>Sugerencia:</b> ${alternativa}</p>
            </div>
          `,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Sí, cambiar',
          cancelButtonText: 'No, otra sugerencia',
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
          setMenuLocal(nuevoMenu);
          seguir = false;
          setLoadingCell(null);
          return; // Salir inmediatamente tras confirmar
        } else {
          // Si el usuario pulsa 'No', se vuelve a pedir otra alternativa
          if (alternativasMostradas.size > 5) {
            await Swal.fire('Sin más alternativas', 'No se encontraron más alternativas diferentes. Intenta más tarde.', 'info');
            seguir = false;
          }
        }
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
          <tr className="bg-green-50 dark:bg-secondary-800">
            <th className="p-2 border text-secondary-900 dark:text-secondary-100">Día</th>
            <th className="p-2 border text-secondary-900 dark:text-secondary-100"><span role="img" aria-label="desayuno">🍳</span> Desayuno</th>
            <th className="p-2 border text-secondary-900 dark:text-secondary-100"><span role="img" aria-label="comida">🍽️</span> Comida</th>
            <th className="p-2 border text-secondary-900 dark:text-secondary-100"><span role="img" aria-label="cena">🌙</span> Cena</th>
            <th className="p-2 border text-secondary-900 dark:text-secondary-100"><span role="img" aria-label="snack mañana">☀️</span> Snack mañana</th>
            <th className="p-2 border text-secondary-900 dark:text-secondary-100"><span role="img" aria-label="snack tarde">🌆</span> Snack tarde</th>
          </tr>
        </thead>
        <tbody>
          {diasAMostrar.map((fecha, idx) => {
            const nombreDia = fecha.toLocaleDateString('es-ES', { weekday: 'long' });
            const nombreDiaCapital = nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1);
            const fechaStr = `${nombreDiaCapital} ${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()}`;
            const keyMenu = Object.keys(menuLocal)[idx];
            const today = new Date();
            const isToday = today.toDateString() === fecha.toDateString();
            const comidas = menuLocal[keyMenu] || {
              Desayuno: '',
              Comida: '',
              Cena: '',
              'Snack mañana': '',
              'Snack tarde': '',
            };

            return (
              <tr key={fechaStr} className={isToday ? 'bg-green-100 dark:bg-secondary-700 font-bold' : 'hover:bg-green-50 dark:hover:bg-secondary-700 transition-colors'}>
                <td className="p-2 border font-semibold capitalize text-secondary-900 dark:text-secondary-100">{fechaStr}</td>
                {TIPOS_COMIDA.map((tipo) => {
                  const valor = comidas[tipo] || '';
                  const isLoading = loadingCell && loadingCell.dia === keyMenu && loadingCell.tipo === tipo;
                  return (
                    <td key={tipo} className="p-2 border text-secondary-900 dark:text-secondary-100">
                      {isLoading ? (
                        <span className="text-green-600 dark:text-green-400 animate-pulse">Buscando...</span>
                      ) : (
                        <>
                          {valor === '-' || valor === '' ? '' : (
                            <Link
                              to={`/receta/${slugReceta(valor)}`}
                              className="text-green-700 dark:text-green-400 hover:underline font-semibold"
                              title={`Ver receta de ${valor}`}
                            >
                              {valor}
                            </Link>
                          )}
                          <button
                            type="button"
                            className="ml-2 text-xs text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300"
                            onClick={() => handleSuggestAlternative(keyMenu, tipo, valor)}
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