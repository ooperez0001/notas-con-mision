import React, { useState } from 'react';
import { User, Moon, Sun, Type, Download, Trash2, Bell, Globe, Shield, LogOut, ChevronRight, Crown, CreditCard, Languages } from 'lucide-react';
import { Sermon, PersonalNote, UserProfile, Language } from '../types';
import { getVersionsByLanguage } from '../services/bibleService';
import { translations } from '../services/translations';
import { getLocalYMD } from "../services/dateUtils";

interface SettingsScreenProps {
  sermons: Sermon[];
  setSermons: React.Dispatch<React.SetStateAction<Sermon[]>>;
  personalNotes: PersonalNote[];
  setPersonalNotes: React.Dispatch<React.SetStateAction<PersonalNote[]>>;
  darkMode: boolean;
  setDarkMode: (enabled: boolean) => void;
  fontSize: string;
  setFontSize: (size: string) => void;
  user: UserProfile;
  onLogout: () => void;
  preferredVersion: string;
  setPreferredVersion: (version: string) => void;
  onOpenPremium: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ 
    sermons, 
    setSermons, 
    personalNotes, 
    setPersonalNotes,
    darkMode,
    setDarkMode,
    fontSize,
    setFontSize,
    user,
    onLogout,
    preferredVersion,
    setPreferredVersion,
    onOpenPremium,
    language,
    setLanguage
}) => {
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const t = translations[language];
    const availableVersions = getVersionsByLanguage(language);
    
    // Ensure display version is valid for current language
    const displayVersion = availableVersions.includes(preferredVersion) ? preferredVersion : availableVersions[0];

    const handleLanguageChange = (newLang: Language) => {
        setLanguage(newLang);
        // Automatically switch Bible version based on language
        if (newLang === 'en') setPreferredVersion('NIV');
        else if (newLang === 'pt') setPreferredVersion('ARC');
        else setPreferredVersion('RVR60');
    };

    const handleExport = () => {
        const data = {
            app: "Notas con Misión",
            version: "1.0",
           exportedAt: getLocalYMD(),

            user: user.email,
            sermons,
            personalNotes
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${user.name.replace(/\s+/g, '_').toLowerCase()}_${getLocalYMD()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleClearData = () => {
         if(window.confirm("⚠️ ¿Estás seguro de que deseas eliminar TODOS tus sermones y notas locales?\n\nEsta acción no se puede deshacer.")) {
             setSermons([]);
             setPersonalNotes([]);
         }
    };

    return (
        <div className="p-6 animate-fade-in max-w-lg mx-auto pb-24">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">{t.settings_title}</h1>

            {/* Profile Card */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 mb-6 transition-colors">
                <div className={`h-16 w-16 rounded-full overflow-hidden border-2 shadow-md flex items-center justify-center ${user.isPremium ? 'border-yellow-400' : 'border-white dark:border-gray-600'}`}>
                    {user.avatar ? (
                        <img src={user.avatar} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                        <div className="h-full w-full bg-blue-500 flex items-center justify-center text-white font-bold text-xl">
                            {user.name.charAt(0)}
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h2 className="font-bold text-gray-800 dark:text-white text-lg truncate">{user.name}</h2>
                        {user.isPremium && <Crown size={16} className="text-yellow-500" fill="currentColor" />}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${user.isPremium ? 'bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 border border-yellow-200' : 'bg-gray-100 text-gray-500'}`}>
                        {user.isPremium ? 'MIEMBRO PREMIUM' : 'PLAN GRATUITO'}
                    </span>
                </div>
            </div>

            {/* Premium Upsell Banner (Only if not premium) */}
            {!user.isPremium && (
                <div 
                    onClick={onOpenPremium}
                    className="bg-gradient-to-r from-gray-900 to-gray-800 dark:from-yellow-500 dark:to-orange-600 rounded-2xl p-5 mb-8 shadow-lg cursor-pointer transform transition-transform active:scale-95 group relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-white/20 w-24 h-24 rounded-full blur-2xl"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                <Crown size={20} className="text-yellow-400 dark:text-white" fill="currentColor"/> 
                                {t.premium_banner_title}
                            </h3>
                            <p className="text-gray-300 dark:text-white/90 text-sm mt-1">{t.premium_banner_desc}</p>
                        </div>
                        <div className="bg-white text-gray-900 dark:text-orange-600 font-bold px-4 py-2 rounded-lg text-sm group-hover:bg-gray-100 transition-colors">
                            {t.view_plans}
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-8">
                
                {/* General Settings */}
                <section>
                    <h3 className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-3 ml-2">{t.section_general}</h3>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
                        
                         <div className="flex items-center justify-between p-4 border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-xl text-blue-600 dark:text-blue-300"><Languages size={20} /></div>
                                <span className="font-semibold text-gray-700 dark:text-gray-200">{t.language}</span>
                            </div>
                             <select 
                                value={language}
                                onChange={(e) => handleLanguageChange(e.target.value as Language)}
                                style={{ colorScheme: darkMode ? 'dark' : 'light' }}
                                className="bg-gray-100 dark:bg-gray-700 border-none text-sm font-bold text-gray-600 dark:text-white rounded-lg py-1.5 px-3 focus:ring-2 focus:ring-blue-200 cursor-pointer outline-none"
                            >
                                <option value="es" className="bg-white dark:bg-gray-800 text-gray-800 dark:text-white">Español</option>
                                <option value="en" className="bg-white dark:bg-gray-800 text-gray-800 dark:text-white">English</option>
                                <option value="pt" className="bg-white dark:bg-gray-800 text-gray-800 dark:text-white">Português</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-between p-4 border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="bg-purple-100 dark:bg-purple-900/50 p-2 rounded-xl text-purple-600 dark:text-purple-300"><Bell size={20} /></div>
                                <span className="font-semibold text-gray-700 dark:text-gray-200">{t.notifications}</span>
                            </div>
                            <button 
                                className={`w-12 h-7 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${notificationsEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}
                                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                            >
                                <div className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-300 ease-in-out ${notificationsEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </button>
                        </div>

                         <div className="flex items-center justify-between p-4 border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="bg-orange-100 dark:bg-orange-900/50 p-2 rounded-xl text-orange-600 dark:text-orange-300"><Globe size={20} /></div>
                                <span className="font-semibold text-gray-700 dark:text-gray-200">{t.preferred_version}</span>
                            </div>
                             <select 
                                value={displayVersion}
                                onChange={(e) => setPreferredVersion(e.target.value)}
                                style={{ colorScheme: darkMode ? 'dark' : 'light' }}
                                className="bg-gray-100 dark:bg-gray-700 border-none text-sm font-bold text-gray-600 dark:text-white rounded-lg py-1.5 px-3 focus:ring-2 focus:ring-blue-200 cursor-pointer outline-none"
                            >
                                {availableVersions.map(version => (
                                    <option 
                                      key={version} 
                                      value={version} 
                                      className="bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                                      style={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff', color: darkMode ? '#ffffff' : '#1f2937' }}
                                    >
                                        {version}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-xl text-gray-600 dark:text-gray-300">
                                    {darkMode ? <Moon size={20}/> : <Sun size={20}/>}
                                </div>
                                <span className="font-semibold text-gray-700 dark:text-gray-200">{t.dark_mode}</span>
                            </div>
                             <button 
                                className={`w-12 h-7 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}
                                onClick={() => setDarkMode(!darkMode)}
                            >
                                <div className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-300 ease-in-out ${darkMode ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </button>
                        </div>
                    </div>
                </section>

                {/* Appearance */}
                 <section>
                    <h3 className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-3 ml-2">{t.section_reading}</h3>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex items-center justify-between transition-colors">
                         <div className="flex items-center gap-3">
                            <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-xl text-indigo-600 dark:text-indigo-300"><Type size={20} /></div>
                            <span className="font-semibold text-gray-700 dark:text-gray-200">{t.font_size}</span>
                        </div>
                        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                            {['small', 'medium', 'large'].map((size) => (
                                <button 
                                    key={size}
                                    onClick={() => setFontSize(size)}
                                    className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${fontSize === size ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                                >
                                    {size === 'small' ? 'Aa' : size === 'medium' ? 'Aa+' : 'Aa++'}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Data Management */}
                <section>
                    <h3 className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-3 ml-2"> {t.section_account} </h3>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
                        
                         {/* Premium Management in Menu */}
                        <button onClick={onOpenPremium} className="w-full flex items-center justify-between p-4 border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left group">
                             <div className="flex items-center gap-3">
                                <div className="bg-yellow-100 dark:bg-yellow-900/50 p-2 rounded-xl text-yellow-600 dark:text-yellow-400"><CreditCard size={20} /></div>
                                <span className="font-semibold text-gray-700 dark:text-gray-200">
                                    {user.isPremium ? t.manage_sub : t.upgrade_premium}
                                </span>
                            </div>
                            <ChevronRight size={20} className="text-gray-300 group-hover:text-yellow-500 transition-colors"/>
                        </button>

                        <button onClick={handleExport} className="w-full flex items-center justify-between p-4 border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left group">
                             <div className="flex items-center gap-3">
                                <div className="bg-green-100 dark:bg-green-900/50 p-2 rounded-xl text-green-600 dark:text-green-400 group-hover:bg-green-200 dark:group-hover:bg-green-800 transition-colors"><Download size={20} /></div>
                                <div>
                                    <span className="font-semibold text-gray-700 dark:text-gray-200 block">{t.export_data} (.txt)</span>
                                </div>
                            </div>
                        </button>
                        <button onClick={handleClearData} className="w-full flex items-center justify-between p-4 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left group">
                             <div className="flex items-center gap-3">
                                <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-xl text-red-600 dark:text-red-400 group-hover:bg-red-200 dark:group-hover:bg-red-800 transition-colors"><Trash2 size={20} /></div>
                                <span className="font-semibold text-red-600 dark:text-red-400">{t.clear_data}</span>
                            </div>
                        </button>
                    </div>
                </section>

                <div className="px-4">
                     <button 
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                     >
                         <LogOut size={20} /> {t.logout}
                     </button>
                </div>

                {/* About */}
                <div className="text-center pt-8 pb-4">
                    <div className="flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500 text-sm mb-2 font-medium">
                         <Shield size={16}/>
                         <span>{t.app_name} v1.2.0</span>
                    </div>
                    <p className="text-gray-400 dark:text-gray-600 text-xs">Potenciado por Google Gemini ✨</p>
                </div>
            </div>
        </div>
    );
};