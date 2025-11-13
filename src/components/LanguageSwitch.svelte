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
  document.cookie = `language=${lang}; path=/; max-age=${60*60*24*365}; SameSite=Lax`;
  
  // 更新网站语言
  document.documentElement.lang = lang;
  console.log("LanguageSwitch: 已设置HTML lang属性", document.documentElement.lang);
  
  // 重新加载页面以应用新语言
  setTimeout(() => {
    console.log("LanguageSwitch: 重新加载页面");
    window.location.reload();
  }, 100);
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
  document.documentElement.lang = currentLang;
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
    on:click={toggleDropdown}
    on:mouseenter={() => isDropdownOpen = true}
  >
    <div class="flex items-center justify-center">
      <Icon icon={getCurrentLanguageFlag()} class="text-[1.25rem]"></Icon>
    </div>
  </button>
  
  <!-- 下拉菜单 -->
  <div 
    class="absolute right-0 mt-2 w-40 rounded-lg shadow-lg bg-[var(--card-bg)] border border-[var(--border-color)] transition-all duration-200 z-50"
    class:opacity-0={!isDropdownOpen}
    class:invisible={!isDropdownOpen}
    class:opacity-100={isDropdownOpen}
    class:visible={isDropdownOpen}
    on:mouseleave={() => isDropdownOpen = false}
    on:mouseenter={() => isDropdownOpen = true}
  >
    {#each languages as lang}
      <button 
        class="w-full text-left px-4 py-2 text-sm hover:bg-[var(--hover-bg)] first:rounded-t-lg last:rounded-b-lg flex items-center gap-2"
        class:bg-[var(--hover-bg)]={currentLang === lang.code}
        on:click={() => switchLanguage(lang.code)}
      >
        <Icon icon={lang.code === "en" ? "flag:us-1" : "flag:cn-1"} class="text-[1rem]"></Icon>
        <span>{lang.name}</span>
      </button>
    {/each}
  </div>
</div>