// 调试用i18n函数
import I18nKey from "./i18nKey";
import { getTranslation } from "./translation";

export function debugI18n() {
  // 检查当前语言设置
  let lang = "en";
  if (typeof window !== "undefined") {
    if ((window as any).__currentLanguage) {
      lang = (window as any).__currentLanguage;
      console.log("Debug i18n: 全局变量语言", lang);
    } else {
      lang = localStorage.getItem("language") || "en";
      console.log("Debug i18n: localStorage语言", lang);
    }
  }
  
  // 测试几个常用翻译
  const testKeys = [
    I18nKey.search,
    I18nKey.home,
    I18nKey.about,
    I18nKey.archive
  ];
  
  testKeys.forEach(key => {
    const translatedText = getTranslation(lang)[key];
    console.log(`Debug i18n: ${key} -> ${translatedText}`);
  });
  
  return lang;
}