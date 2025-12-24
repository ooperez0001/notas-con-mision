import { BibleSearchResult, KeywordResult } from '../types';

// Updated version list to include EN and PT versions
const bibleVersions = ['RVR60', 'NTV', 'NVI', 'DHH', 'LBLA', 'NIV', 'KJV', 'ARC'];

export const normalizeText = (text: string) => text ? text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';

// --- COLECCIÓN DE VERSÍCULOS DIARIOS ---
const DAILY_VERSES = [
  {
    refs: { es: 'Juan 3:16', en: 'John 3:16', pt: 'João 3:16' },
    isJesusWords: true,
    versions: {
      RVR60: 'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna.',
      NTV: 'Pues Dios amó tanto al mundo que dio a su único Hijo, para que todo el que crea en él no se pierda, sino que tenga vida eterna.',
      NVI: 'Porque tanto amó Dios al mundo, que dio a su Hijo unigénito, para que todo el que cree en él no se pierda, sino que tenga vida eterna.',
      DHH: 'Pues Dios amó tanto al mundo, que dio a su Hijo único, para que todo aquel que cree en él no muera, sino que tenga vida eterna.',
      LBLA: 'Porque de tal manera amó Dios al mundo, que dio a su Hijo unigénito, para que todo aquel que cree en El, no se pierda, mas tenga vida eterna.',
      NIV: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
      KJV: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
      ARC: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.'
    }
  },
  {
    refs: { es: 'Lamentaciones 3:22-23', en: 'Lamentations 3:22-23', pt: 'Lamentações 3:22-23' },
    isJesusWords: false,
    versions: {
      RVR60: 'Por la misericordia de Jehová no hemos sido consumidos, porque nunca decayeron sus misericordias. Nuevas son cada mañana; grande es tu fidelidad.',
      NTV: '¡El fiel amor del Señor nunca se acaba! Sus misericordias jamás terminan. Grande es su fidelidad; sus misericordias son nuevas cada mañana.',
      NVI: 'El gran amor del Señor nunca se acaba, y su compasión jamás se agota. Cada mañana se renuevan sus bondades; ¡muy grande es su fidelidad!',
      DHH: 'El amor del Señor no tiene fin, ni se han agotado sus bondades. Cada mañana se renuevan; ¡qué grande es su fidelidad!',
      LBLA: 'Que las misericordias del Señor jamás terminan, pues nunca fallan sus bondades; nuevas son cada mañana; ¡grande es tu fidelidad!',
      NIV: 'Because of the Lord’s great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.',
      KJV: 'It is of the LORD\'s mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness.',
      ARC: 'As misericórdias do Senhor são a causa de não sermos consumidos, porque as suas misericórdias não têm fim; Novas são cada manhã; grande é a tua fidelidade.'
    }
  },
  {
    refs: { es: 'Filipenses 4:13', en: 'Philippians 4:13', pt: 'Filipenses 4:13' },
    isJesusWords: false,
    versions: {
      RVR60: 'Todo lo puedo en Cristo que me fortalece.',
      NTV: 'Pues todo lo puedo hacer por medio de Cristo, quien me da las fuerzas.',
      NVI: 'Todo lo puedo en Cristo que me fortalece.',
      DHH: 'A todo puedo hacerle frente, gracias a Cristo que me fortalece.',
      LBLA: 'Todo lo puedo en Cristo que me fortalece.',
      NIV: 'I can do all this through him who gives me strength.',
      KJV: 'I can do all things through Christ which strengtheneth me.',
      ARC: 'Posso todas as coisas em Cristo que me fortalece.'
    }
  },
  {
    refs: { es: 'Jeremías 29:11', en: 'Jeremiah 29:11', pt: 'Jeremias 29:11' },
    isJesusWords: false,
    versions: {
      RVR60: 'Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová, pensamientos de paz, y no de mal, para daros el fin que esperáis.',
      NTV: 'Pues yo sé los planes que tengo para ustedes —dice el Señor—. Son planes para lo bueno y no para lo malo, para darles un futuro y una esperanza.',
      NVI: 'Porque yo sé muy bien los planes que tengo para ustedes —afirma el Señor—, planes de bienestar y no de calamidad, a fin de darles un futuro y una esperanza.',
      DHH: 'Yo sé los planes que tengo para ustedes, planes para su bienestar y no para su mal, a fin de darles un futuro lleno de esperanza. Yo, el Señor, lo afirmo.',
      LBLA: 'Porque yo sé los planes que tengo para vosotros —declara el Señor— planes de bienestar y no de calamidad, para daros un futuro y una esperanza.',
      NIV: 'For I know the plans I have for you,” declares the Lord, “plans to prosper you and not to harm you, plans to give you hope and a future.',
      KJV: 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.',
      ARC: 'Porque eu bem sei os pensamentos que tenho a vosso respeito, diz o Senhor; pensamentos de paz, e não de mal, para vos dar o fim que esperais.'
    }
  },
  {
    refs: { es: 'Salmos 23:1', en: 'Psalm 23:1', pt: 'Salmos 23:1' },
    isJesusWords: false,
    versions: {
      RVR60: 'Jehová es mi pastor; nada me faltará.',
      NTV: 'El Señor es mi pastor; tengo todo lo que necesito.',
      NVI: 'El Señor es mi pastor, nada me falta.',
      DHH: 'El Señor es mi pastor; nada me falta.',
      LBLA: 'El Señor es mi pastor, nada me faltará.',
      NIV: 'The Lord is my shepherd, I lack nothing.',
      KJV: 'The LORD is my shepherd; I shall not want.',
      ARC: 'O Senhor é o meu pastor, nada me faltará.'
    }
  }
];

