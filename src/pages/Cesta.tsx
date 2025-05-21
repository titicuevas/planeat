import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../config/supabase';
import ReactConfetti from 'react-confetti';

export default function Cesta() {
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState<Array<{ id: string; nombre: string; cantidad?: string; checked: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState<'menu' | 'cesta' | 'done'>('menu');
  const [showReadyMsg, setShowReadyMsg] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);

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
    async function loadIngredients() {
      setLoadingStep('menu');
      setLoading(true);
      // Simular proceso de creación de menú
      await new Promise(res => setTimeout(res, 1000));
      setLoadingStep('cesta');
      try {
        // Obtener usuario actual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIngredients([]);
          setLoading(false);
          setLoadingStep('done');
          return;
        }
        // Filtrar por user_id
        const { data, error } = await supabase
          .from('shopping_list')
          .select('id, nombre, cantidad, checked')
          .eq('user_id', user.id)
          .order('nombre');
        if (error) throw error;
        setIngredients(data || []);
      } catch (err) {
        console.error('Error cargando ingredientes:', err);
      } finally {
        setLoading(false);
        setLoadingStep('done');
        setShowReadyMsg(true);
        setTimeout(() => setShowReadyMsg(false), 2500);
      }
    }
    loadIngredients();
  }, []);

  // Agrupar ingredientes por nombre y sumar cantidades si es posible
  const groupedIngredients = React.useMemo(() => {
    const map = new Map<string, { cantidades: Record<string, number>, otros: string[], checked: {id: string, checked: boolean}[] }>();
    ingredients.forEach(item => {
      const nombre = item.nombre;
      const cantidad = item.cantidad || '';
      // Filtrar ingredientes con cantidades ignoradas
      const cantidadLower = cantidad.toLowerCase().trim();
      if (CANTIDADES_IGNORADAS.some(palabra => cantidadLower.includes(palabra))) {
        return; // No añadir este ingrediente
      }
      if (!map.has(nombre)) {
        map.set(nombre, { cantidades: {}, otros: [], checked: [] });
      }
      // Intentar extraer valor y unidad
      const match = cantidad.match(/^\s*([\d,.]+)\s*([\wáéíóúüñ%]+)?/i);
      if (match && match[1]) {
        const valor = parseFloat(match[1].replace(',', '.'));
        const unidad = (match[2] || '').trim();
        if (!isNaN(valor) && unidad) {
          map.get(nombre)!.cantidades[unidad] = (map.get(nombre)!.cantidades[unidad] || 0) + valor;
        } else if (!isNaN(valor) && !unidad) {
          map.get(nombre)!.cantidades[''] = (map.get(nombre)!.cantidades[''] || 0) + valor;
        } else {
          map.get(nombre)!.otros.push(cantidad);
        }
      } else if (cantidad && cantidad.trim() !== '') {
        map.get(nombre)!.otros.push(cantidad);
      }
      map.get(nombre)!.checked.push({id: item.id, checked: item.checked});
    });
    return Array.from(map.entries()).map(([nombre, { cantidades, otros, checked }]) => {
      // Construir string de cantidades sumadas por unidad
      const cantidadesStr = Object.entries(cantidades)
        .map(([unidad, total]) => `${total % 1 === 0 ? total : total.toFixed(2)}${unidad ? ' ' + unidad : ''}`)
        .join(' + ');
      // Añadir los textos no sumables
      const otrosStr = otros.filter(Boolean).join(' + ');
      const cantidadFinal = [cantidadesStr, otrosStr].filter(Boolean).join(' + ');
      return {
        nombre,
        cantidad: cantidadesStr,
        otros: otros,
        checked: checked.every(c => c.checked),
        ids: checked.map(c => c.id),
      };
    });
  }, [ingredients]);

  // Marcar/desmarcar todos los ingredientes individuales de un grupo
  const handleToggleGroup = async (ids: string[], checked: boolean) => {
    try {
      const { error } = await supabase
        .from('shopping_list')
        .update({ checked })
        .in('id', ids);
      if (error) throw error;
      setIngredients(prev => prev.map(item => ids.includes(item.id) ? { ...item, checked } : item));
    } catch (err) {
      console.error('Error actualizando ingredientes agrupados:', err);
    }
  };

  // Overlay de carga y mensajes de proceso
  const renderLoadingOverlay = () => {
    if (loadingStep === 'done' && !showReadyMsg) return null;
    let msg = '';
    if (loadingStep === 'menu') msg = 'Creando menú semanal...';
    else if (loadingStep === 'cesta') msg = 'Generando cesta de la compra...';
    else if (loadingStep === 'done' && showReadyMsg) msg = '¡Ya puedes consultar tu cesta de la compra!';
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex flex-col items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center">
          {(loadingStep !== 'done' || showReadyMsg) && (
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
          )}
          <span className="text-lg font-semibold text-green-700">{msg}</span>
        </div>
      </div>
    );
  };

  // Mejorar visualización y suma de cantidades
  const formatCantidad = (cantidad: string | undefined, otros: string[] = [], nombreIngrediente?: string) => {
    if (!cantidad && (!otros || otros.length === 0)) return 'ver receta';
    let totalMl = 0;
    let totalG = 0;
    let totalUnidades = 0;
    let otrosTextos: string[] = [];
    // Sumar cantidades útiles
    const partes = (cantidad ? cantidad.split(' + ') : []).concat(otros || []);
    partes.forEach(parte => {
      const match = parte.match(/([\d,.]+)\s*([\wáéíóúüñ]+)/i);
      if (match) {
        let valor = parseFloat(match[1].replace(',', '.'));
        let unidad = match[2].toLowerCase();
        if (UNIDADES_ML.some(u => unidad.includes(u))) {
          totalMl += valor;
        } else if (UNIDADES_G.some(u => unidad.includes(u))) {
          totalG += valor;
        } else if (unidad.includes('unidad')) {
          totalUnidades += valor;
        } else if (CONVERSION_UNIDADES[unidad as keyof typeof CONVERSION_UNIDADES]) {
          // Convertir a ml o g según el tipo
          if (unidad.includes('cucharada') || unidad.includes('chorro') || unidad.includes('vaso') || unidad.includes('taza')) {
            totalMl += valor * CONVERSION_UNIDADES[unidad as keyof typeof CONVERSION_UNIDADES];
          } else if (unidad.includes('pizca')) {
            totalG += valor * CONVERSION_UNIDADES[unidad as keyof typeof CONVERSION_UNIDADES];
          }
        } else {
          otrosTextos.push(parte);
        }
      } else if (/^\d+$/.test(parte.trim())) {
        totalUnidades += parseInt(parte.trim());
      } else if (parte && parte.trim() !== '') {
        otrosTextos.push(parte);
      }
    });
    let resultado = [];
    if (totalG > 0) resultado.push(`${totalG % 1 === 0 ? totalG : totalG.toFixed(2)} g`);
    if (totalMl > 0) resultado.push(`${totalMl % 1 === 0 ? totalMl : totalMl.toFixed(2)} ml`);
    if (totalUnidades > 0) resultado.push(`${totalUnidades} unidades`);
    if (otrosTextos.length > 0) {
      // Buscar sugerencia orientativa por nombre de ingrediente
      let sugerencia = '';
      if (nombreIngrediente) {
        const clave = nombreIngrediente.toLowerCase().split(' ')[0];
        sugerencia = SUGERENCIAS_ORIENTATIVAS[clave] || '';
      }
      resultado.push(sugerencia ? sugerencia : '~1 unidad');
    }
    if (resultado.length === 0) return '~1 unidad';
    return resultado.join(' + ');
  };

  useEffect(() => {
    if (!loading && groupedIngredients.length > 0 && groupedIngredients.every(i => i.checked)) {
      setShowConfetti(true);
      setShowCongrats(true);
      setTimeout(() => setShowConfetti(false), 4000);
      setTimeout(() => setShowCongrats(false), 5000);
    }
  }, [loading, groupedIngredients]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 relative">
      {renderLoadingOverlay()}
      <div className="w-full max-w-2xl bg-white rounded-xl shadow p-6 mb-8 relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 transition-colors text-sm font-semibold"
          disabled={loadingStep !== 'done'}
        >
          ← Volver
        </button>
        <h1 className="text-3xl font-bold text-green-700 mb-4 text-center">🛒 Cesta de la compra</h1>
        <p className="mb-6 text-gray-700 text-center">
          Aquí verás la lista de ingredientes necesarios para preparar todas las comidas de tu menú semanal. Marca los ingredientes que ya tienes para organizar mejor tu compra.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center text-green-800 mb-4">
          Próximamente: checklist de ingredientes, descarga en PDF y envío por email.
        </div>
        {/* Botón para marcar toda la lista */}
        {groupedIngredients.length > 0 && (
          <button
            className="mb-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-semibold transition-colors"
            onClick={async () => {
              const allIds = groupedIngredients.flatMap(item => item.ids);
              await handleToggleGroup(allIds, true);
            }}
            disabled={loadingStep !== 'done' || groupedIngredients.every(item => item.checked)}
          >
            Lista de la compra completa
          </button>
        )}
        {loading ? (
          <div className="text-center">Cargando ingredientes...</div>
        ) : groupedIngredients.length === 0 ? (
          <div className="text-center text-gray-500">No hay ingredientes en la lista.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-green-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-green-700">Ingrediente</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-green-700">Cantidad</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-green-100">
                {groupedIngredients.map((item, idx) => (
                  <tr key={item.nombre + idx}>
                    <td className={"px-4 py-2 " + (item.checked ? 'line-through text-gray-500' : '')}>
                      {item.nombre}
                    </td>
                    <td className={"px-4 py-2 " + (item.checked ? 'line-through text-gray-500' : '')}>{formatCantidad(item.cantidad, item.otros, item.nombre)}</td>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={e => handleToggleGroup(item.ids, e.target.checked)}
                        className="h-5 w-5 text-green-600"
                        disabled={loadingStep !== 'done'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showConfetti && <ReactConfetti width={window.innerWidth} height={window.innerHeight} numberOfPieces={250} recycle={false} />}
      {showCongrats && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center border-2 border-green-400">
            <span className="text-2xl font-bold text-green-700 mb-2">¡Compra completada!</span>
            <span className="text-lg text-green-600">Disfruta de tus menús 🎉</span>
          </div>
        </div>
      )}
      {/* Aquí podrías añadir un bloque para mostrar recetas de la semana si tienes los datos */}
    </div>
  );
} 