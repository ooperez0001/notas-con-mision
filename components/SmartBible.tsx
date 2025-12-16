import React, { useState, useEffect } from 'react';
import { Search, Sparkles, Lock } from 'lucide-react';
import { fetchVerseFromAPI, searchByKeyword, getVersionsByLanguage } from '../services/bibleService';
import { analyzePassage } from '../services/geminiService';
import { BibleSearchResult, KeywordResult, BibleVerse, UserProfile, Language } from '../types';
import { AIAccordion } from './AIAccordion';
import { BibleDictionary } from './BibleDictionary';
import { translations } from '../services/translations';

interface SmartBibleProps {
  user?: UserProfile;
  onOpenPremium?: () => void;
  language: Language;
}

export const SmartBible: React.FC<SmartBibleProps> = ({ user, onOpenPremium, language }) => {
  const [query, setQuery] = useState('');
  const [verseData, setVerseData] = useState<BibleSearchResult | null>(null);
  const [keywordResults, setKeywordResults] = useState<KeywordResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const t = translations[language];
  
  // AI State
  const [aiContent, setAiContent] = useState<{[key: string]: string}>({});
  const [openAIAccordions, setOpenAIAccordions] = useState<{[key: string]: boolean}>({});
  const [loadingAITab, setLoadingAITab] = useState<string | null>(null);

  const performSearch = async (searchTerm: string) => {
    if (!searchTerm) return;
    setLoading(true); 
    setOpenAIAccordions({}); 
    setAiContent({}); 
    setVerseData(null); 
    setKeywordResults([]);
    setHasSearched(true);
    
    const referenceData = await fetchVerseFromAPI(searchTerm);
    
    if (referenceData) { 
        setVerseData(referenceData); 
    } else { 
        const keywordData = await searchByKeyword(searchTerm); 
        setKeywordResults(keywordData); 
    }
    setLoading(false);
  };

  // Initial load
  useEffect(() => { 
      // Set default search based on language
      const defaultSearch = language === 'en' ? 'John 3' : 'Juan 3';
      setQuery(defaultSearch);
      performSearch(defaultSearch); 
  }, [language]);

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



  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{t.bible_title}</h1>
      
      <div className="flex gap-2">
        <input 
            type="text" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && performSearch(query)} 
            className="w-full border-2 border-transparent shadow-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-400 dark:placeholder-gray-500 dark:border-gray-700" 
            placeholder={t.bible_search_ph}
        />
        <button 
            onClick={() => performSearch(query)} 
            className="bg-blue-600 text-white p-4 rounded-xl shadow-md hover:bg-blue-700 transition-colors"
        >
            <Search size={24} />
        </button>
      </div>

      {loading && (
          <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
      )}

      {verseData && !loading && (
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
          
          <BibleDictionary isEmbedded={true} language={language} />
          
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

      {!loading && !verseData && keywordResults.length === 0 && hasSearched && (
          <div className="text-center py-10">
              <p className="text-gray-400">{t.no_results} "{query}".</p>
          </div>
      )}
    </div>
  );
};