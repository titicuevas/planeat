import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../config/supabase';
import ReactConfetti from 'react-confetti';
import type { Session } from '@supabase/supabase-js';
import { unificarNombreIngrediente, formatCantidadCompra, agruparIngredientesHumanizado } from '../utils/menuUtils';

export default function Cesta({ session, profile }: { session: Session, profile: any }) {
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState<Array<{ id: string; nombre: string; cantidad?: string; checked: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState<'menu' | 'cesta' | 'done'>('menu');
  const [showReadyMsg, setShowReadyMsg] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [bannerClosed, setBannerClosed] = useState(false);

  // Palabras clave para cantidades irrelevantes
  const CANTIDADES_IGNORADAS = [
    'al gusto', 'una pizca', 'unas ramitas', 'cantidad necesaria', 'c/s', 'opcional', 'a gusto', 'a elección', 'a tu gusto', 'cantidad suficiente', 'c/n'
  ];

  // Unidades poco útiles para la compra
  const UNIDADES_POUCO_UTILES = [
    'cucharada', 'cucharadita', 'pizca', 'chorro', 'ramita', 'rama', 'hoja', 'diente', 'gota', 'puñado', 'rebanada', 'rodaja', 'loncha', 'taza', 'vaso', 'pellizco', 'grano', 'copa', 'bolita', 'cucharón', 'cazo', 'cucharadas', 'cucharaditas', 'ramitas', 'hojas', 'dientes', 'gotas', 'puñados', 'rebanadas', 'rodajas', 'lonchas', 'tazas', 'vasos', 'pellizcos', 'granos', 'copas', 'bolitas', 'cucharones', 'cazos'
  ];
  // Unidades útiles para la compra
  const UNIDADES_UTILES = [
    'g', 'gramo', 'gramos', 'kg', 'kilo', 'kilos', 'ml', 'mililitro', 'mililitros', 'l', 'litro', 'litros', 'unidad', 'unidades', 'paquete', 'paquetes', 'lata', 'latas', 'bote', 'botes', 'pieza', 'piezas', 'barra', 'barras', 'sobre', 'sobres', 'botella', 'botellas', 'bandeja', 'bandejas'
  ];

  // Conversión de unidades pequeñas a estándar (ml, g)
  const CONVERSION_UNIDADES = {
    'cucharada': 15, // ml
    'cucharadas': 15,
    'cucharadita': 5, // ml
    'cucharaditas': 5,
    'pizca': 1, // g (aprox)
    'pizcas': 1,
    'chorro': 10, // ml (aprox)
    'chorros': 10,
    'vaso': 200, // ml
    'vasos': 200,
    'taza': 250, // ml
    'tazas': 250
  };
  const UNIDADES_ML = ['ml', 'mililitro', 'mililitros', 'l', 'litro', 'litros'];
  const UNIDADES_G = ['g', 'gramo', 'gramos', 'kg', 'kilo', 'kilos'];

  // Sugerencias orientativas para ingredientes sin cantidad clara
  const SUGERENCIAS_ORIENTATIVAS: { [clave: string]: string } = {
    'sal': '~10 g',
    'pimienta': '~5 g',
    'aceite': '~250 ml',
    'vinagre': '~100 ml',
    'azúcar': '~50 g',
    'harina': '~500 g',
    'agua': '~1 l',
    'leche': '~1 l',
    'especias': '~10 g',
    'perejil': '~1 manojo',
    'ajo': '~1 cabeza',
    'cebolla': '~1 unidad',
    'limón': '~1 unidad',
    'tomate': '~1 unidad',
    'mantequilla': '~250 g',
    'queso': '~200 g',
    'pan': '~1 barra',
    'arroz': '~500 g',
    'pasta': '~500 g',
    'caldo': '~1 l',
    'zanahoria': '~2 unidades',
    'patata': '~2 unidades',
    'pollo': '~500 g',
    'carne': '~500 g',
    'pescado': '~500 g',
    'huevo': '~6 unidades',
    'fruta': '~1 kg',
    'verdura': '~1 kg',
  };

  useEffect(() => {
    let mounted = true;
    let timeout: NodeJS.Timeout;
    async function loadIngredients() {
      if (!session || !session.user?.id || !profile) return;
      setLoadingStep('menu');
      setLoading(true);
      await new Promise(res => setTimeout(res, 1000));
      setLoadingStep('cesta');
      try {
        const { data, error } = await supabase
          .from('shopping_list')
          .select('id, nombre, cantidad, checked')
          .eq('user_id', session.user.id)
          .order('nombre');
        if (!mounted) return;
        if (error) throw error;
        setIngredients(data || []);
      } catch (err) {
        if (!mounted) return;
        console.error('Error cargando ingredientes:', err);
      } finally {
        if (!mounted) return;
        setLoading(false);
        setLoadingStep('done');
        setShowReadyMsg(true);
        setTimeout(() => setShowReadyMsg(false), 2500);
      }
    }
    loadIngredients();
    // Si tras 5 segundos no hay ingredientes, mostrar mensaje de error
    timeout = setTimeout(() => {
      if (mounted && ingredients.length === 0) {
        setLoading(false);
        setLoadingStep('done');
      }
    }, 5000);
    return () => { mounted = false; clearTimeout(timeout); };
  }, [session, profile]);

  useEffect(() => {
    document.title = 'Cesta de la compra - Planeat';
  }, []);

  // Limpiar loader al navegar con el botón volver
  const handleBack = () => {
    setLoading(false);
    setLoadingStep('done');
    navigate('/inicio');
  };

  // Agrupar ingredientes por nombre y sumar cantidades de forma humanizada
  const groupedIngredients = React.useMemo(() => agruparIngredientesHumanizado(ingredients.map(i => ({ nombre: i.nombre, cantidad: i.cantidad || '' }))), [ingredients]);

  useEffect(() => {
    if (!loading && groupedIngredients.length > 0) {
      setShowConfetti(true);
      setShowCongrats(true);
      setTimeout(() => setShowConfetti(false), 4000);
      setTimeout(() => setShowCongrats(false), 5000);
    }
  }, [loading, groupedIngredients]);

  // Determinar si todos los ingredientes están marcados
  const allChecked = groupedIngredients.length > 0 && groupedIngredients.every(item => {
    return ingredients.find(i => unificarNombreIngrediente(i.nombre) === unificarNombreIngrediente(item.nombre))?.checked;
  });

  // Mostrar banner solo cuando se marca todo y permitir cerrarlo manualmente
  useEffect(() => {
    if (allChecked && groupedIngredients.length > 10) {
      setShowCongrats(true);
      setShowConfetti(true);
      setBannerClosed(false);
      setTimeout(() => {
        setShowConfetti(false);
        setShowCongrats(false);
        setBannerClosed(true);
      }, 3000);
    } else {
      setShowCongrats(false);
      setShowConfetti(false);
      setBannerClosed(false);
    }
  }, [allChecked, groupedIngredients.length]);

  // Función para clasificar ingredientes por tipo (simplificada)
  function clasificarIngrediente(nombre: string) {
    const lower = nombre.toLowerCase();
    if (lower.match(/(lechuga|espinaca|acelga|col|repollo|rúcula|berro|canónigo|brocoli|coliflor|zanahoria|pepino|calabacín|berenjena|pimiento|apio|cebolla|ajo|puerro|alcachofa|judía|habas|guisante|espárrago|seta|champiñón|tomate|patata|batata|boniato|remolacha|rábano|nabo|calabaza|endibia|escarola|hinojo|maíz|mazorca|verdura|vegetal)/)) return 'Verduras';
    if (lower.match(/(manzana|pera|plátano|banana|naranja|mandarina|limón|lima|pomelo|uva|melón|sandía|kiwi|fresa|frambuesa|arándano|cereza|ciruela|albaricoque|melocotón|mango|piña|papaya|granada|higo|dátil|fruta)/)) return 'Frutas';
    if (lower.match(/(pollo|pavo|ternera|cerdo|cordero|conejo|carne|jamón|lomo|embutido|huevo|huevos|atún|salmón|pescado|merluza|bacalao|gamba|marisco|langostino|anchoa|sardina|caballa|proteína|tofu|seitán|tempeh|soja|legumbre|lenteja|garbanzo|alubia|judía|frijol|proteína)/)) return 'Proteínas';
    if (lower.match(/(leche|yogur|queso|lácteo|nata|mantequilla|crema|kefir|lactosa)/)) return 'Lácteos';
    if (lower.match(/(pan|arroz|pasta|espagueti|macarrón|fideo|cereal|avena|trigo|maíz|centeno|quinoa|mijo|amaranto|cuscús|bulgur|cereal|galleta|bizcocho|tostada|cereal)/)) return 'Cereales';
    if (lower.match(/(aceite|sal|azúcar|vinagre|especia|hierba|condimento|salsa|caldo|agua|bebida|vino|cerveza|refresco|miel|semilla|fruto seco|almendra|nuez|avellana|pistacho|cacahuete|anacardo|semilla|pipa|chía|lino|sésamo|girasol|calabaza|otros)/)) return 'Otros';
    return 'Otros';
  }

  // Agrupar ingredientes por tipo
  const ingredientesPorTipo = React.useMemo(() => {
    const grupos: Record<string, typeof groupedIngredients> = {};
    groupedIngredients.forEach(item => {
      const tipo = clasificarIngrediente(item.nombre);
      if (!grupos[tipo]) grupos[tipo] = [];
      grupos[tipo].push(item);
    });
    return grupos;
  }, [groupedIngredients]);

  // Función para marcar o desmarcar todos
  async function handleCheckAll(checked: boolean) {
    // Buscar todos los ids
    const ids = ingredients.map(i => i.id);
    await Promise.all(ids.map(id =>
      supabase.from('shopping_list').update({ checked }).eq('id', id)
    ));
    setIngredients(prev => prev.map(i => ({ ...i, checked })));
  }

  // Función para actualizar el estado checked en Supabase y local
  async function handleCheck(nombre: string, checked: boolean) {
    // Buscar todos los ingredientes con ese nombre (puede haber varios ids)
    const ids = ingredients.filter(i => i.nombre === nombre).map(i => i.id);
    // Actualizar en Supabase
    await Promise.all(ids.map(id =>
      supabase.from('shopping_list').update({ checked }).eq('id', id)
    ));
    // Actualizar en local
    setIngredients(prev => prev.map(i => i.nombre === nombre ? { ...i, checked } : i));
  }

  // Validación: solo mostrar la lista si hay suficientes ingredientes (por ejemplo, más de 10)
  const listaCompleta = groupedIngredients.length > 10;

  // Mostrar loader si no hay sesión o perfil o si está cargando
  if (!session || !session.user?.id || !profile || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-secondary-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }
  // Si solo hay ingredientes "No disponible", mostrar mensaje de error
  const soloNoDisponible = ingredients.length > 0 && ingredients.every(i => i.nombre === 'No disponible');
  if (soloNoDisponible || ingredients.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-secondary-900">
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-xl shadow-lg text-center">
          <div className="font-bold mb-2">No se pudo generar la lista de la compra.</div>
          <div className="mb-4">Puede que la IA no haya devuelto ingredientes o haya habido un error. Intenta de nuevo.</div>
          <button onClick={() => window.location.reload()} className="bg-green-600 text-white px-4 py-2 rounded font-semibold shadow hover:bg-green-700">Reintentar</button>
          <button onClick={() => navigate('/inicio')} className="ml-4 bg-gray-400 text-white px-4 py-2 rounded font-semibold shadow hover:bg-gray-500">Volver al inicio</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-secondary-900 flex flex-col items-center py-0 relative transition-colors duration-300">
      <div className="w-full max-w-2xl bg-white dark:bg-secondary-800 rounded-2xl shadow p-6 mb-8 relative mt-8 border border-green-100 dark:border-secondary-700">
        <button
          onClick={handleBack}
          className="absolute left-4 top-4 bg-green-100 dark:bg-secondary-700 text-green-700 dark:text-green-300 px-3 py-1 rounded hover:bg-green-200 dark:hover:bg-secondary-600 transition-colors text-sm font-semibold shadow"
          disabled={loadingStep !== 'done'}
        >
          ← Volver
        </button>
        <h1 className="text-3xl font-bold text-green-700 dark:text-green-400 mb-4 text-center flex items-center gap-2 justify-center">
          <span role="img" aria-label="carrito">🛒</span> Cesta de la compra
        </h1>
        {/* Botón para marcar/desmarcar todos */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => handleCheckAll(!allChecked)}
            className={`px-4 py-2 rounded font-semibold shadow transition-colors text-white ${allChecked ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {allChecked ? 'Desmarcar todo' : 'Marcar todo'}
          </button>
        </div>
        {/* Mostrar la lista agrupada y sumada de ingredientes por categoría con checklist */}
        {listaCompleta ? (
          <div className="divide-y divide-green-200 dark:divide-secondary-700 mt-6">
            {Object.entries(ingredientesPorTipo).map(([categoria, items]) => (
              <div key={categoria} className="mb-6">
                <h2 className="text-2xl font-bold text-green-800 dark:text-green-300 mb-3 border-b-2 border-green-300 dark:border-green-700 pb-1 sticky top-0 bg-white dark:bg-secondary-800 z-10">{categoria}</h2>
                <table className="w-full text-sm mb-2 min-w-[350px]">
                  <thead>
                    <tr>
                      <th className="text-left text-green-700 dark:text-green-400 pb-2 w-1/12"></th>
                      <th className="text-left text-green-700 dark:text-green-400 pb-2 w-7/12 min-w-[180px]">Ingrediente</th>
                      <th className="text-right text-green-700 dark:text-green-400 pb-2 w-4/12 min-w-[80px]">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => {
                      const checked = ingredients.find(i => unificarNombreIngrediente(i.nombre) === unificarNombreIngrediente(item.nombre))?.checked || false;
                      return (
                        <tr key={item.nombre}>
                          <td className="py-1 text-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={e => handleCheck(item.nombre, e.target.checked)}
                              className="accent-green-600 dark:accent-green-500 w-5 h-5 rounded border-gray-300 dark:border-secondary-600 focus:ring-green-500 transition-all"
                            />
                          </td>
                          <td className={`py-1 text-secondary-900 dark:text-secondary-100 font-medium text-left ${checked ? 'line-through text-gray-400 dark:text-secondary-500' : ''}`}>{item.nombre}</td>
                          <td className={`py-1 text-secondary-700 dark:text-secondary-300 text-right ${checked ? 'line-through text-gray-400 dark:text-secondary-500' : ''}`}>{item.cantidad}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-lg text-red-600 dark:text-red-400 mt-8">La lista de la compra aún no está completa. Genera tu menú semanal para ver la lista completa.</div>
        )}
      </div>
      {/* Banner superior de compra completada */}
      {showCongrats && !bannerClosed && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-green-900 text-green-100 border-2 border-green-400 rounded-xl px-8 py-4 flex items-center gap-4 shadow-xl animate-fade-in">
          <span className="text-2xl font-bold">¡Compra completada!</span>
          <span className="text-lg">Disfruta de tus menús 🎉</span>
          <button
            onClick={() => { setShowCongrats(false); setBannerClosed(true); }}
            className="ml-4 text-green-200 hover:text-white text-xl font-bold focus:outline-none"
            title="Cerrar"
          >
            ×
          </button>
        </div>
      )}
      {showConfetti && <ReactConfetti width={window.innerWidth} height={window.innerHeight} numberOfPieces={250} recycle={false} />}
    </div>
  );
} 