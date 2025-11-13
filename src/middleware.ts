import type { MiddlewareHandler } from "astro";

export const onRequest: MiddlewareHandler = async ({ request, locals }, next) => {
  // 从Cookie中获取语言设置
  const lang = request.headers.get("cookie")?.split(";")
    .find(c => c.trim().startsWith("language="))
    ?.split("=")[1];

  // 如果Cookie中有语言设置，使用它
  if (lang) {
    locals.lang = lang;
  }

  const response = await next();

  // 如果用户通过localStorage设置了语言，也尝试设置到Cookie中
  // 这需要在前端通过JavaScript设置Cookie
  return response;
};