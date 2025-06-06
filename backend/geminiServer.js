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
    const isAlternativeRequest = prompt.includes("alternativa para el siguiente plato");

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
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (isAlternativeRequest) {
      // Para alternativas, devolvemos el texto directamente
      return res.json({ menu: text.trim() });
    }

    // Para menús completos, procesamos el JSON
    const matchJsonBlock = text.match(/```json[\s\n]*([\s\S]*?)```/);
    if (matchJsonBlock) text = matchJsonBlock[1];
    let menu = null;
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        menu = JSON.parse(match[0]);
      } else {
        menu = JSON.parse(text);
      }
      // Normaliza claves a minúscula
      const normalizaMenu = (menu) => {
        const dias = Object.keys(menu);
        const nuevoMenu = {};
        for (const dia of dias) {
          const diaMin = dia.toLowerCase();
          const comidas = menu[dia];
          const nuevoComidas = {};
          for (const tipo of Object.keys(comidas)) {
            nuevoComidas[tipo.toLowerCase()] = comidas[tipo];
          }
          nuevoMenu[diaMin] = nuevoComidas;
        }
        return nuevoMenu;
      };
      menu = normalizaMenu(menu);
    } catch {
      menu = null;
    }
    if (!menu) {
      return res.status(500).json({ error: "No se pudo generar el menú con la IA. Intenta de nuevo más tarde." });
    }
    res.json({ menu });
  } catch (err) {
    return res.status(500).json({ error: "No se pudo generar el menú con la IA. Intenta de nuevo más tarde." });
  }
});

app.post("/api/receta-detalle", async (req, res) => {
  try {
    let { nombre } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Falta el nombre de la receta' });

    // Generar variantes del nombre para mayor robustez
    const removeDiacritics = (str) => str.normalize('NFD').replace(/[0-\u036f]/g, '');
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
    let intentos = 0;
    for (let intento of variantes) {
      intentos++;
      // Prompt ultra estricto
      const prompt = `Eres un chef profesional. Dame la receta detallada para preparar el siguiente plato: "${intento}".\nDevuelve SOLO un JSON válido con los siguientes campos:\n- "nombre": nombre del plato\n- "ingredientes": array de objetos con "nombre" y "cantidad" (por ejemplo: [{"nombre": "Pollo", "cantidad": "1 kg"}, ...])\n- "pasos": array de strings, cada uno es un paso de la elaboración\nNo incluyas explicaciones ni texto fuera del JSON. Si no conoces la receta, INVÉNTALA de forma realista y devuelve SIEMPRE el JSON pedido. Si devuelves texto fuera del JSON, el sistema fallará.`;
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
        let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        // Limpia si viene envuelto en markdown
        const matchJsonBlock = text.match(/```json[\s\n]*([\s\S]*?)```/);
        if (matchJsonBlock) text = matchJsonBlock[1];
        // Parsear JSON
        try {
          if (!text || text.trim() === "") {
            continue;
          }
          const matchJson = text.match(/\{[\s\S]*\}/);
          if (matchJson) {
            receta = JSON.parse(matchJson[0]);
          } else {
            receta = JSON.parse(text);
          }
          // Validar que la receta tiene los campos mínimos
          if (!receta || !receta.nombre || !receta.ingredientes || !receta.pasos) {
            receta = null;
            continue;
          }
          break; // Si se obtiene una receta válida, salir del bucle
        } catch (err) {
          errorFinal = err.message || 'Error parseando JSON';
        }
      } catch (err) {
        errorFinal = err.message || 'Error en fetch Gemini';
      }
      // Si tras 3 intentos no hay receta, simplificar aún más el nombre
      if (!receta && intentos === 3) {
        const palabras = intento.split(' ');
        if (palabras.length > 2) {
          const nombreSimple = palabras.slice(0, 2).join(' ');
          variantes.push(nombreSimple);
        }
      }
    }
    if (!receta) {
      // Último recurso: inventar una receta genérica de batido
      receta = {
        nombre: nombre,
        ingredientes: [
          { nombre: 'Bebida vegetal', cantidad: '250 ml' },
          { nombre: 'Fruta variada', cantidad: '1 unidad' },
          { nombre: 'Proteína en polvo', cantidad: '1 cacito' }
        ],
        pasos: [
          'Añadir todos los ingredientes a la batidora.',
          'Batir hasta obtener una mezcla homogénea.',
          'Servir frío.'
        ]
      };
    }
    res.json(receta);
  } catch (error) {
    res.status(500).json({ error: error.message || "Error generando receta" });
  }
});

app.post("/api/ingredientes-plato", async (req, res) => {
  try {
    const { plato } = req.body;
    if (!plato) return res.status(400).json({ error: 'Falta el nombre del plato' });
    const prompt = `Eres un nutricionista experto. Dame SOLO la lista de ingredientes necesarios para preparar el siguiente plato: "${plato}". Devuelve SOLO un array JSON de objetos, cada uno con "nombre" y "cantidad" (por ejemplo: [{"nombre": "Arroz", "cantidad": "100g"}, ...]). No incluyas explicaciones ni texto fuera del array JSON.`;
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
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    // Limpia si viene envuelto en markdown
    const matchJsonBlock = text.match(/```json[\s\n]*([\s\S]*?)```/);
    if (matchJsonBlock) text = matchJsonBlock[1];
    let ingredientes = null;
    try {
      ingredientes = JSON.parse(text);
      if (!Array.isArray(ingredientes)) {
        // Intentar extraer el array de un texto
        const match = text.match(/\[[^\]]*\]/);
        if (match) ingredientes = JSON.parse(match[0]);
      }
    } catch {
      ingredientes = null;
    }
    if (!ingredientes || !Array.isArray(ingredientes)) {
      return res.status(500).json({ error: 'No se pudieron obtener los ingredientes con la IA. Intenta de nuevo más tarde.' });
    }
    res.json({ ingredientes });
  } catch (err) {
    return res.status(500).json({ error: 'No se pudieron obtener los ingredientes con la IA. Intenta de nuevo más tarde.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor Gemini escuchando en puerto ${PORT}`)); 