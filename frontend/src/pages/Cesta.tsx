import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../config/supabase';
import ReactConfetti from 'react-confetti';
import type { Session } from '@supabase/supabase-js';
import { unificarNombreIngrediente, formatCantidadCompra } from '../utils/menuUtils';

export default function Cesta({ session, profile }: { session: Session, profile: any }) {
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
    let mounted = true;
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
    return () => { mounted = false; };
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

  // Agrupar ingredientes por nombre y sumar cantidades si es posible
  const groupedIngredients = React.useMemo(() => {
    const map = new Map<string, { cantidades: Record<string, number>, otros: string[], checked: {id: string, checked: boolean}[] }>();
    ingredients.forEach(item => {
      // Unificar nombres y filtrar poco útiles
      const nombre = unificarNombreIngrediente(item.nombre);
      if (['agua', 'sal', 'pimienta', 'hielo', 'especias', 'vinagre', 'sirope', 'opcional', 'caldo', 'zumo', 'bebida', 'aroma', 'extracto', 'decoración', 'aderezo', 'condimento', 'azúcar', 'edulcorante', 'stevia', 'colorante', 'levadura', 'bicarbonato', 'vainilla', 'limón (opcional)', 'zumo de limón (opcional)'].some(i => nombre.toLowerCase().includes(i))) return;
      const cantidad = item.cantidad || '';
      if (!map.has(nombre)) {
        map.set(nombre, { cantidades: {}, otros: [], checked: [] });
      }
      // Intentar extraer valor y unidad
      const match = cantidad.match(/^(\d+(?:[\.,]\d+)?)\s*([\wáéíóúüñ%]+)?/i);
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
        .map(([unidad, total]) => {
          // Redondear cantidades pequeñas
          if (unidad === 'g' && total < 20) return '1 puñado';
          if (unidad === 'ml' && total < 20) return '1 cda';
          if (unidad === 'un' && total < 1) return '1 unidad';
          return `${total % 1 === 0 ? total : total.toFixed(2)}${unidad ? ' ' + unidad : ''}`;
        })
        .join(' + ');
      // Añadir los textos no sumables
      const otrosStr = otros.filter(Boolean).join(' + ');
      return {
        nombre,
        cantidad: [cantidadesStr, otrosStr].filter(Boolean).join(' + '),
        checked: checked.every(c => c.checked),
        ids: checked.map(c => c.id),
      };
    });
  }, [ingredients]);

  // Opción para ocultar ingredientes marcados como "ya tengo"
  const [ocultarMarcados, setOcultarMarcados] = useState(false);
  const ingredientesAMostrar = ocultarMarcados ? groupedIngredients.filter(i => !i.checked) : groupedIngredients;

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
    const unidadesSumadas: Record<string, number> = {};
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
          // Agrupar por unidad si es una unidad no estándar
          unidadesSumadas[unidad] = (unidadesSumadas[unidad] || 0) + valor;
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
    // Añadir otras unidades sumadas
    for (const [unidad, valor] of Object.entries(unidadesSumadas)) {
      resultado.push(`${valor % 1 === 0 ? valor : valor.toFixed(2)} ${unidad}`);
    }
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

  // Mostrar loader si no hay sesión o perfil
  if (!session || !session.user?.id || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-secondary-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
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
        <p className="mb-6 text-secondary-700 dark:text-secondary-200 text-center">
          Aquí verás la lista de ingredientes necesarios para preparar todas las comidas de tu menú semanal. Marca los ingredientes que ya tienes para organizar mejor tu compra.
        </p>
        <div className="bg-green-50 dark:bg-secondary-900 border border-green-200 dark:border-secondary-700 rounded-lg p-4 text-center text-green-800 dark:text-green-200 mb-4 font-semibold">
          Próximamente: checklist de ingredientes, descarga en PDF y envío por email.
        </div>
        {/* Botón para marcar toda la lista */}
        <div className="flex justify-center w-full mb-4">
          <button
            className="bg-green-600 dark:bg-green-500 text-white px-4 py-2 rounded hover:bg-green-700 dark:hover:bg-green-600 font-semibold transition-colors w-full sm:w-auto shadow-lg"
            onClick={async () => {
              const allIds = groupedIngredients.flatMap(item => item.ids);
              await handleToggleGroup(allIds, true);
            }}
            disabled={loadingStep !== 'done' || groupedIngredients.every(item => item.checked)}
          >
            Lista de la compra completa
          </button>
          <button
            className="ml-4 bg-gray-200 dark:bg-secondary-700 text-secondary-800 dark:text-secondary-200 px-4 py-2 rounded hover:bg-gray-300 dark:hover:bg-secondary-600 font-semibold transition-colors w-full sm:w-auto shadow-lg"
            onClick={() => setOcultarMarcados(v => !v)}
          >
            {ocultarMarcados ? 'Mostrar todo' : 'Ocultar marcados'}
          </button>
        </div>
        {/* Ingredientes agrupados por tipo */}
        <div className="overflow-x-auto">
          <div className="divide-y divide-green-200 dark:divide-secondary-700 mt-6">
            {ingredientesAMostrar.map(item => (
              <div key={item.nombre} className="py-4">
                <h2 className="text-xl font-bold text-green-700 dark:text-green-400 mb-2 border-b border-green-200 dark:border-secondary-700 pb-1">
                  {item.nombre}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm mb-2 min-w-[350px]">
                    <thead>
                      <tr>
                        <th className="text-left text-green-700 dark:text-green-400 pb-2 w-2/3 min-w-[180px]">Ingrediente</th>
                        <th className="text-right text-green-700 dark:text-green-400 pb-2 w-1/3 min-w-[80px]">Cantidad</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.ids.map(id => (
                        <tr key={id} className={ingredients.find(i => i.id === id)?.checked ? 'opacity-60' : ''}>
                          <td className={"py-1 text-secondary-900 dark:text-secondary-100 font-medium text-left " + (ingredients.find(i => i.id === id)?.checked ? 'line-through' : '')}>{ingredients.find(i => i.id === id)?.nombre}</td>
                          <td className={"py-1 text-secondary-700 dark:text-secondary-300 text-right " + (ingredients.find(i => i.id === id)?.checked ? 'line-through' : '')}>{formatCantidadCompra(ingredients.find(i => i.id === id)?.nombre || '', ingredients.find(i => i.id === id)?.cantidad || '')}</td>
                          <td className="text-center">
                            <input
                              type="checkbox"
                              checked={ingredients.find(i => i.id === id)?.checked}
                              onChange={() => handleToggleGroup([id], !ingredients.find(i => i.id === id)?.checked)}
                              className="accent-green-600 dark:accent-green-500 w-5 h-5 rounded border-gray-300 dark:border-secondary-600 focus:ring-green-500 transition-all"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {showConfetti && <ReactConfetti width={window.innerWidth} height={window.innerHeight} numberOfPieces={250} recycle={false} />}
      {showCongrats && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-lg p-8 flex flex-col items-center border-2 border-green-400 dark:border-green-600">
            <span className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">¡Compra completada!</span>
            <span className="text-lg text-green-600 dark:text-green-300">Disfruta de tus menús 🎉</span>
          </div>
        </div>
      )}
    </div>
  );
} 