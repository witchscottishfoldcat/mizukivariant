<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { getTranslation, i18n } from "@i18n/translation";
import Icon from "@iconify/svelte";

// 支持的语言列表
const languages = [
	{ code: "en", name: "English" },
	{ code: "zh_CN", name: "简体中文" },
];

// 获取当前存储的语言或默认语言
function getCurrentLanguage() {
	// 优先使用全局变量，然后是localStorage，最后是默认值
	if (typeof window !== "undefined" && (window as any).__currentLanguage) {
		console.log(
			"LanguageSwitch: 使用全局变量语言",
			(window as any).__currentLanguage,
		);
		return (window as any).__currentLanguage;
	}
	const lang = localStorage.getItem("language") || "en";
	console.log("LanguageSwitch: 使用localStorage语言", lang);
	return lang;
}

let currentLang = $state(getCurrentLanguage());
let isDropdownOpen = $state(false);

// 检查是否为首页
function isHomePage(): boolean {
	if (typeof window === "undefined") return false;
	const path = window.location.pathname;
	return path === "/" || path === "" || path === "/index.html";
}

// 同步语言设置：从 Cookie 和 localStorage 读取并更新状态
function syncLanguageFromStorage(forceUpdate = false) {
	const cookieLang = document.cookie
		.split(";")
		.find((c) => c.trim().startsWith("language="))
		?.split("=")[1]
		?.trim();

	const storedLang = localStorage.getItem("language");

	// 优先使用 Cookie，然后是 localStorage
	const lang = cookieLang || storedLang || "en";

	if (lang !== currentLang || forceUpdate) {
		console.log(
			"LanguageSwitch: 从存储同步语言",
			lang,
			"当前语言",
			currentLang,
			"强制更新",
			forceUpdate,
		);
		currentLang = lang;
		if (typeof window !== "undefined") {
			(window as any).__currentLanguage = lang;
		}
		document.documentElement.lang = lang;
		// 确保 Cookie 和 localStorage 同步
		if (cookieLang && cookieLang !== storedLang) {
			localStorage.setItem("language", cookieLang);
		}
		if (storedLang && storedLang !== cookieLang) {
			const cookieValue = `language=${storedLang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
			document.cookie = cookieValue;
		}
		// 更新页面文本
		updateNavbarTexts();
		updatePageTexts();
	}
}

// 强制更新页面文本（带重试机制）
function forceUpdatePageTexts(retries = 3, delay = 200) {
	const lang = currentLang;
	const isHome = isHomePage();

	// 首页使用更温和的更新策略（减少重试次数和延迟）
	const finalRetries = isHome ? 1 : retries;
	const finalDelay = isHome ? 300 : delay;

	console.log(
		`LanguageSwitch: 强制更新页面文本，语言: ${lang}, 剩余重试: ${finalRetries}, 首页: ${isHome}`,
	);

	// 同步语言设置
	syncLanguageFromStorage();

	// 更新页面文本
	updatePageTexts();

	// 如果还有重试次数，延迟后再次尝试（首页只重试一次）
	if (finalRetries > 0) {
		setTimeout(() => {
			forceUpdatePageTexts(finalRetries - 1, finalDelay);
		}, finalDelay);
	}
}

// 监听 Swup 页面切换事件，确保语言设置持久化
function setupSwupListeners() {
	if (typeof window !== "undefined" && (window as any).swup) {
		const swup = (window as any).swup;

		// 页面内容替换后同步语言设置（立即执行）
		swup.hooks.on("content:replace", () => {
			console.log("LanguageSwitch: Swup content:replace 事件");
			// 立即同步一次
			setTimeout(() => {
				syncLanguageFromStorage();
			}, 50);
		});

		// 页面视图切换后同步语言设置
		swup.hooks.on("page:view", () => {
			console.log("LanguageSwitch: Swup page:view 事件");
			const isHome = isHomePage();
			// 首页使用更温和的更新策略
			if (isHome) {
				setTimeout(() => {
					syncLanguageFromStorage();
					updatePageTexts();
				}, 200);
			} else {
				// 非首页使用强制更新
				setTimeout(() => {
					forceUpdatePageTexts(3, 200);
				}, 150);
			}
		});

		// 动画结束后同步语言设置（最重要，此时内容已完全加载）
		swup.hooks.on("animation:in:end", () => {
			console.log("LanguageSwitch: Swup animation:in:end 事件");
			const isHome = isHomePage();
			// 首页使用更温和的更新策略
			if (isHome) {
				setTimeout(() => {
					syncLanguageFromStorage();
					updatePageTexts();
				}, 150);
			} else {
				// 非首页使用强制更新
				setTimeout(() => {
					forceUpdatePageTexts(3, 200);
				}, 100);
			}
		});

		console.log("LanguageSwitch: Swup 监听器已注册");
	} else {
		// 如果 Swup 尚未初始化，延迟重试
		setTimeout(() => {
			setupSwupListeners();
		}, 200);
	}
}

// 初始化时设置 Swup 监听器并同步语言
if (typeof window !== "undefined") {
	// 页面加载时立即同步语言设置
	syncLanguageFromStorage();

	// 设置 Swup 监听器
	setTimeout(setupSwupListeners, 100);

	// 也监听浏览器前进/后退
	window.addEventListener("popstate", () => {
		const isHome = isHomePage();
		if (isHome) {
			// 首页使用更温和的更新
			setTimeout(() => {
				syncLanguageFromStorage();
				updatePageTexts();
			}, 200);
		} else {
			// 非首页使用强制更新
			setTimeout(() => {
				forceUpdatePageTexts(3, 200);
			}, 150);
		}
	});

	// 监听 DOM 内容变化，确保在内容加载后更新语言
	if (typeof MutationObserver !== "undefined") {
		let updateTimeout: ReturnType<typeof setTimeout> | null = null;

		const observer = new MutationObserver((mutations) => {
			let shouldUpdate = false;
			mutations.forEach((mutation) => {
				if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
					// 检查是否有新的主要内容被添加
					mutation.addedNodes.forEach((node) => {
						if (node.nodeType === 1) {
							const element = node as Element;
							// 检查是否是主要内容区域或包含 i18n 元素
							if (
								element.tagName === "MAIN" ||
								element.tagName === "ARTICLE" ||
								element.querySelector?.("main") ||
								element.querySelector?.("article") ||
								element.querySelector?.("[data-i18n]") ||
								element.hasAttribute?.("data-i18n")
							) {
								shouldUpdate = true;
							}
						}
					});
				}
			});
			if (shouldUpdate) {
				// 防抖：延迟更新，确保内容已完全渲染
				if (updateTimeout) {
					clearTimeout(updateTimeout);
				}
				updateTimeout = setTimeout(() => {
					const isHome = isHomePage();
					console.log("LanguageSwitch: DOM 内容变化，更新语言，首页:", isHome);
					if (isHome) {
						// 首页使用更温和的更新
						syncLanguageFromStorage();
						updatePageTexts();
					} else {
						// 非首页使用强制更新
						forceUpdatePageTexts(2, 150);
					}
				}, 200);
			}
		});

		// 观察 body 元素的变化（因为 Swup 会替换整个 main 内容）
		const bodyElement = document.body;
		if (bodyElement) {
			observer.observe(bodyElement, {
				childList: true,
				subtree: true,
			});
			console.log("LanguageSwitch: MutationObserver 已设置，观察 body 变化");
		}

		// 在 Swup 切换时重新设置观察器（因为 main 元素可能被替换）
		if ((window as any).swup) {
			const swup = (window as any).swup;
			swup.hooks.on("content:replace", () => {
				setTimeout(() => {
					const mainElement = document.querySelector("main");
					if (mainElement && !mainElement.isConnected) {
						// main 元素被替换，重新观察
						const newMainElement = document.querySelector("main");
						if (newMainElement) {
							observer.observe(newMainElement, {
								childList: true,
								subtree: true,
							});
							console.log("LanguageSwitch: 重新设置 MutationObserver");
						}
					}
				}, 50);
			});
		}
	}

	// 监听语言变化事件（从其他组件触发）
	window.addEventListener("language-changed", () => {
		syncLanguageFromStorage();
	});

	// 定期同步语言设置（防止意外丢失）
	setInterval(() => {
		syncLanguageFromStorage();
	}, 5000); // 每5秒检查一次
}

// 切换语言函数
function switchLanguage(lang: string) {
	console.log("LanguageSwitch: 切换语言到", lang);
	currentLang = lang;
	localStorage.setItem("language", lang);
	console.log(
		"LanguageSwitch: 已设置localStorage",
		localStorage.getItem("language"),
	);

	// 更新全局变量，确保i18n函数能立即获取到新语言
	if (typeof window !== "undefined") {
		(window as any).__currentLanguage = lang;
		console.log(
			"LanguageSwitch: 已设置全局变量",
			(window as any).__currentLanguage,
		);
	}

	// 同时设置Cookie，使服务端也能获取到语言设置
	// 使用更明确的 Cookie 设置方式，确保在根路径下可用
	// 设置 Cookie（有效期1年）
	const cookieValue = `language=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
	document.cookie = cookieValue;
	console.log("LanguageSwitch: 已设置Cookie", cookieValue);
	console.log("LanguageSwitch: 当前所有Cookie", document.cookie);

	// 多次验证 Cookie 是否设置成功（确保持久化）
	const verifyCookie = () => {
		const cookie = document.cookie
			.split(";")
			.find((c) => c.trim().startsWith("language="))
			?.split("=")[1]
			?.trim();

		if (!cookie || cookie !== lang) {
			console.warn(
				"LanguageSwitch: Cookie验证失败，重试设置",
				"期望:",
				lang,
				"实际:",
				cookie,
			);
			// 重试设置 Cookie
			document.cookie = cookieValue;
			return false;
		}
		return true;
	};

	// 立即验证
	verifyCookie();

	// 延迟验证（确保 Cookie 已写入）
	setTimeout(() => {
		if (!verifyCookie()) {
			// 如果还是失败，再试一次
			setTimeout(verifyCookie, 100);
		}
	}, 50);

	// 更新网站语言
	document.documentElement.lang = lang;
	console.log(
		"LanguageSwitch: 已设置HTML lang属性",
		document.documentElement.lang,
	);

	// 触发语言变化事件，通知其他组件更新
	if (typeof window !== "undefined") {
		window.dispatchEvent(
			new CustomEvent("language-changed", { detail: { lang } }),
		);
		console.log("LanguageSwitch: 已触发 language-changed 事件");
	}

	// 更新导航栏文本（立即更新，不等待页面重新加载）
	updateNavbarTexts();

	// 更新页面中所有使用 i18n 的文本（客户端更新，不刷新页面）
	updatePageTexts();

	// 不再自动刷新页面，所有内容通过客户端更新
	console.log("LanguageSwitch: 语言切换完成，已更新所有文本（不刷新页面）");
}

// 更新页面中所有使用 i18n 的文本
function updatePageTexts() {
	const lang = currentLang;
	console.log("LanguageSwitch: 更新页面文本，语言:", lang);

	// 动态导入翻译数据
	import("@/i18n/translation")
		.then(({ getTranslation }) => {
			import("@/i18n/i18nKey").then(({ default: I18nKey }) => {
				const translations = getTranslation(lang);

				// 更新页面标题（如果有 data-i18n 属性）
				const i18nElements = document.querySelectorAll("[data-i18n]");
				i18nElements.forEach((element) => {
					const key = element.getAttribute("data-i18n");
					if (key && translations[key as keyof typeof translations]) {
						element.textContent =
							translations[key as keyof typeof translations];
					}
				});

				// 更新侧边栏组件标题
				// 1. Categories 标题
				const categoriesWidget = document.querySelector(
					'widget-layout[data-id="categories"]',
				);
				if (categoriesWidget) {
					const titleElement = categoriesWidget.querySelector(".font-bold");
					if (titleElement && translations[I18nKey.categories]) {
						titleElement.textContent = translations[I18nKey.categories];
					}
				}

				// 2. Tags 标题
				const tagsWidget = document.querySelector(
					'widget-layout[data-id="tags"]',
				);
				if (tagsWidget) {
					const titleElement = tagsWidget.querySelector(".font-bold");
					if (titleElement && translations[I18nKey.tags]) {
						titleElement.textContent = translations[I18nKey.tags];
					}
				}

				// 3. Announcement 标题和内容
				const announcementWidget = document.querySelector(
					'widget-layout[data-id="announcement"]',
				);
				if (announcementWidget) {
					const titleElement = announcementWidget.querySelector(".font-bold");
					if (titleElement && translations[I18nKey.announcement]) {
						titleElement.textContent = translations[I18nKey.announcement];
					}
					// 更新关闭按钮的 aria-label
					const closeButton =
						announcementWidget.querySelector("button[aria-label]");
					if (closeButton && translations[I18nKey.announcementClose]) {
						closeButton.setAttribute(
							"aria-label",
							translations[I18nKey.announcementClose],
						);
					}
					// 更新公告栏内容
					const announcementContentMap: Record<
						string,
						{ en: string; zh_CN: string }
					> = {
						"Welcome to my blog! This is a sample announcement.": {
							en: "Welcome to my blog! This is a sample announcement.",
							zh_CN: "欢迎来到我的博客！这是一个示例公告。",
						},
					};
					// 创建反向映射
					const announcementContentReverseMap: Record<string, string> = {};
					Object.values(announcementContentMap).forEach((translation) => {
						announcementContentReverseMap[translation.zh_CN] = translation.en;
					});
					const contentElement = announcementWidget.querySelector(
						".text-neutral-600, .text-neutral-300",
					);
					if (contentElement) {
						const contentText = contentElement.textContent?.trim() || "";
						let translatedContent: string | null = null;
						if (announcementContentMap[contentText]) {
							translatedContent =
								announcementContentMap[contentText][lang as "en" | "zh_CN"] ||
								announcementContentMap[contentText].en;
						} else if (
							lang === "en" &&
							announcementContentReverseMap[contentText]
						) {
							translatedContent = announcementContentReverseMap[contentText];
						}
						if (translatedContent && translatedContent !== contentText) {
							contentElement.textContent = translatedContent;
						}
					}
					// 更新公告栏链接文本
					const linkTextMap: Record<string, { en: string; zh_CN: string }> = {
						"Learn More": {
							en: "Learn More",
							zh_CN: "了解更多",
						},
					};
					// 创建链接文本的反向映射
					const linkTextReverseMap: Record<string, string> = {};
					Object.values(linkTextMap).forEach((translation) => {
						linkTextReverseMap[translation.zh_CN] = translation.en;
					});
					const linkElement = announcementWidget.querySelector("a.btn-regular");
					if (linkElement) {
						const linkText = linkElement.textContent?.trim() || "";
						let translatedLinkText: string | null = null;
						if (linkTextMap[linkText]) {
							translatedLinkText =
								linkTextMap[linkText][lang as "en" | "zh_CN"] ||
								linkTextMap[linkText].en;
						} else if (lang === "en" && linkTextReverseMap[linkText]) {
							translatedLinkText = linkTextReverseMap[linkText];
						}
						if (translatedLinkText && translatedLinkText !== linkText) {
							linkElement.textContent = translatedLinkText;
						}
					}
				}

				// 4. 更新所有 WidgetLayout 中的 "more" 按钮文本
				const moreButtons = document.querySelectorAll(".expand-btn button");
				moreButtons.forEach((button) => {
					// 查找按钮内的文本节点
					const walker = document.createTreeWalker(
						button,
						NodeFilter.SHOW_TEXT,
						null,
					);
					let textNode: Node | null = walker.nextNode();
					while (textNode !== null) {
						const text = textNode.textContent?.trim();
						// 检查是否是 "more" 相关的文本（可能是 "More"、"更多" 或其他语言）
						if (
							text &&
							(text.toLowerCase().includes("more") ||
								text === "更多" ||
								text === translations[I18nKey.more] ||
								// 检查是否是已知的其他语言版本
								["More", "更多", "もっと", "Más", "Mehr"].some(
									(known) => text === known,
								))
						) {
							if (translations[I18nKey.more]) {
								textNode.textContent = translations[I18nKey.more];
								break;
							}
						}
						textNode = walker.nextNode();
					}
				});

				// 5. 更新所有 widget-layout 中的标题（通用方法）
				const allWidgets = document.querySelectorAll("widget-layout");
				allWidgets.forEach((widget) => {
					const titleElement = widget.querySelector(".font-bold");
					if (titleElement) {
						const widgetId = widget.getAttribute("data-id");
						// 根据 widget ID 更新对应的标题
						if (widgetId === "categories" && translations[I18nKey.categories]) {
							titleElement.textContent = translations[I18nKey.categories];
						} else if (widgetId === "tags" && translations[I18nKey.tags]) {
							titleElement.textContent = translations[I18nKey.tags];
						} else if (
							widgetId === "announcement" &&
							translations[I18nKey.announcement]
						) {
							titleElement.textContent = translations[I18nKey.announcement];
						}
					}
				});

				// 6. 更新文章卡片中的 "words" 文本
				// 方法：查找所有包含数字和 "word"/"words"/"字" 的父元素，然后更新其中的文本
				const metaElements = document.querySelectorAll(
					".text-50, .text-75, .text-90, .text-sm",
				);
				metaElements.forEach((element) => {
					const fullText = element.textContent || "";
					// 匹配格式：数字 + 空格 + "word"/"words"/"字"
					const wordMatch = fullText.match(/(\d+)\s+(word|words|字)\b/i);
					if (wordMatch) {
						const count = Number.parseInt(wordMatch[1], 10);
						const wordText =
							count > 1
								? translations[I18nKey.wordsCount]
								: translations[I18nKey.wordCount];
						if (wordText) {
							// 替换整个文本中的 "数字 words" 为 "数字 {wordText}"
							const newText = fullText.replace(
								/(\d+)\s+(word|words|字)\b/gi,
								`${count} ${wordText}`,
							);
							if (newText !== fullText) {
								// 如果文本节点是直接子节点，直接更新
								if (
									element.childNodes.length === 1 &&
									element.firstChild?.nodeType === Node.TEXT_NODE
								) {
									element.textContent = newText;
								} else {
									// 否则查找并更新包含 "word"/"words"/"字" 的文本节点
									const walker = document.createTreeWalker(
										element,
										NodeFilter.SHOW_TEXT,
										null,
									);
									let textNode: Node | null = walker.nextNode();
									while (textNode !== null) {
										const nodeText = textNode.textContent || "";
										if (nodeText.match(/(\d+)\s+(word|words|字)\b/i)) {
											const nodeMatch = nodeText.match(
												/(\d+)\s+(word|words|字)\b/i,
											);
											if (nodeMatch) {
												const nodeCount = Number.parseInt(nodeMatch[1], 10);
												const nodeWordText =
													nodeCount > 1
														? translations[I18nKey.wordsCount]
														: translations[I18nKey.wordCount];
												if (nodeWordText) {
													textNode.textContent = nodeText.replace(
														/(\d+)\s+(word|words|字)\b/gi,
														`${nodeCount} ${nodeWordText}`,
													);
												}
											}
											break; // 只更新第一个匹配的节点
										}
										textNode = walker.nextNode();
									}
								}
							}
						}
					}
				});

				// 7. 更新 "Uncategorized" 文本
				const uncategorizedElements = document.querySelectorAll(
					".text-50, .text-75, .text-90",
				);
				uncategorizedElements.forEach((element) => {
					const walker = document.createTreeWalker(
						element,
						NodeFilter.SHOW_TEXT,
						null,
					);
					let textNode: Node | null = walker.nextNode();
					while (textNode !== null) {
						const text = textNode.textContent?.trim();
						if (text === "Uncategorized" || text === "未分类") {
							if (translations[I18nKey.uncategorized]) {
								textNode.textContent = translations[I18nKey.uncategorized];
							}
						}
						textNode = walker.nextNode();
					}
				});

				// 8. 更新 "No Tags" 文本
				const noTagsElements = document.querySelectorAll(".text-50, .text-75");
				noTagsElements.forEach((element) => {
					const walker = document.createTreeWalker(
						element,
						NodeFilter.SHOW_TEXT,
						null,
					);
					let textNode: Node | null = walker.nextNode();
					while (textNode !== null) {
						const text = textNode.textContent?.trim();
						if (text === "No Tags" || text === "无标签") {
							if (translations[I18nKey.noTags]) {
								textNode.textContent = translations[I18nKey.noTags];
							}
						}
						textNode = walker.nextNode();
					}
				});

				// 9. 更新所有 aria-label 属性
				const ariaLabelMap: Record<string, string> = {
					"Previous Page": lang === "zh_CN" ? "上一页" : "Previous Page",
					"Next Page": lang === "zh_CN" ? "下一页" : "Next Page",
					"Go to About Page":
						lang === "zh_CN" ? "前往关于页面" : "Go to About Page",
					"Display Settings":
						lang === "zh_CN" ? "显示设置" : "Display Settings",
					Menu: lang === "zh_CN" ? "菜单" : "Menu",
					"Back to Top": lang === "zh_CN" ? "返回顶部" : "Back to Top",
					"Search Panel": lang === "zh_CN" ? "搜索面板" : "Search Panel",
					"Table of Contents":
						translations[I18nKey.tableOfContents] || "Table of Contents",
					"Close TOC": lang === "zh_CN" ? "关闭目录" : "Close TOC",
				};

				// 更新 aria-label
				document.querySelectorAll("[aria-label]").forEach((element) => {
					const ariaLabel = element.getAttribute("aria-label");
					if (ariaLabel) {
						// 检查是否是已知的英文文本
						for (const [enText, translatedText] of Object.entries(
							ariaLabelMap,
						)) {
							if (ariaLabel === enText) {
								element.setAttribute("aria-label", translatedText);
								break;
							}
						}
						// 更新 "Page X" 格式
						const pageMatch = ariaLabel.match(/^Page (\d+)$/);
						if (pageMatch && lang === "zh_CN") {
							element.setAttribute("aria-label", `第 ${pageMatch[1]} 页`);
						}
					}
				});

				// 10. 更新所有 placeholder 属性
				document
					.querySelectorAll("input[placeholder], textarea[placeholder]")
					.forEach((element) => {
						const placeholder = (element as HTMLInputElement).placeholder;
						if (placeholder) {
							if (placeholder === "Search" && translations[I18nKey.search]) {
								(element as HTMLInputElement).placeholder =
									translations[I18nKey.search];
							}
						}
					});

				// 11. 更新 ArchivePanel 中的 "post"/"posts" 文本
				const archivePanel = document.querySelector(".card-base");
				if (archivePanel) {
					const walker = document.createTreeWalker(
						archivePanel,
						NodeFilter.SHOW_TEXT,
						null,
					);
					let textNode: Node | null = walker.nextNode();
					while (textNode !== null) {
						const text = textNode.textContent || "";
						// 匹配格式：数字 + 空格 + "post"/"posts"/"篇文章"
						const postMatch = text.match(/(\d+)\s+(post|posts|篇文章)\b/i);
						if (postMatch) {
							const count = Number.parseInt(postMatch[1], 10);
							const postText =
								count > 1
									? translations[I18nKey.postsCount]
									: translations[I18nKey.postCount];
							if (postText) {
								textNode.textContent = text.replace(
									/(\d+)\s+(post|posts|篇文章)\b/gi,
									`${count} ${postText}`,
								);
							}
						}
						textNode = walker.nextNode();
					}
				}

				// 12. 更新文章标题和描述（需要翻译映射表）
				// 创建双向映射：英文 -> 翻译对象，中文 -> 翻译对象
				const postTitleMap: Record<string, { en: string; zh_CN: string }> = {
					"Markdown Tutorial": {
						en: "Markdown Tutorial",
						zh_CN: "Markdown 教程",
					},
					"Encrypted Post": {
						en: "Encrypted Post",
						zh_CN: "加密文章",
					},
					"Markdown Extended Features": {
						en: "Markdown Extended Features",
						zh_CN: "Markdown 扩展功能",
					},
					"Simple Guides for Mizuki": {
						en: "Simple Guides for Mizuki",
						zh_CN: "Mizuki 简单指南",
					},
					"Cover Image of the Post": {
						en: "Cover Image of the Post",
						zh_CN: "文章封面图片",
					},
					"Markdown Mermaid": {
						en: "Markdown Mermaid",
						zh_CN: "Markdown Mermaid",
					},
					"Include Video in the Posts": {
						en: "Include Video in the Posts",
						zh_CN: "在文章中嵌入视频",
					},
					"Draft Example": {
						en: "Draft Example",
						zh_CN: "草稿示例",
					},
				};

				// 创建反向映射：从中文文本找到对应的英文文本
				const postTitleReverseMap: Record<string, string> = {};
				Object.values(postTitleMap).forEach((translation) => {
					postTitleReverseMap[translation.zh_CN] = translation.en;
				});

				// 辅助函数：根据当前文本和目标语言找到翻译
				function findTranslation(
					text: string,
					targetLang: string,
				): string | null {
					// 先尝试直接匹配
					if (postTitleMap[text]) {
						return postTitleMap[text][targetLang as "en" | "zh_CN"] || null;
					}
					// 如果是中文，尝试反向查找
					if (targetLang === "en" && postTitleReverseMap[text]) {
						return postTitleReverseMap[text];
					}
					// 遍历所有翻译，查找匹配的中文文本
					if (targetLang === "en") {
						for (const [enText, translation] of Object.entries(postTitleMap)) {
							if (translation.zh_CN === text) {
								return enText;
							}
						}
					}
					return null;
				}

				// 文章描述翻译映射表
				const postDescriptionMap: Record<
					string,
					{ en: string; zh_CN: string }
				> = {
					"A simple example of a Markdown blog post.": {
						en: "A simple example of a Markdown blog post.",
						zh_CN: "一个简单的 Markdown 博客文章示例。",
					},
					"A simple example of a Markdown blog post with Mermaid.": {
						en: "A simple example of a Markdown blog post with Mermaid.",
						zh_CN: "一个包含 Mermaid 图表的 Markdown 博客文章示例。",
					},
					"Read more about Markdown features in Mizuki": {
						en: "Read more about Markdown features in Mizuki",
						zh_CN: "了解更多关于 Mizuki 中的 Markdown 功能",
					},
					"This is an article for testing the page encryption feature": {
						en: "This is an article for testing the page encryption feature",
						zh_CN: "这是一篇用于测试页面加密功能的文章",
					},
					"This post demonstrates how to include embedded video in a blog post.":
						{
							en: "This post demonstrates how to include embedded video in a blog post.",
							zh_CN: "这篇文章演示了如何在博客文章中嵌入视频。",
						},
					"This article is currently in a draft state and is not published. Therefore, it will not be visible to the general audience. The content is still a work in progress and may require further editing and review.":
						{
							en: "This article is currently in a draft state and is not published. Therefore, it will not be visible to the general audience. The content is still a work in progress and may require further editing and review.",
							zh_CN:
								"这篇文章目前处于草稿状态，尚未发布。因此，它不会对普通观众可见。内容仍在进行中，可能需要进一步编辑和审查。",
						},
					"How to use this blog template.": {
						en: "How to use this blog template.",
						zh_CN: "如何使用这个博客模板。",
					},
				};

				// 创建描述的反向映射
				const postDescriptionReverseMap: Record<string, string> = {};
				Object.values(postDescriptionMap).forEach((translation) => {
					postDescriptionReverseMap[translation.zh_CN] = translation.en;
				});

				// 辅助函数：根据当前描述文本和目标语言找到翻译
				function findDescriptionTranslation(
					text: string,
					targetLang: string,
				): string | null {
					// 先尝试直接匹配
					if (postDescriptionMap[text]) {
						return (
							postDescriptionMap[text][targetLang as "en" | "zh_CN"] || null
						);
					}
					// 如果是中文，尝试反向查找
					if (targetLang === "en" && postDescriptionReverseMap[text]) {
						return postDescriptionReverseMap[text];
					}
					// 遍历所有翻译，查找匹配的中文文本
					if (targetLang === "en") {
						for (const [enText, translation] of Object.entries(
							postDescriptionMap,
						)) {
							if (translation.zh_CN === text) {
								return enText;
							}
						}
					}
					return null;
				}

				// 更新文章标题（在文章卡片和详情页中）
				// 方法：遍历所有可能的标题元素，查找并替换
				const titleSelectors = [
					".card-base a.text-3xl", // PostCard 中的标题链接
					".card-base .text-3xl", // PostCard 中的标题
					"h1", // 文章详情页的 h1 标题
					".text-\\[2\\.25rem\\]", // 文章详情页的大标题
					"[data-pagefind-meta='title']", // Pagefind 标记的标题
				];

				titleSelectors.forEach((selector) => {
					try {
						const titleElements = document.querySelectorAll(selector);
						titleElements.forEach((element) => {
							const titleText = element.textContent?.trim() || "";
							if (titleText) {
								const translatedTitle = findTranslation(titleText, lang);
								if (translatedTitle && translatedTitle !== titleText) {
									// 直接更新元素文本内容
									element.textContent = translatedTitle;
								}
							}
						});
					} catch (e) {
						// 忽略选择器错误（某些 CSS 选择器可能无效）
						console.warn("LanguageSwitch: 标题选择器错误", selector, e);
					}
				});

				// 额外处理：查找所有包含文章标题的文本节点
				const allTitleWalker = document.createTreeWalker(
					document.body,
					NodeFilter.SHOW_TEXT,
					null,
				);
				let titleTextNode: Node | null = allTitleWalker.nextNode();
				while (titleTextNode !== null) {
					const text = titleTextNode.textContent?.trim() || "";
					if (text) {
						const translatedTitle = findTranslation(text, lang);
						if (translatedTitle && translatedTitle !== text) {
							titleTextNode.textContent = translatedTitle;
						}
					}
					titleTextNode = allTitleWalker.nextNode();
				}

				// 更新文章描述（在文章卡片中）
				const descriptionSelectors = [
					".card-base .text-75", // PostCard 中的描述
					".line-clamp-2", // 描述文本容器
					".line-clamp-1", // 描述文本容器（单行）
				];

				descriptionSelectors.forEach((selector) => {
					try {
						const descriptionElements = document.querySelectorAll(selector);
						descriptionElements.forEach((element) => {
							const descriptionText = element.textContent?.trim() || "";
							if (descriptionText) {
								const translatedDescription = findDescriptionTranslation(
									descriptionText,
									lang,
								);
								if (
									translatedDescription &&
									translatedDescription !== descriptionText
								) {
									element.textContent = translatedDescription;
								}
							}
						});
					} catch (e) {
						console.warn("LanguageSwitch: 描述选择器错误", selector, e);
					}
				});

				// 额外处理：查找所有包含文章描述的文本节点
				const allDescriptionWalker = document.createTreeWalker(
					document.body,
					NodeFilter.SHOW_TEXT,
					null,
				);
				let descriptionTextNode: Node | null = allDescriptionWalker.nextNode();
				while (descriptionTextNode !== null) {
					const text = descriptionTextNode.textContent?.trim() || "";
					if (text) {
						const translatedDescription = findDescriptionTranslation(
							text,
							lang,
						);
						if (translatedDescription && translatedDescription !== text) {
							descriptionTextNode.textContent = translatedDescription;
						}
					}
					descriptionTextNode = allDescriptionWalker.nextNode();
				}

				// 13. 更新所有包含已知英文文本的元素（通用方法，支持双向翻译）
				const commonTextMap: Record<string, I18nKey> = {
					Search: I18nKey.search,
					Categories: I18nKey.categories,
					Tags: I18nKey.tags,
					Announcement: I18nKey.announcement,
					More: I18nKey.more,
					Home: I18nKey.home,
					About: I18nKey.about,
					Archive: I18nKey.archive,
					Friends: I18nKey.friends,
					Anime: I18nKey.anime,
					Diary: I18nKey.diary,
					Albums: I18nKey.albums,
					Projects: I18nKey.projects,
					Skills: I18nKey.skills,
					Timeline: I18nKey.timeline,
				};

				// 创建反向映射：从中文文本找到对应的英文文本
				const commonTextReverseMap: Record<string, string> = {};
				Object.entries(commonTextMap).forEach(([enText, key]) => {
					const zhText = translations[key];
					if (zhText) {
						commonTextReverseMap[zhText] = enText;
					}
				});

				// 14. 更新分类名称（Categories）
				const categoryNameMap: Record<string, { en: string; zh_CN: string }> = {
					Examples: {
						en: "Examples",
						zh_CN: "示例",
					},
					Guides: {
						en: "Guides",
						zh_CN: "指南",
					},
					Technology: {
						en: "Technology",
						zh_CN: "技术",
					},
				};

				// 创建分类名称的反向映射
				const categoryNameReverseMap: Record<string, string> = {};
				Object.values(categoryNameMap).forEach((translation) => {
					categoryNameReverseMap[translation.zh_CN] = translation.en;
				});

				// 辅助函数：根据当前分类名称和目标语言找到翻译
				function findCategoryTranslation(
					text: string,
					targetLang: string,
				): string | null {
					// 先尝试直接匹配
					if (categoryNameMap[text]) {
						return categoryNameMap[text][targetLang as "en" | "zh_CN"] || null;
					}
					// 如果是中文，尝试反向查找
					if (targetLang === "en" && categoryNameReverseMap[text]) {
						return categoryNameReverseMap[text];
					}
					// 遍历所有翻译，查找匹配的中文文本
					if (targetLang === "en") {
						for (const [enText, translation] of Object.entries(
							categoryNameMap,
						)) {
							if (translation.zh_CN === text) {
								return enText;
							}
						}
					}
					return null;
				}

				// 更新分类名称（在侧边栏和文章元数据中）
				// 方法1: 更新侧边栏分类列表
				const categoriesWidgetForNames = document.querySelector(
					'widget-layout[data-id="categories"]',
				);
				if (categoriesWidgetForNames) {
					const categoryLinks =
						categoriesWidgetForNames.querySelectorAll("a button");
					categoryLinks.forEach((button) => {
						// ButtonLink 的结构：button > div > div (分类名称) + div (数字徽章)
						const textContainer = button.querySelector(
							"div.overflow-hidden.text-left",
						);
						if (textContainer) {
							const categoryText = textContainer.textContent?.trim() || "";
							if (categoryText) {
								const translatedCategory = findCategoryTranslation(
									categoryText,
									lang,
								);
								if (translatedCategory && translatedCategory !== categoryText) {
									// 更新文本容器中的文本节点
									const walker = document.createTreeWalker(
										textContainer,
										NodeFilter.SHOW_TEXT,
										null,
									);
									let textNode: Node | null = walker.nextNode();
									while (textNode !== null) {
										if (textNode.textContent?.trim() === categoryText) {
											textNode.textContent = translatedCategory;
											break;
										}
										textNode = walker.nextNode();
									}
								}
							}
						}
					});
				}

				// 方法2: 更新文章元数据中的分类名称
				const categorySelectors = [
					".link-lg", // PostMeta 中的分类链接
					".text-50", // 分类文本
				];

				categorySelectors.forEach((selector) => {
					try {
						const categoryElements = document.querySelectorAll(selector);
						categoryElements.forEach((element) => {
							const categoryText = element.textContent?.trim() || "";
							if (categoryText) {
								const translatedCategory = findCategoryTranslation(
									categoryText,
									lang,
								);
								if (translatedCategory && translatedCategory !== categoryText) {
									element.textContent = translatedCategory;
								}
							}
						});
					} catch (e) {
						console.warn("LanguageSwitch: 分类选择器错误", selector, e);
					}
				});

				// 方法3: 遍历所有文本节点，查找并替换分类名称
				// 注意：需要处理可能包含数字的情况（如 "Examples 5"）
				const allCategoryWalker = document.createTreeWalker(
					document.body,
					NodeFilter.SHOW_TEXT,
					null,
				);
				let categoryTextNode: Node | null = allCategoryWalker.nextNode();
				while (categoryTextNode !== null) {
					const text = categoryTextNode.textContent?.trim() || "";
					if (text) {
						// 先尝试完全匹配
						let translatedCategory = findCategoryTranslation(text, lang);
						// 如果完全匹配失败，尝试匹配文本开头（处理 "Examples 5" 这种情况）
						if (!translatedCategory) {
							for (const [enName, translation] of Object.entries(
								categoryNameMap,
							)) {
								if (
									text.startsWith(enName) ||
									text.startsWith(translation.zh_CN)
								) {
									// 提取数字部分（如果有）
									const numberMatch = text.match(/\s+(\d+)$/);
									const numberPart = numberMatch ? numberMatch[0] : "";
									if (lang === "zh_CN") {
										translatedCategory = translation.zh_CN + numberPart;
									} else {
										translatedCategory = translation.en + numberPart;
									}
									break;
								}
							}
						}
						if (translatedCategory && translatedCategory !== text) {
							categoryTextNode.textContent = translatedCategory;
						}
					}
					categoryTextNode = allCategoryWalker.nextNode();
				}

				// 遍历所有文本节点，查找并替换已知的文本（支持双向翻译）
				const allTextWalker = document.createTreeWalker(
					document.body,
					NodeFilter.SHOW_TEXT,
					null,
				);
				let allTextNode: Node | null = allTextWalker.nextNode();
				while (allTextNode !== null) {
					const nodeText = allTextNode.textContent?.trim() || "";
					if (nodeText) {
						let targetText: string | null = null;
						// 先尝试英文 -> 中文
						if (commonTextMap[nodeText]) {
							const key = commonTextMap[nodeText];
							targetText = translations[key];
						}
						// 再尝试中文 -> 英文
						else if (lang === "en" && commonTextReverseMap[nodeText]) {
							targetText = commonTextReverseMap[nodeText];
						}
						if (targetText && targetText !== nodeText) {
							allTextNode.textContent = targetText;
						}
					}
					allTextNode = allTextWalker.nextNode();
				}

				console.log("LanguageSwitch: 页面文本更新完成");
			});
		})
		.catch((e) => {
			console.error("LanguageSwitch: 无法加载翻译模块", e);
		});
}

// 更新导航栏文本的函数
function updateNavbarTexts() {
	const lang = currentLang;
	console.log("LanguageSwitch: 更新导航栏文本，语言:", lang);

	// 定义翻译映射
	const translationMap: Record<string, { en: string; zh_CN: string }> = {
		Home: { en: "Home", zh_CN: "主页" },
		About: { en: "About", zh_CN: "关于" },
		Archive: { en: "Archive", zh_CN: "归档" },
		Friends: { en: "Friends", zh_CN: "友链" },
		Anime: { en: "Anime", zh_CN: "追番" },
		Diary: { en: "Diary", zh_CN: "日记" },
		Albums: { en: "Albums", zh_CN: "相册" },
		Projects: { en: "Projects", zh_CN: "项目" },
		Skills: { en: "Skills", zh_CN: "技能" },
		Timeline: { en: "Timeline", zh_CN: "时间线" },
	};

	// 更新导航栏文本的函数
	const updateTextInContainer = (
		container: Element,
		enText: string,
		zhText: string,
		targetText: string,
	) => {
		// 方法1: 直接查找文本节点
		const walker = document.createTreeWalker(
			container,
			NodeFilter.SHOW_TEXT,
			null,
		);

		let textNode: Node | null = walker.nextNode();
		while (textNode !== null) {
			const text = textNode.textContent?.trim();
			if (text === enText || text === zhText) {
				textNode.textContent = targetText;
				return true;
			}
			textNode = walker.nextNode();
		}

		// 方法2: 查找包含文本的 span（下拉菜单中的子项）
		const spans = container.querySelectorAll("span");
		for (const span of spans) {
			const text = span.textContent?.trim();
			if (text === enText || text === zhText) {
				span.textContent = targetText;
				return true;
			}
		}

		return false;
	};

	// 更新所有导航链接
	for (const [key, translations] of Object.entries(translationMap)) {
		const targetText = translations[lang as "en" | "zh_CN"] || translations.en;
		const enText = translations.en;
		const zhText = translations.zh_CN;

		// 桌面端：更新所有按钮和链接
		const navElements = document.querySelectorAll("#navbar button, #navbar a");
		navElements.forEach((element) => {
			if (
				element.textContent?.trim().includes(enText) ||
				element.textContent?.trim().includes(zhText)
			) {
				updateTextInContainer(element, enText, zhText, targetText);
			}
		});

		// 移动端：更新菜单项
		const mobileElements = document.querySelectorAll(
			"#nav-menu-panel button, #nav-menu-panel a",
		);
		mobileElements.forEach((element) => {
			if (
				element.textContent?.trim().includes(enText) ||
				element.textContent?.trim().includes(zhText)
			) {
				updateTextInContainer(element, enText, zhText, targetText);
			}
		});

		// 下拉菜单项
		const dropdownItems = document.querySelectorAll(".dropdown-item");
		dropdownItems.forEach((element) => {
			if (
				element.textContent?.trim().includes(enText) ||
				element.textContent?.trim().includes(zhText)
			) {
				updateTextInContainer(element, enText, zhText, targetText);
			}
		});
	}

	console.log("LanguageSwitch: 导航栏文本更新完成");
}

// 切换下拉菜单显示状态
function toggleDropdown() {
	isDropdownOpen = !isDropdownOpen;
}

// 关闭下拉菜单
function closeDropdown() {
	isDropdownOpen = false;
}

// 获取当前语言显示名称
function getCurrentLanguageName() {
	const lang = languages.find((l) => l.code === currentLang);
	return lang ? lang.name : "English";
}

// 获取当前语言标志
// 如果 circle-flags 图标不可用，可以尝试其他格式：
// - "twemoji:flag-us" / "twemoji:flag-china"
// - "emojione:flag-for-flag-united-states" / "emojione:flag-for-flag-china"
// - "material-symbols:language" (通用语言图标)
function getCurrentLanguageFlag() {
	switch (currentLang) {
		case "en":
			return "circle-flags:us";
		case "zh_CN":
			return "circle-flags:cn";
		default:
			return "circle-flags:us";
	}
}

// 初始化页面语言
if (typeof window !== "undefined") {
	// 使用 $effect 来响应式更新
	$effect(() => {
		document.documentElement.lang = currentLang;
	});
}

// 点击页面其他地方关闭下拉菜单
if (typeof document !== "undefined") {
	document.addEventListener("click", (e) => {
		const target = e.target as Element;
		if (!target.closest(".language-switch-container")) {
			isDropdownOpen = false;
		}
	});
}
</script>

<div class="language-switch-container relative z-50">
  <button 
    aria-label="Language Switch" 
    class="relative btn-plain scale-animation rounded-lg h-11 w-11 active:scale-90" 
    id="language-switch"
    onclick={toggleDropdown}
    onmouseenter={() => isDropdownOpen = true}
  >
    <div class="flex items-center justify-center">
      <Icon icon={getCurrentLanguageFlag()} class="text-[1.25rem]" />
    </div>
  </button>
  
  <!-- 下拉菜单 -->
  <div 
    role="menu"
    tabindex="-1"
    class="absolute right-0 mt-2 w-40 rounded-lg shadow-lg bg-[var(--card-bg)] border border-[var(--border-color)] transition-all duration-200 z-50"
    class:opacity-0={!isDropdownOpen}
    class:invisible={!isDropdownOpen}
    class:opacity-100={isDropdownOpen}
    class:visible={isDropdownOpen}
    onmouseleave={() => isDropdownOpen = false}
    onmouseenter={() => isDropdownOpen = true}
  >
    {#each languages as lang}
      <button 
        class="w-full text-left px-4 py-2 text-sm hover:bg-[var(--hover-bg)] first:rounded-t-lg last:rounded-b-lg flex items-center gap-2"
        class:bg-[var(--hover-bg)]={currentLang === lang.code}
        onclick={() => switchLanguage(lang.code)}
      >
        <Icon icon={lang.code === "en" ? "circle-flags:us" : "circle-flags:cn"} class="text-[1rem]" />
        <span>{lang.name}</span>
      </button>
    {/each}
  </div>
</div>