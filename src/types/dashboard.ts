export interface Profile {
  id: string
  name?: string
  full_name?: string
  email?: string
  avatar_url?: string | null
  goal?: string | null
  intolerances?: string[] | null
}

export interface MealPlan {
  id: string
  title: string
  week: string
  created_at: string
  meals: Record<string, DiaComidas>
  note?: string
}

export interface DiaComidas {
  Desayuno: string;
  Comida: string;
  Cena: string;
  'Snack mañana': string;
  'Snack tarde': string;
  [key: string]: string;
}

export const GOALS = [
  'Perder peso',
  'Ganar masa muscular',
  'Mantenerme saludable',
  'Mejorar mi energía',
  'Otro'
]

export const INTOLERANCES = [
  'Gluten',
  'Lactosa',
  'Frutos secos',
  'Mariscos',
  'Huevo',
  'Soja',
  'Pescado',
  'Sésamo',
  'Mostaza',
  'Apio',
  'Sulfitos',
  'Altramuces'
]

export const mealTypeImages: Record<string, string> = {
  Desayuno: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80',
  Comida: 'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=400&q=80',
  Cena: 'https://images.unsplash.com/photo-1502741338009-cac2772e18bc?auto=format&fit=crop&w=400&q=80'
}

export const WEEK_DAYS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo'
] as const;

export const SNACKS_SALUDABLES = [
  'Fruta fresca (manzana, plátano, pera, uvas)',
  'Yogur vegetal',
  'Palitos de zanahoria con hummus',
  'Barrita de cereales sin alérgenos',
  'Galletas de arroz',
  'Queso fresco vegano',
  'Batido vegetal',
  'Tortitas de maíz',
  'Pepino en rodajas',
  'Compota de manzana',
  'Tomates cherry',
  'Palitos de apio',
  'Mandarina',
  'Pera',
  'Manzana',
  'Plátano',
  'Uvas',
  'Melón',
  'Sandía',
  'Barrita energética sin frutos secos',
]; 