// src/services/dateUtils.ts

/** Devuelve YYYY-MM-DD en tu hora local (NO UTC) */
export function getLocalYMD(date: Date = new Date()): string {
  const offset = date.getTimezoneOffset(); // minutos
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

/**
 * Normaliza cualquier fecha guardada (ISO, Date, string raro) a YYYY-MM-DD local.
 * - Si ya viene "YYYY-MM-DD" lo deja igual.
 * - Si viene ISO tipo "2025-12-21T04:00:00.000Z" lo convierte a tu día local.
 */
export function normalizeToLocalYMD(input: unknown): string {
  if (!input) return getLocalYMD();

  if (typeof input === "string") {
    // ya está en formato correcto
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;

    const d = new Date(input);
    if (!isNaN(d.getTime())) return getLocalYMD(d);

    return getLocalYMD();
  }

  if (input instanceof Date) return getLocalYMD(input);

  // si viene number timestamp
  if (typeof input === "number") {
    const d = new Date(input);
    if (!isNaN(d.getTime())) return getLocalYMD(d);
  }

  return getLocalYMD();
}

/** Para mostrar bonito sin desfase (evita que JS lo trate como UTC) */
export function formatYMDForUI(ymd: string, locale = "es-US"): string {
  // IMPORTANTE: usar T00:00:00 para que lo interprete como hora local
  const d = new Date(`${ymd}T00:00:00`);
  if (isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString(locale);
}