export const getVerseOfTheDay = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    
    // Selecciona un versículo basado en el día del año
    // Esto asegura que cambie cada 24 horas y rote por la lista
    const verseIndex = dayOfYear % DAILY_VERSES.length;
    return DAILY_VERSES[verseIndex];
};

// Mock Database Data
const MATTHEW_DATA = { "6": { 
      "33": { 
        RVR60: 'Mas buscad primeramente el reino de Dios y su justicia, y todas estas cosas os serán añadidas.', 
        NTV: 'Busquen el reino de Dios por encima de todo lo demás y lleven una vida justa, y él les dará todo lo que necesiten.', 
        NVI: 'Más bien, busquen primeramente el reino de Dios y su justicia, y todas estas cosas les serán añadidas.', 
        DHH: 'Por lo tanto, pongan toda su atención en el reino de los cielos y en hacer lo que es justo ante Dios, y recibirán también todas estas cosas.',
        LBLA: 'Pero buscad primero su reino y su justicia, y todas estas cosas os serán añadidas.',
        NIV: 'But seek first his kingdom and his righteousness, and all these things will be given to you as well.',
        KJV: 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.',
        ARC: 'Mas buscai primeiro o reino de Deus, e a sua justiça, e todas estas coisas vos serão acrescentadas.',
        isJesusWords: true 
      }
    } 
};

const JOHN_DATA = { "3": { 
      "16": { 
        RVR60: 'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna.', 
        NTV: 'Pues Dios amó tanto al mundo que dio a su único Hijo, para que todo el que crea en él no se pierda, sino que tenga vida eterna.', 
        NVI: 'Porque tanto amó Dios al mundo, que dio a su Hijo unigénito, para que todo el que cree en él no se pierda, sino que tenga vida eterna.', 
        DHH: 'Pues Dios amó tanto al mundo, que dio a su Hijo único, para que todo aquel que cree en él no muera, sino que tenga vida eterna.',
        LBLA: 'Porque de tal manera amó Dios al mundo, que dio a su Hijo unigénito, para que todo aquel que cree en El, no se pierda, mas tenga vida eterna.',
        NIV: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
        KJV: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
        ARC: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.',
        isJesusWords: true 
      }
  } 
};

// Map languages to the same data
const bibleApiData: any = {
  // Spanish
  "mateo": MATTHEW_DATA,
  "juan": JOHN_DATA,
  
  // English
  "matthew": MATTHEW_DATA,
  "john": JOHN_DATA,
  
  // Portuguese
  "mateus": MATTHEW_DATA,
  "joao": JOHN_DATA
};
// --- CONFIG REAL BIBLE API ---
const BIBLE_API_BASE_URL = 'https://bible-api.deno.dev/api';
const DEFAULT_VERSION = 'rv1960';
const UI_TO_API_VERSION: Record<string, string> = {
  RVR60: "rv1960",
  RVR1960: "rv1960",
  RV1960: "rv1960",
  NVI: "nvi",
  DHH: "dhh",
  RVR95: "rv1995",
  RV1995: "rv1995",
};

function toApiVersion(uiVersion?: string) {
  const key = (uiVersion ?? "").trim().toUpperCase();
  return UI_TO_API_VERSION[key] ?? DEFAULT_VERSION; // DEFAULT_VERSION = 'rv1960'
}

// Convierte "Juan", "1 Samuel", "Cantares", etc. al formato que usa la API
const buildApiBookName = (rawBookName: string) => {
  const normalized = normalizeText(rawBookName)
    .toLowerCase()
    .replace(/\./g, '')
    .trim();

  // Caso: "1 corintios", "2 reyes", etc. -> "1-corintios"
  const match = normalized.match(/^(\d+)\s+(.+)$/);
  if (match) {
    const num = match[1];
    const rest = match[2].replace(/\s+/g, '-');
    return `${num}-${rest}`;
  }

  // Caso general: "juan", "salmos", "genesis" -> "juan", "salmos", "genesis"
  return normalized.replace(/\s+/g, '-');
};

