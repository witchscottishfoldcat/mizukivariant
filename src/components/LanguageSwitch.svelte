<script lang="ts">
import { i18n } from "@i18n/translation";
import I18nKey from "@i18n/i18nKey";
import { getTranslation } from "@i18n/translation";
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
    console.log("LanguageSwitch: 使用全局变量语言", (window as any).__currentLanguage);
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
  console.log("LanguageSwitch: 已设置localStorage", localStorage.getItem("language"));
  
  // 更新全局变量，确保i18n函数能立即获取到新语言
  if (typeof window !== "undefined") {
    (window as any).__currentLanguage = lang;
    console.log("LanguageSwitch: 已设置全局变量", (window as any).__currentLanguage);
  }
  
  // 同时设置Cookie，使服务端也能获取到语言设置
  // 使用更明确的 Cookie 设置方式，确保在根路径下可用
  const cookieValue = `language=${lang}; path=/; max-age=${60*60*24*365}; SameSite=Lax; Secure=false`;
  document.cookie = cookieValue;
  console.log("LanguageSwitch: 已设置Cookie", cookieValue);
  console.log("LanguageSwitch: 当前所有Cookie", document.cookie);
  
  // 验证 Cookie 是否设置成功
  const cookieCheck = document.cookie.split(";").find(c => c.trim().startsWith("language="));
  console.log("LanguageSwitch: Cookie验证", cookieCheck);
  
  // 强制验证：立即读取 Cookie 确认设置成功
  setTimeout(() => {
    const verifyCookie = document.cookie.split(";").find(c => c.trim().startsWith("language="));
    console.log("LanguageSwitch: 延迟验证Cookie", verifyCookie);
    if (!verifyCookie || !verifyCookie.includes(lang)) {
      console.error("LanguageSwitch: Cookie设置失败！", "期望:", lang, "实际:", verifyCookie);
      // 重试设置 Cookie
      document.cookie = cookieValue;
      console.log("LanguageSwitch: 重试设置Cookie");
    }
  }, 50);
  
  // 更新网站语言
  document.documentElement.lang = lang;
  console.log("LanguageSwitch: 已设置HTML lang属性", document.documentElement.lang);
  
  // 触发语言变化事件，通知其他组件更新
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("language-changed", { detail: { lang } }));
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
  import("@/i18n/translation").then(({ getTranslation }) => {
    import("@/i18n/i18nKey").then(({ default: I18nKey }) => {
      const translations = getTranslation(lang);
      
      // 更新页面标题（如果有 data-i18n 属性）
      const i18nElements = document.querySelectorAll("[data-i18n]");
      i18nElements.forEach((element) => {
        const key = element.getAttribute("data-i18n");
        if (key && translations[key as keyof typeof translations]) {
          element.textContent = translations[key as keyof typeof translations];
        }
      });
      
      // 更新侧边栏组件标题
      // 1. Categories 标题
      const categoriesWidget = document.querySelector('widget-layout[data-id="categories"]');
      if (categoriesWidget) {
        const titleElement = categoriesWidget.querySelector('.font-bold');
        if (titleElement && translations[I18nKey.categories]) {
          titleElement.textContent = translations[I18nKey.categories];
        }
      }
      
      // 2. Tags 标题
      const tagsWidget = document.querySelector('widget-layout[data-id="tags"]');
      if (tagsWidget) {
        const titleElement = tagsWidget.querySelector('.font-bold');
        if (titleElement && translations[I18nKey.tags]) {
          titleElement.textContent = translations[I18nKey.tags];
        }
      }
      
      // 3. Announcement 标题
      const announcementWidget = document.querySelector('widget-layout[data-id="announcement"]');
      if (announcementWidget) {
        const titleElement = announcementWidget.querySelector('.font-bold');
        if (titleElement && translations[I18nKey.announcement]) {
          titleElement.textContent = translations[I18nKey.announcement];
        }
        // 更新关闭按钮的 aria-label
        const closeButton = announcementWidget.querySelector('button[aria-label]');
        if (closeButton && translations[I18nKey.announcementClose]) {
          closeButton.setAttribute('aria-label', translations[I18nKey.announcementClose]);
        }
      }
      
      // 4. 更新所有 WidgetLayout 中的 "more" 按钮文本
      const moreButtons = document.querySelectorAll('.expand-btn button');
      moreButtons.forEach((button) => {
        // 查找按钮内的文本节点
        const walker = document.createTreeWalker(
          button,
          NodeFilter.SHOW_TEXT,
          null
        );
        let textNode: Node | null;
        while (textNode = walker.nextNode()) {
          const text = textNode.textContent?.trim();
          // 检查是否是 "more" 相关的文本（可能是 "More"、"更多" 或其他语言）
          if (text && (
            text.toLowerCase().includes('more') || 
            text === '更多' || 
            text === translations[I18nKey.more] ||
            // 检查是否是已知的其他语言版本
            ['More', '更多', 'もっと', 'Más', 'Mehr'].some(known => text === known)
          )) {
            if (translations[I18nKey.more]) {
              textNode.textContent = translations[I18nKey.more];
              break;
            }
          }
        }
      });
      
      // 5. 更新所有 widget-layout 中的标题（通用方法）
      const allWidgets = document.querySelectorAll('widget-layout');
      allWidgets.forEach((widget) => {
        const titleElement = widget.querySelector('.font-bold');
        if (titleElement) {
          const widgetId = widget.getAttribute('data-id');
          // 根据 widget ID 更新对应的标题
          if (widgetId === 'categories' && translations[I18nKey.categories]) {
            titleElement.textContent = translations[I18nKey.categories];
          } else if (widgetId === 'tags' && translations[I18nKey.tags]) {
            titleElement.textContent = translations[I18nKey.tags];
          } else if (widgetId === 'announcement' && translations[I18nKey.announcement]) {
            titleElement.textContent = translations[I18nKey.announcement];
          }
        }
      });
      
      console.log("LanguageSwitch: 页面文本更新完成");
    });
  }).catch((e) => {
    console.error("LanguageSwitch: 无法加载翻译模块", e);
  });
}

