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
	const cookieValue = `language=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax; Secure=false`;
	document.cookie = cookieValue;
	console.log("LanguageSwitch: 已设置Cookie", cookieValue);
	console.log("LanguageSwitch: 当前所有Cookie", document.cookie);

	// 验证 Cookie 是否设置成功
	const cookieCheck = document.cookie
		.split(";")
		.find((c) => c.trim().startsWith("language="));
	console.log("LanguageSwitch: Cookie验证", cookieCheck);

	// 强制验证：立即读取 Cookie 确认设置成功
	setTimeout(() => {
		const verifyCookie = document.cookie
			.split(";")
			.find((c) => c.trim().startsWith("language="));
		console.log("LanguageSwitch: 延迟验证Cookie", verifyCookie);
		if (!verifyCookie || !verifyCookie.includes(lang)) {
			console.error(
				"LanguageSwitch: Cookie设置失败！",
				"期望:",
				lang,
				"实际:",
				verifyCookie,
			);
			// 重试设置 Cookie
			document.cookie = cookieValue;
			console.log("LanguageSwitch: 重试设置Cookie");
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

				// 3. Announcement 标题
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

				// 12. 更新所有包含已知英文文本的元素（通用方法）
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

				// 遍历所有文本节点，查找并替换已知的英文文本
				const allTextWalker = document.createTreeWalker(
					document.body,
					NodeFilter.SHOW_TEXT,
					null,
				);
				let allTextNode: Node | null = allTextWalker.nextNode();
				while (allTextNode !== null) {
					const nodeText = allTextNode.textContent?.trim() || "";
					// 只处理完全匹配的文本（避免误替换）
					if (nodeText && commonTextMap[nodeText]) {
						const key = commonTextMap[nodeText];
						if (translations[key] && nodeText !== translations[key]) {
							allTextNode.textContent = translations[key];
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