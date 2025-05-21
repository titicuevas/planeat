import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
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
    res.json({ text });
  } catch (error) {
    res.status(500).json({ error: error.message || "Error generando menú" });
  }
});

app.post("/api/receta-detalle", async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Falta el nombre de la receta' });
    const prompt = `Eres un chef profesional. Dame la receta detallada para preparar el siguiente plato: "${nombre}".\nDevuelve SOLO un JSON con los siguientes campos:\n- "nombre": nombre del plato\n- "ingredientes": array de objetos con "nombre" y "cantidad" (por ejemplo: [{"nombre": "Pollo", "cantidad": "1 kg"}, ...])\n- "pasos": array de strings, cada uno es un paso de la elaboración\nNo incluyas explicaciones ni texto fuera del JSON. Si no conoces la receta, invéntala de forma realista y devuelve SIEMPRE el JSON pedido.`;
    console.log('Prompt enviado a Gemini:', prompt);
    const body = {
      contents: [{ parts: [{ text: prompt }] }]
    };
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log('Respuesta cruda de Gemini:', text);
    let receta;
    try {
      // Si la IA responde con un bloque markdown
      const matchJsonBlock = text.match(/```json[\s\n]*([\s\S]*?)```/);
      if (matchJsonBlock) {
        receta = JSON.parse(matchJsonBlock[1]);
      } else {
        // Buscar el primer bloque JSON en el texto
        const matchJson = text.match(/\{[\s\S]*\}/);
        if (matchJson) {
          receta = JSON.parse(matchJson[0]);
        } else {
          receta = JSON.parse(text);
        }
      }
    } catch (err) {
      console.error('Error parseando la respuesta de Gemini:', err);
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
      console.log('Usando receta de ejemplo por error de parseo.');
    }
    res.json(receta);
  } catch (error) {
    console.error('Error en /api/receta-detalle:', error);
    res.status(500).json({ error: error.message || "Error generando receta" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor Gemini escuchando en puerto ${PORT}`)); 