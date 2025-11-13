/**
 * 获取语言的显示名称
 * @param langCode 语言代码（配置文件格式或翻译服务格式）
 * @returns 语言的显示名称
 */
export function getLanguageDisplayName(langCode: string): string {
	const languageNames: Record<string, string> = {
		zh_CN: "简体中文",
		zh_TW: "繁體中文",
		en: "English",
		ja: "日本語",
		ko: "한국어",
		es: "Español",
		th: "ไทย",
		vi: "Tiếng Việt",
		tr: "Türkçe",
		id: "Bahasa Indonesia",
		fr: "Français",
		de: "Deutsch",
		ru: "Русский",
		ar: "العربية",
		// 翻译服务格式
		chinese_simplified: "简体中文",
		chinese_traditional: "繁體中文",
		english: "English",
		japanese: "日本語",
		korean: "한국어",
		spanish: "Español",
		thai: "ไทย",
		vietnamese: "Tiếng Việt",
		turkish: "Türkçe",
		indonesian: "Bahasa Indonesia",
		french: "Français",
		german: "Deutsch",
		russian: "Русский",
		arabic: "العربية",
	};

	return languageNames[langCode] || langCode;
}

/**
 * 初始化语言设置
 */
export function initLanguageSettings() {
	console.log("LanguageUtils: 开始初始化语言设置");
	
	// 检查是否已在localStorage中设置了语言
	let lang = localStorage.getItem("language");
	console.log("LanguageUtils: localStorage中的语言", lang);
	
	// 如果localStorage中没有，尝试从Cookie中获取
	if (!lang && typeof document !== "undefined") {
		const cookieLang = document.cookie
			?.split(";")
			.find(c => c.trim().startsWith("language="))
			?.split("=")[1];
		
		console.log("LanguageUtils: Cookie中的语言", cookieLang);
		
		if (cookieLang) {
			lang = cookieLang;
			localStorage.setItem("language", lang);
			console.log("LanguageUtils: 从Cookie设置localStorage", lang);
		}
	}
	
	// 如果还是没有，使用默认语言（英文）
	if (!lang && typeof document !== "undefined") {
		// 根据浏览器语言自动选择
		const browserLang = navigator.language || "en";
		console.log("LanguageUtils: 浏览器语言", browserLang);
		
		if (browserLang.startsWith("zh")) {
			lang = "zh_CN";
		} else if (browserLang.startsWith("ja")) {
			lang = "ja";
		} else {
			lang = "en";
		}
		
		console.log("LanguageUtils: 使用默认语言", lang);
		
		// 存储到localStorage和Cookie
		localStorage.setItem("language", lang);
		document.cookie = `language=${lang}; path=/; max-age=${60*60*24*365}; SameSite=Lax`;
		console.log("LanguageUtils: 已存储语言到localStorage和Cookie");
	}
	
	// 应用语言设置到HTML元素
	if (typeof document !== "undefined" && lang) {
		document.documentElement.lang = lang;
		console.log("LanguageUtils: 设置HTML lang属性为", lang);
		
		// 确保i18n函数能获取到正确的语言
		// 通过在全局存储当前语言设置
		(window as any).__currentLanguage = lang;
		console.log("LanguageUtils: 设置全局变量为", (window as any).__currentLanguage);
	}
	
	console.log("LanguageUtils: 初始化完成，最终语言", lang);
	return lang;
}