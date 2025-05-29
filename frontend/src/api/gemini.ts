export async function generateMenuWithGemini({ 
  objetivo, 
  intolerancias, 
  peso,
  altura,
  promptExtra,
  platoActual,
  dia,
  tipo,
  diasRestantes
}: { 
  objetivo: string, 
  intolerancias: string[], 
  peso?: number,
  altura?: number,
  promptExtra?: string,
  platoActual?: string,
  dia?: string,
  tipo?: string,
  diasRestantes?: string[]
}) {
  let prompt = '';
  const intoleranciasTexto = intolerancias.length > 0
    ? `IMPORTANTE: No incluyas ningún plato ni ingrediente que contenga: ${intolerancias.join(', ')}. Si el usuario es intolerante a un alimento, no debe aparecer en ninguna comida bajo ningún concepto.`
    : '';

  const datosUsuario = `${peso ? `Peso: ${peso} kg. ` : ''}${altura ? `Altura: ${altura} cm. ` : ''}`;

  // Calcular requerimientos estándar
  let requerimientos = '';
  if (peso) {
    const proteinas = (peso * 1.8).toFixed(0); // gramos/día
    const grasas = (peso * 1).toFixed(0); // gramos/día
    requerimientos = `El usuario necesita aproximadamente ${proteinas}g de proteínas y ${grasas}g de grasas al día. El resto de calorías deben venir de carbohidratos. Ajusta las cantidades y los platos para que el menú semanal se aproxime a estos valores, adaptando las porciones a su peso y objetivo.`;
  }

  // Siempre pedir los 7 días de la semana
  let diasTexto = '';
  diasTexto = '\n- El menú debe tener SIEMPRE los 7 días de la semana: lunes, martes, miércoles, jueves, viernes, sábado, domingo. Usa estos días como claves en el JSON.';

  if (platoActual && dia && tipo) {
    prompt = `Eres un nutricionista experto. Necesito una alternativa para el siguiente plato que contiene ingredientes no aptos para el usuario:\nPlato actual: "${platoActual}"\nDía: ${dia}\nTipo de comida: ${tipo}\nObjetivo del usuario: "${objetivo}"\n${datosUsuario}${intoleranciasTexto}\n${requerimientos}\n\nPor favor, sugiere una alternativa saludable y deliciosa que:\n1. No contenga ninguno de los ingredientes no aptos\n2. Sea compatible con el objetivo del usuario\n3. Sea fácil de preparar\n4. Sea similar en tipo de comida (por ejemplo, si es un plato principal, sugiere otro plato principal)\n\nDevuelve SOLO el nombre del plato alternativo, sin explicaciones adicionales.`;

    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/generate-menu`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    if (data.error) {
      throw new Error(data.error);
    }
    // Para alternativas, esperamos un string directo
    return data.menu?.toString() || platoActual;
  } else {
    prompt = `Eres un nutricionista experto. Crea un menú semanal saludable, variado y equilibrado para una persona.\n\nOBJETIVO DEL USUARIO: ${objetivo}\n${datosUsuario}\n${requerimientos}\nIMPORTANTE: No incluyas ningún plato ni ingrediente que contenga: ${intolerancias.length > 0 ? intolerancias.join(', ') : 'ninguna intolerancia'}. Si el usuario es intolerante a un alimento, no debe aparecer en ninguna comida bajo ningún concepto.\n\nREQUISITOS:\n- Devuelve SOLO un JSON válido, sin explicaciones ni texto fuera del JSON.\n- El JSON debe tener los días de la semana en minúscula como claves ("lunes", "martes", ...).${diasTexto}\n- Para cada día, incluye los campos: "Desayuno", "Comida", "Cena", "Snack mañana", "Snack tarde".\n- NO repitas el mismo plato en ningún día ni comida de la semana. Cada comida debe ser única en toda la semana. Si repites algún plato, el menú será inválido.\n- Ejemplo de formato:\n{\n  "lunes": { "Desayuno": "Avena con frutas", "Comida": "Ensalada de pollo", "Cena": "Sopa de verduras", "Snack mañana": "Fruta fresca", "Snack tarde": "Yogur vegetal" },\n  ...\n}\n- No incluyas explicaciones, solo el JSON.`;
  }

  const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // Reintentar hasta 3 veces si el menú es incompleto o repetido
  let intentos = 0;
  let menu: any = null;
  let lastError = '';
  while (intentos < 3) {
    intentos++;
    const res = await fetch(`${BACKEND_URL}/api/generate-menu`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    if (data.error) {
      lastError = data.error;
      continue;
    }
    // Ahora el backend devuelve { menu }
    menu = data.menu;
    // Validar que ningún plato contiene ingredientes de las intolerancias
    if (intolerancias.length > 0) {
      for (const dia of Object.keys(menu)) {
        for (const tipo of ['Desayuno', 'Comida', 'Cena', 'Snack mañana', 'Snack tarde']) {
          const plato = menu[dia]?.[tipo]?.toLowerCase() || '';
          for (const intol of intolerancias) {
            const intolLower = intol.toLowerCase();
            const regexSin = new RegExp(`sin[\w\s,]*${intolLower}`, 'i');
            if (
              plato.includes(intolLower) &&
              !regexSin.test(plato)
            ) {
              lastError = `El plato '${plato}' contiene la intolerancia '${intol}'.`;
              menu = null;
              break;
            }
          }
        }
      }
    }
    // Validar que no hay platos repetidos y que hay 7 días y 5 comidas por día
    const { hayPlatosRepetidos } = await import('../utils/menuUtils');
    const dias = Object.keys(menu || {});
    const comidasPorDia = dias.map(d => Object.keys(menu[d] || {}).length);
    if (!menu || dias.length !== 7 || comidasPorDia.some(c => c < 3) || hayPlatosRepetidos(menu)) {
      lastError = 'El menú generado es incompleto o contiene platos repetidos. Reintentando...';
      menu = null;
      continue;
    }
    // Si todo está bien, salir del bucle
    break;
  }
  if (!menu) {
    throw new Error('No se pudo generar un menú completo y variado tras varios intentos. ' + lastError);
  }
  return menu;
}

// Función de prueba mínima para Gemini
export async function testGeminiAPI() {
  try {
    const prompt = 'Dime una receta saludable para cenar.';
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/generate-menu`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    if (data.error) {
      console.error('Error de Gemini (test):', data.error);
      return;
    }
    console.log('Respuesta de Gemini (test):', data.text);
  } catch (e) {
    console.error('Error en la petición de prueba a Gemini:', e);
  }
}

export async function getIngredientesPlatoGemini(plato: string) {
  const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/ingredientes-plato`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plato })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.ingredientes;
}