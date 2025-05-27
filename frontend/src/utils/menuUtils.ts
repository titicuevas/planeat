import { format } from 'date-fns';
import type { DiaComidas } from '../types/dashboard';
import { WEEK_DAYS, SNACKS_SALUDABLES } from '../types/dashboard';

export const MENU_EJEMPLO: Record<string, DiaComidas> = {
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
  const tiposComida = ['Desayuno', 'Comida', 'Cena', 'Snack mañana', 'Snack tarde'];
  for (const dia of WEEK_DAYS) {
    // Buscar el día en el menú sin importar mayúsculas/minúsculas/tildes
    const keyMenu = Object.keys(menu).find(
      k => k.normalize('NFD').replace(/[0-\u036f]/g, '').toLowerCase() ===
           dia.normalize('NFD').replace(/[0-\u036f]/g, '').toLowerCase()
    );
    const comidas = keyMenu ? menu[keyMenu] : {};
    normalizado[dia] = {
      Desayuno: comidas?.Desayuno || comidas?.desayuno || '',
      Comida: comidas?.Comida || comidas?.comida || '',
      Cena: comidas?.Cena || comidas?.cena || '',
      'Snack mañana': comidas?.['Snack mañana'] || comidas?.['snack mañana'] || '',
      'Snack tarde': comidas?.['Snack tarde'] || comidas?.['snack tarde'] || '',
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
    carbohidratos: {
      arroz: 45,
      pasta: 40,
      pan: 30,
      patata: 20,
      quinoa: 30,
      avena: 30,
      cereal: 25,
      legumbre: 20,
      fruta: 15,
      batata: 25,
      maíz: 20
    },
    proteinas: {
      pollo: 30,
      pavo: 30,
      huevo: 12,
      atún: 25,
      salmón: 22,
      carne: 25,
      ternera: 25,
      tofu: 15,
      lenteja: 18,
      yogur: 10,
      queso: 20,
      pescado: 20,
      marisco: 20,
      soja: 15,
      proteína: 25,
      jamón: 20,
      bacalao: 20,
      merluza: 20,
      gambas: 20,
      calamares: 15,
      pechuga: 30,
      hamburguesa: 20,
      legumbre: 15
    },
    grasas: {
      aceite: 14,
      aguacate: 15,
      nuez: 15,
      almendra: 15,
      'frutos secos': 15,
      mantequilla: 12,
      queso: 10,
      oliva: 14,
      semilla: 10,
      mayonesa: 12,
      sésamo: 10,
      cacahuete: 15,
      chía: 10,
      coco: 12
    }
  };

  let total = { carbohidratos: 0, proteinas: 0, grasas: 0, calorias: 0 };

  for (const dia of WEEK_DAYS) {
    const comidas = menu[dia];
    if (!comidas) continue;

    for (const tipo of Object.keys(comidas) as (keyof DiaComidas)[]) {
      const plato = (comidas[tipo] || '').toLowerCase();
      if (!plato || plato === 'por definir') continue;

      // Calcular macros basados en ingredientes
      for (const macro in estimaciones) {
        const ingredientes = estimaciones[macro as keyof typeof estimaciones];
        for (const [ingrediente, valor] of Object.entries(ingredientes)) {
          if (plato.includes(ingrediente)) {
            total[macro as keyof typeof total] += valor;
          }
        }
      }

      // Ajustar calorías según el tipo de comida
      if (tipo === 'Desayuno' || tipo === 'Snack mañana' || tipo === 'Snack tarde') {
        total.calorias += 300; // Aumentado de 200 a 300 para snacks
      } else if (tipo === 'Comida' || tipo === 'Cena') {
        total.calorias += 600; // Aumentado de 400 a 600 para comidas principales
      }
    }
  }

  // Ajustar valores finales
  total.carbohidratos = Math.round(total.carbohidratos);
  total.proteinas = Math.round(total.proteinas);
  total.grasas = Math.round(total.grasas);
  total.calorias = Math.round(total.calorias);

  return total;
}

export function normalizarCantidad(cantidad: string): string {
  // Convertir a minúsculas y eliminar espacios extra
  let cant = cantidad.toLowerCase().trim();
  
  // Normalizar unidades
  cant = cant.replace(/ml/g, 'ml')
             .replace(/g/g, 'g')
             .replace(/kg/g, 'kg')
             .replace(/l/g, 'l')
             .replace(/unidad(es)?/g, 'un')
             .replace(/puñado(s)?/g, 'puñ')
             .replace(/cucharada(s)?/g, 'cda')
             .replace(/cucharadita(s)?/g, 'cdta');

  // Normalizar números
  if (cant.includes('~')) {
    cant = cant.replace('~', '');
  }

  // Redondear cantidades pequeñas
  const match = cant.match(/(\d+(?:\.\d+)?)\s*(ml|g|kg|l|un|puñ|cda|cdta)/);
  if (match) {
    const [_, num, unit] = match;
    const numValue = parseFloat(num);
    if (numValue < 1 && unit !== 'un' && unit !== 'puñ' && unit !== 'cda' && unit !== 'cdta') {
      return `1 ${unit}`;
    }
    if (numValue < 5 && unit === 'ml') {
      return `1 cda`;
    }
    if (numValue < 10 && unit === 'g') {
      return `1 puñ`;
    }
  }

  return cant;
}

// Lista de ingredientes a ignorar en la lista de la compra
const INGREDIENTES_IGNORAR = [
  'agua', 'sal', 'pimienta', 'hielo', 'especias', 'vinagre', 'sirope', 'opcional', 'caldo', 'zumo', 'bebida', 'hielo', 'aroma', 'extracto', 'decoración', 'aderezo', 'condimento', 'azúcar', 'edulcorante', 'stevia', 'colorante', 'levadura', 'bicarbonato', 'vainilla', 'limón (opcional)', 'zumo de limón (opcional)'
];

// Unificación de nombres de ingredientes similares
export function unificarNombreIngrediente(nombre: string): string {
  let n = nombre.toLowerCase().trim();
  // Aceite de oliva y variantes
  if (/aceite.*oliva/.test(n)) return 'Aceite de oliva';
  if (/aceite.*virgen/.test(n)) return 'Aceite de oliva';
  // Leche vegetal y variantes
  if (/agua o leche vegetal/.test(n) || /leche vegetal/.test(n)) return 'Leche vegetal';
  // Almendras y variantes
  if (/almendra/.test(n)) return 'Almendras';
  // Frutos rojos congelados y variantes
  if (/frutos rojos/.test(n)) return 'Frutos rojos congelados';
  // Proteína vegetal en polvo y variantes
  if (/prote[ií]na.*(vegetal|arroz|soja|guisante)/.test(n)) return 'Proteína vegetal en polvo';
  // Calabaza
  if (/calabaza/.test(n)) return 'Calabaza';
  // Cebolla
  if (/cebolla/.test(n)) return 'Cebolla';
  // Espárragos
  if (/esp[aá]rrago/.test(n)) return 'Espárragos frescos';
  // Limón
  if (/lim[oó]n/.test(n)) return 'Limón';
  // Semillas de calabaza
  if (/semillas.*calabaza/.test(n)) return 'Semillas de calabaza';
  // Semillas de chía
  if (/ch[ií]a/.test(n)) return 'Semillas de chía';
  // Quinoa
  if (/quinoa/.test(n)) return 'Quinoa';
  // Jengibre
  if (/jengibre/.test(n)) return 'Jengibre fresco';
  // Manzana
  if (/manzana/.test(n)) return 'Manzana';
  // Puerro
  if (/puerro/.test(n)) return 'Puerro';
  // Hierbas frescas
  if (/hierbas frescas/.test(n)) return 'Hierbas frescas';
  // Perejil
  if (/perejil/.test(n)) return 'Perejil';
  // Ajo
  if (/ajo/.test(n)) return 'Ajo';
  // Crema de cacahuete
  if (/crema.*cacahuete/.test(n)) return 'Crema de cacahuete natural';
  // Espinaca
  if (/espinaca/.test(n)) return 'Espinacas';
  // Batido de proteína
  if (/batido.*prote[ií]na/.test(n)) return 'Batido de proteína';
  // Otros casos genéricos
  return nombre.trim();
}

export function agruparIngredientes(ingredientes: { nombre: string, cantidad: string }[]): { nombre: string, cantidad: string }[] {
  const grupos: { [key: string]: { nombre: string, cantidad: string } } = {};

  ingredientes.forEach(ing => {
    const nombreUnificado = unificarNombreIngrediente(ing.nombre);
    const nombreNormalizado = nombreUnificado.toLowerCase();
    const cantidadNormalizada = normalizarCantidad(ing.cantidad);

    // Ignorar ingredientes poco útiles
    if (INGREDIENTES_IGNORAR.some(i => nombreNormalizado.includes(i))) return;

    if (!grupos[nombreNormalizado]) {
      grupos[nombreNormalizado] = {
        nombre: nombreUnificado,
        cantidad: cantidadNormalizada
      };
    } else {
      // Si ya existe, sumar cantidades si son del mismo tipo
      const cantActual = grupos[nombreNormalizado].cantidad;
      const cantNueva = cantidadNormalizada;
      if (cantActual.includes('un') && cantNueva.includes('un')) {
        const numActual = parseInt(cantActual) || 1;
        const numNueva = parseInt(cantNueva) || 1;
        grupos[nombreNormalizado].cantidad = `${numActual + numNueva} un`;
      } else if (cantActual.includes('puñ') && cantNueva.includes('puñ')) {
        const numActual = parseInt(cantActual) || 1;
        const numNueva = parseInt(cantNueva) || 1;
        grupos[nombreNormalizado].cantidad = `${numActual + numNueva} puñ`;
      } else {
        // Si son diferentes tipos de unidades, mantener ambas
        grupos[nombreNormalizado].cantidad = `${cantActual} + ${cantNueva}`;
      }
    }
  });

  return Object.values(grupos);
}

// Nuevo cálculo de valores nutricionales realistas
// (requiere que los platos tengan ingredientes y cantidades reales)
// Aquí solo se muestra la estructura, habría que completarla con una base de datos real
export function calcularMacrosReales(ingredientes: { nombre: string, cantidad: string }[]): { carbohidratos: number, proteinas: number, grasas: number, calorias: number } {
  // Ejemplo de tabla de macros por ingrediente (por 100g)
  const tablaMacros: Record<string, { c: number, p: number, g: number, kcal: number }> = {
    'arroz': { c: 78, p: 7, g: 0.6, kcal: 350 },
    'pollo': { c: 0, p: 27, g: 3, kcal: 145 },
    'tofu firme': { c: 2, p: 13, g: 7, kcal: 110 },
    'leche vegetal': { c: 3, p: 1, g: 2, kcal: 30 },
    'frutos rojos congelados': { c: 14, p: 1, g: 0.3, kcal: 60 },
    'manzana': { c: 14, p: 0.3, g: 0.2, kcal: 52 },
    'salmón fresco': { c: 0, p: 20, g: 13, kcal: 200 },
    'espárragos frescos': { c: 2, p: 2, g: 0.2, kcal: 20 },
    'cebolla': { c: 9, p: 1, g: 0.1, kcal: 40 },
    'calabaza': { c: 7, p: 1, g: 0.1, kcal: 30 },
    'crema de cacahuete natural': { c: 20, p: 25, g: 50, kcal: 600 },
    'semillas de calabaza': { c: 15, p: 30, g: 45, kcal: 560 },
    // Añade más ingredientes según necesidades
  };
  let total = { carbohidratos: 0, proteinas: 0, grasas: 0, calorias: 0 };
  ingredientes.forEach(ing => {
    const nombre = unificarNombreIngrediente(ing.nombre).toLowerCase();
    const macros = tablaMacros[nombre];
    if (!macros) return;
    // Extraer cantidad en gramos
    let cantidadG = 0;
    const match = ing.cantidad.match(/(\d+(?:[\.,]\d+)?)\s*g/);
    if (match) {
      cantidadG = parseFloat(match[1].replace(',', '.'));
    } else if (ing.cantidad.match(/kg/)) {
      const matchKg = ing.cantidad.match(/(\d+(?:[\.,]\d+)?)\s*kg/);
      if (matchKg) cantidadG = parseFloat(matchKg[1].replace(',', '.')) * 1000;
    } else if (ing.cantidad.match(/ml/)) {
      // Para líquidos, aproximar 1ml = 1g
      const matchMl = ing.cantidad.match(/(\d+(?:[\.,]\d+)?)\s*ml/);
      if (matchMl) cantidadG = parseFloat(matchMl[1].replace(',', '.'));
    }
    if (cantidadG > 0) {
      total.carbohidratos += (macros.c * cantidadG) / 100;
      total.proteinas += (macros.p * cantidadG) / 100;
      total.grasas += (macros.g * cantidadG) / 100;
      total.calorias += (macros.kcal * cantidadG) / 100;
    }
  });
  // Redondear
  total.carbohidratos = Math.round(total.carbohidratos);
  total.proteinas = Math.round(total.proteinas);
  total.grasas = Math.round(total.grasas);
  total.calorias = Math.round(total.calorias);
  return total;
}

export function formatCantidadCompra(nombre: string, cantidad: string): string {
  const n = nombre.toLowerCase();
  // Cantidades orientativas para ingredientes clave
  if (n.includes('aceite')) return '1 botella (500 ml)';
  if (n.includes('leche')) return '1 brick (1 l)';
  if (n.includes('huevo')) return '1 docena';
  if (n.includes('pan')) return '1 barra';
  if (n.includes('arroz')) return '1 paquete (500 g)';
  if (n.includes('pasta')) return '1 paquete (500 g)';
  if (n.includes('fruta')) return '1 kg';
  if (n.includes('verdura')) return '1 kg';
  if (n.includes('espinaca')) return '1 bolsa';
  if (n.includes('pomelo')) return '1 unidad';
  if (n.includes('manzana')) return '1 unidad';
  if (n.includes('plátano')) return '1 unidad';
  if (n.includes('zanahoria')) return '1 bolsa';
  if (n.includes('cebolla')) return '1 malla';
  if (n.includes('patata')) return '1 bolsa';
  if (n.includes('yogur')) return '4 unidades';
  if (n.includes('queso')) return '1 cuña';
  if (n.includes('pollo')) return '1 bandeja';
  if (n.includes('pescado')) return '1 bandeja';
  if (n.includes('carne')) return '1 bandeja';
  if (n.includes('tofu')) return '1 bloque';
  if (n.includes('proteína')) return '1 bote';
  if (n.includes('frutos secos')) return '1 bolsa';
  if (n.includes('almendra')) return '1 bolsa';
  if (n.includes('nuez')) return '1 bolsa';
  if (n.includes('avena')) return '1 paquete';
  // Si la cantidad es pequeña o poco útil, mostrar sugerencia
  if (!cantidad || cantidad.includes('~') || cantidad.includes('ver receta') || cantidad.includes('1 puñ') || cantidad.includes('1 cda') || cantidad.includes('1 unidad')) {
    return SUGERENCIAS_ORIENTATIVAS[n.split(' ')[0]] || '1 unidad';
  }
  return cantidad;
}

// Sugerencias orientativas para ingredientes sin cantidad clara
export const SUGERENCIAS_ORIENTATIVAS: { [clave: string]: string } = {
  'sal': '~10 g',
  'pimienta': '~5 g',
  'aceite': '1 botella (500 ml)',
  'vinagre': '~100 ml',
  'azúcar': '~50 g',
  'harina': '~500 g',
  'agua': '~1 l',
  'leche': '1 brick (1 l)',
  'especias': '~10 g',
  'perejil': '~1 manojo',
  'ajo': '~1 cabeza',
  'cebolla': '1 malla',
  'limón': '1 unidad',
  'tomate': '1 unidad',
  'mantequilla': '~250 g',
  'queso': '1 cuña',
  'pan': '1 barra',
  'arroz': '1 paquete (500 g)',
  'pasta': '1 paquete (500 g)',
  'caldo': '~1 l',
  'zanahoria': '1 bolsa',
  'patata': '1 bolsa',
  'pollo': '1 bandeja',
  'carne': '1 bandeja',
  'pescado': '1 bandeja',
  'huevo': '1 docena',
  'fruta': '1 kg',
  'verdura': '1 kg',
}; 