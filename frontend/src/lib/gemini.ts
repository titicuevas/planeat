import type { UserProfile } from '../types/user';
import type { MenuPlan } from '../types/menu';

function generatePrompt(profile: UserProfile): string {
  return `Genera un menú semanal saludable en formato JSON para una persona con las siguientes características:
- Nombre: ${profile.name}
- Edad: ${profile.age} años
- Peso: ${profile.weight} kg
- Altura: ${profile.height} cm
- Nivel de actividad: ${profile.activityLevel}
- Objetivos: ${profile.goals.join(', ')}
- Intolerancias: ${profile.intolerances.join(', ')}
- Preferencias: ${profile.preferences.join(', ')}

El menú debe ser en formato JSON con la siguiente estructura:
{
  "semana": {
    "Lunes": {
      "desayuno": "string",
      "almuerzo": "string",
      "cena": "string",
      "snacks": ["string"]
    }
  },
  "recomendaciones": ["string"]
}

IMPORTANTE:
1. Responde SOLO con el JSON, sin texto adicional
2. Evita los alimentos que contengan las intolerancias mencionadas
3. Incluye las calorías aproximadas para cada comida
4. Asegúrate de que el JSON sea válido y esté correctamente formateado
5. Usa \`\`\`json al inicio y \`\`\` al final del JSON`;
}

export async function generateMenuWithGemini(profile: UserProfile): Promise<MenuPlan> {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('API key no configurada');
    }

    const prompt = generatePrompt(profile);
    const endpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    console.log('ENDPOINT GEMINI:', endpoint);
    console.log('PROMPT:', prompt);

    const response = await fetch(
      endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 1,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error response from Gemini:', errorData);
      throw new Error(`Error en la petición a Gemini: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('Respuesta de Gemini:', data);

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Formato de respuesta inválido de Gemini');
    }

    const menuText = data.candidates[0].content.parts[0].text;
    console.log('Texto del menú recibido:', menuText);

    // Extraer el JSON del texto de respuesta
    const jsonMatch = menuText.match(/```json\n([\s\S]*?)\n```/);
    if (!jsonMatch) {
      throw new Error('No se encontró el JSON en la respuesta');
    }

    const menuJson = jsonMatch[1];
    console.log('JSON extraído:', menuJson);

    const menu = JSON.parse(menuJson);
    return menu;
  } catch (error) {
    console.error('Error en generateMenuWithGemini:', error);
    throw error;
  }
} 