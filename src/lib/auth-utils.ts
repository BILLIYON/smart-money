export function getAppOrigin(req: Request): string {
  // 1. Environment variable fallback
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (envUrl && envUrl.startsWith("http")) {
    return envUrl.trim().replace(/\/$/, "");
  }

  // 2. Extract host from headers or req.url
  const urlObj = new URL(req.url);
  const rawHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || urlObj.host;

  // Filter out internal server loopback bindings (e.g. 0.0.0.0:3000 or 127.0.0.1:3000)
  const isInternal = !rawHost || rawHost.includes("0.0.0.0") || rawHost.includes("127.0.0.1");
  const host = isInternal ? "smartmoney.technology" : rawHost;

  const rawProto = req.headers.get("x-forwarded-proto");
  const proto = rawProto || (host.includes("localhost") ? "http" : "https");

  return `${proto}://${host}`;
}
