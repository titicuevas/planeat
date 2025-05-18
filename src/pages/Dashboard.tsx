import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { Dialog } from '@headlessui/react'
import { generateMenuWithGemini, testGeminiAPI } from '../api/gemini'
import { format } from 'date-fns'
import Swal from 'sweetalert2'
import type { Session } from '@supabase/supabase-js'

interface Profile {
  id: string
  name?: string
  full_name?: string
  email?: string
  avatar_url?: string | null
  goal?: string | null
  intolerances?: string[] | null
}

interface MealPlan {
  id: string
  title: string
  week: string
  created_at: string
  meals: Record<string, Record<string, string>>
  note?: string
}

const GOALS = [
  'Perder peso',
  'Ganar masa muscular',
  'Mantenerme saludable',
  'Mejorar mi energía',
  'Otro'
]

const INTOLERANCES = [
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

const mealTypeImages: Record<string, string> = {
  desayuno: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80',
  comida: 'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=400&q=80',
  cena: 'https://images.unsplash.com/photo-1502741338009-cac2772e18bc?auto=format&fit=crop&w=400&q=80'
}

const WEEK_DAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

function getWeekRange(week: string) {
  const start = new Date(week)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return `${format(start, 'd/M/yyyy')} - ${format(end, 'd/M/yyyy')}`
}

// Función para validar si algún plato contiene intolerancias
function getPlatosNoAptos(menu: any, intolerancias: string[]) {
  if (!menu || !intolerancias || intolerancias.length === 0) return [];
  const platosNoAptos: { dia: string, tipo: string, plato: string, intolerancia: string }[] = [];
  for (const dia of WEEK_DAYS) {
    if (!menu[dia]) continue;
    for (const tipo of ['desayuno', 'comida', 'cena']) {
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

// Definir interfaz para las comidas de un día
interface DiaComidas {
  desayuno: string;
  comida: string;
  cena: string;
  'snack mañana': string;
  'snack tarde': string;
}

function normalizaMenuConSnacks(menu: Record<string, Partial<DiaComidas>>): Record<string, DiaComidas> {
  const normalizado: Record<string, DiaComidas> = {};
  for (const dia of WEEK_DAYS) {
    const comidas = menu[dia] || {};
    normalizado[dia] = {
      desayuno: comidas.desayuno || comidas.Desayuno || '-',
      comida: comidas.comida || comidas.Comida || comidas.almuerzo || comidas.Almuerzo || '-',
      cena: comidas.cena || comidas.Cena || '-',
      'snack mañana': comidas['snack mañana'] || comidas['snack_manana'] || comidas['Snack Mañana'] || comidas['Snack_manana'] || '-',
      'snack tarde': comidas['snack tarde'] || comidas['snack_tarde'] || comidas['Snack Tarde'] || comidas['Snack_tarde'] || '-',
    };
  }
  return normalizado;
}

// Añadir función para obtener el menú normalizado y ordenado para el modal
function getMenuHorizontal(menu: Record<string, Partial<DiaComidas>>): Record<string, DiaComidas> {
  const normalizado: Record<string, DiaComidas> = {};
  for (const dia of WEEK_DAYS) {
    const comidas = menu[dia] || {};
    normalizado[dia] = {
      desayuno: comidas.desayuno || '-',
      comida: comidas.comida || (comidas as any).almuerzo || '-',
      cena: comidas.cena || '-',
      'snack mañana': comidas['snack mañana'] || (comidas as any)['snack_manana'] || '-',
      'snack tarde': comidas['snack tarde'] || (comidas as any)['snack_tarde'] || '-',
    };
  }
  return normalizado;
}

// Lista estándar de snacks saludables
const SNACKS_SALUDABLES = [
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

// Función para filtrar snacks según intolerancias
function getSnackSaludable(intolerancias: string[]): string {
  // Palabras clave a evitar según intolerancias
  const claves = intolerancias.map(i => i.toLowerCase());
  // Buscar un snack que no contenga ninguna intolerancia
  const snack = SNACKS_SALUDABLES.find(s =>
    !claves.some(clave => s.toLowerCase().includes(clave))
  );
  // Si no hay ninguno, devolver "Fruta fresca"
  return snack || 'Fruta fresca';
}

// Función para calcular el próximo lunes
function getNextMonday() {
  const today = new Date();
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + ((8 - today.getDay()) % 7 || 7));
  return nextMonday;
}

// Función para estimar macronutrientes y calorías (muy básica, por palabras clave)
function analizarMenu(menu: Record<string, DiaComidas>) {
  // Valores estimados por tipo de comida
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
      if (!plato || plato === '-') continue;
      // Estimación simple: suma 1 por cada palabra clave encontrada
      for (const macro in estimaciones) {
        if (estimaciones[macro as keyof typeof estimaciones].some(k => plato.includes(k))) {
          total[macro as keyof typeof total] += 1;
        }
      }
      // Calorías estimadas: desayuno/snack 200, comida/cena 400
      if (tipo === 'desayuno' || tipo.includes('snack')) total.calorias += 200;
      if (tipo === 'comida' || tipo === 'cena') total.calorias += 400;
    }
  }
  return total;
}

// Función para saber si hoy es sábado o posterior
function puedeCrearMenuProximaSemana() {
  const today = new Date();
  return today.getDay() >= 6; // 6 = sábado, 0 = domingo
}

// Función para obtener la fecha del próximo sábado
function getNextSaturday() {
  const today = new Date();
  const nextSaturday = new Date(today);
  const daysUntilSaturday = (6 - today.getDay() + 7) % 7;
  nextSaturday.setDate(today.getDate() + daysUntilSaturday);
  return nextSaturday;
}

// Función robusta para obtener el lunes de la semana actual
function getMondayOfCurrentWeek(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

// Función robusta para obtener el lunes de la semana siguiente
function getMondayOfNextWeek(date = new Date()) {
  const monday = getMondayOfCurrentWeek(date);
  monday.setDate(monday.getDate() + 7);
  return monday;
}

// Función para decidir para qué semana crear el menú (actual o próxima)
function getTargetMondayForMenu() {
  const now = new Date();
  if (now.getDay() === 0 && now.getHours() >= 22) {
    // Domingo después de las 22:00, crear para la próxima semana
    return getMondayOfNextWeek(now);
  }
  return getMondayOfCurrentWeek(now);
}

// Función para decidir el lunes base para mostrar el menú en el dashboard
function getBaseMondayForDisplay() {
  const now = new Date();
  if (now.getDay() === 0 && now.getHours() >= 22) {
    // Domingo después de las 22:00, mostrar la semana siguiente
    return getMondayOfNextWeek(now);
  }
  return getMondayOfCurrentWeek(now);
}

export default function Inicio({ session }: { session: Session }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [goal, setGoal] = useState('')
  const [customGoal, setCustomGoal] = useState('')
  const [savingGoal, setSavingGoal] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [showIntoleranceForm, setShowIntoleranceForm] = useState(false)
  const [selectedIntolerances, setSelectedIntolerances] = useState<string[]>([])
  const [otherIntolerance, setOtherIntolerance] = useState('')
  const [savingIntolerances, setSavingIntolerances] = useState(false)
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([])
  const [showCreatePlan, setShowCreatePlan] = useState(false)
  const [creatingPlan, setCreatingPlan] = useState(false)
  const [planMsg, setPlanMsg] = useState('')
  const planTitleRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const [selectedPlan, setSelectedPlan] = useState<MealPlan | null>(null)
  const [menuDetail, setMenuDetail] = useState<Record<string, DiaComidas> | null>(null)
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editNote, setEditNote] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [loadingAlternative, setLoadingAlternative] = useState<{dia: string, tipo: string} | null>(null)
  const [creatingNextWeek, setCreatingNextWeek] = useState(false);
  const [nextWeekMsg, setNextWeekMsg] = useState('');
  const [jsonMenu, setJsonMenu] = useState('');
  const [verSemanaCompleta, setVerSemanaCompleta] = useState(false);

  function getDiasAMostrar() {
    if (verSemanaCompleta) return WEEK_DAYS;
    const today = new Date();
    const diaHoy = today.getDay() === 0 ? 6 : today.getDay() - 1;
    return WEEK_DAYS.slice(diaHoy);
  }

  useEffect(() => {
    async function getProfileAndPlans() {
      setLoading(true);
      try {
        const user = session.user;
        if (!user) {
          navigate('/login', { replace: true });
          setLoading(false);
          return;
        }

        // Cargar el perfil
        let { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([{
              id: user.id,
              name: user.user_metadata?.name || '',
              email: user.email
            }]);
          if (insertError) throw insertError;
          const { data: newProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          profileData = newProfile;
        } else if (error) {
          showToast('error', 'Error cargando el perfil');
          setProfileLoaded(true);
          setLoading(false);
          return;
        }

        if (!profileData) {
          setProfile({ id: user.id, name: '', goal: null, intolerances: null });
          setProfileLoaded(true);
          setLoading(false);
          navigate('/perfil', { replace: true });
          return;
        }

        setProfile(profileData);
        setProfileLoaded(true);
        setLoading(false);

        // Cargar los planes de comidas
        const { data: mealPlansData, error: plansError } = await supabase
          .from('meal_plans')
          .select('*')
          .eq('user_id', user.id)
          .order('week', { ascending: false });

        if (plansError) {
          console.error('Error cargando planes:', plansError);
          showToast('error', 'Error cargando los planes de comidas');
          setLoading(false);
          return;
        }

        if (mealPlansData) {
          setMealPlans(mealPlansData);
          // Buscar y mostrar el menú de la semana actual
          const today = new Date();
          const monday = new Date(today);
          monday.setHours(0, 0, 0, 0);
          monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
          const weekStr = monday.toISOString().slice(0, 10);

          const currentWeekPlan = mealPlansData.find(plan => {
            const planWeek = new Date(plan.week);
            planWeek.setHours(0, 0, 0, 0);
            return planWeek.toISOString().slice(0, 10) === weekStr;
          });

          if (currentWeekPlan) {
            setSelectedPlan(currentWeekPlan);
            setMenuDetail(currentWeekPlan.meals);
          }
        }
      } catch (err: any) {
        console.error('Error:', err);
        showToast('error', 'Error cargando los datos');
        setLoading(false);
      }
    }
    getProfileAndPlans();
  }, [session, navigate]);

  useEffect(() => {
    if (selectedPlan) {
      setEditTitle(selectedPlan.title || '')
      setEditNote(selectedPlan.note || '')
    }
  }, [selectedPlan])

  useEffect(() => {
    if (profileLoaded && profile && (!profile.name || !profile.goal || !profile.intolerances || profile.intolerances.length === 0)) {
      navigate('/perfil', { replace: true });
    }
  }, [profileLoaded, profile, navigate, session?.user]);

  // Eliminar automáticamente el menú de la semana pasada a partir de las 22:00 del domingo
  useEffect(() => {
    const now = new Date();
    // Si es domingo después de las 22:00 o lunes/martes/...
    if ((now.getDay() === 0 && now.getHours() >= 22) || now.getDay() > 0) {
      // Calcular el lunes de la semana pasada
      const lastMonday = new Date(now);
      lastMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7) - 7);
      lastMonday.setHours(0, 0, 0, 0);
      const lastWeekStr = lastMonday.toISOString().slice(0, 10);

      // Buscar el menú de la semana pasada
      const lastWeekPlan = mealPlans.find(plan => {
        const planWeek = new Date(plan.week);
        planWeek.setHours(0, 0, 0, 0);
        return planWeek.toISOString().slice(0, 10) === lastWeekStr;
      });

      if (lastWeekPlan) {
        supabase.from('meal_plans').delete().eq('id', lastWeekPlan.id).then(() => {
          setMealPlans(prev => prev.filter(p => p.id !== lastWeekPlan.id));
        });
      }
    }
  }, [mealPlans]);

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingGoal(true)
    const finalGoal = goal === 'Otro' ? customGoal : goal
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')
      await supabase
        .from('profiles')
        .update({ goal: finalGoal })
        .eq('id', user.id)
      setProfile(prev => prev ? { ...prev, goal: finalGoal } : prev)
      setShowGoalForm(false)
      setShowIntoleranceForm(true)
      setSuccessMsg('¡Objetivo guardado correctamente!')
    } catch (err: any) {
      setSuccessMsg('Error guardando el objetivo')
    } finally {
      setSavingGoal(false)
    }
  }

  const handleIntoleranceChange = (intol: string) => {
    setSelectedIntolerances(prev =>
      prev.includes(intol)
        ? prev.filter(i => i !== intol)
        : [...prev, intol]
    )
  }

  const handleIntoleranceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingIntolerances(true)
    let intolerances = [...selectedIntolerances]
    if (otherIntolerance.trim()) intolerances.push(otherIntolerance.trim())
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')
      await supabase
        .from('profiles')
        .update({ intolerances })
        .eq('id', user.id)
      setProfile(prev => prev ? { ...prev, intolerances } : prev)
      setShowIntoleranceForm(false)
      setSuccessMsg('¡Intolerancias guardadas correctamente!')
    } catch (err: any) {
      setSuccessMsg('Error guardando las intolerancias')
    } finally {
      setSavingIntolerances(false)
    }
  }

  // Función para mostrar Toast
  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  // Crear nuevo plan (placeholder para IA)
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingPlan(true);
    setPlanMsg('Generando tu menú semanal personalizado...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');
      // Usar la semana correcta según la hora y el día
      const monday = getTargetMondayForMenu();
      const week = monday.toISOString().slice(0, 10);
      if (mealPlans.some(plan => plan.week.slice(0, 10) === week)) {
        await Swal.fire({
          title: 'Ya tienes un menú para esta semana',
          text: 'Solo puedes tener un menú por semana. Puedes editarlo o eliminarlo si lo deseas.',
          icon: 'info',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#22c55e',
        });
        setCreatingPlan(false);
        return;
      }
      const objetivo = profile?.goal || '';
      const intolerancias = profile?.intolerances || [];
      const menu = await generateMenuWithGemini({ objetivo, intolerancias });
      const title = planTitleRef.current?.value || `Menú semana ${week}`;
      const { data: plan, error } = await supabase
        .from('meal_plans')
        .insert([
          {
            user_id: user.id,
            title,
            week,
            meals: menu,
          }
        ])
        .select('id, title, week, created_at, meals')
        .single();
      if (error) throw error;
      const newPlan = { ...plan, meals: menu };
      setMealPlans(prev => [newPlan, ...prev]);
      setSelectedPlan(newPlan);
      setMenuDetail(menu);
      setShowMenuModal(true);
      setPlanMsg('');
      showToast('success', '¡Plan creado correctamente!');
    } catch (err: any) {
      setPlanMsg('Error creando el plan');
      showToast('error', 'Error creando el plan');
    } finally {
      setCreatingPlan(false);
    }
  };

  // Mostrar menú al hacer clic en una tarjeta
  const handleShowMenu = async (plan: MealPlan) => {
    setSelectedPlan(plan)
    setShowMenuModal(true)
    // Obtener el menú del plan
    const { data } = await supabase
      .from('meal_plans')
      .select('meals')
      .eq('id', plan.id)
      .single()
    setMenuDetail(data?.meals || {})
  }

  // Añade la función para eliminar un menú
  const handleDeletePlan = async (planId: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar plan?',
      text: '¿Estás seguro de que quieres eliminar este plan? Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    })
    if (!result.isConfirmed) return
    const { error } = await supabase.from('meal_plans').delete().eq('id', planId)
    if (error) {
      showToast('error', 'Error eliminando el plan')
      return
    }
    setMealPlans(prev => prev.filter(p => p.id !== planId))
    if (selectedPlan && selectedPlan.id === planId) {
      setShowMenuModal(false)
      setSelectedPlan(null)
      setMenuDetail(null)
    }
    showToast('success', 'Plan eliminado correctamente')
  }

  // Función para guardar cambios
  const handleSavePlanEdit = async () => {
    if (!selectedPlan) return
    setSavingEdit(true)
    const { error } = await supabase.from('meal_plans').update({ title: editTitle, note: editNote }).eq('id', selectedPlan.id)
    if (!error) {
      setSelectedPlan({ ...selectedPlan, title: editTitle, note: editNote })
      setMealPlans(prev => prev.map(p => p.id === selectedPlan.id ? { ...p, title: editTitle, note: editNote } : p))
      showToast('success', 'Plan actualizado')
    } else {
      showToast('error', 'Error al guardar cambios')
    }
    setSavingEdit(false)
  }

  const handleSuggestAlternative = async (dia: string, tipo: keyof DiaComidas, platoActual: string) => {
    try {
      setLoadingAlternative({dia, tipo});
      showToast('success', 'Buscando alternativa...');
      const objetivo = profile?.goal || '';
      const intolerancias = profile?.intolerances || [];
      const alternativa = await generateMenuWithGemini({
        objetivo,
        intolerancias,
        platoActual,
        dia,
        tipo
      });
      // Actualiza el menú en el estado
      const nuevoMenu = { ...menuDetail };
      nuevoMenu[dia][tipo] = alternativa;
      setMenuDetail(nuevoMenu);
      // Actualiza en la base de datos
      if (selectedPlan) {
        const { error } = await supabase
          .from('meal_plans')
          .update({ meals: nuevoMenu })
          .eq('id', selectedPlan.id);
        if (error) throw error;
        // Sincroniza mealPlans y currentWeekPlan
        setMealPlans(prev => prev.map(p => p.id === selectedPlan.id ? { ...p, meals: nuevoMenu } : p));
      }
      showToast('success', '¡Alternativa sugerida!');
      return alternativa;
    } catch (err: any) {
      console.error('Error al sugerir alternativa:', err);
      showToast('error', 'No se pudo sugerir alternativa');
      return platoActual;
    } finally {
      setLoadingAlternative(null);
    }
  };

  // Generar menú para la próxima semana
  const handleCreateNextWeekPlan = async () => {
    if (!puedeCrearMenuProximaSemana()) {
      await Swal.fire({
        title: 'No disponible aún',
        text: `Podrás crear el menú de la próxima semana a partir del ${format(getNextSaturday(), 'dd/MM/yyyy')}`,
        icon: 'info',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#22c55e',
      });
      return;
    }
    // Usar el lunes de la semana siguiente
    const nextMonday = getMondayOfNextWeek();
    const week = nextMonday.toISOString().slice(0, 10);
    if (mealPlans.some(plan => plan.week.slice(0, 10) === week)) {
      await Swal.fire({
        title: 'Ya tienes un menú para la próxima semana',
        text: 'Solo puedes tener un menú por semana. Puedes editarlo o eliminarlo si lo deseas.',
        icon: 'info',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#22c55e',
      });
      return;
    }
    setCreatingNextWeek(true);
    setNextWeekMsg('Generando menú para la próxima semana...');
    try {
      if (!session) {
        setNextWeekMsg('Error: No session found');
        return;
      }
      const user = session.user;
      if (!user) throw new Error('No user found');
      const objetivo = profile?.goal || '';
      const intolerancias = profile?.intolerances || [];
      const menu = await generateMenuWithGemini({ objetivo, intolerancias });
      const title = `Menú semana ${week}`;
      const { data: plan, error } = await supabase
        .from('meal_plans')
        .insert([
          {
            user_id: user.id,
            title,
            week,
            meals: menu,
          }
        ])
        .select('id, title, week, created_at, meals')
        .single();
      if (error) {
        setNextWeekMsg('Error creando el menú de la próxima semana: ' + (error.message || error.details || ''));
        setCreatingNextWeek(false);
        setTimeout(() => setNextWeekMsg(''), 3500);
        return;
      }
      setMealPlans(prev => [{ ...plan, meals: menu }, ...prev]);
      setNextWeekMsg('¡Menú de la próxima semana creado correctamente!');
    } catch (err: any) {
      setNextWeekMsg('Error creando el menú de la próxima semana: ' + (err.message || ''));
    } finally {
      setCreatingNextWeek(false);
      setTimeout(() => setNextWeekMsg(''), 3500);
    }
  };

  // Obtener el menú de la semana actual o de la próxima si ya es sábado o domingo
  const getCurrentWeekMenu = () => {
    const baseMonday = getBaseMondayForDisplay();
    const weekStr = baseMonday.toISOString().slice(0, 10);
    let plan = mealPlans.find(plan => plan.week.slice(0, 10) === weekStr);
    if (!plan) return null;
    // Normalizar el menú para asegurar que tenga todos los días y comidas
    const menuNormalizado = normalizaMenuConSnacks(plan.meals || {});
    // Mostrar siempre todos los días de la semana (lunes a domingo)
    const mostrarDias = WEEK_DAYS;
    const menuFiltrado: Record<string, DiaComidas> = {};
    for (let i = 0; i < mostrarDias.length; i++) {
      const dia = mostrarDias[i];
      menuFiltrado[dia] = menuNormalizado[dia] || {
        desayuno: '-',
        comida: '-',
        cena: '-',
        'snack mañana': '-',
        'snack tarde': '-',
      };
    }
    return { ...plan, meals: menuFiltrado };
  };
  const currentWeekPlan = getCurrentWeekMenu();

  // Mostrar Toast de error y botón para cerrar sesión si hay error crítico
  if (toast && toast.type === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{toast.message}</span>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    )
  }

  if (!loading && profileLoaded && (!profile || !profile.name || !profile.goal || !profile.intolerances || profile.intolerances.length === 0)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">Tu perfil está incompleto o no has confirmado tu correo. Por favor, completa tu perfil y confirma tu cuenta para continuar.</span>
        </div>
        <button
          onClick={() => navigate('/perfil')}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
        >
          Ir a completar perfil
        </button>
      </div>
    );
  }

  if (loading || !profileLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8">
      <div className="absolute top-4 right-4">
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
      <div className="w-full max-w-2xl bg-white rounded-xl shadow p-6 mb-8">
        <h1 className="text-3xl font-bold text-green-700 mb-2">¡Bienvenido{profile?.name ? `, ${profile.name}` : ''}!</h1>
        <div className="text-gray-700 mb-2">
          <span className="font-semibold">Objetivo:</span> {profile?.goal || 'No especificado'}
        </div>
        <div className="text-gray-700 mb-2">
          <span className="font-semibold">Intolerancias:</span> {profile?.intolerances && profile.intolerances.length > 0 ? profile.intolerances.join(', ') : 'Ninguna'}
        </div>
        {/* Botón para crear menú solo si no hay menú */}
        {!currentWeekPlan && (
          <button
            onClick={handleCreatePlan}
            disabled={creatingPlan || mealPlans.some(plan => {
              const planWeek = new Date(plan.week);
              planWeek.setHours(0, 0, 0, 0);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              today.setDate(today.getDate() - ((today.getDay() + 6) % 7));
              return planWeek.toISOString().slice(0, 10) === today.toISOString().slice(0, 10);
            })}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {creatingPlan ? 'Generando menú...' : 'Crear menú'}
          </button>
        )}
        {/* Botón para crear menú de la próxima semana solo si ya hay menú */}
        {currentWeekPlan && (
          <button
            onClick={handleCreateNextWeekPlan}
            disabled={creatingNextWeek || !puedeCrearMenuProximaSemana()}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 ml-2"
          >
            {creatingNextWeek
              ? 'Generando menú de la próxima semana...'
              : puedeCrearMenuProximaSemana()
                ? `Crear menú para la próxima semana (${format(getNextMonday(), 'dd/MM/yyyy')})`
                : `Disponible el ${format(getNextSaturday(), 'dd/MM/yyyy')} para hacer la compra`}
          </button>
        )}
        {/* Menú de la semana actual */}
        <div className="mt-8">
          <h3 className="text-xl font-bold text-green-700 mb-2">Menú de esta semana</h3>
          {currentWeekPlan && currentWeekPlan.meals ? (
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
                  {WEEK_DAYS.filter(dia => currentWeekPlan && (currentWeekPlan.meals as Record<string, DiaComidas>)[dia]).length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-gray-500">No hay menú para esta semana.</td></tr>
                  ) : (
                    Object.entries(currentWeekPlan ? (currentWeekPlan.meals as Record<string, DiaComidas>) : {}).map(([dia, comidas], idx) => {
                      const baseMonday = getBaseMondayForDisplay();
                      const planDate = new Date(baseMonday);
                      planDate.setDate(baseMonday.getDate() + idx);
                      const fechaStr = `${dia.charAt(0).toUpperCase() + dia.slice(1)} ${planDate.getDate().toString().padStart(2, '0')}/${(planDate.getMonth() + 1).toString().padStart(2, '0')}/${planDate.getFullYear()}`;
                      const today = new Date();
                      const isToday = today.toDateString() === planDate.toDateString();
                      return (
                        <tr key={dia} className={isToday ? 'bg-green-100 font-bold' : 'hover:bg-green-50'}>
                          <td className="p-2 border font-semibold capitalize">{dia.charAt(0).toUpperCase() + dia.slice(1)}</td>
                          <td className="p-2 border">{comidas.desayuno || '-'} <button className="ml-2 text-xs text-blue-600 underline" onClick={() => handleSuggestAlternative(dia, 'desayuno', comidas.desayuno)} title="Sugerir alternativa">¿Otra?</button></td>
                          <td className="p-2 border">{comidas.comida || '-'} <button className="ml-2 text-xs text-blue-600 underline" onClick={() => handleSuggestAlternative(dia, 'comida', comidas.comida)} title="Sugerir alternativa">¿Otra?</button></td>
                          <td className="p-2 border">{comidas.cena || '-'} <button className="ml-2 text-xs text-blue-600 underline" onClick={() => handleSuggestAlternative(dia, 'cena', comidas.cena)} title="Sugerir alternativa">¿Otra?</button></td>
                          <td className="p-2 border">
                            {((comidas['snack mañana'] && comidas['snack mañana'] !== '-')
                              ? comidas['snack mañana']
                              : getSnackSaludable(profile?.intolerances || []))}
                            <button
                              className="ml-2 text-xs text-blue-600 underline"
                              onClick={async () => {
                                const alternativa = await handleSuggestAlternative(dia, 'snack mañana', comidas['snack mañana']);
                                // Actualiza el menú de la semana en mealPlans y currentWeekPlan
                                if (currentWeekPlan) {
                                  const newMeals = { ...currentWeekPlan.meals, [dia]: { ...currentWeekPlan.meals[dia], ['snack mañana']: alternativa } };
                                  setMealPlans(prev => prev.map(p => p.id === currentWeekPlan.id ? { ...p, meals: newMeals } : p));
                                  setMenuDetail(newMeals);
                                }
                              }}
                              title="Sugerir alternativa"
                            >
                              ¿Otra?
                            </button>
                          </td>
                          <td className="p-2 border">
                            {((comidas['snack tarde'] && comidas['snack tarde'] !== '-')
                              ? comidas['snack tarde']
                              : getSnackSaludable(profile?.intolerances || []))}
                            <button
                              className="ml-2 text-xs text-blue-600 underline"
                              onClick={async () => {
                                const alternativa = await handleSuggestAlternative(dia, 'snack tarde', comidas['snack tarde']);
                                if (currentWeekPlan) {
                                  const newMeals = { ...currentWeekPlan.meals, [dia]: { ...currentWeekPlan.meals[dia], ['snack tarde']: alternativa } };
                                  setMealPlans(prev => prev.map(p => p.id === currentWeekPlan.id ? { ...p, meals: newMeals } : p));
                                  setMenuDetail(newMeals);
                                }
                              }}
                              title="Sugerir alternativa"
                            >
                              ¿Otra?
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-gray-500">Aún no tienes menú para esta semana. ¡Genera uno para empezar!</div>
          )}
        </div>
      </div>
      <div className="w-full max-w-2xl bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold text-green-700 mb-4">Tus planes de alimentación</h2>
        <div className="space-y-4">
          {mealPlans.length === 0 && <div className="text-gray-500">Aún no tienes menús generados.</div>}
          {mealPlans.map(plan => (
            <div key={plan.id} className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between shadow-sm">
              <div>
                <div className="font-semibold text-lg text-green-700">{plan.title}</div>
                <div className="text-gray-500 text-sm">Semana: {format(new Date(plan.week), 'dd/MM/yyyy')}</div>
              </div>
              <button
                onClick={() => handleShowMenu(plan)}
                className="mt-2 md:mt-0 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
              >
                Ver menú
              </button>
            </div>
          ))}
        </div>
      </div>
      {/* Modal para mostrar el detalle del menú */}
      <Dialog open={showMenuModal} onClose={() => setShowMenuModal(false)} className="fixed z-50 inset-0 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="fixed inset-0 bg-black opacity-30" aria-hidden="true" />
          <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full mx-auto p-6 z-10">
            <Dialog.Title className="text-2xl font-bold text-green-700 mb-4">{selectedPlan?.title}</Dialog.Title>
            {menuDetail ? (
              <div className="overflow-x-auto">
                {/* Análisis nutricional */}
                <div className="mb-4 p-4 bg-green-50 rounded-lg shadow flex flex-col md:flex-row md:items-center md:justify-between">
                  {(() => {
                    const analisis = analizarMenu(menuDetail);
                    const totalMacros = analisis.carbohidratos + analisis.proteinas + analisis.grasas;
                    return (
                      <>
                        <div className="text-green-800 font-semibold mb-2 md:mb-0">Análisis nutricional estimado de la semana:</div>
                        <div className="flex flex-wrap gap-4">
                          <div><span className="font-bold">Carbohidratos:</span> {analisis.carbohidratos}g ({totalMacros > 0 ? Math.round(analisis.carbohidratos/totalMacros*100) : 0}%)</div>
                          <div><span className="font-bold">Proteínas:</span> {analisis.proteinas}g ({totalMacros > 0 ? Math.round(analisis.proteinas/totalMacros*100) : 0}%)</div>
                          <div><span className="font-bold">Grasas:</span> {analisis.grasas}g ({totalMacros > 0 ? Math.round(analisis.grasas/totalMacros*100) : 0}%)</div>
                          <div><span className="font-bold">Calorías estimadas:</span> {analisis.calorias} kcal</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="flex justify-end mb-2">
                  <button
                    className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm font-semibold text-gray-700 transition-colors"
                    onClick={() => setVerSemanaCompleta(v => !v)}
                  >
                    {verSemanaCompleta ? 'Ver días restantes' : 'Ver toda la semana'}
                  </button>
                </div>
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
                          <th key={dia} className={`p-2 border font-semibold capitalize${isToday ? ' bg-green-300 text-green-900' : ''}`}>{fechaStr}</th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {(['desayuno', 'comida', 'cena', 'snack mañana', 'snack tarde'] as (keyof DiaComidas)[]).map(tipo => (
                      <tr key={tipo} className="hover:bg-green-50 transition-colors">
                        <td className="p-2 border font-semibold capitalize bg-green-50">
                          {tipo === 'desayuno' && '🍳 Desayuno'}
                          {tipo === 'comida' && '🍽️ Comida'}
                          {tipo === 'cena' && '🌙 Cena'}
                          {tipo === 'snack mañana' && '☀️ Snack mañana'}
                          {tipo === 'snack tarde' && '🌆 Snack tarde'}
                        </td>
                        {WEEK_DAYS.map((dia, idx) => {
                          const comidas = menuDetail ? getMenuHorizontal(menuDetail)[dia] : {
                            desayuno: '-', comida: '-', cena: '-', 'snack mañana': '-', 'snack tarde': '-'
                          };
                          let valor = comidas[tipo] || '-';
                          if ((tipo === 'snack mañana' || tipo === 'snack tarde') && (!valor || valor === '-')) {
                            valor = getSnackSaludable(profile?.intolerances || []);
                          }
                          const planDate = selectedPlan ? new Date(selectedPlan.week) : new Date();
                          planDate.setDate(planDate.getDate() + WEEK_DAYS.indexOf(dia));
                          const today = new Date();
                          const isToday = today.toDateString() === planDate.toDateString();
                          return (
                            <td key={dia} className={`p-2 border text-xs md:text-sm${isToday ? ' bg-green-100 font-bold' : ''}`}
                              style={{ minWidth: 120 }}>
                              {valor}
                              {['desayuno', 'comida', 'cena', 'snack mañana', 'snack tarde'].includes(tipo) && (
                                <button
                                  className="ml-2 text-xs text-blue-600 underline"
                                  onClick={async () => {
                                    const alternativa = await handleSuggestAlternative(dia, tipo as keyof DiaComidas, valor);
                                    // Actualiza el menú de la semana en mealPlans y currentWeekPlan
                                    if (currentWeekPlan) {
                                      const newMeals = { ...currentWeekPlan.meals, [dia]: { ...currentWeekPlan.meals[dia], [tipo]: alternativa } };
                                      setMealPlans(prev => prev.map(p => p.id === currentWeekPlan.id ? { ...p, meals: newMeals } : p));
                                      setMenuDetail(newMeals);
                                    }
                                  }}
                                  title="Sugerir alternativa"
                                >
                                  ¿Otra?
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-gray-500">Cargando menú...</div>
            )}
            <button
              onClick={() => setShowMenuModal(false)}
              className="mt-6 w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  )
} 