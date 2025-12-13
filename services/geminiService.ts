import { GoogleGenAI } from "@google/genai";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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