export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US').format(value)
}
