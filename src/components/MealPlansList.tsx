import React from 'react';
import { format } from 'date-fns';
import type { MealPlan } from '../types/dashboard';

interface MealPlansListProps {
  mealPlans: MealPlan[];
  onShowMenu: (plan: MealPlan) => void;
}

export function MealPlansList({ mealPlans, onShowMenu }: MealPlansListProps) {
  return (
    <div className="w-full max-w-2xl bg-white rounded-xl shadow p-6">
      <h2 className="text-2xl font-bold text-green-700 mb-4">Tus planes de alimentación</h2>
      <div className="space-y-4">
        {mealPlans.length === 0 && (
          <div className="text-gray-500">Aún no tienes menús generados.</div>
        )}
        {mealPlans.map(plan => (
          <div
            key={plan.id}
            className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between shadow-sm"
          >
            <div>
              <div className="font-semibold text-lg text-green-700">{plan.title}</div>
              <div className="text-gray-500 text-sm">
                Semana: {format(new Date(plan.week), 'dd/MM/yyyy')}
              </div>
            </div>
            <button
              onClick={() => onShowMenu(plan)}
              className="mt-2 md:mt-0 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
            >
              Ver menú
            </button>
          </div>
        ))}
      </div>
    </div>
  );
} 