// 更新导航栏文本的函数
function updateNavbarTexts() {
  const lang = currentLang;
  console.log("LanguageSwitch: 更新导航栏文本，语言:", lang);
  
  // 定义翻译映射
  const translationMap: Record<string, { en: string; zh_CN: string }> = {
    "Home": { en: "Home", zh_CN: "主页" },
    "About": { en: "About", zh_CN: "关于" },
    "Archive": { en: "Archive", zh_CN: "归档" },
    "Friends": { en: "Friends", zh_CN: "友链" },
    "Anime": { en: "Anime", zh_CN: "追番" },
    "Diary": { en: "Diary", zh_CN: "日记" },
    "Albums": { en: "Albums", zh_CN: "相册" },
    "Projects": { en: "Projects", zh_CN: "项目" },
    "Skills": { en: "Skills", zh_CN: "技能" },
    "Timeline": { en: "Timeline", zh_CN: "时间线" },
  };
  
  // 更新导航栏文本的函数
  const updateTextInContainer = (container: Element, enText: string, zhText: string, targetText: string) => {
    // 方法1: 直接查找文本节点
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let textNode: Node | null;
    while (textNode = walker.nextNode()) {
      const text = textNode.textContent?.trim();
      if (text === enText || text === zhText) {
        textNode.textContent = targetText;
        return true;
      }
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
      if (element.textContent?.trim().includes(enText) || element.textContent?.trim().includes(zhText)) {
        updateTextInContainer(element, enText, zhText, targetText);
      }
    });
    
    // 移动端：更新菜单项
    const mobileElements = document.querySelectorAll("#nav-menu-panel button, #nav-menu-panel a");
    mobileElements.forEach((element) => {
      if (element.textContent?.trim().includes(enText) || element.textContent?.trim().includes(zhText)) {
        updateTextInContainer(element, enText, zhText, targetText);
      }
    });
    
    // 下拉菜单项
    const dropdownItems = document.querySelectorAll(".dropdown-item");
    dropdownItems.forEach((element) => {
      if (element.textContent?.trim().includes(enText) || element.textContent?.trim().includes(zhText)) {
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
  const lang = languages.find(l => l.code === currentLang);
  return lang ? lang.name : "English";
}

// 获取当前语言标志
function getCurrentLanguageFlag() {
  switch (currentLang) {
    case "en": return "flag:us-1";
    case "zh_CN": return "flag:cn-1";
    default: return "flag:us-1";
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
      <Icon icon={getCurrentLanguageFlag()} class="text-[1.25rem]"></Icon>
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
        <Icon icon={lang.code === "en" ? "flag:us-1" : "flag:cn-1"} class="text-[1rem]"></Icon>
        <span>{lang.name}</span>
      </button>
    {/each}
  </div>
</div>