export const fetchVerseFromAPI = async (
  reference: string,
  uiVersion?: string
): Promise<BibleSearchResult | null> => {

try {
    const ref = reference.trim().replace(/–/g, '-');

    // Separar "Juan 3:16-18" en:
    //  - bookAndChapterPart: "Juan 3"
    //  - versePart: "16-18"
    const parts = ref.split(':');
    const bookAndChapterPart = parts[0].trim();
    const versePart = parts.length > 1 ? parts[1].trim() : null;

    // Extraer libro y capítulo: "Juan 3" -> book="Juan", chapter="3"
    const chapterMatch = bookAndChapterPart.match(/^(.*?)\s+(\d+)$/);
    if (!chapterMatch) {
      console.warn('[BibleService] Referencia inválida:', reference);
      return null;
    }

    const rawBookName = chapterMatch[1]; // "Juan"
    const chapter = chapterMatch[2];     // "3"
// ✅ Fix PT + acentos: "João" -> "Joao" -> "john"
const cleanBook = rawBookName
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, ""); // quita acentos

// Si viene de portugués, la API espera inglés
const bookForApi =
  cleanBook.trim().toLowerCase() === "joao" ? "john" : cleanBook;

    // Rango de versículos
    let startVerse = 1;
    let endVerse = 999; // si no se especifica, devolvemos todo el capítulo

    if (versePart) {
      const verseParts = versePart.split('-');
      startVerse = parseInt(verseParts[0], 10);
      endVerse = verseParts.length > 1 ? parseInt(verseParts[1], 10) : startVerse;
    }

    // Convertir libro al formato de la API: "Juan" -> "juan", "1 Corintios" -> "1-corintios"
   const apiBookName = buildApiBookName(bookForApi);


    // Ejemplo final: https://bible-api.deno.dev/api/read/rv1960/juan/3
    const apiVersion = toApiVersion(uiVersion);
const url = `${BIBLE_API_BASE_URL}/read/${apiVersion}/${apiBookName}/${chapter}`;

    
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error('[BibleService] Error en respuesta de la API:', resp.status, resp.statusText);
      return null;
    }

    // Estructura esperada:
    // { testament: "old"|"new", name: string, chapter: number, vers: [ { verse, number, id, study? } ] }
    const data = await resp.json() as {
      vers: { verse: string; number: number; id: number; study?: string }[];
    };

    if (!data.vers || !Array.isArray(data.vers)) {
      console.error('[BibleService] Respuesta sin versículos:', data);
      return null;
    }

    // Filtramos solo los versículos en el rango pedido
    const selectedVerses = data.vers.filter(v =>
      v.number >= startVerse && v.number <= endVerse
    );

    if (selectedVerses.length === 0) {
      console.warn('[BibleService] No se encontraron versículos para el rango:', reference);
      return null;
    }

    // Adaptar al tipo BibleSearchResult que ya usa tu app
    const result: BibleSearchResult = {
      ref: reference,
      versions: {}
    };

    // Llenamos RVR60 con lo que trae la API
    result.versions['RVR60'] = selectedVerses.map(v => ({
      number: v.number,
      text: v.verse,
      isJesusWords: false   // la API no marca palabras de Jesús
    }));

    // Aseguramos que las demás versiones existan aunque estén vacías
    bibleVersions.forEach(version => {
      if (!result.versions[version]) {
        result.versions[version] = [];
      }
    });

    return result;
  } catch (error) {
    console.error('[BibleService] Error general al buscar versículo:', error);
    return null;
  }
};

export const searchByKeyword = async (keyword: string): Promise<KeywordResult[]> => {
  const normalizedKeyword = normalizeText(keyword);
  const results: KeywordResult[] = []; 
  const foundRefs = new Set<string>();

  for (const book in bibleApiData) {
    for (const chapter in bibleApiData[book]) {
      for (const verseNumber in bibleApiData[book][chapter]) {
        const verseData = bibleApiData[book][chapter][verseNumber];
        const reference = `${book.charAt(0).toUpperCase() + book.slice(1)} ${chapter}:${verseNumber}`;
        
        if (foundRefs.has(reference)) continue;

        for (const version of bibleVersions) {
          if (verseData[version] && normalizeText(verseData[version]).includes(normalizedKeyword)) {
            // Default to RVR60 for snippet if available, else first found
            results.push({ ref: reference, text: verseData.RVR60 || verseData[version], isJesusWords: !!verseData.isJesusWords });
            foundRefs.add(reference); 
            break;
          }
        }
      }
    }
  }
  return results;
};

export const VERSIONS = bibleVersions;

export const getVersionsByLanguage = (lang: string) => {
    switch(lang) {
        case 'en': return ['NIV', 'KJV'];
        case 'pt': return ['ARC'];
        default: return ['RVR60', 'NTV', 'NVI', 'DHH', 'LBLA'];
    }
};