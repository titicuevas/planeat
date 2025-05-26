import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { format } from 'date-fns'
import Swal from 'sweetalert2'
import type { Session } from '@supabase/supabase-js'
import { useMealPlans } from '../hooks/useMealPlans'
import ProfileInfo from '../components/ProfileInfo'
import { MenuTable } from '../components/MenuTable'
import MenuModal from '../components/MenuModal'
import MealPlansList from '../components/MealPlansList'
import { getBaseMondayForDisplay, puedeCrearMenuProximaSemana, getNextSaturday } from '../utils/dateUtils'
import { normalizaMenuConSnacks, analizarMenu } from '../utils/menuUtils'
import type { MealPlan, DiaComidas } from '../types/dashboard'
import { generateMenuWithGemini } from '../api/gemini'
import { es } from 'date-fns/locale'

interface Profile {
  id: string
  name?: string
  full_name?: string
  email?: string
  avatar_url?: string | null
  goal?: string | null
  intolerances?: string[] | null
}

export default function Dashboard({ session, profile, setGenerandoCesta, handleLogout }: { session: Session, profile: any, setGenerandoCesta?: (v: boolean) => void, handleLogout?: () => Promise<void> }) {
  const navigate = useNavigate()
  const planTitleRef = useRef<HTMLInputElement>(null)
  const [selectedPlan, setSelectedPlan] = useState<MealPlan | null>(null)
  const [menuDetail, setMenuDetail] = useState<Record<string, DiaComidas> | null>(null)
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [loadingAlternative, setLoadingAlternative] = useState<{dia: string, tipo: string} | null>(null)

  const {
    mealPlans,
    loading: plansLoading,
    creatingPlan,
    creatingNextWeek,
    createPlan,
    createNextWeekPlan,
    deletePlan,
    updatePlan
  } = useMealPlans(session?.user?.id, profile)

  useEffect(() => {
    document.title = 'Dashboard - Planeat';
  }, []);

  // Mostrar loader solo si está cargando y no hay planes ni se está creando uno
  const showLoader = plansLoading && !mealPlans.length && !creatingPlan && !creatingNextWeek;

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  const logout = handleLogout || (async () => {
    await supabase.auth.signOut()
    navigate('/login')
  });

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setGenerandoCesta && setGenerandoCesta(true);
      const plan = await createPlan(planTitleRef.current?.value)
      if (plan) {
        setSelectedPlan(plan)
        setMenuDetail(normalizaMenuConSnacks(plan.meals, profile?.intolerances || []))
        setShowMenuModal(true)
        showToast('success', '¡Plan creado correctamente!')
      }
    } catch (err: any) {
      showToast('error', 'Error creando el plan')
    } finally {
      setGenerandoCesta && setGenerandoCesta(false);
    }
  }

  const handleCreateNextWeekPlan = async () => {
    if (!puedeCrearMenuProximaSemana()) {
        await Swal.fire({
        title: 'No disponible aún',
        text: `Podrás crear el menú de la próxima semana a partir del ${format(getNextSaturday(), 'dd/MM/yyyy')}`,
          icon: 'info',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#22c55e',
      })
      return
    }

    try {
      setGenerandoCesta && setGenerandoCesta(true);
      const plan = await createNextWeekPlan()
      if (plan) {
        setSelectedPlan(plan)
        setMenuDetail(normalizaMenuConSnacks(plan.meals, profile?.intolerances || []))
        setShowMenuModal(true)
        showToast('success', '¡Menú de la próxima semana creado correctamente!')
      }
    } catch (err: any) {
      showToast('error', 'Error creando el menú de la próxima semana')
    } finally {
      setGenerandoCesta && setGenerandoCesta(false);
    }
  }

  const handleShowMenu = async (plan: MealPlan) => {
    setSelectedPlan(plan)
    setShowMenuModal(true)
    const { data } = await supabase
      .from('meal_plans')
      .select('meals')
      .eq('id', plan.id)
      .single()
    setMenuDetail(normalizaMenuConSnacks(data?.meals || {}, profile?.intolerances || []))
  }

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

    const success = await deletePlan(planId)
    if (success) {
    if (selectedPlan && selectedPlan.id === planId) {
      setShowMenuModal(false)
      setSelectedPlan(null)
      setMenuDetail(null)
    }
    showToast('success', 'Plan eliminado correctamente')
    } else {
      showToast('error', 'Error eliminando el plan')
    }
  }

  const handleSuggestAlternativeTable = async (dia: string, tipo: keyof DiaComidas, platoActual: string) => {
    try {
      setLoadingAlternative({ dia, tipo: String(tipo) })
      showToast('success', 'Buscando alternativa...')
      const alternativa = await generateMenuWithGemini({
        objetivo: profile?.goal || '',
        intolerancias: profile?.intolerances || [],
        platoActual,
        dia,
        tipo: String(tipo)
      })
      if (currentWeekPlan) {
        const nuevoMenu = { ...currentWeekPlan.meals };
        (nuevoMenu[dia] as any)[String(tipo)] = alternativa;
        await updatePlan(currentWeekPlan.id, { meals: nuevoMenu });
        setMenuDetail(nuevoMenu as Record<string, DiaComidas>);
        showToast('success', '¡Alternativa sugerida!')
      }
      return alternativa;
    } catch (err: any) {
      console.error('Error al sugerir alternativa:', err)
      showToast('error', 'No se pudo sugerir alternativa')
      return platoActual;
    } finally {
      setLoadingAlternative(null)
    }
  }

  // Obtener el menú de la semana actual o de la próxima si ya es sábado o domingo
  const getCurrentWeekMenu = () => {
    const now = new Date();
    // Si es lunes o después, buscar el menú de la semana actual (a partir del lunes)
    const baseMonday = new Date(now);
    baseMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    baseMonday.setHours(0, 0, 0, 0);
    const weekStr = baseMonday.toISOString().slice(0, 10);
    let plan = mealPlans.find(plan => plan.week.slice(0, 10) === weekStr);
    if (!plan) return null;
    const menuNormalizado = normalizaMenuConSnacks(plan.meals, profile?.intolerances || []);
    return { ...plan, meals: menuNormalizado };
  }

  const currentWeekPlan = getCurrentWeekMenu()

  // Detectar si el plan es de la próxima semana
  const isNextWeekPlan = currentWeekPlan && new Date(currentWeekPlan.week) > getBaseMondayForDisplay();

  if (showLoader) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-secondary-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (toast && toast.type === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{toast.message}</span>
        </div>
        <button
          onClick={logout}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-secondary-900 flex flex-col">
      <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        {/* Bloque de datos del usuario centrado */}
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center mb-6">
          {profile ? (
            <ProfileInfo profile={profile} onLogout={logout} />
          ) : (
            <div className="min-h-screen flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
          )}
        </div>

        <div className="w-full max-w-2xl card mx-auto">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
            <h2 className="text-2xl font-bold text-secondary-900 dark:text-white">Mi Plan Semanal</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              {!currentWeekPlan && (
                <button
                  onClick={handleCreatePlan}
                  disabled={creatingPlan}
                  className="btn btn-primary w-full sm:w-auto"
                >
                  {creatingPlan ? 'Generando menú...' : 'Crear menú'}
                </button>
              )}

              {currentWeekPlan && (
                <button
                  onClick={handleCreateNextWeekPlan}
                  disabled={creatingNextWeek || !puedeCrearMenuProximaSemana()}
                  className="btn btn-secondary w-full sm:w-auto"
                >
                  {creatingNextWeek ? 'Generando menú...' : 'Crear menú próxima semana'}
                </button>
              )}
              {!puedeCrearMenuProximaSemana() && (
                <span className="text-xs text-secondary-500 dark:text-secondary-300 mt-1 block">
                  Podrás crear el próximo menú a partir del: <b>{format(getNextSaturday(), 'PPPPp', { locale: es })}</b>
                </span>
              )}
            </div>
          </div>

          {currentWeekPlan && (
            <div className="space-y-4">
              {/* Resumen nutricional */}
              <div className="flex flex-col items-center bg-green-50 dark:bg-secondary-800 border border-green-200 dark:border-secondary-700 rounded-lg p-4 mb-2 w-full max-w-2xl mx-auto">
                <span className="text-sm text-secondary-700 dark:text-secondary-300 mb-2">Valores estimados para <b>toda la semana</b> (aproximados):</span>
                <div className="flex flex-wrap gap-4 justify-center items-center mb-2">
                  {(() => {
                    const macros = analizarMenu(currentWeekPlan.meals);
                    return (
                      <>
                        <span className="font-semibold text-green-700 dark:text-green-300">🥖 Carbohidratos: <span className="font-bold">{macros.carbohidratos} g</span></span>
                        <span className="font-semibold text-green-700 dark:text-green-300">🍗 Proteínas: <span className="font-bold">{macros.proteinas} g</span></span>
                        <span className="font-semibold text-green-700 dark:text-green-300">🥑 Grasas: <span className="font-bold">{macros.grasas} g</span></span>
                        <span className="font-semibold text-green-700 dark:text-green-300">🔥 Calorías estimadas: <span className="font-bold">{macros.calorias} kcal</span></span>
                      </>
                    );
                  })()}
                </div>
                {/* Promedio diario */}
                <span className="text-xs text-secondary-600 dark:text-secondary-400">Promedio diario: <b>{(() => {
                  const macros = analizarMenu(currentWeekPlan.meals);
                  return `${Math.round(macros.carbohidratos/7)} g carbs, ${Math.round(macros.proteinas/7)} g proteínas, ${Math.round(macros.grasas/7)} g grasas, ${Math.round(macros.calorias/7)} kcal`;
                })()}</b></span>
              </div>
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200">
                    {format(new Date(currentWeekPlan.week), 'dd/MM/yyyy')}
                  </h3>
                  <button
                    onClick={() => navigate('/cesta')}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 shadow transition-all text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    <span role="img" aria-label="carrito">🛒</span> Lista de la compra
                  </button>
                </div>
                <button
                  onClick={() => handleShowMenu(currentWeekPlan)}
                  className="btn btn-secondary"
                >
                  Ver menú
                </button>
              </div>
              {/* Tabla-resumen del menú semanal */}
              <div className="mt-4 overflow-x-auto rounded-lg border border-green-100 dark:border-secondary-700 bg-white dark:bg-secondary-800 shadow">
                <MenuTable
                  menu={currentWeekPlan.meals}
                  onSuggestAlternative={handleSuggestAlternativeTable}
                  intolerances={profile?.intolerances}
                  verSemanaCompleta={!!isNextWeekPlan}
                  fechaInicio={isNextWeekPlan ? undefined : new Date(currentWeekPlan.created_at)}
                />
              </div>
            </div>
          )}

          <div className="mt-8">
            <h3 className="text-lg font-semibold text-secondary-800 dark:text-secondary-200 mb-4">
              Planes anteriores
            </h3>
            {profile && (
              <MealPlansList
                mealPlans={mealPlans.filter(plan => plan.id !== currentWeekPlan?.id)}
                onShowMenu={handleShowMenu}
                onDeletePlan={handleDeletePlan}
              />
            )}
          </div>
        </div>

        {showMenuModal && selectedPlan && menuDetail && (
          <MenuModal
            plan={selectedPlan}
            menuDetail={menuDetail}
            onClose={() => {
              setShowMenuModal(false)
              setSelectedPlan(null)
              setMenuDetail(null)
            }}
            onDelete={async () => await handleDeletePlan(selectedPlan?.id || '')}
            onSuggestAlternative={handleSuggestAlternativeTable}
            loadingAlternative={loadingAlternative}
            verSemanaCompleta={!!isNextWeekPlan}
            fechaInicio={isNextWeekPlan ? undefined : selectedPlan ? new Date(selectedPlan.created_at) : undefined}
          />
        )}

        {toast && (
          <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${
            toast.type === 'success' 
              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' 
              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100'
          }`}>
            {toast.message}
          </div>
        )}
      </div>
    </div>
  )
} 