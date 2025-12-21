import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { SermonsList } from './components/SermonsList';
import { SmartBible } from './components/SmartBible';
import { PersonalNotes } from './components/PersonalNotes';
import { SettingsScreen } from './components/SettingsScreen';
import { BottomNav } from './components/BottomNav';
import { LoginScreen } from './components/LoginScreen';
import { PremiumModal } from './components/PremiumModal';
import { TabId, Sermon, PersonalNote, UserProfile, Language } from './types';
import { normalizeToLocalYMD } from "./services/dateUtils";


// Mock Data Definitions
const MOCK_DATA = {
  es: {
    sermons: [
      { 
        id: 'sermon1', 
        title: 'El Gozo en la Prueba', 
        preacher: 'Pastor Juan Pérez', 
        date: '2024-07-14', 
        verses: [{ 
            ref: 'Santiago 1:2',
            text: 'Hermanos míos, tened por sumo gozo cuando os halléis en diversas pruebas.',
            version: 'RVR60'
        }], 
        notes: 'La prueba produce paciencia. Es necesario pasar por fuego para ser purificados.\n\n* La prueba no es castigo.\n* La prueba trae crecimiento.', 
        definitions: { 'Prueba': 'Examen de las cualidades de alguien o algo.' } 
      }
    ] as Sermon[],
    notes: [
      { id: 'note1', title: 'Ideas para serie de Fe', content: 'Hablar sobre Abraão y la confianza ciega...', date: '2024-07-20' },
      { id: 'note2', title: 'Oración por la familia', content: 'Recordar orar por la salud de la tía María...', date: '2024-07-22' }
    ] as PersonalNote[]
  },
  en: {
    sermons: [
      { 
        id: 'sermon1', 
        title: 'Joy in Trials', 
        preacher: 'Pastor John Doe', 
        date: '2024-07-14', 
        verses: [{ 
            ref: 'James 1:2',
            text: 'Consider it pure joy, my brothers and sisters, whenever you face trials of many kinds.',
            version: 'NIV'
        }], 
        notes: 'Trials produce patience. It is necessary to pass through fire to be purified.\n\n* Trials are not punishment.\n* Trials bring growth.', 
        definitions: { 'Trial': 'A test of the performance, qualities, or suitability of someone or something.' } 
      }
    ] as Sermon[],
    notes: [
      { id: 'note1', title: 'Ideas for Faith series', content: 'Talk about Abraham and blind trust...', date: '2024-07-20' },
      { id: 'note2', title: 'Prayer for family', content: 'Remember to pray for Aunt Mary\'s health...', date: '2024-07-22' }
    ] as PersonalNote[]
  },
  pt: {
    sermons: [
      { 
        id: 'sermon1', 
        title: 'Alegria na Provação', 
        preacher: 'Pastor João Silva', 
        date: '2024-07-14', 
        verses: [{ 
            ref: 'Tiago 1:2',
            text: 'Meus irmãos, considerem motivo de grande alegria o fato de passarem por diversas provações.',
            version: 'ARC'
        }], 
        notes: 'A provação produz paciência. É necessário passar pelo fogo para ser purificado.\n\n* A provação não é castigo.\n* A provação traz crescimento.', 
        definitions: { 'Provação': 'Ato ou efeito de provar.' } 
      }
    ] as Sermon[],
    notes: [
      { id: 'note1', title: 'Ideias para série de Fé', content: 'Falar sobre Abraão e a confiança cega...', date: '2024-07-20' },
      { id: 'note2', title: 'Oração pela família', content: 'Lembrar de orar pela saúde da tia Maria...', date: '2024-07-22' }
    ] as PersonalNote[]
  }
};

const App: React.FC = () => {
 
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  
  // Initialize language first to use it for mock data defaults
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
       return (localStorage.getItem('language') as Language) || 'es';
    }
    return 'es';
  });

  // Initialize data with fallback to localized mock data
  const [sermons, setSermons] = useState<Sermon[]>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('sermons');
        if (!saved) return MOCK_DATA[language].sermons;

