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
import SmartDictionary from './SmartDictionary';

import {
  fetchVerseFromAPI,
  searchByKeyword,
  getVersionsByLanguage,
} from "../services/bibleService";
import { summarizeSermon } from "../services/geminiService";
import { translations, getTranslation } from "../services/translations";

import {
  getLocalYMD,
  normalizeToLocalYMD,
  formatYMDForUI,
} from "../services/dateUtils";

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
  verses?: BibleVerse[]; // ✅ ahora sí existe (opcional)
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
    getTranslation(language as import("../types").Language, key);

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
  useEffect(() => {
    const allowed = getVersionsByLanguage(language);
    const fallback = allowed?.[0] ?? null;

    if (!selectedVersion && fallback) {
      setSelectedVersion(fallback);
    }
  }, [language, selectedVersion]);

  const [keepOpen, setKeepOpen] = useState(false);

  const [showSnippetsHelp, setShowSnippetsHelp] = useState(false);

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

 

  

  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);

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
    setSavedWords((sermon as any).savedWords ?? []);
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
    const dict = (editedSermon as any)?.dictionary;
    setSavedWords(Array.isArray(dict) ? dict : []);
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
  const capitalizeRef = (ref: string) => {
    const s = (ref || "").trim();
    if (!s) return s;

    // Capitaliza la primera letra de cada palabra
    // "mateo 6:12" -> "Mateo 6:12"
    // "1 corintios 13:4" -> "1 Corintios 13:4"
    return s.replace(/\p{L}+/gu, (w) => w.charAt(0).toUpperCase() + w.slice(1));
  };

  const handleCopyVerse = (verse: SavedVerse) => {
    const ref = capitalizeRef(verse.ref);
    navigator.clipboard.writeText(`${ref} (${verse.version}) — ${verse.text}`);
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
              ref: capitalizeRef(v?.ref ?? v?.reference ?? v?.verseRef ?? ""),
              text: v?.text ?? v?.verseText ?? "",
              version: v?.version ?? v?.versionOverride ?? "",
            }))
          : ((editedSermon as any).passageLabels ?? []).map((p: any) => ({
              ref: capitalizeRef(p?.ref ?? p?.reference ?? p?.verseRef ?? ""),
              text: p?.text ?? p?.verseText ?? p?.label ?? "",
              version: p?.version ?? p?.versionOverride ?? "",
            })),

      // ✅ guardar solo las referencias (Juan 3:1, etc.)
      // ✅ guardar keyPassages como OBJETOS (reference + version + text)
      keyPassages: (keyPassages ?? [])
        .map((p: any) => {
          // si viene string, lo convertimos a objeto
          if (typeof p === "string") {
            const ref = capitalizeRef(p);
            // buscamos texto/version desde verses (si existe)
            const fromVerse =
              (editedSermon.verses ?? []).find(
                (v: any) =>
                  String(v?.ref ?? v?.reference ?? v?.verseRef ?? "")
                    .trim()
                    .toLowerCase() === ref.trim().toLowerCase()
              ) ?? null;

            return {
              reference: ref,
              version: String(fromVerse?.version ?? "").trim() || "RVR60",
              text:
                String(fromVerse?.text ?? fromVerse?.verseText ?? "").trim() ||
                "",
            };
          }

          // si ya viene objeto
          const reference = capitalizeRef(
            p?.reference ?? p?.ref ?? p?.verseRef ?? p?.passageRef ?? ""
          );

          // intenta sacar version/text del mismo objeto, o de verses si hace falta
          const fromVerse =
            (editedSermon.verses ?? []).find(
              (v: any) =>
                String(v?.ref ?? v?.reference ?? v?.verseRef ?? "")
                  .trim()
                  .toLowerCase() === reference.trim().toLowerCase()
            ) ?? null;

          const version =
            String(
              p?.version ?? p?.versionOverride ?? fromVerse?.version ?? ""
            ).trim() || "RVR60";

          const text =
            String(
              p?.text ??
                p?.verseText ??
                fromVerse?.text ??
                fromVerse?.verseText ??
                ""
            ).trim() || "";

          return { reference, version, text };
        })
        // quitar vacíos
        .filter((p: any) => p && p.reference)
        // ✅ dedupe (reference + version)
        .reduce((acc: any[], p: any) => {
          const key = `${String(p.reference).toLowerCase()}|${String(
            p.version
          ).toLowerCase()}`;
          if (
            acc.some(
              (x) =>
                `${String(x.reference).toLowerCase()}|${String(
                  x.version
                ).toLowerCase()}` === key
            )
          ) {
            return acc;
          }
          acc.push({ ...p, version: String(p.version).toUpperCase() });
          return acc;
        }, []),

      dictionary: savedWords,
      definitions: editedSermon.definitions ?? {},
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

