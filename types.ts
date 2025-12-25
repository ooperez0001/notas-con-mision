
export interface BibleVerse {
  number: number;
  text: string;
  isJesusWords?: boolean;
}

export interface BibleSearchResult {
  ref: string;
  versions: {
    [key: string]: BibleVerse[] | string;
  };
}


export interface SavedVerse {
  ref: string;
  text: string;
  version: string;
  isJesusWords?: boolean;

  // ✅ extras opcionales para compatibilidad
  reference?: string;
  verseText?: string;
  versionOverride?: string;
}

export interface SavedWord {
  term: string;
  definition: string;
  createdAt: string;
}

export interface Sermon {
  id: string;
  title: string;
  preacher: string;
  date: string;
  verses: SavedVerse[];
  notes: string;
  definitions: { [key: string]: string };
    // ✅ Diccionario guardado por sermón (opcional para compatibilidad)
  
  dictionary?: SavedWord[];

}
export interface KeyPassage {
  id: string;
  reference: string;
  version: string;
  text: string;
}


export interface PersonalNote {
  id: string;
  title: string;
  content: string;
  date: string;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  isPremium?: boolean;
}

export type TabId = 'home' | 'sermons' | 'bible' | 'notes' | 'settings';
export type Language = 'es' | 'en' | 'pt';
export type AppLanguage = "es" | "en" | "pt";


export interface KeywordResult {
  ref: string;
  text: string;
  isJesusWords: boolean;
}
