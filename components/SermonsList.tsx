import React, { useState } from 'react';
import { PlusCircle, Search } from 'lucide-react';
import { Sermon, UserProfile, Language } from '../types';
import { SermonEditor } from './SermonEditor';
import { translations, getTranslation } from "../services/translations";
import { getLocalYMD } from "../services/dateUtils";


interface SermonsListProps {
  sermons: Sermon[];
  setSermons: React.Dispatch<React.SetStateAction<Sermon[]>>;
  selectedSermon: Sermon | null; // Keep for interface compatibility, though handled internally
  setSelectedSermon: (sermon: Sermon | null) => void; // Keep for interface compatibility
  user: UserProfile;
  onOpenPremium: () => void;
  language: Language;
  preferredVersion: string;
}

const normalizeText = (text: string) => text ? text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
const parseYMD = (ymd?: string) => {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d); // fecha LOCAL, sin UTC
};

export const SermonsList: React.FC<SermonsListProps> = ({ sermons, setSermons, user, onOpenPremium, language, preferredVersion }) => {
  const [internalSelectedSermon, setInternalSelectedSermon] = useState<Sermon | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
 const t = (key: keyof typeof translations["es"]) =>
  getTranslation(language, key);


  if (internalSelectedSermon) {
    return (
        <SermonEditor 
            sermon={internalSelectedSermon} 
            setSelectedSermon={setInternalSelectedSermon} 
            setSermons={setSermons} 
            user={user} 
            onOpenPremium={onOpenPremium} 
            language={language}
            preferredVersion={preferredVersion}
        />
    );
  }

  const handleDeleteSermon = (id: string) => {
    const confirmDelete = window.confirm(
      '¿Seguro que quieres eliminar este sermón? Esta acción no se puede deshacer.'
    );

    if (!confirmDelete) return;

    setSermons((prevSermons) => {
      const updated = prevSermons.filter((s) => s.id !== id);

      // 🔐 Guardamos también en localStorage (por si tu app usa eso)
      try {
        window.localStorage.setItem('sermons', JSON.stringify(updated));
      } catch (error) {
        console.error('Error al actualizar los sermones en localStorage', error);
      }

      return updated;
    });
  };

  const handleAddNewSermon = () => {
    const newSermon: Sermon = { 
        id: `sermon${Date.now()}`, 
        title: '', 
        preacher: '', 
        date: getLocalYMD(),

        verses: [], 
        notes: '', 
        definitions: {} 
    };
    setInternalSelectedSermon(newSermon);
  };

  const filteredSermons = sermons.filter(sermon => {
    const query = normalizeText(searchQuery);
    // Busca en título, notas y predicador
    return normalizeText(sermon.title).includes(query) || 
           normalizeText(sermon.notes).includes(query) ||
           normalizeText(sermon.preacher).includes(query);
  });

 return (
  <div className="p-6 animate-fade-in max-w-2xl mx-auto">
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
        {t("sermons_title")}
      </h1>

      <button
        onClick={handleAddNewSermon}
        className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
        aria-label={t("new_sermon")}
      >
        <PlusCircle size={24} />
      </button>
    </div>

    <div className="relative mb-8 group">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"
        size={20}
      />
      <input
        type="text"
        placeholder={t("search_sermons")}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full border-2 border-transparent bg-white dark:bg-gray-800 shadow-sm rounded-xl p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all placeholder-gray-400 dark:placeholder-gray-500"
      />
    </div>

    <div className="space-y-4">
      {filteredSermons.length > 0 ? (
        filteredSermons.map((sermon) => {
          const rawPassages =
  (Array.isArray((sermon as any).verses) && (sermon as any).verses.length > 0)
    ? (sermon as any).verses
    : ((sermon as any).keyPassages ?? []);

const passageLabels = rawPassages
  .map((p: any) => (typeof p === "string" ? p : p.reference ?? p.ref ?? ""))
  .filter(Boolean);
            
          return (
            <div
              key={sermon.id}
              onClick={() =>
  setInternalSelectedSermon({
    ...(sermon as any),
    verses: (sermon as any).verses ?? [],
    keyPassages: (sermon as any).keyPassages ?? [],
    passageLabels,
  })
}

              className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all group"
            >
              <div className="flex justify-between items-start">
                <h3
                  className={`font-bold text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${
                    sermon.title ? "" : "text-gray-400 italic"
                  }`}
                >
                  {sermon.title || t("untitled")}
                </h3>

                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded">
                  {parseYMD(sermon.date)?.toLocaleDateString(
                    language === "en" ? "en-US" : language === "pt" ? "pt-BR" : "es-ES",
                    { month: "short", day: "numeric" }
                  )}
                </span>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {sermon.preacher || t("no_preacher")}
              </p>

              {passageLabels.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {passageLabels.slice(0, 2).map((ref: string) => (
                    <span
                      key={ref}
                      className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs"
                    >
                      {ref}
                    </span>
                  ))}
                </div>
              )}

              {searchQuery &&
                normalizeText(sermon.notes).includes(normalizeText(searchQuery)) && (
                  <div className="mt-3 text-xs text-gray-600 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/10 p-2 rounded-lg border border-yellow-100 dark:border-yellow-900/30">
                    <span className="font-bold text-yellow-700 dark:text-yellow-500">
                      {t("in_notes")}
                    </span>{" "}
                    <span className="italic">
                      “…{(sermon.notes || "").substring(0, 100).replace(/\n/g, " ")}…”
                    </span>
                  </div>
                )}

              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSermon(sermon.id);
                  }}
                  className="text-xs text-red-500 hover:text-red-600 hover:underline"
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
        })
      ) : (
        <div className="text-center py-10 opacity-50 dark:text-gray-400">
          <p>{t("no_sermons_found")}</p>
        </div>
      )}
    </div>
  </div>
);}