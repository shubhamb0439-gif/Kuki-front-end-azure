/**
 * Detect user's currency based on their location
 */

const CURRENCY_BY_COUNTRY: Record<string, string> = {
  US: 'USD',
  GB: 'GBP',
  EU: 'EUR',
  IN: 'INR',
  CA: 'CAD',
  AU: 'AUD',
  JP: 'JPY',
  CN: 'CNY',
  BR: 'BRL',
  MX: 'MXN',
  ZA: 'ZAR',
  NG: 'NGN',
  KE: 'KES',
  GH: 'GHS',
  UG: 'UGX',
  TZ: 'TZS',
  RW: 'RWF',
  ET: 'ETB',
  EG: 'EGP',
  MA: 'MAD'
};

/**
 * Detect currency from browser/system
 * Returns a promise that resolves to the currency code
 */
export async function detectCurrency(): Promise<string> {
  try {
    // Try to get currency from Intl API
    const locale = navigator.language || 'en-US';
    const regionCode = locale.split('-')[1] || locale.toUpperCase();

    // Check if we have a mapping for this region
    if (CURRENCY_BY_COUNTRY[regionCode]) {
      return CURRENCY_BY_COUNTRY[regionCode];
    }

    // Try to use Intl.NumberFormat to detect currency
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
    });

    const resolvedOptions = formatter.resolvedOptions();
    if (resolvedOptions.currency) {
      return resolvedOptions.currency;
    }

    // Try geolocation API as fallback
    const currency = await detectCurrencyFromGeolocation();
    if (currency) {
      return currency;
    }

    // Default fallback
    return 'USD';
  } catch (error) {
    console.error('Error detecting currency:', error);
    return 'USD';
  }
}

/**
 * Detect currency from geolocation (if available)
 */
async function detectCurrencyFromGeolocation(): Promise<string | null> {
  try {
    // Try to get approximate location from timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Map common timezones to currencies
    const timezoneMap: Record<string, string> = {
      'America/New_York': 'USD',
      'America/Chicago': 'USD',
      'America/Denver': 'USD',
      'America/Los_Angeles': 'USD',
      'Europe/London': 'GBP',
      'Europe/Paris': 'EUR',
      'Europe/Berlin': 'EUR',
      'Asia/Kolkata': 'INR',
      'Asia/Tokyo': 'JPY',
      'Asia/Shanghai': 'CNY',
      'Australia/Sydney': 'AUD',
      'Africa/Lagos': 'NGN',
      'Africa/Nairobi': 'KES',
      'Africa/Johannesburg': 'ZAR',
      'Africa/Cairo': 'EGP',
      'Africa/Casablanca': 'MAD'
    };

    if (timezone && timezoneMap[timezone]) {
      return timezoneMap[timezone];
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Approximate USD exchange rates (mid-market, updated periodically)
 * These are used for display purposes only
 */
const USD_RATES: Record<string, number> = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
  INR: 83.5,
  CAD: 1.37,
  AUD: 1.53,
  JPY: 149.5,
  CNY: 7.24,
  BRL: 4.97,
  MXN: 17.2,
  ZAR: 18.6,
  NGN: 1580,
  KES: 129,
  GHS: 15.6,
  UGX: 3750,
  TZS: 2680,
  RWF: 1300,
  ETB: 57,
  EGP: 30.9,
  MAD: 10.1,
  SGD: 1.34,
  CHF: 0.9
};

/**
 * Convert a USD amount to the target currency
 */
export function convertFromUSD(usdAmount: number, targetCurrency: string): number {
  const rate = USD_RATES[targetCurrency] ?? 1;
  return usdAmount * rate;
}

/**
 * Format a price for display with appropriate precision
 */
export function formatPlanPrice(usdAmount: number, currency: string): string {
  if (currency === 'USD') return `$${usdAmount.toFixed(2)}`;
  const converted = convertFromUSD(usdAmount, currency);
  const symbol = getCurrencySymbol(currency);
  // For currencies with large values (JPY, KES, NGN, etc.) skip decimals
  const noDecimals = ['JPY', 'NGN', 'KES', 'UGX', 'TZS', 'RWF', 'ETB', 'IDR'];
  const formatted = noDecimals.includes(currency)
    ? Math.round(converted).toLocaleString()
    : converted.toFixed(2);
  return `${symbol}${formatted}`;
}

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    GBP: '£',
    EUR: '€',
    INR: '₹',
    CAD: 'C$',
    AUD: 'A$',
    JPY: '¥',
    CNY: '¥',
    BRL: 'R$',
    MXN: '$',
    ZAR: 'R',
    NGN: '₦',
    KES: 'KSh',
    GHS: '₵',
    UGX: 'USh',
    TZS: 'TSh',
    RWF: 'RF',
    ETB: 'Br',
    EGP: 'E£',
    MAD: 'DH'
  };

  return symbols[currencyCode] || currencyCode;
}
