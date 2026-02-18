// services/devotionalCache.ts

type Lang = "es" | "en" | "pt";

// ✅ fecha local (no UTC) para que “1 por día” sea el día del usuario
function localDateKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function buildKey(userKey: string, lang: Lang) {
  const today = localDateKey();
  const safeUser = (userKey || "guest").trim().toLowerCase();
  return `devotional:${safeUser}:${lang}:${today}`;
}

// ✅ 1 devocional por día, por usuario, por idioma
export function getTodayDevotional(userKey: string, lang: Lang): string | null {
  try {
    return localStorage.getItem(buildKey(userKey, lang));
  } catch {
    return null;
  }
}

export function saveTodayDevotional(
  userKey: string,
  lang: Lang,
  content: string
) {
  try {
    localStorage.setItem(buildKey(userKey, lang), content);
  } catch {
    // si falla localStorage, no rompemos la app
  }
}
