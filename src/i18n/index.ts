import 'intl-pluralrules';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import en from './locales/en/translation.json';
import zh from './locales/zh/translation.json';

const resources = {
  en: { translation: en },
  zh: { translation: zh },
};

const deviceLanguage = getLocales()[0]?.languageCode ?? 'en';
const defaultLanguage = deviceLanguage === 'zh' ? 'zh' : 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: defaultLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v3',
});

export default i18n;
