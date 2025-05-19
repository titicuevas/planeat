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

      let menu = await generateMenuWithGemini({
        objetivo: profile.goal || '',
        intolerancias: profile.intolerances || []
      });
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
      return plan;
    } catch (err: any) {
      setPlanMsg('Error creando el plan');
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

      let menu = await generateMenuWithGemini({
        objetivo: profile.goal || '',
        intolerancias: profile.intolerances || []
      });
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