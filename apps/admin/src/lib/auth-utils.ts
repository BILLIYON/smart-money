export function getAppOrigin(req: Request): string {
  // 1. Check incoming request headers for localhost / dev environments first
  const urlObj = new URL(req.url);
  const rawHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || urlObj.host;

  if (rawHost && (rawHost.includes("localhost") || rawHost.includes("127.0.0.1"))) {
    const rawProto = req.headers.get("x-forwarded-proto") || "http";
    return `${rawProto}://${rawHost}`;
  }

  // 2. Environment variable fallback for production
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (envUrl && envUrl.startsWith("http")) {
    return envUrl.trim().replace(/\/$/, "");
  }

  // 3. Fallback to rawHost or production domain
  const isInternal = !rawHost || rawHost.includes("0.0.0.0");
  const host = isInternal ? "smartmoney.technology" : rawHost;
  const rawProto = req.headers.get("x-forwarded-proto");
  const proto = rawProto || (host.includes("localhost") ? "http" : "https");

  return `${proto}://${host}`;
}
