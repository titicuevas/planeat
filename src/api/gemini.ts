export async function generateMenuWithGemini({ 
  objetivo, 
  intolerancias, 
  promptExtra,
  platoActual,
  dia,
  tipo
}: { 
  objetivo: string, 
  intolerancias: string[], 
  promptExtra?: string,
  platoActual?: string,
  dia?: string,
  tipo?: string 
}) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

  const intoleranciasTexto = intolerancias.length > 0
    ? `IMPORTANTE: No incluyas ningún plato ni ingrediente que contenga: ${intolerancias.join(', ')}. Si el usuario es intolerante a un alimento, no debe aparecer en ninguna comida bajo ningún concepto.`
    : '';

  let prompt = '';
  
  if (platoActual && dia && tipo) {
    // Si estamos pidiendo una alternativa para un plato específico
    prompt = `
Eres un nutricionista experto. Necesito una alternativa para el siguiente plato que contiene ingredientes no aptos para el usuario:
Plato actual: "${platoActual}"
Día: ${dia}
Tipo de comida: ${tipo}
Objetivo del usuario: "${objetivo}"
${intoleranciasTexto}

Por favor, sugiere una alternativa saludable y deliciosa que:
1. No contenga ninguno de los ingredientes no aptos
2. Sea compatible con el objetivo del usuario
3. Sea fácil de preparar
4. Sea similar en tipo de comida (por ejemplo, si es un plato principal, sugiere otro plato principal)

Devuelve SOLO el nombre del plato alternativo, sin explicaciones adicionales.
`;
  } else {
    // Si estamos generando un menú completo
    prompt = promptExtra || `
Eres un nutricionista experto. Crea un menú semanal saludable, variado y equilibrado para una persona cuyo objetivo es: "${objetivo}".

${intoleranciasTexto}

Requisitos específicos:
1. El menú debe ser diferente cada día
2. Incluir recetas mediterráneas e internacionales
3. Ser fácil de preparar
4. Adaptado al objetivo del usuario
5. No incluir ningún ingrediente no apto
6. Incluir una buena variedad de proteínas, carbohidratos y grasas saludables
7. Considerar el desayuno como la comida más importante del día
8. Incluir snacks saludables entre comidas principales

Devuelve el menú en formato JSON, con los días de la semana como claves (lunes a domingo), y para cada día, desayuno, comida y cena.
Ejemplo de formato:
{
  "lunes": { "desayuno": "Avena con frutas", "comida": "Ensalada de pollo", "cena": "Sopa de verduras" },
  ...
}

No incluyas explicaciones, solo el JSON.
`;
  }

  const body = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ]
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (data.error) {
      console.error('Error de Gemini:', data.error);
      throw new Error(data.error.message || 'Error al generar el menú');
    }
    
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('Texto recibido de Gemini:', text);

    if (platoActual) {
      // Si estamos pidiendo una alternativa, devolvemos solo el texto
      return text.trim();
    }

    try {
      return JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          throw new Error('No se pudo parsear la respuesta de Gemini');
        }
      }
      throw new Error('No se encontró un JSON válido en la respuesta');
    }
  } catch (e) {
    console.error('Error en la petición a Gemini:', e);
    throw e;
  }
} 