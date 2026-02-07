interface ReaderUtilsApi {
  normalizeText(value: string): string;
  clamp(value: number, min: number, max: number): number;
  capitalize(value: string): string;
  compactText(text: string): string;
  isLikelyLineNumber(text: string): boolean;
  escapeHtml(text: string): string;
  normalizeCodeText(text: string): string;
}

var RM_UTILS: ReaderUtilsApi = {
  normalizeText(value: string): string {
    return (value || '').replace(/\s+/g, ' ').trim();
  },

  clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  },

  capitalize(value: string): string {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
  },

  compactText(text: string): string {
    return (text || '').replace(/\s+/g, ' ').trim();
  },

  isLikelyLineNumber(text: string): boolean {
    return /^\d{1,6}$/.test((text || '').trim());
  },

  escapeHtml(text: string): string {
    return (text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  normalizeCodeText(text: string): string {
    if (!text) return '';
    return text
      .replace(/\r\n?/g, '\n')
      .replace(/\u00a0/g, ' ')
      .replace(/^\n+|\n+$/g, '');
  }
};
