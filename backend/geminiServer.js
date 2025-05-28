import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors({
  origin: 'https://planeat.up.railway.app',
  credentials: true
}));
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

app.post("/api/generate-menu", async (req, res) => {
  try {
    const { prompt } = req.body;
    const body = {
      contents: [{
        parts: [{ text: prompt }]
      }]
    };
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text || text.trim() === "") {
      return res.status(500).json({ error: "La IA no devolvió ningún menú." });
    }
    res.json({ text });
  } catch (error) {
    res.status(500).json({ error: error.message || "Error generando menú con la IA" });
  }
});

app.post("/api/receta-detalle", async (req, res) => {
  try {
    let { nombre } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Falta el nombre de la receta' });

    // Generar variantes del nombre para mayor robustez
    const removeDiacritics = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const limpiarNombre = (str) => str.replace(/con|y|de|en|el|la|los|las|un|una|unos|unas/gi, '').replace(/\s+/g, ' ').trim();
    let variantes = [
      nombre,
      removeDiacritics(nombre).toLowerCase(),
      nombre.toLowerCase(),
      limpiarNombre(nombre),
      removeDiacritics(limpiarNombre(nombre)).toLowerCase()
    ];
    let receta = null;
    let errorFinal = '';
    for (let intento of variantes) {
      const prompt = `Eres un chef profesional. Dame la receta detallada para preparar el siguiente plato: "${intento}".\nDevuelve SOLO un JSON con los siguientes campos:\n- "nombre": nombre del plato\n- "ingredientes": array de objetos con "nombre" y "cantidad" (por ejemplo: [{"nombre": "Pollo", "cantidad": "1 kg"}, ...])\n- "pasos": array de strings, cada uno es un paso de la elaboración\nNo incluyas explicaciones ni texto fuera del JSON. Si no conoces la receta, invéntala de forma realista y devuelve SIEMPRE el JSON pedido.`;
      console.log('Prompt enviado a Gemini:', prompt);
      const body = {
        contents: [{ parts: [{ text: prompt }] }]
      };
      try {
        const response = await fetch(GEMINI_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        console.log('Respuesta cruda de Gemini:', text);
        // Parsear JSON
        try {
          if (!text || text.trim() === "") {
            console.log('Gemini devolvió una respuesta vacía.');
            continue;
          }
          const matchJsonBlock = text.match(/```json[\s\n]*([\s\S]*?)```/);
          if (matchJsonBlock) {
            receta = JSON.parse(matchJsonBlock[1]);
          } else {
            const matchJson = text.match(/\{[\s\S]*\}/);
            if (matchJson) {
              receta = JSON.parse(matchJson[0]);
            } else {
              receta = JSON.parse(text);
            }
          }
          // Validar que la receta tiene los campos mínimos
          if (!receta || !receta.nombre || !receta.ingredientes || !receta.pasos) {
            console.log('La receta generada por Gemini es inválida o incompleta.');
            receta = null;
            continue;
          }
          break; // Si se obtiene una receta válida, salir del bucle
        } catch (err) {
          errorFinal = err.message || 'Error parseando JSON';
          console.log('Error parseando la respuesta de Gemini:', errorFinal);
        }
      } catch (err) {
        errorFinal = err.message || 'Error en fetch Gemini';
        console.log('Error en fetch Gemini:', errorFinal);
      }
    }
    if (!receta) {
      // Fallback: receta de ejemplo
      receta = {
        nombre: nombre,
        ingredientes: [
          { nombre: 'Ingrediente 1', cantidad: '1 unidad' },
          { nombre: 'Ingrediente 2', cantidad: '100 g' }
        ],
        pasos: [
          'Paso 1: Preparar los ingredientes.',
          'Paso 2: Cocinar según la receta.'
        ]
      };
      console.log('Usando receta de ejemplo por error de parseo o respuesta vacía.');
    }
    res.json(receta);
  } catch (error) {
    console.error('Error en /api/receta-detalle:', error);
    res.status(500).json({ error: error.message || "Error generando receta" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor Gemini escuchando en puerto ${PORT}`)); 