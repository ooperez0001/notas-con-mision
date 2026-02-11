import React, { useState, useEffect } from "react";

import { Sparkles, Crown } from 'lucide-react';
import { Modal } from './Modal';
import { Sermon, TabId, UserProfile, Language } from '../types';
import { generateDevotional } from '../services/geminiService';
import { getVerseOfTheDay, getVersionsByLanguage, fetchVerseFromAPI } from "../services/bibleService";

import { translations, getTranslation } from "../services/translations";
import { formatYMDForUI } from "../services/dateUtils";


interface DashboardProps {
  setActiveTab: (tab: TabId) => void;
  latestSermon: Sermon | null;
  preferredVersion: string;
  setPreferredVersion: (version: string) => void;
  user: UserProfile;
  onOpenPremium: () => void;
  language: Language;
  setBibleOpenRef: React.Dispatch<React.SetStateAction<string>>;

}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab, latestSermon, preferredVersion, setPreferredVersion, user, onOpenPremium, language,  setBibleOpenRef,}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [verseOfTheDayData] = useState(getVerseOfTheDay()); // solo ref + flags
const [verseText, setVerseText] = useState<string>("");
const [verseLoading, setVerseLoading] = useState(false);

const t = (key: keyof typeof translations["es"]) => getTranslation(language, key);

{/*   
  // Get filtered versions based on current language
  const availableVersions = getVersionsByLanguage(language);

  // If the preferredVersion is not available in the current language, default to the first available
  const displayVersion = availableVersions.includes(preferredVersion) ? preferredVersion : availableVersions[0];
*/}

const displayVersion = "RVR60";
useEffect(() => {
  const run = async () => {
    const ref = verseOfTheDayData?.refs?.[language] || verseOfTheDayData?.refs?.es;
    if (!ref) return;

    setVerseLoading(true);
    const res = await fetchVerseFromAPI(ref, "RVR60");

   const raw = res?.versions?.RVR60;

const text =
  typeof raw === "string"
    ? raw
    : Array.isArray(raw)
      ? raw.map((v) => v.text).join(" ")
      : "";
    setVerseText(text);
    setVerseLoading(false);
  };

  run();
}, [language, verseOfTheDayData]);

  const handleShowDevotional = async () => {
    if (!user.isPremium) {
        onOpenPremium();
        return;
    }

    setIsModalOpen(true); 
    setIsLoading(true);
    // @ts-ignore
    const verseTextForAI = verseText || "";

    // Pass language context to AI using the localized reference
    // @ts-ignore
    const verseRef = verseOfTheDayData?.refs?.[language] || verseOfTheDayData?.refs?.es;

   const result = await generateDevotional(verseTextForAI, `${verseRef} RVR60`);

    setModalContent(result); 
    setIsLoading(false);
  };

 return (
  <>
    <Modal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      title={t("devotional_title")}
    >
      {isLoading ? (
        <div className="text-center p-8 flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">{t("loading_ai")}</p>
        </div>
      ) : (
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
          {modalContent}
        </p>
      )}
    </Modal>

      <div className="p-6 space-y-8 animate-fade-in max-w-lg mx-auto">
        <header className="mt-4 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">{t("app_name")}</h1>
              <p className="text-gray-500 dark:text-gray-400 font-medium">{t("welcome")}</p>
            </div>
            {!user.isPremium && (
                <button 
                    onClick={onOpenPremium}
                    className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 p-2 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
                >
                    <Crown size={24} fill="currentColor" />
                </button>
            )}
        </header>
        
        {latestSermon && (
  <div
    className="group bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-all hover:border-blue-300"
    onClick={() => setActiveTab('sermons')}
  >
    {/* Encabezado */}
    <h2 className="font-bold text-sm text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
      {t("last_sermon")}
    </h2>

    {/* Título del sermón */}
    <p className="text-xl font-bold text-gray-800 dark:text-white transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
     {latestSermon.title || t("untitled_sermon")}

    </p>

    {/* Predicador */}
    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-2">
      <span className="transition-colors group-hover:text-blue-500 dark:group-hover:text-blue-300">
        {latestSermon.preacher || t("no_preacher")}
      </span>
    </div>

    {/* Fecha */}
    <span className="mt-3 inline-flex items-center text-xs text-gray-400 transition-colors group-hover:text-blue-500 dark:group-hover:text-blue-300">
    {formatYMDForUI(latestSermon.date, language === "en" ? "en-US" : language === "pt" ? "pt-BR" : "es-US")}

    </span>
  </div>
)}


       <div
  className="
    bg-gradient-to-br from-white to-gray-50
    dark:from-gray-800 dark:to-gray-900
    p-6 rounded-2xl shadow-sm
    border border-gray-200 dark:border-gray-700
    cursor-pointer
    transition-all
    hover:shadow-md
    hover:border-blue-300
  "
>

          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg text-gray-700 dark:text-gray-200">{t("verse_of_day")}</h2>
            {/*
            <select 
              value={displayVersion} 
              onChange={(e) => setPreferredVersion(e.target.value)} 
              style={{ colorScheme: 'light dark' }}
              className="text-xs font-semibold bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm cursor-pointer"
            >
              {availableVersions.map(v => <option key={v} value={v} className="dark:bg-gray-800 dark:text-white">{v}</option>)}
            </select>
            */}
          </div>
          
   <div
  role="button"
  tabIndex={0}
  className="cursor-pointer select-none"
  title="Abrir Biblia Inteligente"
 onClick={() => {
  const ref = verseOfTheDayData?.refs?.[language] || verseOfTheDayData?.refs?.es;
  if (ref) setBibleOpenRef(ref);
  setActiveTab("bible");
}}
onKeyDown={(e) => {
  if (e.key === "Enter" || e.key === " ") {
    const ref = verseOfTheDayData?.refs?.[language] || verseOfTheDayData?.refs?.es;
    if (ref) setBibleOpenRef(ref);
    setActiveTab("bible");
  }
}}

>
  <p
    className={`text-xl leading-relaxed font-serif ${
      verseOfTheDayData?.isJesusWords
        ? "text-red-700 dark:text-red-400"
        : "text-gray-800 dark:text-gray-100"
    }`}
  >
   {verseLoading ? "Cargando..." : (verseText || "")}

  </p>

  <p className="text-right text-blue-600 dark:text-blue-400 font-bold mt-4 tracking-wide">
    {verseOfTheDayData?.refs?.[language] ?? ""}
  </p>
</div>


        </div>

        <button 
          onClick={handleShowDevotional} 
          className={`w-full flex items-center justify-center gap-3 font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-all ${user.isPremium ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white' : 'bg-gray-900 dark:bg-gray-700 text-white'}`}
        >
          {user.isPremium ? <Sparkles size={20} className="text-yellow-300" /> : <Crown size={20} className="text-yellow-500" />}
        <span>
    {t("devotional_btn")}
    {!user.isPremium ? ` (${t("premium_badge")})` : ""}
  </span>
</button>
      </div>
    </>
  );
};