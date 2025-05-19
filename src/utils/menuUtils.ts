import { format } from 'date-fns';
import type { DiaComidas } from '../types/dashboard';
import { WEEK_DAYS, SNACKS_SALUDABLES } from '../types/dashboard';

const MENU_EJEMPLO: Record<string, DiaComidas> = {
  lunes: {
    Desayuno: 'Tostadas integrales con tomate y aceite de oliva',
    Comida: 'Pollo a la plancha con arroz y verduras',
    Cena: 'Ensalada de atún con huevo duro',
    'Snack mañana': 'Fruta fresca (manzana, plátano, pera, uvas)',
    'Snack tarde': 'Yogur vegetal',
  },
  martes: {
    Desayuno: 'Avena con leche vegetal y frutos rojos',
    Comida: 'Lentejas estofadas con verduras',
    Cena: 'Tortilla francesa con ensalada',
    'Snack mañana': 'Fruta fresca (manzana, plátano, pera, uvas)',
    'Snack tarde': 'Palitos de zanahoria con hummus',
  },
  miércoles: {
    Desayuno: 'Pan integral con aguacate y tomate',
    Comida: 'Merluza al horno con patatas',
    Cena: 'Sopa de verduras y pechuga de pavo',
    'Snack mañana': 'Fruta fresca (manzana, plátano, pera, uvas)',
    'Snack tarde': 'Barrita de cereales sin alérgenos',
  },
  jueves: {
    Desayuno: 'Porridge de avena con plátano',
    Comida: 'Arroz integral con verduras y tofu',
    Cena: 'Ensalada de garbanzos',
    'Snack mañana': 'Fruta fresca (manzana, plátano, pera, uvas)',
    'Snack tarde': 'Galletas de arroz',
  },
  viernes: {
    Desayuno: 'Batido de frutas y semillas',
    Comida: 'Pasta integral con salsa de tomate y atún',
    Cena: 'Revuelto de champiñones y espinacas',
    'Snack mañana': 'Fruta fresca (manzana, plátano, pera, uvas)',
    'Snack tarde': 'Queso fresco vegano',
  },
  sábado: {
    Desayuno: 'Tostadas de pan de centeno con hummus',
    Comida: 'Paella de verduras',
    Cena: 'Pizza casera vegetal',
    'Snack mañana': 'Fruta fresca (manzana, plátano, pera, uvas)',
    'Snack tarde': 'Batido vegetal',
  },
  domingo: {
    Desayuno: 'Croissant integral y zumo de naranja',
    Comida: 'Asado de ternera con patatas',
    Cena: 'Ensalada campera',
    'Snack mañana': 'Fruta fresca (manzana, plátano, pera, uvas)',
    'Snack tarde': 'Tortitas de maíz',
  },
};

export function getWeekRange(week: string) {
  const start = new Date(week)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return `${format(start, 'd/M/yyyy')} - ${format(end, 'd/M/yyyy')}`
}

export function getPlatosNoAptos(menu: any, intolerancias: string[]) {
  if (!menu || !intolerancias || intolerancias.length === 0) return [];
  const platosNoAptos: { dia: string, tipo: string, plato: string, intolerancia: string }[] = [];
  for (const dia of WEEK_DAYS) {
    if (!menu[dia]) continue;
    for (const tipo of ['Desayuno', 'Comida', 'Cena']) {
      const plato = menu[dia][tipo]?.toLowerCase() || '';
      for (const intol of intolerancias) {
        if (plato.includes(intol.toLowerCase())) {
          platosNoAptos.push({ dia, tipo, plato: menu[dia][tipo], intolerancia: intol });
        }
      }
    }
  }
  return platosNoAptos;
}

export function normalizaMenuConSnacks(
  menu: Record<string, Partial<DiaComidas>>,
  intolerancias: string[] = []
): Record<string, DiaComidas> {
  const normalizado: Record<string, DiaComidas> = {};
  for (const dia of WEEK_DAYS) {
    const comidas = menu[dia] || {};
    normalizado[dia] = {
      Desayuno: comidas.Desayuno || MENU_EJEMPLO[dia]?.Desayuno || 'Por definir',
      Comida: comidas.Comida || MENU_EJEMPLO[dia]?.Comida || 'Por definir',
      Cena: comidas.Cena || MENU_EJEMPLO[dia]?.Cena || 'Por definir',
      'Snack mañana': comidas['Snack mañana'] || getSnackSaludable(intolerancias),
      'Snack tarde': comidas['Snack tarde'] || getSnackSaludable(intolerancias),
    };
  }
  return normalizado;
}

export function getMenuHorizontal(menu: Record<string, Partial<DiaComidas>>, intolerancias: string[] = []): Record<string, DiaComidas> {
  const normalizado: Record<string, DiaComidas> = {};
  for (const dia of WEEK_DAYS) {
    const comidas = menu[dia] || {};
    normalizado[dia] = {
      Desayuno: comidas.Desayuno || 'Por definir',
      Comida: comidas.Comida || 'Por definir',
      Cena: comidas.Cena || 'Por definir',
      'Snack mañana': comidas['Snack mañana'] || getSnackSaludable(intolerancias),
      'Snack tarde': comidas['Snack tarde'] || getSnackSaludable(intolerancias),
    };
  }
  return normalizado;
}

export function getSnackSaludable(intolerancias: string[]): string {
  const claves = intolerancias.map(i => i.toLowerCase());
  const snack = SNACKS_SALUDABLES.find(s =>
    !claves.some(clave => s.toLowerCase().includes(clave))
  );
  return snack || 'Fruta fresca';
}

export function analizarMenu(menu: Record<string, DiaComidas>) {
  const estimaciones = {
    carbohidratos: ['arroz', 'pasta', 'pan', 'patata', 'quinoa', 'avena', 'cereal', 'legumbre', 'fruta', 'batata', 'maíz'],
    proteinas: ['pollo', 'pavo', 'huevo', 'atún', 'salmón', 'carne', 'ternera', 'tofu', 'lenteja', 'yogur', 'queso', 'pescado', 'marisco', 'soja', 'proteína', 'jamón', 'bacalao', 'merluza', 'gambas', 'calamares', 'pechuga', 'hamburguesa', 'legumbre'],
    grasas: ['aceite', 'aguacate', 'nuez', 'almendra', 'frutos secos', 'mantequilla', 'queso', 'oliva', 'semilla', 'mayonesa', 'sésamo', 'cacahuete', 'chía', 'coco'],
  };
  let total = { carbohidratos: 0, proteinas: 0, grasas: 0, calorias: 0 };
  for (const dia of WEEK_DAYS) {
    const comidas = menu[dia];
    if (!comidas) continue;
    for (const tipo of Object.keys(comidas) as (keyof DiaComidas)[]) {
      const plato = (comidas[tipo] || '').toLowerCase();
      if (!plato || plato === 'por definir') continue;
      for (const macro in estimaciones) {
        if (estimaciones[macro as keyof typeof estimaciones].some(k => plato.includes(k))) {
          total[macro as keyof typeof total] += 1;
        }
      }
      if (tipo === 'Desayuno' || tipo.includes('Snack')) total.calorias += 200;
      if (tipo === 'Comida' || tipo === 'Cena') total.calorias += 400;
    }
  }
  return total;
} 