// use-i18n-store.ts
// Zustand store and React hook wrapper for language state management

import { create } from 'zustand';
import { translations } from '../translations';

export type Language = 'en' | 'fr';

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

// Low-level Zustand store
export const useI18nStore = create<I18nState>((set) => {
  // Safe SSR/Static-Export window checks
  let initialLang: Language = 'fr';
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('umis_lang') as Language;
    if (saved === 'en' || saved === 'fr') {
      initialLang = saved;
    }
  }

  return {
    language: initialLang,
    setLanguage: (lang) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('umis_lang', lang);
      }
      set({ language: lang });
    }
  };
});

// Premium, fully reactive React hook wrapper
export const useTranslation = () => {
  const language = useI18nStore((state) => state.language);
  const setLanguage = useI18nStore((state) => state.setLanguage);

  const t = (key: string): string => {
    const dict = translations[language] || translations['fr'];
    return (dict as any)[key] || key;
  };

  return {
    language,
    setLanguage,
    t
  };
};
