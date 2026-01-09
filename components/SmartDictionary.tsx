import { useEffect, useMemo, useRef, useState } from "react";
import { translations } from "../services/translations";
import type { Language } from "../types";
import { defineWordEs } from "../services/geminiService";
import { getLocalYMD } from "../services/dateUtils";

type SavedWord = {
  term: string;
  definition: string;
  createdAt: string;
};

type DictEntry = {
  word: string;
  meanings?: Array<{
    partOfSpeech?: string;
    definitions?: Array<{ definition?: string }>;
  }>;
};

type SmartDictionaryProps = {
  language: Language;
  savedWords: SavedWord[];
  setSavedWords: (
    value: SavedWord[] | ((prev: SavedWord[]) => SavedWord[])
  ) => void;
  storageKey?: string;
  variant?: "modal" | "bar";
  mode?: "sermon" | "study"; // ✅ NUEVO
};

export default function SmartDictionary({
  language,
  savedWords,
  setSavedWords,
  storageKey: storageKeyProp,
  variant = "modal",
  mode = "sermon", // ✅ NUEVO
}: SmartDictionaryProps) {
  const dict = (translations as any)[language] ?? (translations as any).es;
  const t = (key: string) =>
    dict?.[key] ?? (translations as any).es?.[key] ?? key;

  const [isDictOpen, setIsDictOpen] = useState(false);
  const [dictQuery, setDictQuery] = useState("");
  const [dictResults, setDictResults] = useState<{
    source: "dictionaryapi" | "wiktionary" | "gemini";
    word: string;
    lang?: "es" | "en" | "pt";
    definitions: string[];
  } | null>(null);

  const [dictLoading, setDictLoading] = useState(false);
  const [dictError, setDictError] = useState<string | null>(null);
  const shouldAutoOpen = mode === "study" && variant === "bar";

  const openModalIfNeeded = (results?: { definitions?: string[] } | null) => {
    if (!shouldAutoOpen) return;

    const hasDefs = !!results?.definitions?.length;
    if (!hasDefs) return;

    if (!isDictOpen) setIsDictOpen(true);
  };

  // ✅ Abort + cache para evitar resultados cruzados y llamadas repetidas
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const cacheRef = useRef<Map<string, { results: any; ts: number }>>(new Map());
  const lastGeminiCallRef = useRef(0);
  const GEMINI_COOLDOWN_MS = 2000; // 2 segundos

  // (Opcional) TTL del cache: 24h
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

  const closeDict = () => {
    abortRef.current?.abort();
    abortRef.current = null;

    setIsDictOpen(false);
    setDictQuery("");
    setDictResults(null);
    setDictError(null);
    setDictLoading(false);
  };

  // ✅ Compartido para TODA la app (SermonEditor + SmartBible)
  const storageKey = useMemo(
    () =>
      typeof storageKeyProp === "string" && storageKeyProp.trim()
        ? storageKeyProp.trim()
        : "ncm_saved_words_v1",
    [storageKeyProp]
  );

  // Cargar guardadas (cada vez que cambie la storageKey)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedWord[];
        setSavedWords(Array.isArray(parsed) ? parsed : []);
      } else {
        setSavedWords([]);
      }
    } catch {
      setSavedWords([]);
    }

    // Limpieza visual opcional al cambiar de "modo"
    setDictQuery("");
    setDictResults(null);
    setDictError(null);
  }, [storageKey]);

  // Persistir guardadas
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(savedWords ?? []));
    } catch {
      // ignore
    }
  }, [savedWords, storageKey]);

  useEffect(() => {
  const hasDefs = !!dictResults?.definitions?.length;
  if (!dictLoading && hasDefs) {
    setIsDictOpen(true);
  }
}, [dictLoading, dictResults]);
    

  const cleanHtmlToText = (html: string) => {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
    } catch {
      return html;
    }
  };

  async function fetchFromDictionaryApi(
    lang: "en" | "es",
    term: string,
    signal?: AbortSignal
  ) {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/${lang}/${encodeURIComponent(
      term
    )}`;
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const data = await res.json();
    return data as DictEntry[];
  }

  const fetchWiktionary = async (term: string, signal?: AbortSignal) => {
    const t = encodeURIComponent(term.trim());
    const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${t}`;
    const r = await fetch(url, { signal });
    if (!r.ok) return null;
    return await r.json();
  };

  const resolveWiktionaryTitle = async (q: string, signal?: AbortSignal) => {
    const url = `https://en.wiktionary.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      q
    )}&format=json&origin=*`;

    const r = await fetch(url, { signal });
    if (!r.ok) return null;

    const j = await r.json();
    return j?.query?.search?.[0]?.title ?? null;
  };

  const handleSearchDictionary = async () => {
    const raw = (dictQuery || "").trim();
    if (!raw) return;

    // ✅ Normalizar
    const word = raw.replace(/\s+/g, " ").trim();
    const cacheKey = `${language}:${word.toLowerCase()}`;

    // ✅ Cache hit
    const cached = cacheRef.current.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      setDictError(null);
      setDictResults(cached.results);
      return;
    }

    // ✅ Abortar búsqueda anterior
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // ✅ Evitar resultados cruzados
    const myReqId = ++requestIdRef.current;

    setDictLoading(true);
    setDictError(null);
    setDictResults(null);

    try {
      // =========================
      // 1) NO-EN: Wiktionary primero, Gemini fallback
      // =========================
      if (language !== "en") {
    

        // A) Wiktionary
        let wdata = await fetchWiktionary(word, controller.signal);
        if (requestIdRef.current !== myReqId) return;

        if (!wdata) {
          const resolvedTitle = await resolveWiktionaryTitle(
            word,
            controller.signal
          );
          if (requestIdRef.current !== myReqId) return;

          if (resolvedTitle) {
            wdata = await fetchWiktionary(resolvedTitle, controller.signal);
            if (requestIdRef.current !== myReqId) return;
          }
        }

        if (wdata) {
          const langNameMap: Record<"en" | "es" | "pt", string> = {
            en: "English",
            es: "Spanish",
            pt: "Portuguese",
          };

          const langsToTry: Array<"es" | "pt" | "en"> =
            language === "pt" ? ["pt", "es", "en"] : ["es", "pt", "en"];

          const extractDefs = (langKey: "en" | "es" | "pt") => {
            const langName = langNameMap[langKey];
            const entries = wdata?.[langName] || [];
            const defs: string[] = [];

            for (const e of entries) {
              const part = e?.partOfSpeech ? `${e.partOfSpeech}: ` : "";
              const defList = Array.isArray(e?.definitions)
                ? e.definitions
                : [];

              for (const defObj of defList) {
                const rawDef = defObj?.definition;
                const text = rawDef ? cleanHtmlToText(String(rawDef)) : "";
                if (!text) continue;

                const isJunk =
                  /^Alternative (form|spelling) of/i.test(text) ||
                  /^Alternative (form|spelling) of/i.test(
                    text.replace(/^.*?:\s*/, "")
                  );

                if (!isJunk) {
                  defs.push(part + text);
                  break;
                }
              }
            }
            return defs;
          };

          let finalLang: "en" | "es" | "pt" | null = null;
          let finalDefs: string[] = [];

          for (const l of langsToTry) {
            const d = extractDefs(l);
            if (d.length) {
              finalLang = l;
              finalDefs = d;
              break;
            }
          }

          if (finalLang && finalDefs.length) {
            const results = {
              source: "wiktionary" as const,
              lang: finalLang,
              word,
              definitions: finalDefs,
            };

            setDictResults(results);
            openModalIfNeeded(results);

            cacheRef.current.set(cacheKey, { results, ts: Date.now() });
            return;
          }
        }

        // B) Fallback Gemini (si Wiktionary no dio nada)
        const now = Date.now();
        if (now - lastGeminiCallRef.current < GEMINI_COOLDOWN_MS) {
  setDictError("Espera 2 segundos y vuelve a intentar.");
  return;
}

        lastGeminiCallRef.current = now;

        const gemLang: "es" | "pt" = language === "pt" ? "pt" : "es";

const text = await defineWordEs(word, gemLang);

const results = {
  source: "gemini" as const,
  lang: gemLang,
  word,
  definitions: [text],
};


        setDictResults(results);
        openModalIfNeeded(results);

        cacheRef.current.set(cacheKey, { results, ts: Date.now() });
        return;
      }

      // =========================
      // 2) EN: dictionaryapi primero, luego Wiktionary
      // =========================
      const looksEnglish = /^[a-zA-Z'-]+$/.test(word);
      const shouldTryEnglish = looksEnglish;

      // A) dictionaryapi (EN)
      if (shouldTryEnglish) {
        const data = await fetchFromDictionaryApi(
          "en",
          word,
          controller.signal
        );
        if (requestIdRef.current !== myReqId) return;

        if (data?.length) {
          const meanings: any[] = (data as any)?.[0]?.meanings ?? [];
          const defs: string[] = [];

          for (const m of meanings) {
            const part = m?.partOfSpeech ? `${m.partOfSpeech}: ` : "";
            const d0 = m?.definitions?.[0]?.definition;
            if (d0) defs.push(part + d0);
          }

          if (defs.length) {
            const results = {
              source: "dictionaryapi" as const,
              lang: "en" as const,
              word,
              definitions: defs,
            };

            setDictResults(results);
            openModalIfNeeded(results);

            cacheRef.current.set(cacheKey, { results, ts: Date.now() });
            return;
          }
        }
      }

      // B) Wiktionary
      let wdata = await fetchWiktionary(word, controller.signal);
      if (requestIdRef.current !== myReqId) return;

      if (!wdata) {
        const resolvedTitle = await resolveWiktionaryTitle(
          word,
          controller.signal
        );
        if (requestIdRef.current !== myReqId) return;

        if (resolvedTitle) {
          wdata = await fetchWiktionary(resolvedTitle, controller.signal);
          if (requestIdRef.current !== myReqId) return;
        }
      }

      if (!wdata) {
        setDictError("Palabra no encontrada");
        return;
      }

      const langsToTry: Array<"en" | "es" | "pt"> = ["en", "es", "pt"];
      const langNameMap: Record<"en" | "es" | "pt", string> = {
        en: "English",
        es: "Spanish",
        pt: "Portuguese",
      };

      const extractDefs = (langKey: "en" | "es" | "pt", allowJunk: boolean) => {
        const langName = langNameMap[langKey];
        const entries = wdata?.[langName] || [];
        const defs: string[] = [];

        for (const e of entries) {
          const part = e?.partOfSpeech ? `${e.partOfSpeech}: ` : "";
          const defList = Array.isArray(e?.definitions) ? e.definitions : [];

          for (const defObj of defList) {
            const rawDef = defObj?.definition;
            const text = rawDef ? cleanHtmlToText(String(rawDef)) : "";
            if (!text) continue;

            const isJunk =
              /^Alternative (form|spelling) of/i.test(text) ||
              /^Alternative (form|spelling) of/i.test(
                text.replace(/^.*?:\s*/, "")
              );

            if (allowJunk || !isJunk) {
              defs.push(part + text);
              break;
            }
          }
        }
        return defs;
      };

      let finalLang: "en" | "es" | "pt" | null = null;
      let finalDefs: string[] = [];

      for (const l of langsToTry) {
        const d = extractDefs(l, false);
        if (d.length) {
          finalLang = l;
          finalDefs = d;
          break;
        }
      }

      if (!finalDefs.length) {
        for (const l of langsToTry) {
          const d = extractDefs(l, true);
          if (d.length) {
            finalLang = l;
            finalDefs = d;
            break;
          }
        }
      }

      if (!finalLang || !finalDefs.length) {
        setDictError("Palabra no encontrada");
        return;
      }

      const results = {
        source: "wiktionary" as const,
        lang: finalLang,
        word,
        definitions: finalDefs,
      };

      setDictResults(results);
      openModalIfNeeded(results);

      cacheRef.current.set(cacheKey, { results, ts: Date.now() });
    } catch (err: any) {
      if (err?.name === "AbortError") return;

      const msg = String(err?.message || "");
      if (
        msg.includes("429") ||
        msg.toLowerCase().includes("too many requests")
      ) {
        setDictError("Gemini está limitado (429). Intenta en 20–30 segundos.");
      } else {
        setDictError("Error buscando la palabra. Revisa tu conexión.");
      }
    } finally {
      if (requestIdRef.current === myReqId) {
        setDictLoading(false);
      }
    }
  };

  // ✅ Auto-search con debounce (solo en modo study)
  useEffect(() => {
    // ✅ Solo auto-search en study cuando el idioma es inglés (usa APIs gratuitas)
    if (mode !== "study") return;
    if (language !== "en") return; // ✅ evita spam a Gemini

    const q = dictQuery.trim();

    if (!q) {
      setDictResults(null);
      setDictError(null);
      setDictLoading(false);
      abortRef.current?.abort();
      return;
    }

    if (q.length < 2) return;

    const id = window.setTimeout(() => {
      if (!dictLoading) handleSearchDictionary();
    }, 450);

    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dictQuery, mode, language]);

  function handleSaveWord() {
    if (!dictResults?.definitions?.length) return;

    const term = dictQuery.trim();
    const definition = dictResults.definitions[0] ?? "";
    if (!term || !definition) return;

    setSavedWords((prev) => {
      if (prev.some((w) => w.term.toLowerCase() === term.toLowerCase()))
        return prev;

      return [
        ...prev,
        {
          term,
          definition,
          createdAt: getLocalYMD(), // ✅ compila seguro; luego conectamos getLocalYMD si quieres
        },
      ];
    });
  }
  const modalBody = (
    <div className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          📘 {t("dictionary_title" as any)}
        </h3>

        <button
          type="button"
          onClick={closeDict}
          aria-label={String(t("close" as any))}
          title={String(t("close" as any))}
          className="p-2 rounded-full hover:bg-gray-200 text-gray-600 hover:text-red-600"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
          >
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Buscador */}
      <div className="mt-3 flex gap-2">
       <input
  value={dictQuery}
  onChange={(e) => setDictQuery(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (dictLoading) return;
      if (!dictQuery.trim()) return;

      void handleSearchDictionary(); // ✅ Enter hace lo mismo que 🔍
    }
  }}
  placeholder="Ej: Gracia, Expiación..."
  className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-blue-200"
