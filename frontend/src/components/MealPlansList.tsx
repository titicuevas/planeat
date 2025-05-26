import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { MealPlan } from '../types/dashboard';

interface MealPlansListProps {
  mealPlans: MealPlan[];
  onShowMenu: (plan: MealPlan) => void;
  onDeletePlan: (planId: string) => void;
}

const MealPlansList: React.FC<MealPlansListProps> = ({
  mealPlans,
  onShowMenu,
  onDeletePlan
}) => {
  if (mealPlans.length === 0) {
    return (
      <div className="text-center py-8 text-secondary-600 dark:text-secondary-400">
        No hay planes anteriores
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {mealPlans.map((plan) => (
        <div key={plan.id} className="card hover:shadow-lg transition-shadow duration-200">
          <div className="flex justify-between items-start mb-4">
            <h4 className="text-lg font-semibold text-secondary-900 dark:text-white">
              {format(new Date(plan.week), 'dd/MM/yyyy', { locale: es })}
            </h4>
            <button
              onClick={() => onDeletePlan(plan.id)}
              className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
              title="Eliminar plan"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          <button
            onClick={() => onShowMenu(plan)}
            className="w-full btn btn-secondary"
          >
            Ver menú
          </button>
        </div>
      ))}
    </div>
  );
};

export default MealPlansList; 