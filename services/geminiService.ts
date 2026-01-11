import { GoogleGenAI } from "@google/genai";

// ✅ En Vite se usa import.meta.env
const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;

if (!apiKey) {
  console.warn("Falta VITE_GEMINI_API_KEY en .env.local");
}

const ai = new GoogleGenAI({ apiKey });



export const generateDevotional = async (verseText: string, verseRef: string): Promise<string> => {
  try {
    const prompt = `Escribe un devocional corto y profundo para el día de hoy, basado en el versículo: "${verseText}" (${verseRef}). Enfócate en la aplicación práctica y espiritual.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "No se pudo generar el devocional.";
  } catch (error) {
    console.error("Error generating devotional:", error);
    return "Hubo un error al contactar a la IA. Por favor, verifica tu conexión.";
  }
};

export const generateDefinition = async (term: string): Promise<string> => {
  try {
    const prompt = `Define la palabra bíblica "${term}" con un enfoque teológico y etimológico si es relevante. Sé conciso pero profundo.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "No se pudo encontrar la definición.";
  } catch (error) {
    console.error("Error generating definition:", error);
    return "Error al buscar la definición.";
  }
};

export const analyzePassage = async (type: 'exegesis' | 'application' | 'related' | 'prayer', context: string): Promise<string> => {
  try {
    let prompt = "";
    if (type === 'exegesis') prompt = `Realiza una exégesis concisa del pasaje ${context}. Explica el contexto histórico y el significado original.`;
    if (type === 'application') prompt = `Basado en una correcta hermenéutica, ¿cómo podemos aplicar el pasaje ${context} hoy en día de manera práctica? Dame 3 puntos clave.`;
    if (type === 'related') prompt = `Sugiere 3 a 5 versículos o pasajes relacionados con el tema principal de ${context}, explicando brevemente la conexión teológica.`;
    if (type === 'prayer') prompt = `Escribe una oración personal, profunda y reverente, inspirada en las verdades del pasaje ${context}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "No se pudo generar el análisis.";
  } catch (error) {
    console.error("Error analyzing passage:", error);
    return "Hubo un error al procesar la solicitud.";
  }
};

export const summarizeSermon = async (title: string, notes: string, verses: string): Promise<string> => {
  try {
    const prompt = `Actúa como un editor experto en homilética. Resume el siguiente bosquejo de sermón en 3 puntos principales claros y una frase de conclusión impactante.
    
    Título: ${title}
    Versículos: ${verses}
    Notas: ${notes}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "No se pudo generar el resumen.";
  } catch (error) {
    console.error("Error summarizing sermon:", error);
    return "Hubo un error al generar el resumen.";
  }
};
// --- Gemini cooldown (global) ---
// Si Gemini responde 429, pausamos llamadas por un rato para evitar spam.
let geminiCooldownUntil = 0; // timestamp ms
const GEMINI_COOLDOWN_MS = 90_000; // 90s (ajustable)

function getGeminiCooldownRemainingMs() {
  const remaining = geminiCooldownUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}

function activateGeminiCooldown(ms = GEMINI_COOLDOWN_MS) {
  geminiCooldownUntil = Math.max(geminiCooldownUntil, Date.now() + ms);
}


function isGemini429(error: unknown) {
  const msg = String((error as any)?.message ?? error ?? "");
  return msg.includes("429") || msg.toLowerCase().includes("too many requests");
}

export const defineWordEs = async (
  term: string,
  lang: "es" | "pt" = "es"
): Promise<string> => {
  const clean = term.trim();
  if (!clean) return lang === "pt" ? "Escreva uma palavra." : "Escribe una palabra.";

  // ✅ Si hay cooldown, NO llamamos a Gemini
  const remaining = getGeminiCooldownRemainingMs();
  if (remaining > 0) {
    const seconds = Math.ceil(remaining / 1000);
    return lang === "pt"
      ? `Limite do Gemini atingido. Tente novamente em ${seconds}s.`
      : `Límite de Gemini alcanzado. Intenta de nuevo en ${seconds}s.`;
  }

  const prompt =
    lang === "pt"
      ? `Defina a palavra "${clean}" em português, de forma clara e curta.\n` +
        `Devolva:\n` +
        `1) Classe gramatical (substantivo/verbo/etc.) se aplicável\n` +
        `2) Definição em 1-2 linhas\n` +
        `3) Um exemplo curto\n` +
        `Não traduza para o inglês.`
      : `Define la palabra "${clean}" en español, de forma clara y corta.\n` +
        `Devuelve:\n` +
        `1) Tipo (sustantivo/verbo/etc.) si aplica\n` +
        `2) Definición en 1-2 líneas\n` +
        `3) Un ejemplo corto\n` +
        `No traduzcas al inglés.`;

  try {
    const resp = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return (
      resp.text ||
      (lang === "pt" ? "Não consegui gerar a definição." : "No pude generar la definición.")
    );
  } catch (error) {
    // ✅ Si es 429, activamos cooldown
    if (isGemini429(error)) {
      activateGeminiCooldown();
      return lang === "pt"
        ? "Limite do Gemini atingido (429). Aguarde 1–2 minutos e tente novamente."
        : "Límite de Gemini alcanzado (429). Espera 1–2 minutos e intenta de nuevo.";
    }

    console.error("Gemini defineWordEs error:", error);
    return lang === "pt"
      ? "Erro ao buscar definição."
      : "Error al buscar la definición.";
  }
};