async function fetchFromDictionaryApi(lang: string, term: string) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/${lang}/${encodeURIComponent(term)}`;
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
        const allowed = getVersionsByLanguage(language).map(normalizeVersion);
        const preferredNorm = normalizeVersion(preferredVersion);

        const fallbackVersion =
          (allowed.includes(preferredNorm) ? preferredNorm : allowed[0]) ||
          preferredNorm ||
          "RVR60";

        const versionsObj =
          versionsFromApi ??
          (versesArray ? { [fallbackVersion]: versesArray } : null);

        if (!versionsObj) {
          setVersionSuggestions([]);
          return;
        }

        setLastChapterRef(ref);
        setAvailableVersionKeys(Object.keys(versionsObj).map(normalizeVersion));
        setSelectedVersion((prev) => {
          const keysUpper = Object.keys(versionsObj).map(normalizeVersion);

          // 1) Si PT y existe ARC, ese es el default
          if (language === "pt" && keysUpper.includes("ARC")) return "ARC";

          // 2) Si ya había una selección válida, respétala
          const prevUp = String(prev || "").toUpperCase();
          if (prevUp && keysUpper.includes(prevUp)) return prevUp;

          // 3) Si no, usa preferredVersion si existe en keys; si no, la primera
          const prefUp = normalizeVersion(preferredVersion);
          if (prefUp && keysUpper.includes(prefUp)) return prefUp;

          return keysUpper[0] || prevUp || "ARC";
        });

        // ✅ Default de versión por idioma (sin pisar selección manual)
        const normalizedKeys = Object.keys(versionsObj).map(normalizeVersion);

        const defaultByLanguage =
          language === "pt" && normalizedKeys.includes("ARC")
            ? "ARC"
            : normalizeVersion(
                getVersionsByLanguage(language)[0] || normalizedKeys[0] || ""
              );

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
          selectedVersion || preferredVersion || "RVR60"
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

  // Normaliza versiones para comparar API / UI / guardado
  const normalizeVersion = (v: string) => {
    const up = String(v ?? "")
      .trim()
      .toUpperCase();

    // Unificamos Reina Valera 1960
    if (up === "RVR1960") return "RVR60";
    if (up === "RV1960") return "RVR60"; // <-- ESTA ES LA CLAVE
    if (up === "RV 1960") return "RVR60";
    if (up === "RVR 1960") return "RVR60";

    return up;
  };

  // =======================
  // Version switch (chips)
  // =======================

  const loadChapterInVersion = async (versionKey: string) => {
    if (!lastChapterRef) return;

    // 1) Traer el capítulo en la versión seleccionada
    const result = await fetchVerseFromAPI(
      lastChapterRef,
      normalizeVersion(versionKey)
    );

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
    const allowed = getVersionsByLanguage(language);
    const allowedUpper = allowed.map(normalizeVersion);

    // 4) Mantener botones de versiones (sin texto) usando availableVersionKeys
    const versionButtons = (availableVersionKeys || [])
      .filter((vk) => {
        const up = normalizeVersion(String(vk));
        const current = normalizeVersion(String(versionKey));

        // no mostrar chip de la versión que ya está seleccionada
        if (up === current) return false;

        // si no hay lista (por alguna razón), mostramos todo lo demás
        if (allowedUpper.length === 0) return true;

        // mostrar solo las permitidas por idioma
        return allowedUpper.includes(up);
      })
      .map((vk) => ({
        id: `${ref}-${vk}`,
        reference: ref,
        version: normalizeVersion(String(vk)),

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

    const chosenVersionNorm = normalizeVersion(
      versionOverride || selectedVersion || preferredVersion || "RVR60"
    );

    try {
      setAddingPassage(true);
      setPassageError(null);

      // Usamos el MISMO helper que SmartBible
      const referenceData: BibleSearchResult | null = await fetchVerseFromAPI(
        ref,
        chosenVersionNorm
      );

      if (!referenceData || !referenceData.versions) {
        setPassageError("No se encontró este pasaje.");
        return;
      }

      // 1) sacar todas las versiones disponibles que devolvió la API
      const apiVersions = Object.keys(referenceData.versions || {});
      const apiNormalized = apiVersions.map(normalizeVersion);

      // ✅ Si el pasaje base ya está en RVR60 pero la API no lo trae en "versions", lo agregamos
      if (!apiNormalized.includes("RVR60")) {
      }

      // 1) Versiones permitidas por idioma (fuente única)
      const allowed = getVersionsByLanguage(language);
      const allowedNorm = allowed.map(normalizeVersion);

      // 2) Elegir versión:
      // - preferredVersion si es permitida y existe en la API
      // - si no, la primera permitida que exista en la API
      // - si no, fallback a la primera que venga de la API o RVR60
      const preferredNorm = normalizeVersion(preferredVersion);

      // 3) referenceData.versions usa keys originales: buscamos la key real equivalente
      const chosenKey =
        apiVersions.find((k) => normalizeVersion(k) === chosenVersionNorm) ||
        chosenVersionNorm;

      const versesList = referenceData.versions[chosenKey] as BibleVerse[];

      if (!versesList || versesList.length === 0) {
        setPassageError("No se encontraron versículos para este pasaje.");
        return;
      }

      // 4) Texto COMPLETO del capítulo: "1. ... 2. ... 3. ..."
      const fullText = versesList
        .map((v) => `${v.number}. ${v.text}`)
        .join("\n");

      // 5) Referencia normalizada (para que SIEMPRE se vea "Juan 3", "Mateo 6:33", etc.)
      const reference = (refOverride ?? ref ?? referenceData?.ref ?? "").trim();

      // ✅ Guardar el pasaje con texto completo (para que no se pierda al reabrir)

      const newVerse = {
        ref: reference,
        text: fullText,
        version: chosenVersionNorm,
      };

      setEditedSermon((prev: any) => ({
        ...prev,
        verses: [...(prev.verses || []), newVerse],
        keyPassages: [...(prev.keyPassages || []), newPassage], // ✅ guarda el objeto completo
      }));

      // 6) Crear el pasaje clave que se guarda en el sermón
      const newPassage: KeyPassage = {
        id: `${reference}-${chosenVersionNorm}-${Date.now()}`, // id más único
        reference, // ✅ ahora SI se guarda la referencia correcta
        version: chosenVersionNorm, // ✅ versión
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
    const referenceCap = capitalizeRef(reference);

    const version =
      typeof p === "string" ? "" : p.version ?? p.versionOverride ?? "";

    // normalizador para evitar problemas de mayúsculas / espacios
    const norm = (s: any) =>
      String(s ?? "")
        .toLowerCase()
        .trim();

    // 1) si es string, buscamos el texto en editedSermon.verses (normalizado)
    // 2) si es objeto, usamos p.text
    const found =
      typeof p === "string"
        ? (editedSermon.verses || []).find((v: any) => norm(v.ref) === norm(p))
        : p;

    const text = (found?.text ?? found?.verseText ?? "").trim();

    const header = version ? `${referenceCap} (${version})` : referenceCap;

    // 👉 NO agrega "—" si no hay texto
    const textToCopy = text ? `${header} — ${text}` : header;

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
      keyPassages: (prev.keyPassages || []).filter((p: any) => {
        const ref = typeof p === "string" ? p : p?.reference ?? p?.ref ?? "";
        return ref !== pid;
      }),

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

  const applyFormat = (
    type:
      | "bold"
      | "italic"
      | "h1"
      | "list"
      | "quote"
      | "quotes"
      | "slash"
      | "highlight"
  ) => {
    const ta = notesRef.current;
    if (!ta) return;

    const value = ta.value ?? "";
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;

    const selected = value.slice(start, end);
    const before = value.slice(0, start);
    const after = value.slice(end);

    const wrap = (left: string, right = left) => {
      const insert = `${left}${selected || ""}${right}`;
      const nextValue = `${before}${insert}${after}`;

      // actualiza estado usando tu handler existente
      handleNotesChange({
        target: { value: nextValue },
      } as React.ChangeEvent<HTMLTextAreaElement>);

      // volver foco + posicionar cursor
      requestAnimationFrame(() => {
        ta.focus();
        if (selected) {
          ta.setSelectionRange(start + left.length, end + left.length);
        } else {
          // si no había selección, coloca cursor en medio
          const pos = start + left.length;
          ta.setSelectionRange(pos, pos);
        }
      });
    };

    const prefixLines = (prefix: string) => {
      const block = selected || "";
      const lines = block.length ? block.split("\n") : [""];
      const withPrefix = lines.map((l) => `${prefix}${l}`).join("\n");

      const insert = withPrefix;
      const nextValue = `${before}${insert}${after}`;

      handleNotesChange({
        target: { value: nextValue },
      } as React.ChangeEvent<HTMLTextAreaElement>);

      requestAnimationFrame(() => {
        ta.focus();
        const newStart = start;
        const newEnd = start + insert.length;
        ta.setSelectionRange(newStart, newEnd);
      });
    };

    switch (type) {
      case "bold":
        wrap("**");
        break;
      case "italic":
        wrap("*");
        break;
      case "h1":
        prefixLines("# ");
        break;
      case "list":
        prefixLines("- ");
        break;
      case "quote":
        prefixLines("> ");
        break;
      case "quotes":
        wrap("“", "”");
        break;
      case "slash":
        wrap("/");
        break;
      case "highlight":
        wrap("==", "==");
        break;
    }
  };

  // Cuando cambian las notas
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setEditedSermon((prev) => ({
      ...prev,
      notes: value,
    }));
  };
  const handleNotesKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // TAB = autocompletado inteligente (# intro, # texto, etc.)
    if (e.key === "Tab" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const didExpand = tryExpandSnippetAtCursor();
      if (didExpand) {
        e.preventDefault();
        return;
      }
    }

    const isCtrl = e.ctrlKey || e.metaKey; // Ctrl (Windows) / Cmd (Mac)
    if (!isCtrl) return;

    if (isCtrl && e.shiftKey && e.key.toLowerCase() === "h") {
      e.preventDefault();
      applyFormat("highlight");
      return;
    }
    switch (e.key.toLowerCase()) {
      case "b":
        e.preventDefault();
        applyFormat("bold");
        break;

      case "/":
        e.preventDefault();
        applyFormat("slash");
        break;

      case "h":
        e.preventDefault();
        applyFormat("h1");
        break;

      case "l":
        e.preventDefault();
        applyFormat("list");
        break;

      case "q":
        e.preventDefault();
        applyFormat("quote");
        break;

      default:
        break;
    }
  };

  // 👇 AQUÍ VA SNIPPETS
  const SNIPPETS: Record<string, string> = {
    "# intro": "# Introducción\n\n",
    "# texto": "# Texto base\n\n",
    "# puntos": "# Puntos principales\n- \n- \n- \n\n",
    "# aplicacion": "# Aplicación\n\n",
    "# conclusion": "# Conclusión\n\n",
    "# oracion": "# Oración\n\n",
    "# notas": "# Notas\n\n",
  };
  const tryExpandSnippetAtCursor = () => {
    const ta = notesRef.current;
    if (!ta) return false;

    const value = ta.value ?? "";
    const cursor = ta.selectionStart ?? 0;

    // inicio y fin de la línea actual
    const lineStart = value.lastIndexOf("\n", cursor - 1) + 1;
    const lineEnd = value.indexOf("\n", cursor);
    const end = lineEnd === -1 ? value.length : lineEnd;

    const currentLine = value.slice(lineStart, end).trim().toLowerCase();

    const expansion = SNIPPETS[currentLine];
    if (!expansion) return false;

    const before = value.slice(0, lineStart);
    const after = value.slice(end);

    const nextValue = `${before}${expansion}${after}`;

    handleNotesChange({
      target: { value: nextValue },
    } as React.ChangeEvent<HTMLTextAreaElement>);

    requestAnimationFrame(() => {
      ta.focus();
      const pos = lineStart + expansion.length;
      ta.setSelectionRange(pos, pos);
    });

    return true;
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

  const exportNotesPdf = () => {
    const escapeHtml = (s: string) =>
      (s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const title = escapeHtml((editedSermon.title ?? "").trim() || "Sermón");
    const preacher = escapeHtml((editedSermon.preacher ?? "").trim());
    const date = escapeHtml(
      formatYMDForUI(
        normalizeToLocalYMD(editedSermon.date),
        language === "en" ? "en-US" : language === "pt" ? "pt-BR" : "es-US"
      )
    );

    const notes = escapeHtml(String(editedSermon.notes ?? ""));

    const passagesHtml =
      keyPassages.length > 0
        ? `
      <ul class="list">
        ${keyPassages
          .map((p: any) => {
            // 1) Label bonito (Lucas 1:1)
            const rawLabel =
              typeof p === "string" ? p : p?.reference ?? getPassageLabel(p);

            const niceLabel = String(rawLabel || "")
              .trim()
              .split(" ")
              .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
              .join(" ");

            // 2) Buscar texto del versículo (caja verde)
            const verseObj =
              typeof p === "string"
                ? (editedSermon.verses || []).find(
                    (v: any) =>
                      String(v.ref || "")
                        .toLowerCase()
                        .trim() === String(p).toLowerCase().trim()
                  )
                : (p as any);

            const verseText = verseObj?.text || verseObj?.verseText || "";

            if (!niceLabel) return "";

            // 3) Render
            return `
              <li class="passage-item">
                <div class="passage-ref">${escapeHtml(niceLabel)}</div>
                ${
                  verseText
                    ? `<div class="passage-text">${escapeHtml(
                        String(verseText)
                      )}</div>`
                    : ""
                }
              </li>
            `;
          })
          .filter(Boolean)
          .join("")}
      </ul>
    `
        : `<div class="muted">${escapeHtml(
            String(t("no_passages" as any))
          )}</div>`;

    const termsHtml =
      savedWords.length > 0
        ? `<ul class="list">
        ${savedWords
          .map((w) => {
            const term = escapeHtml(String(w.term || ""));
            const rawDef = String(w.definition || "");

            // limpia markdown y saltos raros
            const cleanedDef = rawDef
              .replace(/\*\*/g, "") // quita ** bold
              .replace(/\r?\n{3,}/g, "\n\n")
              .trim();

            const def = escapeHtml(cleanedDef);

            return `
              <li class="term-item">
                <div class="term-term">${term}</div>
                ${def ? `<div class="term-def">${def}</div>` : ""}
              </li>
            `;
          })
          .join("")}
      </ul>`
        : `<div class="muted">${escapeHtml(
            String(t("defined_terms_empty" as any))
          )}</div>`;

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    @page { margin: 18mm; }
    body { font-family: Arial, sans-serif; color: #111; }
    .header { border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 14px; }
    h1 { margin: 0; font-size: 20px; line-height: 1.2; }
    .meta { margin-top: 6px; font-size: 12px; color: #444; display: flex; gap: 10px; flex-wrap: wrap; }
    .pill { border: 1px solid #ddd; padding: 4px 8px; border-radius: 999px; background: #fafafa; }
    .section { margin-top: 14px; }
    .section h2 { margin: 0 0 6px 0; font-size: 14px; }
    .muted { color: #666; font-size: 12px; }
    .list { margin: 6px 0 0 18px; padding: 0; }
    .list li { margin: 2px 0; }
    .term-item { margin: 8px 0; }
.term { font-weight: 700; }
.term-def { margin-top: 4px; color: #444; font-size: 12px; white-space: pre-line; }
.term-item { margin: 8px 0; }
.term { font-weight: 700; margin-bottom: 4px; text-transform: capitalize; }
.term-def { color: #222; font-size: 12px; line-height: 1.35; white-space: pre-wrap; }


   pre{
  margin: 0;
  padding: 14px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.5;
  font-size: 13px;
}

  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <div class="meta">
      ${
        preacher
          ? `<div class="pill">${escapeHtml(
              String(t("preacher" as any))
            )}: ${preacher}</div>`
          : ""
      }
      ${
        date
          ? `<div class="pill">${escapeHtml(
              String(t("date" as any))
            )}: ${date}</div>`
          : ""
      }
    </div>
  </div>

  <div class="section">
    <h2>${escapeHtml(String(t("key_passages" as any)))}</h2>
    ${passagesHtml}
  </div>

  <div class="section">
    <h2>${escapeHtml(String(t("my_notes" as any)))}</h2>
    <pre>${notes}</pre>
  </div>
</body>
<div class="section">
  <h2>${escapeHtml(String(t("defined_terms_title" as any)))}</h2>
${termsHtml}

</div>

</html>`;

    const w = window.open("", "_blank");
    if (!w) return;

    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();

    setTimeout(() => {
      w.print();
    }, 250);
  };

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
            value={normalizeToLocalYMD(editedSermon.date)}
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
                        <span className="font-medium capitalize flex items-center gap-2">
                          {s.reference}

                          <span className="text-[10px] px-2 py-[1px] rounded-full border border-gray-300 text-gray-600">
                            {String(
                              (s as any).version ||
                                selectedVersion ||
                                preferredVersion ||
                                "RVR60"
                            ).toUpperCase()}
                          </span>
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
                            className={`px-3 py-1 rounded-full border text-xs transition
  ${
    selectedVersion?.toUpperCase() === String(s.version).toUpperCase()
      ? "bg-blue-600 text-white border-blue-600"
      : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
  }`}
                            onClick={() => {
                              const v = normalizeVersion(String(s.version));
                              setSelectedVersion(v);
                              loadChapterInVersion(v);
                            }}
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

              const verseObj =
                typeof p === "string"
                  ? (editedSermon.verses || []).find(
                      (v: any) =>
                        v.ref?.toLowerCase().trim() ===
                        String(p).toLowerCase().trim()
                    )
                  : (p as any);

              const text = verseObj?.text || verseObj?.verseText || "";

              const version = verseObj?.version ?? "";

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
                        <rect
                          x="9"
                          y="9"
                          width="13"
                          height="13"
                          rx="2"
                          ry="2"
                        />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemovePassage(pid)}
                      className="text-xs px-3 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50"
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
                </div>
              );
            })}
          </div>

          {/* Editor de notas sencillo */}
          <div className="mt-4">
            <label className="block text-base font-semibold mb-2 text-gray-900">
              {t("notes_title")}
            </label>

            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <button
                type="button"
                onClick={() => applyFormat("bold")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-900
           hover:bg-gray-100 active:scale-[0.98]
           focus:outline-none focus:ring-2 focus:ring-blue-500
           dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                title={`${t("fmt_bold" as any)} (Ctrl+B)`}
              >
                *
              </button>

              <button
                type="button"
                onClick={() => applyFormat("slash")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-900
           hover:bg-gray-100 active:scale-[0.98]
           focus:outline-none focus:ring-2 focus:ring-blue-500
           dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                title={`${t("fmt_slash" as any)} (Ctrl+/)`}
              >
                /
              </button>

              <div className="mx-1 h-6 w-px bg-gray-200 dark:bg-gray-700" />

              <button
                type="button"
                onClick={() => applyFormat("h1")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-900
           hover:bg-gray-100 active:scale-[0.98]
           focus:outline-none focus:ring-2 focus:ring-blue-500
           dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                title={`${t("fmt_h1" as any)} (Ctrl+H)`}
              >
                #
              </button>

              <button
                type="button"
                onClick={() => applyFormat("list")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-900
           hover:bg-gray-100 active:scale-[0.98]
           focus:outline-none focus:ring-2 focus:ring-blue-500
           dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                title={`${t("fmt_list" as any)} (Ctrl+L)`}
              >
                -
              </button>
              <div className="mx-1 h-6 w-px bg-gray-200 dark:bg-gray-700" />

              <button
                type="button"
                onClick={() => applyFormat("quotes")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-900
           hover:bg-gray-100 active:scale-[0.98]
           focus:outline-none focus:ring-2 focus:ring-blue-500
           dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                title={`${t("fmt_quote" as any)} (Ctrl+Q)`}
              >
                ❝
              </button>
              <button
                type="button"
                onClick={() => applyFormat("highlight")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-yellow-200 bg-yellow-50 text-sm font-semibold text-yellow-800
           hover:bg-yellow-100 active:scale-[0.98]
           focus:outline-none focus:ring-2 focus:ring-blue-500
           dark:border-yellow-900/50 dark:bg-yellow-900/20 dark:text-yellow-200 dark:hover:bg-yellow-900/30"
                title={`${t("fmt_highlight" as any)} (Ctrl+Shift+H)`}
              >
                🖍
              </button>

              <button
                type="button"
                onClick={() => setShowSnippetsHelp((v) => !v)}
                className="rounded-md border px-2 py-1 text-xs font-semibold
             hover:bg-gray-100 dark:hover:bg-gray-800"
                title={`${t("snippets_help" as any)}`}
              >
                ?
              </button>
            </div>
            {showSnippetsHelp && (
              <div
                className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm
                  dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="mb-2 font-semibold">
                  {t("snippets_title" as any)}
                </div>

                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <code># intro</code> → {t("snip_intro" as any)}
                  </li>
                  <li>
                    <code># texto</code> → {t("snip_texto" as any)}
                  </li>
                  <li>
                    <code># puntos</code> → {t("snip_puntos" as any)}
                  </li>
                  <li>
                    <code># aplicacion</code> → {t("snip_aplicacion" as any)}
                  </li>
                  <li>
                    <code># conclusion</code> → {t("snip_conclusion" as any)}
                  </li>
                  <li>
                    <code># oracion</code> → {t("snip_oracion" as any)}
                  </li>
                  <li>
                    <code># notas</code> → {t("snip_notas" as any)}
                  </li>
                </ul>

                <div className="mt-2 text-xs text-gray-500">
                  {t("snippets_tip" as any)}
                </div>
              </div>
            )}

            <textarea
              ref={notesRef}
              className="w-full min-h-[220px] rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:focus:ring-blue-400
                       resize-none"
              value={editedSermon.notes || ""}
              onChange={handleNotesChange}
              onKeyDown={handleNotesKeyDown}
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
          <button
            type="button"
            onClick={exportNotesPdf}
            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline font-medium"
          >
            {t("export_pdf" as any)}
          </button>

          {/* Botones inferiores */}
          <div className="mt-6 flex justify-between items-end gap-4">
            {/* IZQUIERDA: Diccionario + chips */}
            {/* IZQUIERDA: Diccionario unificado */}
<SmartDictionary
  language={language}
  savedWords={savedWords}
  setSavedWords={setSavedWords}
  storageKey="ncm_saved_words_sermon"
  variant="modal"
/>






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

         
        </div>
      </div>
    </div>
  );
};
