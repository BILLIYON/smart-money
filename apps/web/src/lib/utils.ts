export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export function isImageAvatar(content?: string | null): boolean {
  if (!content) return false;
  return content.startsWith("data:image/") || content.startsWith("http") || content.startsWith("/");
}
