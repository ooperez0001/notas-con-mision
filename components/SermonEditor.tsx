import React, { useState, useEffect, useRef } from 'react';
import { Sermon, BibleSearchResult, BibleVerse, SavedVerse, UserProfile, Language } from '../types';
import { Modal } from './Modal';
import { BibleDictionary } from './BibleDictionary';
import { fetchVerseFromAPI, searchByKeyword, getVersionsByLanguage } from '../services/bibleService';
import { summarizeSermon } from '../services/geminiService';
import { translations } from '../services/translations';


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


export const SermonEditor: React.FC<SermonEditorProps> = ({ sermon, setSelectedSermon, setSermons, user, onOpenPremium, language, preferredVersion }) => {
  const [editedSermon, setEditedSermon] = useState<Sermon>(sermon);
  const [verseQuery, setVerseQuery] = useState('');
  const [verseResults, setVerseResults] = useState<BibleSearchResult | null>(null);
  const [isVerseLoading, setIsVerseLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
  const [definitionModal, setDefinitionModal] = useState<{ isOpen: boolean; term: string; content: string }>({ isOpen: false, term: '', content: '' });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsTimerRef = useRef<number | null>(null);
  const t = translations[language];
const [keyPassages, setKeyPassages] = useState<KeyPassage[]>([]);
const [newPassageRef, setNewPassageRef] = useState('');
const [addingPassage, setAddingPassage] = useState(false);
const [passageError, setPassageError] = useState<string | null>(null);
const [searchResults, setSearchResults] = useState<KeyPassageOption[]>([]);
const [versionSuggestions, setVersionSuggestions] = useState<KeyPassage[]>([]);
const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
const VERSIONS_BY_LANG: Record<string, string[]> = {
  es: ["rvr1960", "nvi", "ntv", "dhh", "lbla"],
  en: ["kjv", "niv"],
  pt: ["arc"],
};

  useEffect(() => {
  if (!verseQuery) {
    setVersionSuggestions([]);
    return;
  }
setVersionSuggestions([]);
setIsVerseLoading(true);

  const handler = setTimeout(() => {
    setIsVerseLoading(true);

    fetchVerseFromAPI(verseQuery, preferredVersion)
      .then((results) => {
        if (!results?.versions) {
          setVersionSuggestions([]);
          return;
        }

        const ref = (results.ref || verseQuery).trim();
       const allVersions = Object.keys(results.versions || {});

// armamos una sugerencia por versión, PERO ahora incluyendo verses y text
const suggestions = allVersions.map((v) => {
  const versesRaw = (results.versions?.[v] || []) as any[];

  const fullText = versesRaw
    .map((x) => {
      const num = x.number ?? x.verse ?? x.num ?? "";
      const txt = x.text ?? x.content ?? x.verseText ?? "";
      return `${num ? num + ". " : ""}${String(txt).trim()}`;
    })
    .filter(Boolean)
    .join("\n");


  return {
    id: `${(results.ref || verseQuery.trim())}-${v}`,
    reference: results.ref || verseQuery.trim(),
    version: v,
    text: fullText,     // para vista previa
    verses: versesRaw,  // ✅ esto es lo que hará que se vean separados
    isJesusWords: false,
  };
});

suggestions.sort((a, b) =>
  a.version === preferredVersion ? -1 : b.version === preferredVersion ? 1 : 0
);

setVersionSuggestions(suggestions as any);

      })
      .finally(() => {
        setIsVerseLoading(false);
      });
  }, 800);

  return () => clearTimeout(handler);
}, [verseQuery, preferredVersion]);

  
  // Seguridad al inicializar verses en caso de datos antiguos corruptos
  useEffect(() => {
      if (!editedSermon.verses) {
          setEditedSermon(prev => ({ ...prev, verses: [] }));
      }
  }, []);
  
  const handleAddVerse = (version: string, verses: BibleVerse[]) => {
    const fullText = verses.map(v => v.text).join(' ');
    const hasJesusWords = verses.some(v => v.isJesusWords);
    const newVerse: SavedVerse = {
        ref: verseResults!.ref,
        text: fullText,
        version: version,
        isJesusWords: hasJesusWords
    };

    setEditedSermon(prev => ({ 
        ...prev, 
        verses: [...(prev.verses || []), newVerse] 
    }));
    
    // Reset search
    setVerseQuery('');
    setVerseResults(null);
  };
  
  const handleRemoveVerse = (index: number) => {
      setEditedSermon(prev => ({
          ...prev,
          verses: (prev.verses || []).filter((_, i) => i !== index)
      }));
  };

  const handleDefineWord = (term: string, definition: string) => {
    const capitalizedTerm = term.charAt(0).toUpperCase() + term.slice(1).toLowerCase();
    setEditedSermon(prev => ({ ...prev, definitions: { ...(prev.definitions || {}), [capitalizedTerm]: definition }}));
  };

  const handleDeleteDefinition = (termToDelete: string) => {
    const newDefinitions = { ...editedSermon.definitions };
    delete newDefinitions[termToDelete];
    setEditedSermon(prev => ({ ...prev, definitions: newDefinitions }));
  };

  const handleToolbarClick = (prefix: string, suffix = '') => {
    const textarea = notesRef.current; if (!textarea) return;
    const { selectionStart, selectionEnd } = textarea;
    const currentText = editedSermon.notes || '';
    const textBefore = currentText.substring(0, selectionStart);
    const textAfter = currentText.substring(selectionEnd);
    const prefixWithNewline = (textBefore.length > 0 && textBefore.slice(-1) !== '\n') ? `\n${prefix}` : prefix;
    const newText = textBefore + prefixWithNewline + suffix + textAfter;
    setEditedSermon(prev => ({ ...prev, notes: newText }));
    setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = selectionStart + prefixWithNewline.length;
    }, 0);
  };

  const handleCopyVerse = (verse: SavedVerse) => {
     navigator.clipboard.writeText(`"${verse.text}" - ${verse.ref} (${verse.version})`);
     setCopySuccess(verse.ref);
     setTimeout(() => setCopySuccess(null), 2000);
  };

  const handleSave = () => {
    setSermons(prevSermons => {
      const exists = prevSermons.find(s => s.id === editedSermon.id);
      if (exists) { return prevSermons.map(s => s.id === editedSermon.id ? editedSermon : s); }
      return [editedSermon, ...prevSermons];
    });
    setSelectedSermon(null);
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

      if (!result?.versions) {
        setVersionSuggestions([]);
        return;
      }

      const allowedVersions = VERSIONS_BY_LANG[language] ?? [];

const suggestions = Object.entries(result.versions)
  .filter(([versionKey]) =>
    allowedVersions.length === 0 || allowedVersions.includes(versionKey)
  )
  .map(([versionKey, verses]) => {
    if (!verses || verses.length === 0) return null;

    const fullText = verses
      .map((v: any) => {
        const num = v.number ?? v.verse ?? "";
        const txt = v.text ?? v.content ?? "";
        return `${num ? num + ". " : ""}${txt}`;
      })
      .join("\n"); // 👈 versículos separados

    return {
      id: `${result.ref}-${versionKey}`,
      reference: result.ref,
      version: versionKey,
      text: fullText,
    };
  })
  .filter(Boolean) as KeyPassage[];


      setVersionSuggestions(suggestions);
    } catch (e) {
      setVersionSuggestions([]);
    } finally {
      setIsSearchingSuggestions(false);
    }
  }, 350);
};

  const handleAddPassage = async (versionOverride?: string) => {

  const ref = newPassageRef.trim();
  if (!ref) return;
const chosenVersion = versionOverride || selectedVersion || preferredVersion;

  try {
    setAddingPassage(true);
    setPassageError(null);

    // Usamos el MISMO helper que SmartBible
    const referenceData: BibleSearchResult | null = await fetchVerseFromAPI(ref);

    if (!referenceData || !referenceData.versions) {
      setPassageError('No se encontró este pasaje.');
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
      'RVR60';

    // 3) lista de versículos de ese capítulo en esa versión
    const versesList = referenceData.versions[chosenVersion] as BibleVerse[];

    if (!versesList || versesList.length === 0) {
      setPassageError('No se encontraron versículos para este pasaje.');
      return;
    }

    // 4) Texto COMPLETO del capítulo: "1. ... 2. ... 3. ..."
    const fullText = versesList
  .map((v) => `${v.number}. ${v.text}`)
  .join('\n');


    // 5) Referencia normalizada (para que SIEMPRE se vea "Juan 3", "Mateo 6:33", etc.)
const reference = (referenceData?.ref || ref || '').trim();


// 6) Crear el pasaje clave que se guarda en el sermón
const newPassage: KeyPassage = {
  id: `${reference}-${chosenVersion}-${Date.now()}`, // id más único
  reference,                         // ✅ ahora SI se guarda la referencia correcta
  version: chosenVersion,            // ✅ versión
  text: fullText,                    // ✅ capítulo completo o versículo según lo que escribas
};


    // 6) Guardarlo en el estado de pasajes
    setKeyPassages((prev) => [...prev, newPassage]);
    setNewPassageRef('');
  } catch (error) {
    console.error('Error al buscar pasaje:', error);
    setPassageError('Ocurrió un error al buscar el pasaje.');
  } finally {
    setAddingPassage(false);

    // ✅ limpiar UI después de añadir
setNewPassageRef("");
setVerseQuery("");
setVerseResults(null);
setVersionSuggestions([]);

  }
};


// Copiar pasaje completo
const handleCopyPassage = async (p: KeyPassage) => {
  const textToCopy = `${p.reference} (${p.version}) — ${p.text}`;
  try {
    await navigator.clipboard.writeText(textToCopy);
    // opcional: más adelante podemos mostrar un pequeño "Copiado ✅"
  } catch (error) {
    console.error('Error al copiar pasaje:', error);
  }
};

// Eliminar pasaje de la lista
const handleRemovePassage = (id: string) => {
  setKeyPassages(prev => prev.filter(p => p.id !== id));
};

  const handleDeleteConfirm = () => {
    setSermons(prev => prev.filter(s => s.id !== sermon.id));
    setSelectedSermon(null);
    setIsDeleteModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { 
      const { name, value } = e.target; 
      setEditedSermon(prev => ({ ...prev, [name]: value })); 
  };
  
  // Referencia al textarea para poder saber qué texto está seleccionado
const textareaRef = useRef<HTMLTextAreaElement | null>(null);

// Cuando cambian las notas
const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  const value = e.target.value;
  setEditedSermon(prev => ({
    ...prev,
    notes: value,
  }));
};

// Tipos de formato que vamos a aplicar
type NoteFormat = 'bold' | 'italic';

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

  if (format === 'bold') {
    formatted = `**${selected}**`;   // Negrita en Markdown
  } else if (format === 'italic') {
    formatted = `*${selected}*`;     // Cursiva en Markdown
  }

  const newValue = before + formatted + after;

  setEditedSermon(prev => ({
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
  setEditedSermon(prev => ({
    ...prev,
    notes: '',
  }));
};

  const handleSummarize = async () => {
      if (!user.isPremium) {
          onOpenPremium();
          return;
      }
      
      if (!editedSermon.notes && (!editedSermon.verses || editedSermon.verses.length === 0)) {
          alert("Escribe algunas notas o añade versículos para generar un resumen.");
          return;
      }

      setIsSummarizing(true);
      const versesText = (editedSermon.verses || []).map(v => `${v.ref}: ${v.text}`).join('\n');
      const summary = await summarizeSermon(editedSermon.title, editedSermon.notes, versesText);
      
      // Append summary to notes
      setEditedSermon(prev => ({
          ...prev,
          notes: (prev.notes || '') + '\n\n--- 🤖 RESUMEN IA ---\n' + summary
      }));
      setIsSummarizing(false);
  };

  // --- Estadísticas de las notas (para mostrar debajo del textarea) ---
  const notesText = editedSermon.notes || '';
  const wordCount = notesText.trim() ? notesText.trim().split(/\s+/).length : 0;
  const charCount = notesText.length;

          return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors duration-200">
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        {/* Encabezado básico */}
        <h1 className="text-2xl font-bold mb-2">
          {editedSermon.title || 'Nuevo sermón'}
        </h1>

        <p className="text-sm text-gray-500">
          Predicador: {editedSermon.preacher || '—'}
        </p>
{/* PASAJES CLAVE */}
<div className="mb-6">
  <label className="block text-sm font-medium text-gray-600 mb-2">
    Pasajes clave
  </label>

  {/* Barra de búsqueda de pasaje */}
  <div className="flex gap-2">
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

// Siempre actualiza verseQuery cuando el usuario escribe (capítulo o versículo)
setVerseQuery(value);


}}

      onKeyDown={e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (!addingPassage) {
      handleAddPassage();
    }
  }
}}
      placeholder="Ej. Juan 3:16, Mateo 6:33..."
      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
    {isSearchingSuggestions && (
  <div className="mt-2 text-sm text-gray-500">
    Buscando versiones...
  </div>
)}
<button
      type="button"
      onClick={handleAddPassage}
      disabled={addingPassage || !newPassageRef.trim()}
      className={`px-4 py-2 rounded-xl text-sm font-semibold text-white ${
        addingPassage || !newPassageRef.trim()
          ? 'bg-gray-300 cursor-not-allowed'
          : 'bg-blue-600 hover:bg-blue-700'
      }`}
    >
      {addingPassage ? 'Buscando...' : 'Añadir'}
    </button>
  </div>

