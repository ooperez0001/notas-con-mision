import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AIAccordionProps {
  title: string;
  content?: string;
  isOpen: boolean;
  isLoading: boolean;
  onClick: () => void;
}

export const AIAccordion: React.FC<AIAccordionProps> = ({ title, content, isOpen, onClick, isLoading }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
      <button onClick={onClick} className="w-full flex justify-between items-center p-4 text-left font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
        <span>{title}</span>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
      {isOpen && (
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 animate-fade-in">
          <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
            {isLoading ? (
              <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <span className="animate-pulse h-2 w-2 bg-current rounded-full"></span>
                Generando respuesta...
              </span>
            ) : content || 'No hay contenido disponible.'}
          </p>
        </div>
      )}
    </div>
  );
};