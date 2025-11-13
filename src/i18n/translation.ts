import { siteConfig } from "../config";
import type I18nKey from "./i18nKey";
import { en } from "./languages/en";
import { ja } from "./languages/ja";
import { zh_CN } from "./languages/zh_CN";
import { zh_TW } from "./languages/zh_TW";

export type Translation = {
	[K in I18nKey]: string;
};

const defaultTranslation = en;

const map: { [key: string]: Translation } = {
	en: en,
	en_us: en,
	en_gb: en,
	en_au: en,
	zh_cn: zh_CN,
	zh_tw: zh_TW,
	ja: ja,
	ja_jp: ja,
};

export function getTranslation(lang: string): Translation {
	return map[lang.toLowerCase()] || defaultTranslation;
}

export function i18n(key: I18nKey): string {
	// 优先从全局变量获取用户设置的语言，然后是localStorage，然后是配置文件的语言，最后默认英文
	let lang = "en";
	if (typeof window !== "undefined") {
		// 优先使用全局变量（由initLanguageSettings设置）
		if ((window as any).__currentLanguage) {
			lang = (window as any).__currentLanguage;
			console.log("i18n: 使用全局变量语言", lang);
		} else {
			// 备用方案：从localStorage获取
			lang = localStorage.getItem("language") || siteConfig.lang || "en";
			console.log("i18n: 使用localStorage语言", lang);
			// 存储到全局变量，避免重复访问localStorage
			(window as any).__currentLanguage = lang;
		}
	} else {
		lang = siteConfig.lang || "en";
		console.log("i18n: 使用配置文件语言", lang);
	}
	
	const translatedText = getTranslation(lang)[key];
	console.log(`i18n: 翻译键 ${key} 到 ${translatedText}`);
	return translatedText;
}