{versionSuggestions.length > 0 && (
  <div className="mt-2 rounded-xl border border-red-500 bg-white shadow-sm max-h-[320px] overflow-y-auto">


    {versionSuggestions.map((s) => (
      <button
        key={`${s.reference}-${s.version}`}

        type="button"
      onClick={() => {
  setNewPassageRef(s.reference);
  setVerseQuery(s.reference); // opcional, si quieres que el input refleje lo elegido
  setVersionSuggestions([]);
  handleAddPassage();
}}

       className="w-full text-left px-4 py-2 hover:bg-blue-50 flex justify-between items-start gap-3"

      >
        <span className="font-medium capitalize">{s.reference}</span>
{s.verses && Array.isArray(s.verses) ? (
  <div className="mt-2 space-y-1 text-xs text-gray-700">
    {s.verses.map((v: any, idx: number) => (
      <div key={idx} className="leading-relaxed">
        <span className="font-semibold mr-1">
          {(v.number ?? v.verse ?? v.num) || idx + 1}.
        </span>
        <span>{v.text || v.verse || v.content || ""}</span>
      </div>
    ))}
  </div>
) : (
  s.text && (
   <div className="mt-1 text-xs text-gray-600 whitespace-pre-line max-h-48 overflow-auto pr-2">
  {s.text}
</div>

  )
)}

        <span
          className={`text-xs px-2 py-1 rounded-full ${
            s.version === preferredVersion
              ? "bg-yellow-100 text-yellow-800"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {s.version}
          {s.version === preferredVersion && " ⭐"}
        </span>
      </button>
    ))}
  </div>
)}


    
  {/* Error al buscar */}
  {passageError && (
    <p className="text-xs text-red-500 mt-1">{passageError}</p>
  )}

  {/* Lista de pasajes agregados */}
  <div className="mt-3 space-y-2">
    {keyPassages.map((p) => (
      <div
        key={p.id}
        className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm flex justify-between items-start gap-3"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold capitalize">{p.reference}</span>
            <span className="text-[10px] px-2 py-1 rounded-full bg-white border border-green-200">
              {p.version}
            </span>
          </div>
  <div className="mt-1 max-h-[260px] overflow-y-auto pr-2">
  <p className="text-[13px] text-green-800 italic whitespace-pre-line">
    "{p.text}"
  </p>
</div>


        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => handleCopyPassage(p)}
            className="text-xs px-3 py-1 rounded-full border border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            Copiar
          </button>
          <button
            type="button"
            onClick={() => handleRemovePassage(p.id)}
            className="text-xs px-3 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50"
          >
            Eliminar
          </button>
        </div>
      </div>
    ))}
  </div>
</div>

        {/* Editor de notas sencillo */}
        <div className="mt-4">
          <label className="block text-sm font-semibold mb-1">
            Notas del sermón
          </label>

          <textarea
            className="w-full min-h-[220px] rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:focus:ring-blue-400
                       resize-none"
            value={editedSermon.notes || ''}
            onChange={handleNotesChange}
            placeholder={t.notes_placeholder}
          />

          {/* Contador de palabras / caracteres + limpiar */}
          <div className="mt-1 flex justify-between text-xs text-gray-400">
            <span>
              {wordCount} palabras · {charCount} caracteres
            </span>

            <button
              type="button"
              onClick={() =>
                handleNotesChange({
                  target: { value: '' },
                } as React.ChangeEvent<HTMLTextAreaElement>)
              }
                className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline font-medium"
            >
              Limpiar notas
            </button>
          </div>
        </div>

        {/* Botones inferiores */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => setSelectedSermon(null)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm
                       hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            ← Volver
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold
                       hover:bg-blue-700 shadow-sm"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};
