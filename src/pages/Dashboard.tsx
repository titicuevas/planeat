import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { Dialog } from '@headlessui/react'
import { generateMenuWithGemini } from '../api/gemini'
import { Fragment } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Swal from 'sweetalert2'

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

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
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
  const [menuDetail, setMenuDetail] = useState<any>(null)
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editNote, setEditNote] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [loadingAlternative, setLoadingAlternative] = useState<{dia: string, tipo: string} | null>(null)

  useEffect(() => {
    async function getProfileAndPlans() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('No user found')
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        if (error) throw error
        setProfile(data)
        if (!data.goal) setShowGoalForm(true)
        else if (!data.intolerances || data.intolerances.length === 0) setShowIntoleranceForm(true)
        // Obtener planes de alimentación
        const { data: plans } = await supabase
          .from('meal_plans')
          .select('id, title, week, created_at, meals, note')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        setMealPlans(plans || [])
        // Mostrar automáticamente el menú del plan más reciente
        if (plans && plans.length > 0) {
          setSelectedPlan(plans[0])
          setMenuDetail(plans[0].meals || {})
          setShowMenuModal(true)
        }
      } catch (error) {
        console.error('Error loading profile:', error)
      } finally {
        setLoading(false)
      }
    }
    getProfileAndPlans()
  }, [])

  useEffect(() => {
    if (selectedPlan) {
      setEditTitle(selectedPlan.title || '')
      setEditNote(selectedPlan.note || '')
    }
  }, [selectedPlan])

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
    } catch (err) {
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
    } catch (err) {
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
    e.preventDefault()
    setCreatingPlan(true)
    setPlanMsg('Generando tu menú semanal personalizado...')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')
      const objetivo = profile?.goal || ''
      const intolerancias = profile?.intolerances || []
      const menu = await generateMenuWithGemini({ objetivo, intolerancias })
      const week = new Date().toISOString().slice(0, 10)
      const title = planTitleRef.current?.value || `Menú semana ${week}`
      const { data: plan, error } = await supabase
        .from('meal_plans')
        .insert([
          {
            user_id: user.id,
            title,
            week,
            meals: menu, // Menú generado por la IA
          }
        ])
        .select('id, title, week, created_at')
        .single()
      if (error) throw error
      setMealPlans(prev => [{ ...plan, meals: menu }, ...prev])
      setShowCreatePlan(false)
      setPlanMsg('')
      showToast('success', '¡Plan creado correctamente!')
    } catch (err) {
      setPlanMsg('Error creando el plan')
      showToast('error', 'Error creando el plan')
    } finally {
      setCreatingPlan(false)
    }
  }

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

  const handleSuggestAlternative = async (dia: string, tipo: string, platoActual: string) => {
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
      }

      showToast('success', '¡Alternativa sugerida!');
    } catch (err) {
      console.error('Error al sugerir alternativa:', err);
      showToast('error', 'No se pudo sugerir alternativa');
    } finally {
      setLoadingAlternative(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-8 px-4 flex flex-col items-center">
        <div className="w-full flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Bienvenido, {profile?.name || profile?.full_name || 'Usuario'}
          </h1>
          <button
            onClick={handleLogout}
            className="ml-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            aria-label="Cerrar sesión"
          >
            Cerrar sesión
          </button>
        </div>
        {showGoalForm ? (
          <form onSubmit={handleGoalSubmit} className="bg-white rounded-xl shadow-md p-6 w-full max-w-md flex flex-col gap-4 items-center">
            <h2 className="text-xl font-semibold text-green-700 mb-2">¿Cuál es tu objetivo principal?</h2>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-green-500"
              value={goal}
              onChange={e => setGoal(e.target.value)}
              required
            >
              <option value="">Selecciona un objetivo...</option>
              {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            {goal === 'Otro' && (
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-green-500"
                placeholder="Escribe tu objetivo..."
                value={customGoal}
                onChange={e => setCustomGoal(e.target.value)}
                required
              />
            )}
            <button
              type="submit"
              disabled={savingGoal || (!goal && !customGoal)}
              className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {savingGoal ? 'Guardando...' : 'Guardar objetivo'}
            </button>
          </form>
        ) : showIntoleranceForm ? (
          <form onSubmit={handleIntoleranceSubmit} className="bg-white rounded-xl shadow-md p-6 w-full max-w-md flex flex-col gap-4 items-center">
            <h2 className="text-xl font-semibold text-green-700 mb-2">¿Tienes alguna intolerancia alimentaria?</h2>
            <div className="w-full grid grid-cols-2 gap-2">
              {INTOLERANCES.map(intol => (
                <label key={intol} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIntolerances.includes(intol)}
                    onChange={() => handleIntoleranceChange(intol)}
                    className="accent-green-600"
                  />
                  <span>{intol}</span>
                </label>
              ))}
            </div>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-green-500"
              placeholder="Otras intolerancias (opcional)"
              value={otherIntolerance}
              onChange={e => setOtherIntolerance(e.target.value)}
            />
            <button
              type="submit"
              disabled={savingIntolerances}
              className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {savingIntolerances ? 'Guardando...' : 'Guardar intolerancias'}
            </button>
          </form>
        ) : (
          <>
            {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded mb-4">{successMsg}</div>}
            <p className="mt-2 text-gray-600 text-center">
              {profile?.goal
                ? <>Tu objetivo es: <span className="font-semibold text-green-700">{profile.goal}</span></>
                : 'Esta es tu página de dashboard. Aquí podrás gestionar tus planes de alimentación.'}
            </p>
            {profile?.intolerances && profile.intolerances.length > 0 && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
                <span className="font-semibold">Intolerancias:</span> {profile.intolerances.join(', ')}
              </div>
            )}
          </>
        )}
        {/* Sección de planes */}
        {!showGoalForm && !showIntoleranceForm && (
          <div className="w-full mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-green-700">Tus planes de alimentación</h2>
              <button
                onClick={() => setShowCreatePlan(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
                aria-label="Crear nuevo plan"
              >
                Crear nuevo plan
              </button>
            </div>
            {mealPlans.length === 0 ? (
              <div className="text-gray-500 text-center py-8">Aún no tienes planes creados.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mealPlans.map(plan => (
                  <div key={plan.id} className="card flex flex-col gap-2 cursor-pointer hover:shadow-lg transition relative group" onClick={() => handleShowMenu(plan)}>
                    <h3 className="text-lg font-semibold text-green-800">{plan.title}</h3>
                    <span className="text-sm text-gray-500">Semana: {plan.week}</span>
                    <span className="text-xs text-gray-400">Creado: {format(new Date(plan.created_at), 'd/M/yyyy')}</span>
                    {plan.note && <span className="text-xs text-green-700 italic">{plan.note}</span>}
                    <button
                      onClick={e => { e.stopPropagation(); handleDeletePlan(plan.id) }}
                      className="absolute top-2 right-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                      aria-label="Eliminar plan"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Modal para crear plan */}
        <Dialog open={showCreatePlan} onClose={() => setShowCreatePlan(false)} className="relative z-10">
          <div className="fixed inset-0 bg-black bg-opacity-30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="relative bg-white rounded-xl shadow-lg p-8 w-full max-w-md mx-auto z-20 flex flex-col items-center">
              <Dialog.Title className="text-xl font-bold mb-2 text-green-700">Crear nuevo plan de alimentación</Dialog.Title>
              <p className="mb-4 text-gray-600 text-center">Se generará un menú semanal adaptado a tu objetivo e intolerancias.</p>
              <form onSubmit={handleCreatePlan} className="w-full flex flex-col gap-4 items-center">
                <input
                  ref={planTitleRef}
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-green-500"
                  placeholder="Título del plan (opcional)"
                />
                <button
                  type="submit"
                  disabled={creatingPlan}
                  className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {creatingPlan ? 'Generando...' : 'Crear plan'}
                </button>
                {planMsg && <div className="text-green-700 text-center mt-2">{planMsg}</div>}
              </form>
            </Dialog.Panel>
          </div>
        </Dialog>
        {/* Modal para mostrar el menú */}
        <Dialog open={showMenuModal} onClose={() => setShowMenuModal(false)} as="div" className="relative z-20">
          <div className="fixed inset-0 bg-black bg-opacity-20 transition-opacity duration-300" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-2 overflow-y-auto">
            <Dialog.Panel className="relative bg-white rounded-2xl shadow-lg w-full max-w-md sm:max-w-xl mx-auto z-20 flex flex-col border border-gray-100 animate-fade-in max-h-[90vh]">
              {/* Encabezado sticky */}
              <div className="sticky top-0 bg-white z-10 pt-4 pb-2 px-4 border-b border-gray-100">
                <Dialog.Title className="text-xl sm:text-2xl font-bold text-green-700 text-center tracking-tight">Menú semanal</Dialog.Title>
                {selectedPlan && (
                  <div className="mt-1 w-full text-center text-gray-600 text-sm">
                    <span className="font-semibold text-green-700">{profile?.name || profile?.full_name || 'Usuario'}</span> &bull; Semana: <span className="font-semibold">{getWeekRange(selectedPlan.week)}</span>
                  </div>
                )}
              </div>
              {/* Resumen nutricional */}
              <div className="w-full flex flex-col items-center gap-2 py-2 bg-green-50 border-b border-green-100">
                <div className="flex gap-4 justify-center">
                  <div className="flex flex-col items-center">
                    <span className="text-green-700 font-bold text-lg">1800</span>
                    <span className="text-xs text-gray-600">kcal/día</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-green-700 font-bold text-lg">90g</span>
                    <span className="text-xs text-gray-600">Proteínas</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-green-700 font-bold text-lg">220g</span>
                    <span className="text-xs text-gray-600">Carbohidratos</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-green-700 font-bold text-lg">60g</span>
                    <span className="text-xs text-gray-600">Grasas</span>
                  </div>
                </div>
                <span className="text-xs text-gray-400 italic">*Valores estimados. Próximamente: resumen real por IA.</span>
              </div>
              {/* Contenido con scroll */}
              <div className="flex-1 overflow-y-auto px-4 py-2">
                {selectedPlan && menuDetail && profile?.intolerances && profile.intolerances.length > 0 && (
                  (() => {
                    const platosNoAptos = getPlatosNoAptos(menuDetail, profile.intolerances);
                    return platosNoAptos.length > 0 ? (
                      <div className="w-full bg-red-50 border border-red-200 text-red-700 rounded p-2 mb-2 text-xs">
                        <b>Aviso:</b> Se han detectado platos que pueden contener tus intolerancias:
                        <ul className="list-disc ml-5 mt-1">
                          {platosNoAptos.map((p, i) => (
                            <li key={i} className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                {p.dia} - {p.tipo}: <b>{p.plato}</b> (contiene <b>{p.intolerancia}</b>)
                              </div>
                              <button
                                onClick={() => handleSuggestAlternative(p.dia, p.tipo, p.plato)}
                                className={`mt-1 sm:mt-0 px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-xs font-medium transition-colors flex items-center gap-1 ${loadingAlternative && loadingAlternative.dia === p.dia && loadingAlternative.tipo === p.tipo ? 'opacity-60 cursor-not-allowed' : ''}`}
                                disabled={!!(loadingAlternative && loadingAlternative.dia === p.dia && loadingAlternative.tipo === p.tipo)}
                              >
                                {loadingAlternative && loadingAlternative.dia === p.dia && loadingAlternative.tipo === p.tipo ? (
                                  <svg className="animate-spin h-4 w-4 mr-1 text-green-700" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                                ) : null}
                                Sugerir alternativa
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null;
                  })()
                )}
                {menuDetail ? (
                  <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {WEEK_DAYS.filter(day => menuDetail[day]).map(day => {
                      const isToday = new Date().toLocaleDateString('es-ES', { weekday: 'long' }).toLowerCase() === day
                      return (
                        <div key={day} className={`bg-white rounded-xl shadow p-3 flex flex-col gap-2 border border-gray-200 ${isToday ? 'ring-2 ring-green-600' : ''} animate-fade-in`}>
                          <h4 className={`font-bold capitalize mb-1 text-base sm:text-lg text-center tracking-wide ${isToday ? 'text-green-700' : 'text-green-600'}`}>{day}</h4>
                          <ul className="flex flex-col gap-2">
                            {['desayuno', 'comida', 'cena'].map(type => (
                              <li key={type} className="flex items-center gap-2">
                                <img
                                  src={mealTypeImages[type]}
                                  alt={type}
                                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover border border-gray-200 bg-white shadow-sm"
                                  onError={e => (e.currentTarget.src = 'data:image/svg+xml;utf8,<svg width=\'56\' height=\'56\' viewBox=\'0 0 24 24\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'><rect width=\'24\' height=\'24\' rx=\'8\' fill=\'%23f3f4f6\'/><path d=\'M7 17l5-5 5 5\' stroke=\'%239ca3af\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/></svg>')}
                                />
                                <div className="flex-1 min-w-0">
                                  <span className="block font-semibold capitalize text-gray-700 text-xs sm:text-sm">{type}:</span>
                                  <span
                                    className="block text-gray-900 text-sm truncate"
                                    title={menuDetail[day][type]}
                                  >
                                    {menuDetail[day][type]}
                                  </span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-gray-500">Cargando menú...</div>
                )}
                {/* Edición de nombre y nota */}
                <div className="w-full flex flex-col items-center mt-4 mb-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="text-lg sm:text-xl font-bold text-green-700 text-center tracking-tight bg-transparent border-b-2 border-green-200 focus:border-green-500 outline-none w-full max-w-xs mb-2"
                    aria-label="Editar nombre del plan"
                    disabled={savingEdit}
                  />
                  <input
                    type="text"
                    value={editNote}
                    onChange={e => setEditNote(e.target.value)}
                    className="text-sm text-gray-600 text-center bg-transparent border-b border-gray-200 focus:border-green-400 outline-none w-full max-w-xs"
                    placeholder="Añade una nota personal..."
                    aria-label="Nota personal"
                    disabled={savingEdit}
                  />
                  <button
                    onClick={handleSavePlanEdit}
                    className="mt-2 px-4 py-1 bg-green-600 text-white rounded font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                    disabled={savingEdit || (!editTitle.trim() && !editNote.trim())}
                    aria-label="Guardar cambios del plan"
                  >
                    {savingEdit ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
              {/* Botón sticky abajo */}
              <div className="sticky bottom-0 bg-white z-10 pt-2 pb-4 px-4 border-t border-gray-100 flex justify-center">
                <button
                  onClick={() => setShowMenuModal(false)}
                  className="px-8 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow transition-colors duration-150 text-base sm:text-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
                  aria-label="Cerrar menú semanal"
                >
                  Cerrar
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
        {toast && (
          <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-3
            ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
            animate-fade-in`}
            style={{ minWidth: 220 }}
          >
            <span className="font-semibold">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-white/80 hover:text-white text-lg">&times;</button>
          </div>
        )}
      </div>
    </div>
  )
} 