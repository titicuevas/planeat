import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { generateMenuWithGemini } from '../api/gemini';
import type { MealPlan, Profile } from '../types/dashboard';
import { getTargetMondayForMenu, getMondayOfNextWeek } from '../utils/dateUtils';
import { format } from 'date-fns';
import Swal from 'sweetalert2';
import { normalizaMenuConSnacks, getMenuHorizontal, MENU_EJEMPLO } from '../utils/menuUtils';
import { useApp } from '../context/AppContext';

export function useMealPlans(userId: string | undefined, profile: Profile | null) {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [creatingNextWeek, setCreatingNextWeek] = useState(false);
  const [planMsg, setPlanMsg] = useState('');
  const [nextWeekMsg, setNextWeekMsg] = useState('');
  const { setIsLoading } = useApp();

  useEffect(() => {
    if (userId) {
      fetchMealPlans();
    }
  }, [userId]);

  const fetchMealPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', userId)
        .order('week', { ascending: false });

      if (error) throw error;
      setMealPlans(data || []);
    } catch (error) {
      console.error('Error fetching meal plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPlan = async (title?: string) => {
    if (!userId || !profile) return;
    setCreatingPlan(true);
    setIsLoading(true);
    setPlanMsg('Generando tu menú semanal personalizado...');
    try {
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
        return;
      }

      // Antes de crear, elimina el menú de la semana actual si existe (por si el usuario ha editado el perfil)
      await supabase.from('meal_plans').delete().eq('user_id', userId).eq('week', week);

      let menu;
      try {
        // Calcular días restantes de la semana
        const now = new Date();
        const diaSemana = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0=lunes, 6=domingo
        const WEEK_DAYS = ['lunes','martes','miércoles','jueves','viernes','sábado','domingo'];
        let diasRestantes: string[] = [];
        // Siempre incluir el día actual y los siguientes hasta el domingo
        diasRestantes = WEEK_DAYS.slice(diaSemana);
        let menuRaw = await generateMenuWithGemini({
          objetivo: profile.goal || '',
          intolerancias: profile.intolerances || [],
          diasRestantes
        });
        // Normaliza el menú recibido para asegurar formato correcto y tipado
        menu = normalizaMenuConSnacks(menuRaw, profile.intolerances || []);
        console.log('Menú generado y normalizado:', menu);
        console.info('✅ Menú semanal generado mediante IA (Gemini)');
      } catch (err) {
        console.error('Error real de Gemini:', err);
        // Si Gemini falla, usa menú de ejemplo
        menu = normalizaMenuConSnacks(getMenuHorizontal(MENU_EJEMPLO, profile.intolerances || []), profile.intolerances || []);
        console.log('Usando menú de ejemplo:', menu);
        console.warn('⚠️ Menú semanal generado con el menú de ejemplo (NO IA)');
      }

      const planTitle = title || `Menú semana ${week}`;
      const { data: plan, error } = await supabase
        .from('meal_plans')
        .insert([{
          user_id: userId,
          title: planTitle,
          week,
          meals: menu,
        }])
        .select('id, title, week, created_at, meals')
        .single();

      if (error) throw error;
      
      setMealPlans(prev => [{ ...plan, meals: menu }, ...prev]);
      setPlanMsg('');
      // Guardar los ingredientes en shopping_list
      await saveIngredientsToShoppingList(plan.id, menu, week);
      return plan;
    } catch (err: any) {
      setPlanMsg('Error creando el plan: ' + (err.message || JSON.stringify(err)));
      console.error('Error creando el plan:', err);
      throw err;
    } finally {
      setCreatingPlan(false);
      setIsLoading(false);
    }
  };

  const createNextWeekPlan = async () => {
    if (!userId || !profile) return;
    setCreatingNextWeek(true);
    setIsLoading(true);
    setNextWeekMsg('Generando menú para la próxima semana...');
    try {
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

      let menu;
      try {
        menu = await generateMenuWithGemini({
          objetivo: profile.goal || '',
          intolerancias: profile.intolerances || []
        });
        // Normaliza el menú recibido para asegurar formato correcto
        menu = normalizaMenuConSnacks(menu, profile.intolerances || []);
        console.log('Menú generado y normalizado:', menu);
      } catch (err) {
        console.error('Error real de Gemini:', err);
        // Si Gemini falla, usa menú de ejemplo
        menu = normalizaMenuConSnacks(getMenuHorizontal(MENU_EJEMPLO, profile.intolerances || []), profile.intolerances || []);
        console.log('Usando menú de ejemplo:', menu);
      }

      const title = `Menú semana ${week}`;
      const { data: plan, error } = await supabase
        .from('meal_plans')
        .insert([{
          user_id: userId,
          title,
          week,
          meals: menu,
        }])
        .select('id, title, week, created_at, meals')
        .single();

      if (error) throw error;
      
      setMealPlans(prev => [{ ...plan, meals: menu }, ...prev]);
      setNextWeekMsg('¡Menú de la próxima semana creado correctamente!');
      return plan;
    } catch (err: any) {
      setNextWeekMsg('Error creando el menú de la próxima semana: ' + (err.message || ''));
      throw err;
    } finally {
      setCreatingNextWeek(false);
      setIsLoading(false);
      setTimeout(() => setNextWeekMsg(''), 3500);
    }
  };

  const deletePlan = async (planId: string) => {
    try {
      const { error } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', planId);
      
      if (error) throw error;
      
      setMealPlans(prev => prev.filter(p => p.id !== planId));
      return true;
    } catch (err: any) {
      console.error('Error eliminando plan:', err);
      return false;
    }
  };

  const updatePlan = async (planId: string, updates: Partial<MealPlan>) => {
    try {
      let updatesToSave = { ...updates };
      if (updates.meals) {
        updatesToSave.meals = normalizaMenuConSnacks(updates.meals);
      }
      const { error } = await supabase
        .from('meal_plans')
        .update(updatesToSave)
        .eq('id', planId);
      
      if (error) throw error;
      
      setMealPlans(prev => prev.map(p => p.id === planId ? { ...p, ...updatesToSave } : p));
      return true;
    } catch (err: any) {
      console.error('Error actualizando plan:', err);
      return false;
    }
  };

  return {
    mealPlans,
    loading,
    creatingPlan,
    creatingNextWeek,
    planMsg,
    nextWeekMsg,
    createPlan,
    createNextWeekPlan,
    deletePlan,
    updatePlan
  };
}

