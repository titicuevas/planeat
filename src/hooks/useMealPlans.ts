import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { generateMenuWithGemini } from '../api/gemini';
import type { MealPlan, Profile } from '../types/dashboard';
import { getTargetMondayForMenu, getMondayOfNextWeek } from '../utils/dateUtils';
import { format } from 'date-fns';
import Swal from 'sweetalert2';
import { normalizaMenuConSnacks } from '../utils/menuUtils';

export function useMealPlans(userId: string | undefined, profile: Profile | null) {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [creatingNextWeek, setCreatingNextWeek] = useState(false);
  const [planMsg, setPlanMsg] = useState('');
  const [nextWeekMsg, setNextWeekMsg] = useState('');

  useEffect(() => {
    async function getMealPlans() {
      if (!userId) return;
      setLoading(true);
      try {
        const { data: mealPlansData, error } = await supabase
          .from('meal_plans')
          .select('*')
          .eq('user_id', userId)
          .order('week', { ascending: false });

        if (error) throw error;
        setMealPlans(mealPlansData || []);
      } catch (err: any) {
        console.error('Error cargando planes:', err);
      } finally {
        setLoading(false);
      }
    }

    getMealPlans();
  }, [userId]);

  const createPlan = async (title?: string) => {
    if (!userId || !profile) return;
    setCreatingPlan(true);
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

      let menu;
      try {
        menu = await generateMenuWithGemini({
          objetivo: profile.goal || '',
          intolerancias: profile.intolerances || []
        });
      } catch (err) {
        console.error('Error real de Gemini:', err);
        // Si Gemini falla, lanzamos el error para que no se use el menú de ejemplo
        throw new Error('No se pudo generar el menú personalizado con Gemini. Por favor, inténtalo de nuevo.');
      }
      menu = normalizaMenuConSnacks(menu) as unknown as Record<string, Record<string, string>>;

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
    }
  };

  const createNextWeekPlan = async () => {
    if (!userId || !profile) return;
    setCreatingNextWeek(true);
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
      } catch (err) {
        console.error('Error real de Gemini:', err);
        // Si Gemini falla, lanzamos el error para que no se use el menú de ejemplo
        throw new Error('No se pudo generar el menú personalizado con Gemini. Por favor, inténtalo de nuevo.');
      }
      menu = normalizaMenuConSnacks(menu) as unknown as Record<string, Record<string, string>>;

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
        updatesToSave.meals = normalizaMenuConSnacks(updates.meals) as unknown as Record<string, Record<string, string>>;
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
  if (!user) return;
  const ingredients = [];
  for (const dia of WEEK_DAYS) {
    for (const tipo of ['Desayuno', 'Comida', 'Cena', 'Snack mañana', 'Snack tarde']) {
      const plato = menu[dia]?.[tipo];
      if (plato) {
        try {
          const ingredientes = await getIngredientesPlatoGemini(plato);
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
        } catch (err) {
          console.error(`Error obteniendo ingredientes para ${plato}:`, err);
        }
      }
    }
  }
  if (ingredients.length > 0) {
    const { error } = await supabase.from('shopping_list').insert(ingredients);
    if (error) console.error('Error guardando ingredientes:', error);
  }
} 