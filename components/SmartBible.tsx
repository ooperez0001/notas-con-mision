import React, { useState, useEffect, useRef } from "react";


import { Search, Sparkles, Lock } from 'lucide-react';
import { fetchVerseFromAPI, searchByKeyword, getVersionsByLanguage } from '../services/bibleService';
import { analyzePassage } from '../services/geminiService';
import { BibleSearchResult, KeywordResult, BibleVerse, UserProfile, Language } from '../types';
import { AIAccordion } from './AIAccordion';
import { BibleDictionary } from './BibleDictionary';
import { translations } from '../services/translations';
import SmartDictionary from "./SmartDictionary";


interface SmartBibleProps {
  user?: UserProfile;
  onOpenPremium?: () => void;
  language: Language;
}

export const SmartBible: React.FC<SmartBibleProps> = ({ user, onOpenPremium, language }) => {
  const [query, setQuery] = useState("");
const [selectedVersion, setSelectedVersion] = useState<string>(() => {
  const list = getVersionsByLanguage(language);
  return list?.[0] || "RVR60";
});

// para refrescar cuando cambie el idioma
useEffect(() => {
  const list = getVersionsByLanguage(language);
  setSelectedVersion(list?.[0] || "RVR60");
}, [language]);

  const [verseData, setVerseData] = useState<BibleSearchResult | null>(null);
  const [keywordResults, setKeywordResults] = useState<KeywordResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const t = translations[language];
  const tt = (key: keyof typeof t) => t[key] ?? key;
const inputRef = useRef<HTMLInputElement | null>(null);
const searchAreaRef = useRef<HTMLDivElement | null>(null);

 const [suggestions, setSuggestions] = useState<{ ref: string; text: string }[]>([]);

const [showSuggestions, setShowSuggestions] = useState(false);
// ✅ Clon Pasajes Clave (Nuevo Sermón)
const [keepOpen, setKeepOpen] = useState(false);
const [isSearchingSuggestions, setSearchingSuggestions] = useState(false);
const suggestionsTimerRef = useRef<number | null>(null);

// Estructura real: lista de sugerencias por versión
// (igual que versionSuggestions en SermonEditor)
const [versionSuggestions, setVersionSuggestions] = useState<any[]>([]);

// Pasajes seleccionados (caja verde)
const [selectedPassages, setSelectedPassages] = useState<any[]>([]);


  
  // AI State
  const [aiContent, setAiContent] = useState<{[key: string]: string}>({});
  const [openAIAccordions, setOpenAIAccordions] = useState<{[key: string]: boolean}>({});
  const [loadingAITab, setLoadingAITab] = useState<string | null>(null);
 type SavedWord = {
  term: string;
  definition: string;
  createdAt: string;
};

const [studyWords, setStudyWords] = useState<SavedWord[]>([]);




  const performSearch = async (searchTerm: string, versionOverride?: string) => {
  if (!searchTerm) return;

  const versionToUse = versionOverride || selectedVersion;

  setLoading(true);
  setOpenAIAccordions({});
  setAiContent({});
  setVerseData(null);
  setKeywordResults([]);
  setHasSearched(true);

  const referenceData = await fetchVerseFromAPI(searchTerm, versionToUse);

  if (referenceData) {
    setVerseData(referenceData);
  } else {
    const keywordData = await searchByKeyword(searchTerm /* luego ajustamos para versión */);
    setKeywordResults(keywordData);
  }

  setLoading(false);
};

  const handleAITabClick = async (tab: string) => {
    // Check Premium
    if (user && !user.isPremium && onOpenPremium) {
        onOpenPremium();
        return;
    }

    const isOpening = !openAIAccordions[tab];
    setOpenAIAccordions(prev => ({ ...prev, [tab]: isOpening }));
    
    if (isOpening && !aiContent[tab]) {
      setLoadingAITab(tab);
      const context = verseData ? verseData.ref : query;
      // @ts-ignore
      const result = await analyzePassage(tab, context);
      
      setAiContent(prev => ({ ...prev, [tab]: result }));
      setLoadingAITab(null);
    }
  };

  const renderAccordionTitle = (title: string) => {
      if (user?.isPremium) return title;
      return (
          <div className="flex items-center gap-2">
              <span>{title}</span>
              <Lock size={14} className="text-yellow-500" />
          </div>
      );
  };
  const handleSmartBibleChange = (value: string) => {
  setQuery(value);

  // Si está vacío → limpiar y salir
  if (!value.trim()) {
    setShowSuggestions(false);
    setVersionSuggestions([]);
    return;
  }

  // Requiere al menos un número (ej: "Juan 3")
  const hasNumber = /\d/.test(value);
  if (!hasNumber) {
    setShowSuggestions(false);
    setVersionSuggestions([]);
    return;
  }

  // Mostrar sugerencias y disparar búsqueda con debounce
  setShowSuggestions(true);
  scheduleSuggestionsSearch(value);
};

const handleAddFromInput = async () => {
  const value = query.trim();
  if (!value || loading) return;

  const versionToUse = selectedVersion || "RVR60";

  // Si viene como versículo (tiene ":") => añadir directo a la caja verde
  const isVerse = value.includes(":");

  if (isVerse) {
    try {
      const referenceData = await fetchVerseFromAPI(value, versionToUse);


      // Normalizamos el texto del versículo
     const v: any = referenceData;

const versionKey = (versionToUse || "RVR60") as string;

const versesForVersion =
  v?.versions?.[versionKey] ||
  v?.versions?.[versionKey.toLowerCase()] ||
  v?.versions?.[Object.keys(v?.versions || {})[0]];

const arr = Array.isArray(versesForVersion)
  ? versesForVersion
  : Array.isArray(versesForVersion?.verses)
  ? versesForVersion.verses
  : Array.isArray(versesForVersion?.data?.verses)
  ? versesForVersion.data.verses
  : [];

const requestedNum = Number(value.split(":")[1]);
const match = arr.find((x: any) => Number(x?.number ?? x?.verse) === requestedNum);
const first = match || arr[0] || {};

const baseText = first?.text ?? first?.verse ?? first?.content ?? "";
const verseNumber = first?.number ?? first?.verse ?? requestedNum;

const text = baseText
  ? `${verseNumber}. ${baseText}`
  : "";



      const item = {
       ref: normalizeReferenceTitle(value),
reference: normalizeReferenceTitle(value),

        version: versionToUse,
        text,
      };

      setSelectedPassages((prev: any[]) => {
        const exists = prev.some(
          (p) =>
            (p.ref || p.reference) === value &&
            (p.version || p.translation) === versionToUse
        );
        return exists ? prev : [...prev, item];
      });

      // Si NO está en modo múltiple, limpiamos y cerramos sugerencias
      if (!keepOpen) {
        setShowSuggestions(false);
        setQuery("");
      } else {
        // si está en múltiple, mantenemos como base el capítulo ("juan 3")
        const base = value.split(":")[0];
        setQuery(base);
        setShowSuggestions(true);
      }
    } catch (e) {
      // si falla el fetch, igual abrimos sugerencias para que el usuario elija
      setShowSuggestions(true);
      scheduleSuggestionsSearch(value);
    }

    return;
  }

 // Si es capítulo (ej "juan 3") -> si ya hay sugerencias, añadir capítulo completo
setShowSuggestions(true);

// 1) Si aún no hay sugerencias cargadas, solo las buscamos y salimos
if (!chapterSuggestions || chapterSuggestions.length === 0) {
  scheduleSuggestionsSearch(value);
  return;
}

// 2) Elegimos la sugerencia que coincida con la versión seleccionada (si existe)
const picked =
  chapterSuggestions.find((s: any) => (s.version || selectedVersion || "RVR60") === (selectedVersion || "RVR60")) ||
  chapterSuggestions[0];

// 3) Armamos el texto completo del capítulo desde los versículos que ya se muestran
const versesArray = Array.isArray(picked?.verses) ? picked.verses : [];
const fullText = versesArray
  .map((v: any, idx: number) => {
    const n = v?.number ?? v?.verse ?? idx + 1;
    const tx = v?.text ?? v?.verse ?? v?.content ?? "";
    return `${n}. ${tx}`.trim();
  })
  .filter(Boolean)
  .join("\n");

// 4) Agregamos a la caja verde (selectedPassages) igual que cuando es versículo

setSelectedPassages((prev: any[]) => {
  const exists = prev.some(
    (p: any) =>
      (p.ref || p.reference) === value &&
      (p.version || p.translation) === versionToUse
  );
  if (exists) return prev;

  return [
    ...prev,
    {
     ref: normalizeReferenceTitle(value),
reference: normalizeReferenceTitle(value),

      version: versionToUse,
      translation: versionToUse, // por si en otros lados usas translation
      text: fullText || "(Sin texto disponible)",
    },
  ];
});

// 5) Comportamiento igual que en Nuevo Sermón
if (!keepOpen) {
  setShowSuggestions(false);
  setQuery("");
} else {
  // mantenemos "juan 3" como base si está en modo múltiple
  setQuery(value.split(":")[0]);
  setShowSuggestions(true);
}

};


  // --- Utilidades para copiar versículos ---
// Este tipo acepta cualquier forma que use tu API para el versículo
type AnyVerse = {
  reference?: string;   // "Juan 3:16"
  ref?: string;         // a veces la API usa "ref"
  version?: string;
  translation?: string;
  text?: string;        // texto del versículo
  verse?: string;       // algunos endpoints usan "verse"
  content?: string;     // o "content"
};
const normalizeReferenceTitle = (ref: string) => {
  const s = (ref || "").trim();
  if (!s) return s;
  // Primera letra en mayúscula, el resto igual
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Utilidad para dar formato correcto al versículo
const formatVerse = (verse: any) => {
  const reference = verse.ref || verse.reference || "";
  const text = verse.text || verse.verse || verse.content || "";

  if (!reference && !text) return "";

  // Capitalizar referencia: Juan 3:16 → Juan 3:16
  const capitalizedRef =
    reference.charAt(0).toUpperCase() + reference.slice(1);

  return text ? `${capitalizedRef} — ${text}` : capitalizedRef;
};

// Copiar versículo al portapapeles
const handleCopyVerse = async (verse: any) => {
  const formatted = formatVerse(verse);
  if (!formatted) return;

  try {
    await navigator.clipboard.writeText(formatted);
    
  } catch (error) {
    console.error("Error al copiar el versículo", error);
  }
};
const handleQueryChange = (value: string) => {
  setQuery(value);

  const v = value.trim();

  // si está vacío, ocultamos sugerencias
  if (!v) {
    setShowSuggestions(false);
    setVersionSuggestions([]);
    return;
  }

  // Mostrar caja cuando hay texto
  setShowSuggestions(true);

  // Igual que Nuevo Sermón: no buscamos hasta que haya un número
  const hasNumber = /\d/.test(v);
  if (!hasNumber) {
    setVersionSuggestions([]);
    return;
  }

  // Motor real (debounce + API + armado de versículos)
  scheduleSuggestionsSearch(v);
};


 <div className="mt-2 flex flex-wrap gap-2">
  {getVersionsByLanguage(language).map((v) => (
    <button
      key={v}
      type="button"
      onClick={() => setSelectedVersion(v)}
      className={
        "px-3 py-1 rounded-full border text-xs font-semibold transition " +
        (selectedVersion === v
          ? "border-blue-600 text-blue-700 bg-blue-50"
          : "border-gray-300 text-gray-600 hover:border-blue-300")
      }
      aria-label={t[`version_${v}`] ?? v}
      title={t[`version_${v}`] ?? v}
    >
      {t[`version_${v}`] ?? v}
    </button>
  ))}
</div>
const normalizeVersion = (v: string) => (v || "").trim().toUpperCase();


const scheduleSuggestionsSearch = (value: string) => {
    // limpiamos timer anterior
    if (suggestionsTimerRef.current) {
      window.clearTimeout(suggestionsTimerRef.current);
    }


    suggestionsTimerRef.current = window.setTimeout(async () => {
      try {
      setSearchingSuggestions(true);

        const result = await fetchVerseFromAPI(value);


        // ✅ Normalizamos formatos: puede venir como {versions:{...}} o como {verses:[...]}
        const ref = (result?.ref || value).trim();


        // intenta tomar "versions" si existe
        // intenta tomar "versions" venga donde venga (result.versions, result.data.versions, etc.)
        const rawVersions =
          (result as any)?.versions ??
          (result as any)?.data?.versions ??
          (result as any)?.data?.results?.versions ??
          (result as any)?.results?.versions ??
          null;


        const versionsFromApi =
          rawVersions &&
          typeof rawVersions === "object" &&
          !Array.isArray(rawVersions)
            ? rawVersions
            : null;


        // si NO viene versions, intenta tomar un array de versos directo
        const versesArray = Array.isArray((result as any)?.verses)
          ? (result as any).verses
          : Array.isArray((result as any)?.data?.verses)
          ? (result as any).data.verses
          : null;

        // construimos un objeto versions sí o sí
      const allowed = getVersionsByLanguage(language).map(normalizeVersion);
const preferredNorm = normalizeVersion(selectedVersion);



const fallbackVersion =
  (allowed.includes(preferredNorm) ? preferredNorm : allowed[0]) ||
  preferredNorm ||
  "RVR60";

const versionsObj =
  versionsFromApi ??
  (versesArray
    ? { [fallbackVersion]: versesArray }
    : null);

        if (!versionsObj) {
          setVersionSuggestions([]);
          return;
        }

       // setLastChapterRef(ref);
// setAvailableVersionKeys(Object.keys(versionsObj).map(normalizeVersion));

        setSelectedVersion((prev) => {
  const keysUpper = Object.keys(versionsObj).map(normalizeVersion);


  // 1) Si PT y existe ARC, ese es el default
  if (language === "pt" && keysUpper.includes("ARC")) return "ARC";


  // 2) Si ya había una selección válida, respétala
  const prevUp = String(prev || "").toUpperCase();
  if (prevUp && keysUpper.includes(prevUp)) return prevUp;


  // 3) Si no, usa preferredVersion si existe en keys; si no, la primera
  const prefUp = normalizeVersion(selectedVersion);

  if (prefUp && keysUpper.includes(prefUp)) return prefUp;


  return keysUpper[0] || prevUp || "ARC";
});

        // ✅ Default de versión por idioma (sin pisar selección manual)
const normalizedKeys = Object.keys(versionsObj).map(normalizeVersion);


const defaultByLanguage =
  language === "pt" && normalizedKeys.includes("ARC")
    ? "ARC"
    : normalizeVersion(getVersionsByLanguage(language)[0] || normalizedKeys[0] || "");


// Si aún no hay selección válida, ponemos default
setSelectedVersion((prev) => {
  const prevNorm = normalizeVersion(prev || "");
  if (prevNorm && normalizedKeys.includes(prevNorm)) return prevNorm;
  return defaultByLanguage;
});

        // ✅ usamos versionsObj (no result.versions) para asegurar que vienen todas las versiones
     // Fuente única (constitución): versiones por idioma
const allowedVersions = getVersionsByLanguage(language);


const allowedNormalized = allowedVersions.map(normalizeVersion);


// ✅ versión que debe mostrar el preview (aunque no venga en versionsObj)
const activePreviewVersion = normalizeVersion(
  selectedVersion || selectedVersion || "RVR60"
);


// ✅ versiones para los botones del preview (incluye la activa siempre)
const previewVersions = Array.from(
  new Set([activePreviewVersion, ...normalizedKeys])
).filter((v) => allowedNormalized.includes(v));


        // IMPORTANTE: usar versionsObj (no result.versions)
        const suggestions = Object.entries(versionsObj)
          .filter(([versionKey]) => {
            const vk = normalizeVersion(String(versionKey));
            return (
              allowedNormalized.length === 0 || allowedNormalized.includes(vk)
            );
          })
          .map(([versionKey, verses]) => {
            // soporta: array directo, {verses:[]}, {data:{verses:[]}}
            const pickVersesArray = (v: any) => {
              // 1) Si ya es array, perfecto
              if (Array.isArray(v)) return v;


              // 2) Probar rutas comunes a arrays
              const candidates = [
                v?.verses,
                v?.data?.verses,
                v?.chapter?.verses,
                v?.data?.chapter?.verses,
                v?.results?.verses,
                v?.data?.results?.verses,
                v?.chapter,
                v?.data?.chapter,
              ];


              for (const c of candidates) {
                if (Array.isArray(c)) return c;
              }


              // 3) Si viene como objeto { "1": "texto", "2": "texto" ... } lo convertimos a array
              const objCandidates = [
                v?.verses,
                v?.data?.verses,
                v?.chapter?.verses,
                v?.data?.chapter?.verses,
                v, // a veces el root ya es el mapa
              ];


              for (const o of objCandidates) {
                if (o && typeof o === "object" && !Array.isArray(o)) {
                  const keys = Object.keys(o).filter((k) => /^\d+$/.test(k));
                  if (keys.length) {
                    return keys
                      .sort((a, b) => Number(a) - Number(b))
                      .map((k) => ({ v: Number(k), text: o[k] }));
                  }
                }
              }


              return [];
            };


            const arr = pickVersesArray(verses);


            // Si la API no trajo texto para esa versión, igual la mostramos como opción
            if (arr.length === 0) {
              return {
                id: `${ref}-${versionKey}`,
                reference: ref,
                version: String(versionKey),
                text: "",
                verses: [],
                isJesusWords: false,
              };
            }


            const fullText = arr
              .map((v: any) => {
                const num = v.number ?? v.verse ?? v.num ?? "";
                const txt = v.text ?? v.content ?? v.verseText ?? "";
                return `${num ? num + ". " : ""}${String(txt).trim()}`;
              })
              .filter(Boolean)
              .join("\n");


            return {
              id: `${ref}-${versionKey}`,
              reference: ref,
              version: String(versionKey),
              text: fullText,
              verses: arr,
              isJesusWords: false,
            };
          })


          .filter(Boolean) as any[];


        // poner la preferida arriba
     suggestions.sort((a, b) =>
  a.version === selectedVersion
    ? -1
    : b.version === selectedVersion
    ? 1
    : 0
);

        setVersionSuggestions(suggestions);
      } catch (e) {
        console.error("[SUGGEST] scheduleSuggestionsSearch error:", e);
        setVersionSuggestions([]);
      } finally {
        setSearchingSuggestions(false);

      }
    }, 350);
  };

const chapterSuggestions = versionSuggestions.filter(
  (s) =>
    (s.text && s.text.trim().length > 0) ||
    (s.verses && s.verses.length > 0)
);

const verseOnlySuggestions = versionSuggestions.filter(
  (s) =>
    (!s.text || s.text.trim().length === 0) &&
    (!s.verses || s.verses.length === 0)
);


  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{t.bible_title}</h1>
      
      <div ref={searchAreaRef}>

    

 {/* Barra de búsqueda de pasaje (igual a SermonEditor) */}
<div className="flex items-center gap-2">
  <input
    ref={inputRef}
    type="text"
    value={query}
      onChange={(e) => handleSmartBibleChange(e.target.value)}
    onFocus={() => setShowSuggestions(true)}
    onBlur={() => {
  window.setTimeout(() => {
    const active = document.activeElement as HTMLElement | null;
    if (active && searchAreaRef.current?.contains(active)) return; // seguimos dentro
    setShowSuggestions(false);
  }, 150);
}}

    onKeyDown={(e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    if (!loading && query.trim()) handleAddFromInput();
  }
}}

   placeholder={t.bible_search_ph}

    className="flex-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  />

  <button
    type="button"
    onClick={handleAddFromInput}

    disabled={loading || !query.trim()}
    className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-white ${
      loading || !query.trim()
        ? "bg-gray-300 cursor-not-allowed"
        : "bg-blue-600 hover:bg-blue-700"
    }`}
  >
    {loading ? t.adding : t.add}


  </button>
</div>
<div className="mt-2">
  <label className="flex items-center gap-2 text-sm text-gray-600 select-none">
    <input
      type="checkbox"
      checked={keepOpen}
      onChange={(e) => setKeepOpen(e.target.checked)}
    />
    {t.keep_list_open}

    {keepOpen && (
      <span className="ml-2 rounded-full px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700">
        {t.multi_mode_active}
      </span>
    )}
  </label>

  <div className="mt-1 text-xs text-gray-500">
    {keepOpen ? t.tip_keep_open_on : t.tip_keep_open_off}
  </div>
</div>



 {showSuggestions && versionSuggestions.length > 0 && (
  <div
    className={`mt-2 rounded-xl bg-white dark:bg-gray-800 shadow-sm max-h-[320px] overflow-y-auto border ${
      keepOpen
        ? "border-blue-500 ring-1 ring-blue-200"
        : "border-gray-200 dark:border-gray-700"
    }`}
  >
    {keepOpen && (
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 px-3 py-2 text-xs text-gray-600">
        {t["open_list_multiple"]}
      </div>
    )}

    <div className="px-3 py-2 border-b last:border-b-0">
      {chapterSuggestions.map((s) => (
        <div key={`${s.reference}-${(s as any).version || ""}`} className="mb-3">
          {/* Encabezado */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-blue-700 dark:text-blue-400">
              {s.reference}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-gray-300 text-gray-600">
              {(s as any).version || selectedVersion || "RVR60"}
            </span>
          </div>

          {/* Versículos del capítulo (clickeables) */}
<div className="mt-2 space-y-1 text-xs text-gray-700">
  {(Array.isArray(s.verses) ? s.verses : []).map((v: any, idx: number) => {
    const verseNumber = v.number ?? v.verse ?? v.num ?? idx + 1;
    const verseText = v.text ?? v.verse ?? v.content ?? "";

    return (
      <div
        key={`${s.reference}-${verseNumber}`}
        className="leading-relaxed cursor-pointer hover:bg-blue-100 rounded px-1"
        onMouseDown={(e) => {
          // evita que el input haga blur antes del click
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();

          // arma "juan 3:5" desde "juan 3"
          const baseRef = String(s.reference).replace(/:\d+$/, "");
          const verseRef = `${baseRef}:${verseNumber}`;

          if (keepOpen) {
            // dejamos lista abierta y mantenemos el capítulo como base
            setQuery(`${baseRef}`);
            setShowSuggestions(true);
          } else {
            setShowSuggestions(false);
            setQuery("");
          }

          setSelectedPassages((prev) => {
  const exists = prev.some((p: any) =>
    String((p?.reference ?? p)).toLowerCase() === verseRef.toLowerCase()
  );
  if (exists) return prev;

  return [
    ...prev,
    {
      reference: verseRef,
      version: (s as any).version || selectedVersion || "RVR60",
      text: verseText,
    },
  ];
});


        }}
        title={`Añadir ${String(s.reference).replace(/:\d+$/, "")}:${verseNumber}`}
      >
        <strong>{verseNumber}.</strong> {verseText}
      </div>
    );
    
  })}
</div>
{/* Chips de versiones */}
<div className="mt-3 flex flex-wrap gap-2">
  {getVersionsByLanguage(language).map((version) => (
    <button
      key={version}
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedVersion(version);
        if (query.trim()) {
          performSearch(query, version);
        }
      }}
      className={`px-3 py-1 rounded-full text-xs border transition ${
        selectedVersion === version
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
      }`}
    >
      {version}
    </button>
  ))}
</div>

        
        </div>
      ))}
    </div>
  </div>
)}

      </div>
      
{selectedPassages.length > 0 && (
  <div className="mt-4 rounded-xl border border-green-300 bg-green-50 dark:bg-green-900/20 p-3 space-y-3">
    
    <div className="flex items-center justify-between">
      <div className="font-semibold text-green-800 dark:text-green-300">
        📗 Estudio actual
      </div>

      <button
        type="button"
        onClick={() => {
          setSelectedPassages([]);
          setStudyWords([]);
          setQuery("");
          setShowSuggestions(false);
          setSuggestions([]);
          setVersionSuggestions([]);
        }}
        className="text-xs px-3 py-1 rounded-lg border border-green-300 bg-white hover:bg-green-100"
        title="Limpiar pasajes y términos del estudio"
      >
        🧹 Nuevo estudio
      </button>
    </div>
    
    {selectedPassages.map((p, idx) => (
      <div
        key={`${p.id}-${idx}`}
        className="rounded-lg bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700 p-3"
      >
        {/* encabezado */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="font-semibold text-green-700 dark:text-green-400">
            {p.reference} · {p.version}
          </div>

          <div className="flex gap-2">
            {/* Copiar */}
            <button
             className="text-xs text-blue-600 hover:underline inline-flex items-center"
aria-label={t["copy"]}
title={t["copy"]}

              onClick={() => {
                const textToCopy = `${p.reference} (${p.version})\n${p.text}`;
                navigator.clipboard.writeText(textToCopy);
              }}
            >
              <span className="flex items-center gap-1">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-4 h-4"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
  <span>{t["copy"]}</span>
</span>

            </button>

            {/* Eliminar */}
            <button
              className="text-xs text-red-600 hover:underline"
             aria-label={t["delete"] ?? "Eliminar"}
title={t["delete"] ?? "Eliminar"}


              onClick={() => {
                setSelectedPassages((prev) =>
                  prev.filter((_, i) => i !== idx)
                );
              }}
            >
              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-4 h-4"
                              >
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="M6 6l1 16h10l1-16" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                              </svg>
            </button>
          </div>
        </div>

        {/* texto */}
        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
          {p.text}
        </div>
      </div>
    ))}
  </div>
)}
      {loading && (
          <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
      )}
   
     {false && verseData && !loading && (

        <div className="space-y-8 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-6 border-b border-gray-100 dark:border-gray-700 pb-2">{verseData.ref}</h2>
            

            {Object.entries(verseData.versions)
                .filter(([version]) => getVersionsByLanguage(language).includes(version))
                .map(([version, verses]) => {
                const versesList = verses as BibleVerse[];
                if (versesList.length === 0) return null;
                const fullText = versesList
  .map((v) => `${v.number}. ${v.text}`)
  .join(" ");

                return (
                <div key={version} className="mb-6 last:mb-0">
                    <p className="font-bold text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 inline-block px-2 py-1 rounded mb-2">{version}</p>
                    {/* 🔵 BOTÓN COPIAR PARA ESTA VERSIÓN */}
    <button
      type="button"
      onClick={() =>
        handleCopyVerse({
          ref: `${verseData.ref} (${version})`,
          text: fullText,
        })
      }
      className="mt-2 mb-3 px-3 py-1 text-xs rounded-md border border-blue-500 text-blue-600 hover:bg-blue-50"
    >
      Copiar versículo
    </button>

    {/* Lista de versículos */}
                    <div className="text-gray-800 dark:text-gray-200 leading-relaxed space-y-2">
                        {versesList.map(v => (
                            <span key={v.number} className={v.isJesusWords ? 'text-red-700 dark:text-red-400 block' : 'block'}>
                                <strong className="pr-2 text-blue-300 dark:text-blue-500 text-sm font-bold align-top">{v.number}</strong>
                                {v.text}
                            </span>
                        ))}
                    </div>
                </div>
            )})}
          </div>  
                  </div>
      )}

      {keywordResults.length > 0 && !loading && (
        <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{t.results_for} "{query}"</h2>
            {keywordResults.map((verse, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700 transition-colors">
                    <p className="font-bold text-blue-600 dark:text-blue-400 mb-1">{verse.ref}</p>
                    <p className={verse.isJesusWords ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}>{verse.text}</p>
                  {/* 🔵 BOTÓN DE COPIAR PARA RESULTADOS POR PALABRA */}
    <button
      type="button"
      onClick={() => handleCopyVerse(verse)}
      className="mt-2 px-3 py-1 text-xs rounded-md border border-blue-500 text-blue-600 hover:bg-blue-50"
    >
      Copiar versículo
    </button>  
                </div>
            ))}
        </div>
      )}

<SmartDictionary
  language={language}
  savedWords={studyWords}
  setSavedWords={setStudyWords}
  storageKey="ncm_saved_words_smartbible"
  variant="bar"
  mode="sermon"
    isPremium={!!user?.isPremium}
  onOpenPremium={onOpenPremium}
      

/>

          
          <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    <Sparkles size={20} className="text-purple-500" /> 
                    {t.ai_analysis}
                </h3>
                {!user?.isPremium && (
                    <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded-full font-bold border border-yellow-200 dark:border-yellow-900">
                        {t.premium_badge} 
                    </span>
                )}
            </div>
            <div className="space-y-3">
              {/* @ts-ignore */}
              <AIAccordion title={renderAccordionTitle(t.analysis_exegesis)} content={aiContent.exegesis} isLoading={loadingAITab === 'exegesis'} isOpen={!!openAIAccordions.exegesis} onClick={() => handleAITabClick('exegesis')} />
              {/* @ts-ignore */}
              <AIAccordion title={renderAccordionTitle(t.analysis_app)} content={aiContent.application} isLoading={loadingAITab === 'application'} isOpen={!!openAIAccordions.application} onClick={() => handleAITabClick('application')} />
              {/* @ts-ignore */}
              <AIAccordion title={renderAccordionTitle(t.analysis_related)} content={aiContent.related} isLoading={loadingAITab === 'related'} isOpen={!!openAIAccordions.related} onClick={() => handleAITabClick('related')} />
              {/* @ts-ignore */}
              <AIAccordion title={renderAccordionTitle(t.analysis_prayer)} content={aiContent.prayer} isLoading={loadingAITab === 'prayer'} isOpen={!!openAIAccordions.prayer} onClick={() => handleAITabClick('prayer')} />
            </div>
          </div>

      {!loading && !verseData && keywordResults.length === 0 && hasSearched && (
          <div className="text-center py-10">
              <p className="text-gray-400">{t.no_results} "{query}".</p>
          </div>
      )}
    </div>
  );
};