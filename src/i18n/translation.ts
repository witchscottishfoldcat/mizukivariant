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
	const normalizedLang = lang.toLowerCase().replace(/-/g, "_");
	// 只在客户端输出调试信息
	if (typeof window !== "undefined") {
		console.log("getTranslation: 输入语言", lang, "标准化后", normalizedLang, "映射结果", map[normalizedLang] ? "找到" : "未找到，使用默认");
	}
	return map[normalizedLang] || defaultTranslation;
}

/**
 * 从 Cookie 字符串中获取语言设置（用于服务端）
 */
function getLanguageFromCookie(cookieHeader: string | null | undefined): string | null {
	if (!cookieHeader) return null;
	const cookies = cookieHeader.split(";").map(c => c.trim());
	const languageCookie = cookies.find(c => c.startsWith("language="));
	return languageCookie ? languageCookie.split("=")[1] : null;
}

/**
 * 获取当前语言（支持服务端和客户端）
 * @param request 可选的 Request 对象（用于服务端从 Cookie 读取）
 */
function getCurrentLanguage(request?: Request): string {
	// 客户端：优先从全局变量获取
	if (typeof window !== "undefined") {
		if ((window as any).__currentLanguage) {
			const lang = (window as any).__currentLanguage;
			console.log("getCurrentLanguage (客户端): 使用全局变量", lang);
			return lang;
		}
		// 从 localStorage 获取
		const storedLang = localStorage.getItem("language");
		if (storedLang) {
			(window as any).__currentLanguage = storedLang;
			console.log("getCurrentLanguage (客户端): 使用localStorage", storedLang);
			return storedLang;
		}
		console.log("getCurrentLanguage (客户端): 使用默认语言", siteConfig.lang);
	}
	
	// 服务端：从 Cookie 读取
	// 如果提供了 request，使用它；否则尝试从全局 Astro 对象获取
	let actualRequest = request;
	if (!actualRequest && typeof globalThis !== "undefined") {
		// 尝试从全局 Astro 对象获取 request（在 Astro 组件中可用）
		try {
			const astro = (globalThis as any).Astro;
			if (astro?.request) {
				actualRequest = astro.request;
			}
		} catch (e) {
			// 忽略错误
		}
	}
	
	if (actualRequest) {
		const cookieHeader = actualRequest.headers.get("cookie");
		const cookieLang = getLanguageFromCookie(cookieHeader);
		console.log("getCurrentLanguage (服务端): Cookie头", cookieHeader, "提取的语言", cookieLang);
		if (cookieLang) {
			return cookieLang;
		}
	}
	
	// 默认使用配置文件中的语言
	console.log("getCurrentLanguage (服务端): 使用默认语言", siteConfig.lang);
	return siteConfig.lang || "en";
}

export function i18n(key: I18nKey, request?: Request): string {
	const lang = getCurrentLanguage(request);
	const translatedText = getTranslation(lang)[key];
	// 只在服务端输出调试信息（通过检查是否有request来判断）
	if (request && typeof window === "undefined") {
		console.log(`[服务端] i18n(${key}): 语言=${lang}, 结果=${translatedText}`);
	}
	return translatedText;
}

/**
 * 在 Astro 组件中使用的 i18n 辅助函数，自动从 Astro.request 读取语言
 * 使用方式：const t = getI18n(Astro); t(I18nKey.home)
 */
export function getI18n(astro: { request: Request }) {
	return (key: I18nKey) => i18n(key, astro.request);
}