try {
  const parsed = JSON.parse(saved);
  const list = Array.isArray(parsed) ? parsed : [];

  const normalized = list.map((s: any) => ({
    ...s,
    date: normalizeToLocalYMD(s?.date),
  }));

  // opcional recomendado: re-guardar ya normalizado
  try {
    localStorage.setItem("sermons", JSON.stringify(normalized));
  } catch {}

  return normalized as Sermon[];
} catch {
  return MOCK_DATA[language].sermons;
}

    }
    return MOCK_DATA['es'].sermons;
  });

  const [personalNotes, setPersonalNotes] = useState<PersonalNote[]>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('personalNotes');
        return saved ? JSON.parse(saved) : MOCK_DATA[language].notes;
    }
    return MOCK_DATA['es'].notes;
  });

  // Settings State
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('darkMode') === 'true';
    return false;
  });

  const [fontSize, setFontSize] = useState('small');
  const [preferredVersion, setPreferredVersion] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('preferredVersion') || 'RVR60';
    return 'RVR60';
  });

  // Persist Data
  useEffect(() => { localStorage.setItem('sermons', JSON.stringify(sermons)); }, [sermons]);
  useEffect(() => { localStorage.setItem('personalNotes', JSON.stringify(personalNotes)); }, [personalNotes]);
  useEffect(() => { localStorage.setItem('darkMode', String(darkMode)); }, [darkMode]);
  useEffect(() => { localStorage.setItem('preferredVersion', preferredVersion); }, [preferredVersion]);
  useEffect(() => { localStorage.setItem('language', language); }, [language]);

  // Apply Dark Mode
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const handleLogin = () => {
    setUser({
      name: 'Usuario Demo',
      email: 'demo@mision.com',
      isPremium: false // Set to true to test premium features
    });
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab('home');
  };
  
  const handleUpgradeToPremium = () => {
    if (user) {
        setUser({ ...user, isPremium: true });
        setIsPremiumModalOpen(false);
    }
  };

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors duration-200 font-sans ${fontSize === 'medium' ? 'text-lg' : fontSize === 'large' ? 'text-xl' : 'text-base'}`}>
      
      <PremiumModal 
        isOpen={isPremiumModalOpen} 
        onClose={() => setIsPremiumModalOpen(false)} 
        onUpgrade={handleUpgradeToPremium}
        language={language}
      />

      <main className="max-w-lg mx-auto md:max-w-4xl">
        {activeTab === 'home' && (
          <Dashboard 
            setActiveTab={setActiveTab} 
            latestSermon={sermons[0] || null} 
            preferredVersion={preferredVersion}
            setPreferredVersion={setPreferredVersion}
            user={user}
            onOpenPremium={() => setIsPremiumModalOpen(true)}
            language={language}
          />
        )}
        
        {activeTab === 'sermons' && (
          <SermonsList 
            sermons={sermons} 
            setSermons={setSermons}
            selectedSermon={null} // List view manages selection internally for now or passed via props if refactored
            setSelectedSermon={() => {}} // Placeholder if handled inside
            user={user}
            onOpenPremium={() => setIsPremiumModalOpen(true)}
            language={language}
            preferredVersion={preferredVersion}
          />
        )}
        
        {activeTab === 'bible' && (
          <SmartBible 
            user={user} 
            onOpenPremium={() => setIsPremiumModalOpen(true)} 
            language={language}
          />
        )}
        
        {activeTab === 'notes' && (
          <PersonalNotes 
             personalNotes={personalNotes}
             setPersonalNotes={setPersonalNotes}
             selectedNote={null}
             setSelectedNote={() => {}}
             language={language}
          />
        )}
        
        {activeTab === 'settings' && (
          <SettingsScreen 
            sermons={sermons}
            setSermons={setSermons}
            personalNotes={personalNotes}
            setPersonalNotes={setPersonalNotes}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            fontSize={fontSize}
            setFontSize={setFontSize}
            user={user}
            onLogout={handleLogout}
            preferredVersion={preferredVersion}
            setPreferredVersion={setPreferredVersion}
            onOpenPremium={() => setIsPremiumModalOpen(true)}
            language={language}
            setLanguage={setLanguage}
          />
        )}
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} language={language} />
    </div>
  );
};

export default App;