import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { LinkPreset, type NavBarLink } from "@/types/config";

/**
 * 获取链接预设（支持国际化）
 * @param request 可选的 Request 对象（用于服务端从 Cookie 读取语言）
 */
export function getLinkPresets(request?: Request): { [key in LinkPreset]: NavBarLink } {
	// 调试：检查服务端是否正确读取了 Cookie
	if (request && typeof window === "undefined") {
		const cookieHeader = request.headers.get("cookie") || "";
		const cookieLang = cookieHeader.split(";").find(c => c.trim().startsWith("language="))?.split("=")[1];
		console.log("[link-presets] 服务端 Cookie:", cookieHeader, "提取的语言:", cookieLang);
	}
	
	return {
		[LinkPreset.Home]: {
			name: i18n(I18nKey.home, request),
			url: "/",
			icon: "material-symbols:home",
		},
		[LinkPreset.About]: {
			name: i18n(I18nKey.about, request),
			url: "/about/",
			icon: "material-symbols:person",
		},
		[LinkPreset.Archive]: {
			name: i18n(I18nKey.archive, request),
			url: "/archive/",
			icon: "material-symbols:archive",
		},
		[LinkPreset.Friends]: {
			name: i18n(I18nKey.friends, request),
			url: "/friends/",
			icon: "material-symbols:group",
		},
		[LinkPreset.Anime]: {
			name: i18n(I18nKey.anime, request),
			url: "/anime/",
			icon: "material-symbols:movie",
		},
		[LinkPreset.Diary]: {
			name: i18n(I18nKey.diary, request),
			url: "/diary/",
			icon: "material-symbols:book",
		},
		[LinkPreset.Gallery]: {
			name: i18n(I18nKey.albums, request), // 使用 albums 键，因为 gallery 可能不存在
			url: "/albums/",
			icon: "material-symbols:photo-library",
		},
		[LinkPreset.Projects]: {
			name: i18n(I18nKey.projects, request),
			url: "/projects/",
			icon: "material-symbols:work",
		},
		[LinkPreset.Skills]: {
			name: i18n(I18nKey.skills, request),
			url: "/skills/",
			icon: "material-symbols:psychology",
		},
		[LinkPreset.Timeline]: {
			name: i18n(I18nKey.timeline, request),
			url: "/timeline/",
			icon: "material-symbols:timeline",
		},
	};
}

// 为了向后兼容，保留旧的导出（使用默认语言）
export const LinkPresets: { [key in LinkPreset]: NavBarLink } = getLinkPresets();