// Nueva función para guardar ingredientes en shopping_list
async function saveIngredientsToShoppingList(mealPlanId: string, menu: Record<string, Record<string, string>>, week: string) {
  console.log('Entrando en saveIngredientsToShoppingList', mealPlanId, menu, week);
  const { getIngredientesPlatoGemini } = await import('../api/gemini');
  const { WEEK_DAYS } = await import('../types/dashboard');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('No hay usuario autenticado para guardar la lista de la compra.');
    return;
  }
  const ingredients: any[] = [];
  for (const dia of WEEK_DAYS) {
    // Solo procesar días desde hoy en adelante
    const now = new Date();
    const diaSemana = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0=lunes, 6=domingo
    const indexDia = WEEK_DAYS.indexOf(dia);
    if (indexDia < diaSemana) continue;
    for (const tipo of ['Desayuno', 'Comida', 'Cena', 'Snack mañana', 'Snack tarde']) {
      const plato = menu[dia]?.[tipo];
      if (plato) {
        let ingredientes: any[] = [];
        let success = false;
        for (let intento = 1; intento <= 3; intento++) {
          try {
            console.log(`Intento ${intento}: Pidiendo ingredientes para: ${plato}`);
            const resp = await getIngredientesPlatoGemini(plato);
            if (resp && resp.length > 0) {
              ingredientes = resp;
              console.log(`Gemini devolvió ingredientes para ${plato}:`, ingredientes);
              success = true;
              break;
            } else {
              console.warn(`Gemini NO devolvió ingredientes para: ${plato} (intento ${intento})`);
            }
          } catch (err) {
            console.error(`Error obteniendo ingredientes para ${plato} (intento ${intento}):`, err);
          }
        }
        if (!success) {
          console.warn(`Fallo definitivo: No se pudieron obtener ingredientes para ${plato} tras 3 intentos.`);
          // Añadir ingrediente de aviso para que la cesta nunca quede vacía
          ingredients.push({
            user_id: user.id,
            meal_plan_id: mealPlanId,
            week,
            day: dia,
            meal_type: tipo,
            dish: plato,
            ingredient: 'No disponible',
            nombre: 'No disponible',
            cantidad: '',
            checked: false
          });
        }
        for (const ingrediente of ingredientes) {
          let nombre = '', cantidad = '';
          try {
            const obj = typeof ingrediente === 'string' ? JSON.parse(ingrediente) : ingrediente;
            nombre = obj.nombre || '';
            cantidad = obj.cantidad || '';
          } catch {
            nombre = typeof ingrediente === 'string' ? ingrediente : '';
            cantidad = '';
          }
          ingredients.push({
            user_id: user.id,
            meal_plan_id: mealPlanId,
            week,
            day: dia,
            meal_type: tipo,
            dish: plato,
            ingredient: typeof ingrediente === 'string' ? ingrediente : '',
            nombre,
            cantidad,
            checked: false
          });
        }
      } else {
        console.warn(`No hay plato para ${dia} - ${tipo}`);
      }
    }
  }
  if (ingredients.length > 0) {
    const { error } = await supabase.from('shopping_list').insert(ingredients);
    if (error) {
      console.error('Error guardando ingredientes:', error);
      alert('Error guardando la lista de la compra. Intenta de nuevo.');
    } else {
      console.log('Ingredientes guardados correctamente:', ingredients);
    }
  } else {
    console.warn('No se generaron ingredientes para la lista de la compra.');
  }
} 