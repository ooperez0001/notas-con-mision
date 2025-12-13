import React from 'react';
import { Home, BookOpen, FileText, Settings, PlusCircle } from 'lucide-react';
import { TabId, Language } from '../types';
import { translations } from '../services/translations';

interface BottomNavProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  language: Language;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, language = 'es' }) => {
  const t = translations[language];

  const navItems = [
    { id: 'home' as TabId, icon: Home, label: t.nav_home },
    { id: 'sermons' as TabId, icon: FileText, label: t.nav_sermons },
    { id: 'bible' as TabId, icon: BookOpen, label: t.nav_bible },
    { id: 'notes' as TabId, icon: PlusCircle, label: t.nav_notes },
    { id: 'settings' as TabId, icon: Settings, label: t.nav_settings }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-upper z-40 transition-colors duration-200">
      <div className="flex justify-around h-16 max-w-lg mx-auto">
        {navItems.map(item => (
          <button 
            key={item.id} 
            onClick={() => setActiveTab(item.id)} 
            className={`flex flex-col items-center justify-center w-full transition-colors duration-200 ${activeTab === item.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300'}`}
          >
            <item.icon size={24} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            <span className="text-[10px] font-semibold mt-1">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};