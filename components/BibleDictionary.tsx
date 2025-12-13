import React, { useState } from 'react';
import { Search, BookMarked } from 'lucide-react';
import { generateDefinition } from '../services/geminiService';
import { Language } from '../types';
import { translations } from '../services/translations';

interface BibleDictionaryProps {
  isEmbedded?: boolean;
  onDefine?: (term: string, definition: string) => void;
  language?: Language;
}

export const BibleDictionary: React.FC<BibleDictionaryProps> = ({ isEmbedded = false, onDefine, language = 'es' }) => {
  const [term, setTerm] = useState('');
  const [definition, setDefinition] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const t = translations[language];

  const handleSearch = async () => {
    if (!term.trim()) return;
    setIsLoading(true);
    setDefinition('');
    
    const result = await generateDefinition(term);
    
    setDefinition(result);
    setIsLoading(false);
    
    if (onDefine) {
      onDefine(term, result);
    }
  };

  const containerClasses = isEmbedded 
    ? "bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors" 
    : "animate-fade-in";

  return (
    <div className={containerClasses}>
      <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
        <BookMarked size={20} className="text-blue-600 dark:text-blue-400"/>
        {t.dictionary_btn}
      </h3>
      <div className="flex gap-2 mb-4">
        <input 
          type="text" 
          value={term} 
          onChange={(e) => setTerm(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()} 
          className="w-full border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg p-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all placeholder-gray-400 dark:placeholder-gray-400" 
          placeholder={t.dictionary_placeholder}
        />
        <button 
          onClick={handleSearch} 
          disabled={isLoading} 
          className="bg-blue-600 text-white p-3 rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          <Search size={24} />
        </button>
      </div>
      
      {isLoading && (
        <div className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400"></div>
          {language === 'es' ? 'Buscando definición...' : language === 'pt' ? 'Buscando definição...' : 'Searching definition...'}
        </div>
      )}
      
      {definition && !isLoading && (
        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg animate-fade-in border border-gray-100 dark:border-gray-600">
          <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-2 capitalize">{term}</h4>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{definition}</p>
        </div>
      )}
    </div>
  );
};