export async function generateMenuWithGemini({ 
  objetivo, 
  intolerancias, 
  promptExtra,
  platoActual,
  dia,
  tipo,
  diasRestantes
}: { 
  objetivo: string, 
  intolerancias: string[], 
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

  if (platoActual && dia && tipo) {
    prompt = `Eres un nutricionista experto. Necesito una alternativa para el siguiente plato que contiene ingredientes no aptos para el usuario:\nPlato actual: "${platoActual}"\nDía: ${dia}\nTipo de comida: ${tipo}\nObjetivo del usuario: "${objetivo}"\n${intoleranciasTexto}\n\nPor favor, sugiere una alternativa saludable y deliciosa que:\n1. No contenga ninguno de los ingredientes no aptos\n2. Sea compatible con el objetivo del usuario\n3. Sea fácil de preparar\n4. Sea similar en tipo de comida (por ejemplo, si es un plato principal, sugiere otro plato principal)\n\nDevuelve SOLO el nombre del plato alternativo, sin explicaciones adicionales.`;
  } else {
    let diasTexto = '';
    if (diasRestantes && diasRestantes.length > 0) {
      diasTexto = `\n- SOLO genera el menú para los siguientes días: ${diasRestantes.join(', ')}. Usa estos días como claves en el JSON.`;
    }
    prompt = `Eres un nutricionista experto. Crea un menú semanal saludable, variado y equilibrado para una persona.\n\nOBJETIVO DEL USUARIO: ${objetivo}\n\nIMPORTANTE: No incluyas ningún plato ni ingrediente que contenga: ${intolerancias.length > 0 ? intolerancias.join(', ') : 'ninguna intolerancia'}. Si el usuario es intolerante a un alimento, no debe aparecer en ninguna comida bajo ningún concepto.\n\nREQUISITOS:\n- Devuelve SOLO un JSON válido, sin explicaciones ni texto fuera del JSON.\n- El JSON debe tener los días de la semana en minúscula como claves ("lunes", "martes", ...).${diasTexto}\n- Para cada día, incluye los campos: "Desayuno", "Comida", "Cena", "Snack mañana", "Snack tarde".\n- Ejemplo de formato:\n{\n  "lunes": { "Desayuno": "Avena con frutas", "Comida": "Ensalada de pollo", "Cena": "Sopa de verduras", "Snack mañana": "Fruta fresca", "Snack tarde": "Yogur vegetal" },\n  ...\n}\n- No incluyas explicaciones, solo el JSON.`;
  }

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
  const res = await fetch(`${BACKEND_URL}/api/generate-menu`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  if (platoActual) return data.text.trim();
  let menu;
  try {
    console.log('Respuesta cruda de Gemini:', data.text);
    menu = JSON.parse(data.text);
  } catch {
    const match = data.text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        menu = JSON.parse(match[0]);
      } catch {
        throw new Error('No se pudo parsear la respuesta de Gemini (bloque JSON)');
      }
    } else {
      throw new Error('No se encontró un JSON válido en la respuesta de Gemini');
    }
  }
  // Validar que ningún plato contiene ingredientes de las intolerancias
  if (intolerancias.length > 0) {
    for (const dia of Object.keys(menu)) {
      for (const tipo of ['Desayuno', 'Comida', 'Cena', 'Snack mañana', 'Snack tarde']) {
        const plato = menu[dia]?.[tipo]?.toLowerCase() || '';
        for (const intol of intolerancias) {
          const intolLower = intol.toLowerCase();
          const regexSin = new RegExp(`sin[\\w\\s,]*${intolLower}`, 'i');
          if (
            plato.includes(intolLower) &&
            !regexSin.test(plato)
          ) {
            throw new Error(`El plato '${plato}' contiene la intolerancia '${intol}'.`);
          }
        }
      }
    }
  }
  return menu;
}

// Función de prueba mínima para Gemini
export async function testGeminiAPI() {
  try {
    const prompt = 'Dime una receta saludable para cenar.';
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/generate-menu`, {
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

export async function getIngredientesPlatoGemini(nombrePlato: string): Promise<{nombre: string, cantidad: string}[]> {
  const prompt = `Eres un nutricionista experto. Dame la lista de ingredientes necesarios para preparar el siguiente plato: "${nombrePlato}". Devuelve SOLO la lista de ingredientes en formato JSON como un array de objetos, cada uno con "nombre" y "cantidad" (por ejemplo: [{"nombre": "Arroz", "cantidad": "100g"}, ...]). No incluyas explicaciones, solo el array JSON.`;
  const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/generate-menu`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  console.log('Respuesta cruda de Gemini para ingredientes:', data.text);
  try {
    let ingredientes;
    // Si la respuesta viene en bloque markdown, extraer el array
    const matchJsonBlock = data.text.match(/```json[\s\n]*([\s\S]*?)```/);
    if (matchJsonBlock) {
      ingredientes = JSON.parse(matchJsonBlock[1]);
    } else {
      ingredientes = JSON.parse(data.text);
    }
    if (Array.isArray(ingredientes)) return ingredientes;
    // Si la respuesta no es un array, intentar extraer el array de un texto
    const match = data.text.match(/\[[^\]]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('No se pudo extraer un array de ingredientes de la respuesta de Gemini');
  } catch {
    throw new Error('No se pudo parsear la respuesta de Gemini para ingredientes');
  }
}