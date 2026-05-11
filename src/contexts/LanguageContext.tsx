import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// api import removed - not needed here
import { useAuth } from './AuthContext';
import {
  LanguageCode,
  getTranslation,
  detectLanguageFromCountry,
  LANGUAGES
} from '../lib/translations';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  t: (key: string) => string;
  availableLanguages: LanguageCode[];
  suggestedLanguages: LanguageCode[];
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

const detectCountryFromIP = async (): Promise<string> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch('https://ipapi.co/json/', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await response.json();
    return data.country_code || 'US';
  } catch (error) {
    return 'US';
  }
};

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<LanguageCode>('en');
  const [availableLanguages, setAvailableLanguages] = useState<LanguageCode[]>(
    Object.keys(LANGUAGES) as LanguageCode[]
  );
  const [suggestedLanguages, setSuggestedLanguages] = useState<LanguageCode[]>(['en']);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeLanguage = async () => {
      setIsLoading(true);

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('preferred_language, detected_country')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.preferred_language) {
          setLanguageState(profile.preferred_language as LanguageCode);
        }

        if (profile?.detected_country) {
          const langs = detectLanguageFromCountry(profile.detected_country);
          setSuggestedLanguages(langs);
        } else {
          const country = await detectCountryFromIP();
          const langs = detectLanguageFromCountry(country);
          setSuggestedLanguages(langs);

          await supabase
            .from('profiles')
            .update({ detected_country: country })
            .eq('id', user.id);
        }
      } else {
        const storedLang = localStorage.getItem('preferred_language');
        if (storedLang) {
          setLanguageState(storedLang as LanguageCode);
        }

        const country = await detectCountryFromIP();
        const langs = detectLanguageFromCountry(country);
        setSuggestedLanguages(langs);
      }

      setIsLoading(false);
    };

    initializeLanguage();
  }, [user]);

  const setLanguage = async (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem('preferred_language', lang);

    if (user) {
      await supabase
        .from('profiles')
        .update({ preferred_language: lang })
        .eq('id', user.id);
    }
  };

  const t = (key: string): string => {
    return getTranslation(key, language);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, availableLanguages, suggestedLanguages, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
};
