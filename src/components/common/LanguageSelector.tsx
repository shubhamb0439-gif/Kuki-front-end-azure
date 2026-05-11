import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { LANGUAGES, LanguageCode } from '../../lib/translations';

interface LanguageSelectorProps {
  className?: string;
}

export default function LanguageSelector({ className = '' }: LanguageSelectorProps) {
  const { language, setLanguage, availableLanguages, suggestedLanguages, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = async (lang: LanguageCode) => {
    await setLanguage(lang);
    setIsOpen(false);
  };

  const sortedLanguages = [...availableLanguages].sort((a, b) => {
    const aIsSuggested = suggestedLanguages.includes(a);
    const bIsSuggested = suggestedLanguages.includes(b);

    if (a === 'en') return -1;
    if (b === 'en') return 1;

    if (aIsSuggested && !bIsSuggested) return -1;
    if (!aIsSuggested && bIsSuggested) return 1;

    return LANGUAGES[a].nativeName.localeCompare(LANGUAGES[b].nativeName);
  });

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="text-xl">{LANGUAGES[language].flag}</span>
          <span className="font-medium text-gray-700">{LANGUAGES[language].nativeName}</span>
        </span>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
            {sortedLanguages.map((lang, index) => {
              const isSuggested = suggestedLanguages.includes(lang);
              const nextLang = sortedLanguages[index + 1];
              const showDivider = isSuggested && nextLang && !suggestedLanguages.includes(nextLang);

              return (
                <div key={lang}>
                  <button
                    onClick={() => handleLanguageChange(lang)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                      language === lang ? 'bg-blue-50' : ''
                    }`}
                  >
                    <span className="text-2xl">{LANGUAGES[lang].flag}</span>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-900">{LANGUAGES[lang].nativeName}</div>
                      <div className="text-sm text-gray-500">{LANGUAGES[lang].name}</div>
                    </div>
                    {language === lang && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                  </button>
                  {showDivider && (
                    <div className="border-t border-gray-200 my-1">
                      <div className="px-4 py-1 text-xs text-gray-400 bg-gray-50">
                        Other Languages
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
