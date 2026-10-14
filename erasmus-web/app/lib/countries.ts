import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

export type CountryOption = {
  code: string;
  name: string;
  flag: string;
};

let localeReady = false;

function ensureLocale(): void {
  if (localeReady) return;
  countries.registerLocale(enLocale);
  localeReady = true;
}

export function flagFromCode(code: string): string {
  return code
    .toUpperCase()
    .split("")
    .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

export function flagImageUrl(code: string): string {
  return `https://flagcdn.com/24x18/${code.toLowerCase()}.png`;
}

export function buildCountryOptions(): CountryOption[] {
  ensureLocale();
  const names = countries.getNames("en", { select: "official" });
  return Object.entries(names)
    .map(([code, name]) => ({
      code,
      name,
      flag: flagFromCode(code),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function createCountryMap(options: CountryOption[]): Map<string, CountryOption> {
  const map = new Map<string, CountryOption>();
  options.forEach(option => {
    map.set(option.code.toUpperCase(), option);
    map.set(option.name.toLowerCase(), option);
  });
  return map;
}

export function findCountryOption(
  value: string,
  countryMap: Map<string, CountryOption>
): CountryOption | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  return countryMap.get(raw.toUpperCase()) || countryMap.get(raw.toLowerCase());
}

export function formatCountry(
  value: string,
  countryMap: Map<string, CountryOption>
): string {
  const match = findCountryOption(value, countryMap);
  if (match) {
    return `${match.flag} ${match.name}`;
  }
  return value;
}
