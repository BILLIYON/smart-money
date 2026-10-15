const CURRENCY_CONFIG: Record<string, { symbol: string; locale: string }> = {
  NGN: { symbol: "₦",   locale: "en-NG" },
  USD: { symbol: "$",   locale: "en-US" },
  GHS: { symbol: "₵",   locale: "en-GH" },
  KES: { symbol: "KSh", locale: "en-KE" },
  ZAR: { symbol: "R",   locale: "en-ZA" },
};

const DEFAULT_CURRENCY = "NGN";

/**
 * Format a minor-unit amount (kobo, cents, pesewas, etc.) into a
 * human-readable string using the user's currency.
 *
 * All monetary values in the DB are stored as integers in the currency's
 * smallest unit (kobo for NGN, cents for USD, etc.) — always 1/100 of the
 * major unit for every currency we support.
 */
export function formatCurrency(minorUnit: number, currencyCode = DEFAULT_CURRENCY): string {
  const cfg = CURRENCY_CONFIG[currencyCode] ?? CURRENCY_CONFIG[DEFAULT_CURRENCY];
  const n = minorUnit / 100;

  if (n >= 1_000_000)
    return `${cfg.symbol}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)
    return `${cfg.symbol}${(n / 1_000).toFixed(0)}k`;
  return `${cfg.symbol}${n.toLocaleString(cfg.locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** Currency symbol only — for inline UI labels. */
export function currencySymbol(currencyCode = DEFAULT_CURRENCY): string {
  return (CURRENCY_CONFIG[currencyCode] ?? CURRENCY_CONFIG[DEFAULT_CURRENCY]).symbol;
}

/** Supported currency codes. */
export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_CONFIG);

/** Fixed currency for marketplace transactions and Studio pricing. */
export const PLATFORM_CURRENCY = "USD";

/**
 * Format a whole-dollar amount for marketplace / Studio display.
 * Takes dollars (not cents) since creator prices are entered in dollars.
 */
export function formatPlatformPrice(dollars: number): string {
  if (dollars === 0) return "Free";
  return `$${dollars.toLocaleString("en-US")}/mo`;
}
