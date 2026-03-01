/**
 * i18n 配置 - 使用 react-i18next
 *
 * 翻译文件按语言 + 模块拆分：
 *   locales/{lang}/common.json  —— nav / auth / settings / errors / footer / notFound / lang / pwa
 *   locales/{lang}/landing.json —— hero / mobile / demo / features / techStack / ... (首页专用)
 */

import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en/common.json";
import enLanding from "./locales/en/landing.json";
import jaCommon from "./locales/ja/common.json";
import jaLanding from "./locales/ja/landing.json";
import zhCommon from "./locales/zh/common.json";
import zhLanding from "./locales/zh/landing.json";

export const supportedLanguages = ["zh", "en", "ja"] as const;
export type Locale = (typeof supportedLanguages)[number];

const resources = {
  zh: { translation: { ...zhCommon, ...zhLanding } },
  en: { translation: { ...enCommon, ...enLanding } },
  ja: { translation: { ...jaCommon, ...jaLanding } },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "zh",
    supportedLngs: supportedLanguages,

    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "Miu2D_locale",
    },

    interpolation: {
      escapeValue: false, // React 已经处理 XSS
    },
  });

export default i18n;
