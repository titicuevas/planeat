import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { format } from 'date-fns'
import Swal from 'sweetalert2'
import type { Session } from '@supabase/supabase-js'
import { useProfile } from '../hooks/useProfile'
import { useMealPlans } from '../hooks/useMealPlans'
import { ProfileInfo } from '../components/ProfileInfo'
import { MenuTable } from '../components/MenuTable'
import { MenuModal } from '../components/MenuModal'
import { MealPlansList } from '../components/MealPlansList'
import { getBaseMondayForDisplay, puedeCrearMenuProximaSemana, getNextSaturday } from '../utils/dateUtils'
import { normalizaMenuConSnacks, analizarMenu } from '../utils/menuUtils'
import type { MealPlan, DiaComidas } from '../types/dashboard'
import { generateMenuWithGemini } from '../api/gemini'

interface Profile {
  id: string
  name?: string
  full_name?: string
  email?: string
  avatar_url?: string | null
  goal?: string | null
  intolerances?: string[] | null
}

export default function Dashboard({ session, setGenerandoCesta }: { session: Session, setGenerandoCesta?: (v: boolean) => void }) {
  const navigate = useNavigate()
  const planTitleRef = useRef<HTMLInputElement>(null)
  const [selectedPlan, setSelectedPlan] = useState<MealPlan | null>(null)
  const [menuDetail, setMenuDetail] = useState<Record<string, DiaComidas> | null>(null)
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [loadingAlternative, setLoadingAlternative] = useState<{dia: string, tipo: string} | null>(null)

  const { profile, loading: profileLoading, profileLoaded } = useProfile(session)
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

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

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

  const handleSuggestAlternative = async (dia: string, tipo: keyof DiaComidas, platoActual: string) => {
    try {
      setLoadingAlternative({ dia, tipo })
      showToast('success', 'Buscando alternativa...')
      
      const alternativa = await generateMenuWithGemini({
        objetivo: profile?.goal || '',
        intolerancias: profile?.intolerances || [],
        platoActual,
        dia,
        tipo
      })

      if (selectedPlan) {
        const nuevoMenu = { ...menuDetail }
        nuevoMenu[dia][tipo] = alternativa
        setMenuDetail(nuevoMenu)
        
        await updatePlan(selectedPlan.id, { meals: nuevoMenu as unknown as Record<string, Record<string, string>> })
      }

      showToast('success', '¡Alternativa sugerida!')
      return alternativa
    } catch (err: any) {
      console.error('Error al sugerir alternativa:', err)
      showToast('error', 'No se pudo sugerir alternativa')
      return platoActual
    } finally {
      setLoadingAlternative(null)
    }
  }

  // Obtener el menú de la semana actual o de la próxima si ya es sábado o domingo
  const getCurrentWeekMenu = () => {
    const baseMonday = getBaseMondayForDisplay()
    const weekStr = baseMonday.toISOString().slice(0, 10)
    let plan = mealPlans.find(plan => plan.week.slice(0, 10) === weekStr)
    if (!plan) return null
    
    const menuNormalizado = normalizaMenuConSnacks(plan.meals, profile?.intolerances || [])
    return { ...plan, meals: menuNormalizado }
  }

  const currentWeekPlan = getCurrentWeekMenu()

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

  if (!profileLoading && profileLoaded && (!profile || !profile.name || !profile.goal || !profile.intolerances || profile.intolerances.length === 0)) {
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
    )
  }

  if (profileLoading || !profileLoaded || plansLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8">
      <ProfileInfo profile={profile} onLogout={handleLogout} />

      <div className="w-full max-w-2xl bg-white rounded-xl shadow p-6 mb-8">
        {!currentWeekPlan && (
          <button
            onClick={handleCreatePlan}
            disabled={creatingPlan}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {creatingPlan ? 'Generando menú...' : 'Crear menú'}
          </button>
        )}

        {currentWeekPlan && (
          <button
            onClick={handleCreateNextWeekPlan}
            disabled={creatingNextWeek || !puedeCrearMenuProximaSemana()}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 ml-2"
          >
            {creatingNextWeek
              ? 'Generando menú de la próxima semana...'
              : puedeCrearMenuProximaSemana()
                ? `Crear menú para la próxima semana (${format(getNextSaturday(), 'dd/MM/yyyy')})`
                : `Disponible el ${format(getNextSaturday(), 'dd/MM/yyyy')} para hacer la compra`}
          </button>
        )}

        <div className="mt-8">
          <h3 className="text-xl font-bold text-green-700 mb-2">Menú de esta semana</h3>
          {currentWeekPlan && currentWeekPlan.meals ? (
            <MenuTable
              menu={currentWeekPlan.meals}
              onSuggestAlternative={handleSuggestAlternative}
              intolerances={profile?.intolerances}
            />
          ) : (
            <div className="text-gray-500">Aún no tienes menú para esta semana. ¡Genera uno para empezar!</div>
          )}
        </div>
      </div>

      <MealPlansList mealPlans={mealPlans} onShowMenu={handleShowMenu} />

      <MenuModal
        isOpen={showMenuModal}
        onClose={() => setShowMenuModal(false)}
        plan={selectedPlan}
        menu={menuDetail}
        onSuggestAlternative={handleSuggestAlternative}
        onUpdatePlan={updatePlan}
        intolerances={profile?.intolerances}
      />
    </div>
  )
} 