/>

<button
  type="button"
  onClick={() => {
    if (dictLoading) return;
    if (!dictQuery.trim()) return;

    void handleSearchDictionary(); // ✅ Igual que Enter
  }}
  className="h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700"
  title="Buscar"
>
  🔍
</button>

      </div>

      {/* Error */}
      {dictError && <p className="mt-2 text-sm text-red-600">{dictError}</p>}

      {/* Resultados */}
      {dictResults?.definitions?.length ? (
        <div className="mt-3 max-h-56 overflow-auto rounded-lg border border-gray-200 p-3">
          {dictResults.lang ? (
            <div className="mb-2 text-xs text-gray-500">
              Idioma:{" "}
              {dictResults.lang === "es"
                ? "Español"
                : dictResults.lang === "pt"
                ? "Portugués"
                : dictResults.lang === "en"
                ? "Inglés"
                : dictResults.lang}
            </div>
          ) : null}

          <ul className="list-disc pl-5 space-y-1">
            {dictResults.definitions.slice(0, 8).map((d, i) => (
              <li key={i} className="text-sm text-gray-800">
                {d}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Guardar */}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleSaveWord}
          disabled={!dictResults?.definitions?.length}
          className="rounded-lg border border-gray-300 px-4 py-2 disabled:opacity-60"
        >
          {t("dictionary_save" as any)}
        </button>
      </div>

      {/* Guardadas */}
      <div className="mt-4">
        <div className="text-sm font-semibold">
          {t("dictionary_saved_words" as any)}
        </div>

        {savedWords.length === 0 ? (
          <p className="mt-1 text-sm text-gray-500">
            {t("dictionary_no_words" as any)}
          </p>
        ) : (
          <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-gray-200 p-3">
            {savedWords.map((w) => (
              <div key={w.term} className="mb-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{w.term}</div>

                  <button
                    type="button"
                    onClick={() =>
                      setSavedWords((prev) =>
                        prev.filter((x) => x.term !== w.term)
                      )
                    }
                    className="text-red-500 hover:text-red-700"
                    title="Eliminar"
                  >
                     <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-5 h-5"
                      >
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="M6 6l1 16h10l1-16" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                      </svg>
                  </button>
                </div>

                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {w.definition}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (variant === "bar") {
    return (
      <>
        <div className="w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <span className="text-blue-600">📘</span>
            {t("dictionary_title" as any) || "Diccionario"}
          </div>

          <div className="mt-3 flex items-center gap-3">
         <input
  value={dictQuery}
  onChange={(e) => setDictQuery(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (dictLoading) return;
      if (!dictQuery.trim()) return;

      void handleSearchDictionary(); // ✅ Enter hace lo mismo que 🔍
    }
  }}
  placeholder="Ej: Gracia, Expiación..."
  className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-blue-200"
/>

<button
  type="button"
  onClick={() => {
    if (dictLoading) return;
    if (!dictQuery.trim()) return;

    void handleSearchDictionary(); // ✅ Igual que Enter
  }}
  className="h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700"
  title="Buscar"
>
  🔍
</button>

            {/* Estado debajo del buscador (solo bar) */}
            {dictLoading && (
              <p className="mt-2 text-xs text-gray-500">
                Buscando definición...
              </p>
            )}

            {dictError && (
              <p className="mt-2 text-xs text-red-600">{dictError}</p>
            )}
          </div>
        </div>

        {isDictOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            {modalBody}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {/* Botón + chips */}
      <div className="flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={() => setIsDictOpen(true)}
          className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50"
        >
          📘 {t("dictionary_btn")}
        </button>

        {savedWords?.length > 0 && (
          <div className="mt-2">
            <div className="text-sm font-semibold opacity-80 mt-2 mb-1">
              {t("defined_terms")}:
            </div>

            <div className="flex flex-wrap gap-2">
              {savedWords.map((w) => (
                <button
                  key={w.term}
                  type="button"
                  onClick={() => {
                    setDictQuery(w.term);
                    setIsDictOpen(true);
                  }}
                  className="px-3 py-1 rounded-full border text-sm hover:bg-gray-50"
                  title="Ver significado"
                >
                  {w.term}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isDictOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          {modalBody}
        </div>
      )}
    </>
  );
}
