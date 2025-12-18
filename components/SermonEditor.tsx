import React, { useState, useEffect, useRef } from "react";
import {
  Sermon,
  BibleSearchResult,
  BibleVerse,
  SavedVerse,
  UserProfile,
  Language,
} from "../types";
import { Modal } from "./Modal";
import { BibleDictionary } from "./BibleDictionary";
import {
  fetchVerseFromAPI,
  searchByKeyword,
  getVersionsByLanguage,
} from "../services/bibleService";
import { summarizeSermon } from "../services/geminiService";
import { translations, getTranslation } from "../services/translations";
import { defineWordEs } from "../services/geminiService";

interface SermonEditorProps {
  sermon: Sermon;
  setSelectedSermon: (sermon: Sermon | null) => void;
  setSermons: React.Dispatch<React.SetStateAction<Sermon[]>>;
  user: UserProfile;
  onOpenPremium: () => void;
  language: Language;
  preferredVersion: string;
}
type KeyPassage = {
  id: string;
  reference: string;
  version: string;
  text: string;
};

type KeyPassageOption = {
  id: string;
  reference: string;
  version: string;
  text: string;
  isPreferred: boolean;
};

export const SermonEditor: React.FC<SermonEditorProps> = ({
  sermon,
  setSelectedSermon,
  setSermons,
  user,
  onOpenPremium,
  language,
  preferredVersion,
}) => {
  const [editedSermon, setEditedSermon] = useState<Sermon>(sermon);
  const [verseQuery, setVerseQuery] = useState("");
  const [verseResults, setVerseResults] = useState<BibleSearchResult | null>(
    null
  );
  const [isVerseLoading, setIsVerseLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
  const [definitionModal, setDefinitionModal] = useState<{
    isOpen: boolean;
    term: string;
    content: string;
  }>({ isOpen: false, term: "", content: "" });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsTimerRef = useRef<number | null>(null);
  const t = (key: keyof (typeof translations)["es"]) =>
    getTranslation(language, key);
  const [sermonTitle, setSermonTitle] = useState("");
  const [preacherName, setPreacherName] = useState("");
  const [keyPassages, setKeyPassages] = useState<KeyPassage[]>([]);
  const [newPassageRef, setNewPassageRef] = useState("");
  const [addingPassage, setAddingPassage] = useState(false);
  const [passageError, setPassageError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<KeyPassageOption[]>([]);
  const [versionSuggestions, setVersionSuggestions] = useState<KeyPassage[]>(
    []
  );
  const [lastChapterRef, setLastChapterRef] = useState<string>("");
  const [availableVersionKeys, setAvailableVersionKeys] = useState<string[]>(
    []
  );
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [keepOpen, setKeepOpen] = useState(false);
  const VERSIONS_BY_LANG: Record<string, string[]> = {
    es: ["rvr1960", "nvi", "ntv", "dhh", "lbla"],
    en: ["kjv", "niv"],
    pt: ["arc"],
  };

  // =======================
  // Diccionario por sermón
  // =======================
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

  const [isDictOpen, setIsDictOpen] = useState(false);
  const [dictQuery, setDictQuery] = useState("");
  const [dictResults, setDictResults] = useState<{
    source: "dictionaryapi" | "wiktionary";
    word: string;
    lang?: string;
    definitions: string[];
  } | null>(null);

  const [dictLoading, setDictLoading] = useState(false);
  const [dictError, setDictError] = useState<string | null>(null);

  const [savedWords, setSavedWords] = useState<SavedWord[]>(
    editedSermon?.dictionary ?? []
  );

  // Helper: etiqueta bonita para mostrar
  const getPassageLabel = (p: any) =>
    typeof p === "string" ? p : p.reference ?? p.ref ?? "";

  // Helper: id estable para cada pasaje (evita que "Eliminar" borre todos)
  const getPassageId = (p: any, index: number) => {
    if (p && typeof p === "object" && "id" in p && p.id) return String(p.id);

    const label = getPassageLabel(p);
    const version =
      p && typeof p === "object" && (p as any).version
        ? String((p as any).version)
        : "";
    return `${label}::${version}::${index}`;
  };

  useEffect(() => {
    setKeyPassages((sermon as any)?.keyPassages ?? []);
  }, [sermon?.id]);

  useEffect(() => {
    if (!verseQuery.trim()) {
      setVersionSuggestions([]);
    }
  }, [verseQuery]);

  // Seguridad al inicializar verses en caso de datos antiguos corruptos
  useEffect(() => {
    if (!editedSermon.verses) {
      setEditedSermon((prev) => ({ ...prev, verses: [] }));
    }
  }, []);

  useEffect(() => {
    setSavedWords(editedSermon?.dictionary ?? []);
  }, [editedSermon?.id]);

  const handleAddVerse = (version: string, verses: BibleVerse[]) => {
    const fullText = verses.map((v) => v.text).join(" ");
    const hasJesusWords = verses.some((v) => v.isJesusWords);
    const newVerse: SavedVerse = {
      ref: verseResults!.ref,
      text: fullText,
      version: version,
      isJesusWords: hasJesusWords,
    };

    setEditedSermon((prev) => ({
      ...prev,
      verses: [...(prev.verses || []), newVerse],
    }));

    // Reset search
    if (!keepOpen) setVerseQuery("");

    setVerseResults(null);
  };

  const handleRemoveVerse = (index: number) => {
    setEditedSermon((prev) => ({
      ...prev,
      verses: (prev.verses || []).filter((_, i) => i !== index),
    }));
  };

  const handleDefineWord = (term: string, definition: string) => {
    const capitalizedTerm =
      term.charAt(0).toUpperCase() + term.slice(1).toLowerCase();
    setEditedSermon((prev) => ({
      ...prev,
      definitions: {
        ...(prev.definitions || {}),
        [capitalizedTerm]: definition,
      },
    }));
  };

  const handleDeleteDefinition = (termToDelete: string) => {
    const newDefinitions = { ...editedSermon.definitions };
    delete newDefinitions[termToDelete];
    setEditedSermon((prev) => ({ ...prev, definitions: newDefinitions }));
  };

  const handleToolbarClick = (prefix: string, suffix = "") => {
    const textarea = notesRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd } = textarea;
    const currentText = editedSermon.notes || "";
    const textBefore = currentText.substring(0, selectionStart);
    const textAfter = currentText.substring(selectionEnd);
    const prefixWithNewline =
      textBefore.length > 0 && textBefore.slice(-1) !== "\n"
        ? `\n${prefix}`
        : prefix;
    const newText = textBefore + prefixWithNewline + suffix + textAfter;
    setEditedSermon((prev) => ({ ...prev, notes: newText }));
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd =
        selectionStart + prefixWithNewline.length;
    }, 0);
  };

  const handleCopyVerse = (verse: SavedVerse) => {
    navigator.clipboard.writeText(
      `"${verse.text}" - ${verse.ref} (${verse.version})`
    );
    setCopySuccess(verse.ref);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const handleSave = () => {
    const toSave = {
      ...editedSermon,

      // ✅ guardar el texto completo de los versículos seleccionados
      verses:
        editedSermon.verses && editedSermon.verses.length > 0
          ? editedSermon.verses.map((v: any) => ({
              ref: v?.ref ?? v?.reference ?? v?.verseRef ?? "",
              text: v?.text ?? v?.verseText ?? "",
              version: v?.version ?? v?.versionOverride ?? v?.v ?? "",
            }))
          : ((editedSermon as any).passageLabels ?? []).map((p: any) => ({
              ref: p?.ref ?? p?.reference ?? p?.verseRef ?? "",
              text: p?.text ?? p?.verseText ?? p?.label ?? "",
              version: p?.version ?? p?.versionOverride ?? "",
            })),

      // ✅ guardar solo las referencias (juan 3:1, etc.)
      keyPassages: (keyPassages ?? [])
        .map((p: any) => {
          if (typeof p === "string") return p;
          return p?.reference ?? p?.ref ?? p?.verseRef ?? p?.passageRef ?? "";
        })
        .filter(Boolean),

      dictionary: savedWords,
    };

    setSermons((prevSermons) => {
      const idx = prevSermons.findIndex((s) => s.id === toSave.id);
      if (idx >= 0) {
        const copy = [...prevSermons];
        copy[idx] = toSave;
        return copy;
      }
      return [toSave, ...prevSermons];
    });

    setSelectedSermon(null);
  };

  async function fetchDict(lang: string, q: string) {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/${lang}/${encodeURIComponent(
        q
      )}`
    );
    if (!res.ok) return null;
    return (await res.json()) as DictEntry[];
  }

  async function fetchDictionaryApi(lang: "en", term: string) {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/${lang}/${encodeURIComponent(
        term
      )}`
    );
    if (!res.ok) return null;
    return (await res.json()) as DictEntry[];
  }

  async function fetchWiktionaryDefinition(
    lang: "es" | "en" | "pt",
    term: string
  ) {
    const res = await fetch(
      `https://${lang}.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(
        term
      )}`
    );
    if (!res.ok) return null;

    const data = await res.json();

    // La respuesta suele venir como { "<lang>": [ { partOfSpeech, definitions: [...] }, ... ] }
    const key = Object.keys(data)[0];
    const blocks = (data[key] ?? []) as any[];

    // Tomamos las primeras definiciones (si existen)
    const defs: string[] = [];
    for (const b of blocks) {
      const d = b?.definitions ?? [];
      for (const item of d) {
        const text = typeof item === "string" ? item : item?.definition;
        if (text) defs.push(String(text));
        if (defs.length >= 5) break;
      }
      if (defs.length >= 5) break;
    }

    if (defs.length === 0) return null;
    return defs;
  }

  function defsToDictResults(defs: string[], partOfSpeech = "definición") {
    // Adaptamos al formato que tu modal ya está mostrando (meanings/definitions)
    return [
      {
        meanings: [
          {
            partOfSpeech,
            definitions: defs.map((d) => ({ definition: d })),
          },
        ],
      },
    ] as any;
  }

  function normalizeQuery(q: string) {
    return q.trim().toLowerCase();
  }

  // quita markup simple de wiktionary: [[...]], {{...}}, ''...''
  function cleanWiktionaryLine(line: string) {
    let s = line;

    // [[a|b]] -> b ; [[a]] -> a
    s = s.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2");
    s = s.replace(/\[\[([^\]]+)\]\]/g, "$1");

    // {{...}} (templates)
    s = s.replace(/\{\{[^}]+\}\}/g, "");

    // ''italics'' y '''bold'''
    s = s.replace(/'''?/g, "");

    // html tags si vienen
    s = s.replace(/<[^>]+>/g, "");

    // espacios raros
    s = s.replace(/\s+/g, " ").trim();

    return s;
  }

  // devuelve un “DictEntry” compatible con tu UI actual
  function makeDictEntry(word: string, defs: string[]) {
    return [
      {
        word,
        meanings: [
          {
            partOfSpeech: "definition",
            definitions: defs.map((d) => ({ definition: d })),
          },
        ],
      },
    ];
  }

  async function fetchFromWiktionary(lang: string, term: string) {
    const api = `https://${lang}.wiktionary.org/w/api.php`;
    const url =
      `${api}?origin=*` +
      `&action=parse` +
      `&format=json` +
      `&prop=wikitext` +
      `&page=${encodeURIComponent(term)}`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const json = await res.json();

    const wikitext: string | undefined = json?.parse?.wikitext?.["*"];
    if (!wikitext) return null;

    // Agarramos líneas que parezcan definiciones: empiezan con "# "
    const lines = wikitext
      .split("\n")
      .map((l: string) => l.trim())
      .filter((l: string) => l.startsWith("# "));

    const defs = lines
      .slice(0, 4)
      .map((l: string) => cleanWiktionaryLine(l.replace(/^#\s+/, "")))
      .filter(Boolean);

    if (!defs.length) return null;

    return makeDictEntry(term, defs);
  }

  async function fetchFromDictionaryApiEn(term: string) {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
      term
    )}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data; // ya viene en el formato clásico de dictionaryapi
  }

  const getDictLangCandidates = (appLang: string) => {
    const base = (appLang || "en").toLowerCase().split("-")[0];

    if (base === "pt") return ["pt-BR", "pt", "en"];
    if (base === "es") return ["es", "en"];
    return ["en"];
  };

  const removeAccents = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const cleanHtmlToText = (html: string) => {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
    } catch {
      return html;
    }
  };

  const resolveWiktionaryTitle = async (q: string) => {
    const url = `https://en.wiktionary.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      q
    )}&format=json&origin=*`;

    const r = await fetch(url);
    if (!r.ok) return null;

    const j = await r.json();
    const first = j?.query?.search?.[0]?.title ?? null;
    return first;
  };

  const handleSearchDictionary = async () => {
    const raw = (dictQuery || "").trim();

    if (!raw) return;

    setDictLoading(true);
    setDictError(null);
    setDictResults(null);

    // ✅ Si el idioma de la app NO es inglés, usamos Gemini (definición en español)
    if (language !== "en") {
      try {
        const text = await defineWordEs(raw);
        setDictResults({
          source: "gemini",
          lang: "Español",
          word: raw,
          definitions: [text],
        });
      } catch (e) {
        setDictError(
          "No se pudo generar la definición. Revisa tu conexión o tu API key."
        );
      } finally {
        setDictLoading(false);
      }
      return; // 👈 importante: salimos aquí para no seguir con los fetch de inglés/wiktionary
    }

    // Normaliza un poco (quita espacios dobles, etc.)
    const word = raw.replace(/\s+/g, " ").trim();
    const safeWord = encodeURIComponent(word);

    const looksEnglish = /^[a-zA-Z'-]+$/.test(word);
    const shouldTryEnglish = language === "en" && looksEnglish;

    try {
      // =========================
      // A) Intento 1: Inglés (dictionaryapi.dev)
      // =========================
      if (shouldTryEnglish) {
        const urlEN = `https://api.dictionaryapi.dev/api/v2/entries/en/${safeWord}`;
        const resEN = await fetch(urlEN);

        if (resEN.ok) {
          const data = await resEN.json();

          const meanings = data?.[0]?.meanings ?? [];
          const defs: string[] = [];

          for (const m of meanings) {
            const part = m?.partOfSpeech ? `${m.partOfSpeech}: ` : "";
            const d0 = m?.definitions?.[0]?.definition;
            if (d0) defs.push(part + d0);
          }

          if (defs.length) {
            setDictResults({
              source: "dictionaryapi",
              word,
              definitions: defs,
            });
            return; // 👈 se detiene aquí si encontró en inglés
          }
        }
      }

      // Este endpoint suele traer definiciones por idioma
      // B) Intento 2: Wiktionary (multi-idioma) — usar SIEMPRE en.wiktionary (evita 501)
      // === Wiktionary con resolución de título (perdon -> perdón) ===
      const fetchWiktionary = async (term: string) => {
        const t = encodeURIComponent(term.trim());
        const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${t}`;
        const r = await fetch(url);
        if (!r.ok) return null;
        return await r.json();
      };

      const resolveWiktionaryTitle = async (q: string) => {
        const url = `https://en.wiktionary.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
          q
        )}&format=json&origin=*`;

        const r = await fetch(url);
        if (!r.ok) return null;

        const j = await r.json();
        return j?.query?.search?.[0]?.title ?? null;
      };

      // 1️⃣ intento directo
      let wdata = await fetchWiktionary(word);

      // 2️⃣ si no existe, buscar título correcto (ej: perdon → perdón)
      if (!wdata) {
        const resolvedTitle = await resolveWiktionaryTitle(word);
        if (resolvedTitle) {
          wdata = await fetchWiktionary(resolvedTitle);
        }
      }

      if (!wdata) {
        setDictError("Palabra no encontrada");
        return;
      }

      // Priorizamos según idioma de la app, pero leyendo desde en.wiktionary
      const preferredLangs =
        language === "es"
          ? ["Spanish", "Portuguese", "English"]
          : language === "pt"
          ? ["Portuguese", "Spanish", "English"]
          : ["English", "Spanish", "Portuguese"];

      let pickedLang: string | null = null;

      for (const lang of preferredLangs) {
        if (wdata?.[lang]?.length) {
          pickedLang = lang;
          break;
        }
      }
      if (!pickedLang) pickedLang = Object.keys(wdata || {})[0] ?? null;

      if (!pickedLang) {
        setDictError("Palabra no encontrada");
        return;
      }

      const langsToTry =
        language === "es"
          ? ["es", "pt", "en"]
          : language === "pt"
          ? ["pt", "es", "en"]
          : ["en", "es", "pt"];

      const extractDefs = (langName: string, allowJunk: boolean) => {
        const entries = wdata?.[langName] || [];
        const defs: string[] = [];

        for (const e of entries) {
          const part = e?.partOfSpeech ? `${e.partOfSpeech}: ` : "";

          const defList = Array.isArray(e?.definitions) ? e.definitions : [];
          for (const defObj of defList) {
            const raw = defObj?.definition;
            const text = raw ? cleanHtmlToText(String(raw)) : "";
            if (!text) continue;

            const isJunk =
              /^Alternative (form|spelling) of/i.test(text) ||
              /^Alternative (form|spelling) of/i.test(
                text.replace(/^.*?:\s*/, "")
              );

            if (allowJunk || !isJunk) {
              defs.push(part + text);
              break; // ✅ solo tomamos 1 definición buena por entrada
            }
          }
        }

        return defs;
      };

      let finalLang: string | null = null;
      let finalDefs: string[] = [];

      // 1️⃣ Primera pasada: SIN basura
      for (const langName of langsToTry) {
        const d = extractDefs(langName, false);
        if (d.length) {
          finalLang = langName;
          finalDefs = d;
          break;
        }
      }

      // 2️⃣ Segunda pasada: permitir "Alternative form..." como último recurso
      if (!finalDefs.length) {
        for (const langName of langsToTry) {
          const d = extractDefs(langName, true);
          if (d.length) {
            finalLang = langName;
            finalDefs = d;
            break;
          }
        }
      }

      if (!finalLang || !finalDefs.length) {
        setDictError("Palabra no encontrada");
        return;
      }

      setDictResults({
        source: "wiktionary",
        lang: finalLang,
        word,
        definitions: finalDefs,
      });
    } catch (err) {
      setDictError("Error buscando la palabra. Revisa tu conexión.");
    } finally {
      setDictLoading(false);
    }
  };

  function handleSaveWord() {
    if (!dictResults?.definitions?.length) return;

    const term = dictQuery.trim();
    const definition = dictResults.definitions[0] ?? "";

    if (!term || !definition) return;

    setSavedWords((prev) => {
      if (prev.some((w) => w.term.toLowerCase() === term.toLowerCase())) {
        return prev;
      }

      return [
        ...prev,
        {
          term,
          definition,
          createdAt: new Date().toISOString(),
        },
      ];
    });
  }

  const scheduleSuggestionsSearch = (value: string) => {
    // limpiamos timer anterior
    if (suggestionsTimerRef.current) {
      window.clearTimeout(suggestionsTimerRef.current);
    }

    suggestionsTimerRef.current = window.setTimeout(async () => {
      try {
        setIsSearchingSuggestions(true);

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
        const versionsObj =
          versionsFromApi ??
          (versesArray
            ? { [preferredVersion || "rvr1960"]: versesArray }
            : null);

        if (!versionsObj) {
          setVersionSuggestions([]);
          return;
        }

        setLastChapterRef(ref);
        setAvailableVersionKeys(Object.keys(versionsObj));

        // ✅ usamos versionsObj (no result.versions) para asegurar que vienen todas las versiones
        const allowedVersions = VERSIONS_BY_LANG[language] ?? []; // ej: ["rvr1960","nvi","ntv","dhh","lbla"]

        const normalizeVersion = (v: string) => {
          const up = String(v).toUpperCase();
          // la API a veces devuelve RVR60 en lugar de RVR1960
          if (up === "RVR60") return "RVR1960";
          return up;
        };

        const allowedNormalized = allowedVersions.map(normalizeVersion);

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
          a.version === preferredVersion
            ? -1
            : b.version === preferredVersion
            ? 1
            : 0
        );

        setVersionSuggestions(suggestions);
      } catch (e) {
        console.error("[SUGGEST] scheduleSuggestionsSearch error:", e);
        setVersionSuggestions([]);
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 350);
  };
  // =======================
  // Version switch (chips)
  // =======================

  const loadChapterInVersion = async (versionKey: string) => {
    if (!lastChapterRef) return;

    // 1) Traer el capítulo en la versión seleccionada
    const result = await fetchVerseFromAPI(lastChapterRef, versionKey);
    if (!result) return;

    const ref = (result as any)?.ref || lastChapterRef;

    // 2) Normalizar versículos del resultado (tu API devuelve data.verses)
    const verses = Array.isArray((result as any)?.data?.verses)
      ? (result as any).data.verses
      : [];

    if (!verses.length) {
      console.warn(
        "[VersionSwitch] Sin versos para",
        versionKey,
        "ref:",
        lastChapterRef,
        "result:",
        result
      );
      return; // NO cambiamos la UI si esa versión no devolvió capítulo
    }

    // 3) Construir 1 sugerencia “capítulo con texto”
    const chapterSuggestion = {
      id: `${ref}-${versionKey}`,
      reference: ref,
      version: String(versionKey),
      text: verses
        .map((v: any) =>
          `${v.number ?? ""} ${String(v.verse ?? v.text ?? "").trim()}`.trim()
        )
        .filter(Boolean)
        .join("\n"),
      verses,
      isJesusWords: false,
    };
    const allowed = VERSIONS_BY_LANG[language] ?? [];
    const allowedUpper = allowed.map((v) => v.toUpperCase());

    // 4) Mantener botones de versiones (sin texto) usando availableVersionKeys
    const versionButtons = (availableVersionKeys || [])
      .filter((vk) => {
        const up = String(vk).toUpperCase();
        return allowedUpper.length === 0
          ? up !== String(versionKey).toUpperCase()
          : allowedUpper.includes(up) &&
              up !== String(versionKey).toUpperCase();
      })
      .map((vk) => ({
        id: `${ref}-${vk}`,
        reference: ref,
        version: String(vk),
        text: "",
        verses: [],
        isJesusWords: false,
      }));

    setSelectedVersion(String(versionKey)); // para que quede “seleccionada”
    setVersionSuggestions([chapterSuggestion, ...versionButtons]);
  };

  const handleAddPassage = async (
    refOverride?: string,
    versionOverride?: string
  ): Promise<void> => {
    const ref = (refOverride ?? newPassageRef).trim();
    if (!ref) return;

    const chosenVersion =
      versionOverride || selectedVersion || preferredVersion;

    try {
      setAddingPassage(true);
      setPassageError(null);

      // Usamos el MISMO helper que SmartBible
      const referenceData: BibleSearchResult | null = await fetchVerseFromAPI(
        ref
      );

      if (!referenceData || !referenceData.versions) {
        setPassageError("No se encontró este pasaje.");
        return;
      }

      // 1) sacar todas las versiones disponibles que devolvió la API
      const availableVersions = Object.keys(referenceData.versions);

      // 2) elegir versión: primero la preferida (si existe), si no, la primera
      const chosenVersion =
        (preferredVersion &&
          availableVersions.includes(preferredVersion) &&
          preferredVersion) ||
        availableVersions[0] ||
        "RVR60";

      // 3) lista de versículos de ese capítulo en esa versión
      const versesList = referenceData.versions[chosenVersion] as BibleVerse[];

      if (!versesList || versesList.length === 0) {
        setPassageError("No se encontraron versículos para este pasaje.");
        return;
      }

      // 4) Texto COMPLETO del capítulo: "1. ... 2. ... 3. ..."
      const fullText = versesList
        .map((v) => `${v.number}. ${v.text}`)
        .join("\n");

      // 5) Referencia normalizada (para que SIEMPRE se vea "Juan 3", "Mateo 6:33", etc.)
      const reference = (referenceData?.ref || ref || "").trim();
      // ✅ Guardar el pasaje con texto completo (para que no se pierda al reabrir)
      const newVerse = {
        ref: reference, // ej: "juan 3:1" o "juan 3"
        text: fullText, // texto del capítulo/verso
        version: chosenVersion, // ej: "RVR60"
      };
      setEditedSermon((prev: any) => ({
        ...prev,
        verses: [...(prev.verses || []), newVerse],
        keyPassages: [...(prev.keyPassages || []), reference],
      }));

      // 6) Crear el pasaje clave que se guarda en el sermón
      const newPassage: KeyPassage = {
        id: `${reference}-${chosenVersion}-${Date.now()}`, // id más único
        reference, // ✅ ahora SI se guarda la referencia correcta
        version: chosenVersion, // ✅ versión
        text: fullText, // ✅ capítulo completo o versículo según lo que escribas
      };

      // 6) Guardarlo en el estado de pasajes
      setKeyPassages((prev) => [...prev, newPassage]);
      if (!keepOpen) setNewPassageRef("");
    } catch (error) {
      console.error("Error al buscar pasaje:", error);
      setPassageError("Ocurrió un error al buscar el pasaje.");
    } finally {
      setAddingPassage(false);

      if (!keepOpen) {
        setNewPassageRef("");
        setVerseQuery("");
        setVerseResults(null);
        setVersionSuggestions([]);
      } else {
        setPassageError(null);
      }
    }
  };
  // Copiar pasaje completo
  // Copiar pasaje completo (soporta string u objeto)
  const handleCopyPassage = async (p: any) => {
    const reference =
      typeof p === "string" ? p : p.reference ?? p.ref ?? p.verseRef ?? "";

    const version =
      typeof p === "string" ? "" : p.version ?? p.versionOverride ?? "";

    // 1) si es string, buscamos el texto en editedSermon.verses
    // 2) si es objeto, usamos p.text
    const text =
      typeof p === "string"
        ? (editedSermon.verses || []).find((v: any) => v.ref === p)?.text ?? ""
        : p.text ?? p.verseText ?? "";

    const textToCopy = version
      ? `${reference} (${version}) — ${text}`
      : `${reference} — ${text}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch (error) {
      console.error("Error al copiar pasaje:", error);
    }
  };

  // Eliminar pasaje de la lista
  const handleRemovePassage = (pid: string) => {
    // 1) quita de la lista visible de pasajes
    setKeyPassages((prev) =>
      prev.filter((p, index) => getPassageId(p, index) !== pid)
    );

    // 2) quita también el texto guardado de ese pasaje
    setEditedSermon((prev: any) => ({
      ...prev,
      keyPassages: (prev.keyPassages || []).filter((r: string) => r !== pid),
      verses: (prev.verses || []).filter(
        (v: any) => (v.ref ?? v.reference) !== pid
      ),
    }));
  };

  const handleDeleteConfirm = () => {
    setSermons((prev) => prev.filter((s) => s.id !== sermon.id));
    setSelectedSermon(null);
    setIsDeleteModalOpen(false);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditedSermon((prev) => ({ ...prev, [name]: value }));
  };

  // Referencia al textarea para poder saber qué texto está seleccionado
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Cuando cambian las notas
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setEditedSermon((prev) => ({
      ...prev,
      notes: value,
    }));
  };

  // Tipos de formato que vamos a aplicar
  type NoteFormat = "bold" | "italic";

  // Aplica formato tipo Markdown al texto seleccionado
  const applyNoteFormat = (format: NoteFormat) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;

    // Si por alguna razón no hay selección válida, salimos
    if (selectionStart == null || selectionEnd == null) return;

    // Si no hay texto seleccionado, de momento no hacemos nada
    if (selectionStart === selectionEnd) {
      return;
    }

    const before = value.slice(0, selectionStart);
    const selected = value.slice(selectionStart, selectionEnd);
    const after = value.slice(selectionEnd);

    let formatted = selected;

    if (format === "bold") {
      formatted = `**${selected}**`; // Negrita en Markdown
    } else if (format === "italic") {
      formatted = `*${selected}*`; // Cursiva en Markdown
    }

    const newValue = before + formatted + after;

    setEditedSermon((prev) => ({
      ...prev,
      notes: newValue,
    }));

    // Recolocamos el cursor al final del texto formateado
    const newPos = before.length + formatted.length;
    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = newPos;
      textarea.focus();
    });
  };

  const handleClearNotes = () => {
    setEditedSermon((prev) => ({
      ...prev,
      notes: "",
    }));
  };

  const handleSummarize = async () => {
    if (!user.isPremium) {
      onOpenPremium();
      return;
    }

    if (
      !editedSermon.notes &&
      (!editedSermon.verses || editedSermon.verses.length === 0)
    ) {
      alert(
        "Escribe algunas notas o añade versículos para generar un resumen."
      );
      return;
    }

    setIsSummarizing(true);
    const versesText = (editedSermon.verses || [])
      .map((v) => String(v.ref) + ": " + String(v.text))
      .join("\n");

    const summary = await summarizeSermon(
      editedSermon.title,
      editedSermon.notes,
      versesText
    );

    // Append summary to notes
    setEditedSermon((prev) => ({
      ...prev,
      notes: (prev.notes || "") + "\n\n--- 🤖 RESUMEN IA ---\n" + summary,
    }));
    setIsSummarizing(false);
  };

  // --- Estadísticas de las notas (para mostrar debajo del textarea) ---
  const notesText = editedSermon.notes || "";
  const wordCount = notesText.trim() ? notesText.trim().split(/\s+/).length : 0;
  const charCount = notesText.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors duration-200">
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        {/* Encabezado básico */}
        <input
          type="text"
          value={editedSermon.title ?? ""}
          onChange={(e) =>
            setEditedSermon((prev) => ({ ...prev, title: e.target.value }))
          }
          placeholder={t("new_sermon")}
          className="w-full text-2xl font-bold mb-4 bg-transparent outline-none border-b border-gray-200 dark:border-gray-700"
        />

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4 gap-4">
          {/* Predicador */}
          <div className="flex items-center gap-2">
            <span>{t("preacher_ph")}:</span>
            <input
              type="text"
              value={editedSermon.preacher ?? ""}
              onChange={(e) =>
                setEditedSermon((prev) => ({
                  ...prev,
                  preacher: e.target.value,
                }))
              }
              placeholder="_"
              className="bg-transparent outline-none border-b border-dashed border-gray-300 dark:border-gray-600 px-1"
            />
          </div>

          {/* Fecha */}
          <input
            type="date"
            value={(editedSermon.date ?? "").slice(0, 10)}
            onChange={(e) =>
              setEditedSermon((prev) => ({ ...prev, date: e.target.value }))
            }
            className="bg-transparent border border-gray-300 dark:border-gray-600 rounded-xl px-2 py-1 text-xs"
          />
        </div>

        {/* PASAJES CLAVE */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-600 mb-2">
            {t("key_passages")}
          </label>

          {/* Barra de búsqueda de pasaje */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newPassageRef}
              onChange={(e) => {
                const value = e.target.value;
                setNewPassageRef(value);

                // Si está vacío, limpiamos sugerencias
                if (!value.trim()) {
                  setVersionSuggestions([]);
                  return;
                }

                // ✅ NO llamamos a la API hasta que haya al menos un número (ej: "juan 3")
                const hasNumber = /\d/.test(value);
                if (!hasNumber) {
                  setVersionSuggestions([]);
                  return;
                }

                // ✅ debounce
                scheduleSuggestionsSearch(value);

                // Siempre actualiza verseQuery
                setVerseQuery(value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (!addingPassage) {
                    handleAddPassage();
                  }
                }
              }}
              placeholder={t("add_passage_ph")}
              className="flex-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {isSearchingSuggestions && (
              <div className="mt-2 text-sm text-gray-500">
                Buscando versiones...
              </div>
            )}
            <button
              type="button"
              onClick={() => handleAddPassage()}
              disabled={addingPassage || !newPassageRef.trim()}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-white ${
                addingPassage || !newPassageRef.trim()
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {addingPassage ? t("searching") : t("add")}
            </button>
          </div>

          <div className="mt-2">
            <label className="flex items-center gap-2 text-sm text-gray-600 select-none">
              <input
                type="checkbox"
                checked={keepOpen}
                onChange={(e) => setKeepOpen(e.target.checked)}
              />

              {t("keep_list_open")}

              {keepOpen && (
                <span className="ml-2 rounded-full px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700">
                  {t("multi_mode_active")}
                </span>
              )}
            </label>

            <div className="mt-1 text-xs text-gray-500">
              {keepOpen ? t("tip_keep_open_on") : t("tip_keep_open_off")}
            </div>
          </div>

          {versionSuggestions.length > 0 && (
            <div
              className={`mt-2 rounded-xl bg-white shadow-sm max-h-[320px] overflow-y-auto border ${
                keepOpen
                  ? "border-blue-500 ring-1 ring-blue-200"
                  : "border-gray-200"
              }`}
            >
              {keepOpen && (
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-3 py-2 text-xs text-gray-600">
                  {t("open_list_multiple")}👇
                </div>
              )}

              {(() => {
                const chapterSuggestions = versionSuggestions.filter(
                  (s) =>
                    (s.text && s.text.trim().length > 0) ||
                    (s.verses && s.verses.length > 0)
                );

                const versionOnlySuggestions = versionSuggestions.filter(
                  (s) =>
                    (!s.text || s.text.trim().length === 0) &&
                    (!s.verses || s.verses.length === 0)
                );

                return (
                  <div className="px-3 py-2">
                    {/* 📖 Capítulo con texto */}
                    {chapterSuggestions.map((s) => (
                      <div key={`${s.reference}-${s.version}`} className="mb-3">
                        <span className="font-medium capitalize">
                          {s.reference}
                        </span>

                        <div className="mt-2 space-y-1 text-xs text-gray-700">
                          {(Array.isArray(s.verses) ? s.verses : []).map(
                            (v: any, idx: number) => {
                              const verseNumber =
                                v.number ?? v.verse ?? v.num ?? idx + 1;
                              const verseText =
                                v.text ?? v.verse ?? v.content ?? "";

                              return (
                                <div
                                  key={idx}
                                  className="leading-relaxed cursor-pointer hover:bg-blue-100 rounded px-1"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();

                                    const baseRef = s.reference.replace(
                                      /:\d+$/,
                                      ""
                                    ); // quita ":NUM" del final si ya existe
                                    const verseRef = `${baseRef}:${verseNumber}`;

                                    if (keepOpen) {
                                      setNewPassageRef(`${baseRef}:`);
                                      setVerseQuery(`${baseRef}:`);
                                    }

                                    if (!keepOpen) setVersionSuggestions([]);

                                    handleAddPassage(verseRef);
                                  }}
                                >
                                  <strong>{verseNumber}</strong> {verseText}
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    ))}

                    {/* 🔘 Botones de versiones (sin texto) */}
                    {versionOnlySuggestions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2 justify-end">
                        {versionOnlySuggestions.map((s) => (
                          <button
                            key={`btn-${s.version}`}
                            type="button"
                            className="px-3 py-1 rounded-full border text-xs bg-white hover:bg-gray-50"
                            onClick={() =>
                              loadChapterInVersion(String(s.version))
                            }
                            title={`Cambiar a ${String(s.version)}`}
                          >
                            {String(s.version).toUpperCase()}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Error al buscar */}
          {passageError && (
            <p className="text-xs text-red-500 mt-1">{passageError}</p>
          )}

          {/* Lista de pasajes agregados */}
          <div className="mt-3 space-y-2">
            {keyPassages.map((p, index) => {
              const pid = getPassageId(p, index);
              const label =
                typeof p === "string"
                  ? p
                  : (p as any).reference ?? getPassageLabel(p);

              const text =
                typeof p === "string"
                  ? (editedSermon.verses || []).find((v: any) => v.ref === p)
                      ?.text ?? ""
                  : (p as any).text ?? "";

              const version =
                typeof p === "string" ? "" : (p as any).version ?? "";

              return (
                <div
                  key={pid}
                  className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm flex justify-between items-start gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold capitalize">{label}</span>

                      {version ? (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-white border border-green-200">
                          {version}
                        </span>
                      ) : null}
                    </div>

                    {text ? (
                      <div className="mt-1 max-h-[260px] overflow-y-auto pr-2">
                        <p className="text-[13px] text-green-800 italic whitespace-pre-line">
                          {text}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyPassage(p)}
                      className="text-xs px-3 py-1 rounded-full border border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      {t("copy")}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemovePassage(pid)}
                      className="text-xs px-3 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      {t("delete")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Editor de notas sencillo */}
          <div className="mt-4">
            <label className="block text-sm font-semibold mb-1">
              {t("notes_title")}
            </label>

            <textarea
              className="w-full min-h-[220px] rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:focus:ring-blue-400
                       resize-none"
              value={editedSermon.notes || ""}
              onChange={handleNotesChange}
              placeholder={t("notes_placeholder")}
            />

            {/* Contador de palabras / caracteres + limpiar */}
            <div className="mt-1 flex justify-between text-xs text-gray-400">
              <span>
                {wordCount} {t("words")} · {charCount} {t("characters")}
              </span>

              <button
                type="button"
                onClick={() =>
                  handleNotesChange({
                    target: { value: "" },
                  } as React.ChangeEvent<HTMLTextAreaElement>)
                }
                className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline font-medium"
              >
                {t("clear_notes")}
              </button>
            </div>
          </div>

        
          {/* Botones inferiores */}
          <div className="mt-6 flex justify-between items-end gap-4">
            {/* IZQUIERDA: Diccionario + chips */}
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

            {/* DERECHA: Volver / Guardar */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedSermon(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
              >
                {t("back")}
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
              >
                {t("save")}
              </button>
            </div>
          </div>

          {isDictOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">📘 Diccionario</h3>

                  <button
                    type="button"
                    onClick={() => setIsDictOpen(false)}
                    className="text-xl leading-none"
                    aria-label="Cerrar"
                  >
                    ✕
                  </button>
                </div>

                {/* Buscador */}
                <div className="mt-3 flex gap-2">
                  <input
                    value={dictQuery}
                    onChange={(e) => setDictQuery(e.target.value)}
                    placeholder="Escribe una palabra…"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
                  />

                  <button
                    type="button"
                    onClick={handleSearchDictionary}
                    disabled={dictLoading || !dictQuery.trim()}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
                  >
                    {dictLoading ? "Buscando…" : "Buscar"}
                  </button>
                </div>

                {/* Error */}
                {dictError && (
                  <p className="mt-2 text-sm text-red-600">{dictError}</p>
                )}

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
                    Guardar palabra
                  </button>
                </div>

                {/* Guardadas */}
                <div className="mt-4">
                  <div className="text-sm font-semibold">
                    Palabras guardadas
                  </div>

                  {savedWords.length === 0 ? (
                    <p className="mt-1 text-sm text-gray-500">
                      Aún no has guardado palabras.
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
                              className="text-red-600"
                              title="Eliminar"
                            >
                              🗑️
                            </button>
                          </div>

                          <p className="text-sm text-gray-700">
                            {w.definition}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
