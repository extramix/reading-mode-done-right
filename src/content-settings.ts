type ReaderTheme = 'light' | 'dark';

interface Shortcut {
  key: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

interface ReaderSettings {
  readerTheme: ReaderTheme;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  widthCh: number;
  paragraphGap: number;
  bgColor: string;
  textColor: string;
  codeFontFamily: string;
  codeFontSize: number;
  codeTheme: ReaderTheme;
  wrapCode: boolean;
  toggleShortcut: Shortcut;
}

interface FontChoice {
  label: string;
  value: string;
}

interface ReadingPreset {
  fontSize: number;
  lineHeight: number;
  widthCh: number;
  paragraphGap: number;
}

interface ReaderSettingsApi {
  DEFAULT_SETTINGS: ReaderSettings;
  THEME_PRESETS: {
    light: { bgColor: string; textColor: string; codeTheme: ReaderTheme };
    dark: { bgColor: string; textColor: string; codeTheme: ReaderTheme };
  };
  FONT_CHOICES: FontChoice[];
  CODE_FONT_CHOICES: FontChoice[];
  READING_PRESETS: Record<string, ReadingPreset>;
  load(): Promise<ReaderSettings>;
  save(values: ReaderSettings): void;
  normalize(values: Partial<ReaderSettings> | ReaderSettings): ReaderSettings;
  normalizeTheme(theme: unknown): ReaderTheme;
  getDefaultToggleShortcut(): Shortcut;
  eventToShortcut(event: KeyboardEvent): Shortcut | null;
  formatShortcut(shortcut: Shortcut): string;
  shortcutMatchesEvent(shortcut: Shortcut, event: KeyboardEvent): boolean;
}

var RM_SETTINGS: ReaderSettingsApi = (() => {
  const SETTINGS_STORAGE_KEY = 'rmSettings';

  function getDefaultToggleShortcut(): Shortcut {
    if (isMacOS()) {
      return {
        key: 'r',
        ctrlKey: false,
        altKey: true,
        shiftKey: false,
        metaKey: false
      };
    }
    return {
      key: 'r',
      ctrlKey: true,
      altKey: false,
      shiftKey: true,
      metaKey: false
    };
  }

  const DEFAULT_SETTINGS: ReaderSettings = {
    readerTheme: 'light',
    fontFamily: '"Literata", "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
    fontSize: 18,
    lineHeight: 1.7,
    widthCh: 72,
    paragraphGap: 1.15,
    bgColor: '#f5efe2',
    textColor: '#1f1b16',
    codeFontFamily: '"SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    codeFontSize: 14,
    codeTheme: 'light',
    wrapCode: false,
    toggleShortcut: getDefaultToggleShortcut()
  };

  const THEME_PRESETS = {
    light: {
      bgColor: '#f5efe2',
      textColor: '#1f1b16',
      codeTheme: 'light' as ReaderTheme
    },
    dark: {
      bgColor: '#101827',
      textColor: '#e7e8ec',
      codeTheme: 'dark' as ReaderTheme
    }
  };

  const FONT_CHOICES: FontChoice[] = [
    { label: 'Literata', value: '"Literata", Georgia, "Times New Roman", serif' },
    { label: 'Charter', value: '"Charter", "Bitstream Charter", "Sitka Text", Cambria, serif' },
    { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
    { label: 'Atkinson Hyperlegible', value: '"Atkinson Hyperlegible", "Inter", Arial, sans-serif' },
    { label: 'Avenir Sans', value: '"Avenir Next", "Avenir", "Segoe UI", Arial, sans-serif' },
    { label: 'System Sans', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }
  ];

  const CODE_FONT_CHOICES: FontChoice[] = [
    { label: 'SF Mono', value: '"SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace' },
    { label: 'JetBrains Mono', value: '"JetBrains Mono", "SFMono-Regular", Menlo, Monaco, Consolas, monospace' },
    { label: 'Fira Code', value: '"Fira Code", "SFMono-Regular", Menlo, Monaco, Consolas, monospace' },
    { label: 'Source Code Pro', value: '"Source Code Pro", "SFMono-Regular", Menlo, Monaco, Consolas, monospace' },
    { label: 'Cascadia Code', value: '"Cascadia Code", "SFMono-Regular", Menlo, Monaco, Consolas, monospace' }
  ];

  const READING_PRESETS = {
    comfort: {
      fontSize: 19,
      lineHeight: 1.78,
      widthCh: 66,
      paragraphGap: 1.24
    },
    focus: {
      fontSize: 18,
      lineHeight: 1.72,
      widthCh: 62,
      paragraphGap: 1.18
    },
    dense: {
      fontSize: 17,
      lineHeight: 1.58,
      widthCh: 74,
      paragraphGap: 1.08
    }
  };

  function normalizeTheme(theme: unknown): ReaderTheme {
    return theme === 'dark' ? 'dark' : 'light';
  }

  function normalize(values: Partial<ReaderSettings> | ReaderSettings): ReaderSettings {
    const merged = { ...DEFAULT_SETTINGS, ...values };
    const theme = normalizeTheme(merged.readerTheme);
    merged.readerTheme = theme;
    merged.codeTheme = theme;
    merged.toggleShortcut = normalizeShortcut(merged.toggleShortcut);
    return merged;
  }

  function load(): Promise<ReaderSettings> {
    return new Promise((resolve) => {
      chrome.storage.sync.get({ [SETTINGS_STORAGE_KEY]: DEFAULT_SETTINGS }, (result) => {
        const stored = result && result[SETTINGS_STORAGE_KEY] ? result[SETTINGS_STORAGE_KEY] : {};
        resolve(normalize({ ...DEFAULT_SETTINGS, ...stored }));
      });
    });
  }

  function save(values: ReaderSettings): void {
    chrome.storage.sync.set({ [SETTINGS_STORAGE_KEY]: normalize(values) });
  }

  function isMacOS(): boolean {
    return /Mac|iPhone|iPad|iPod/.test(navigator.platform || '');
  }

  function normalizeShortcut(shortcut: Shortcut): Shortcut {
    const base = getDefaultToggleShortcut();
    if (!shortcut || typeof shortcut !== 'object') return base;
    const key = normalizeShortcutKey(shortcut.key);
    if (!key) return base;
    const normalized = {
      key,
      ctrlKey: Boolean(shortcut.ctrlKey),
      altKey: Boolean(shortcut.altKey),
      shiftKey: Boolean(shortcut.shiftKey),
      metaKey: Boolean(shortcut.metaKey)
    };
    if (!normalized.ctrlKey && !normalized.altKey && !normalized.shiftKey && !normalized.metaKey) {
      return base;
    }
    if (isMacOS() && normalized.key === 'r' && !normalized.shiftKey) {
      const cmdOnly = normalized.metaKey && !normalized.ctrlKey && !normalized.altKey;
      const ctrlOnly = normalized.ctrlKey && !normalized.metaKey && !normalized.altKey;
      if (cmdOnly || ctrlOnly) {
        normalized.metaKey = false;
        normalized.ctrlKey = false;
        normalized.altKey = true;
      }
    }
    return normalized;
  }

  function eventToShortcut(event: KeyboardEvent): Shortcut | null {
    const key = normalizeShortcutKey(event.key);
    if (!key) return null;
    if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') return null;
    return {
      key,
      ctrlKey: Boolean(event.ctrlKey),
      altKey: Boolean(event.altKey),
      shiftKey: Boolean(event.shiftKey),
      metaKey: Boolean(event.metaKey)
    };
  }

  function normalizeShortcutKey(key: string): string {
    if (!key || typeof key !== 'string') return '';
    if (key.length === 1) return key.toLowerCase();
    const alias: Record<string, string> = {
      ' ': 'Space',
      Spacebar: 'Space',
      Esc: 'Escape',
      Del: 'Delete'
    };
    return alias[key] || key;
  }

  function formatShortcut(shortcut: Shortcut): string {
    const value = normalizeShortcut(shortcut);
    const mac = isMacOS();
    const parts = [];
    if (value.ctrlKey) parts.push(mac ? '^' : 'Ctrl');
    if (value.altKey) parts.push(mac ? 'Option' : 'Alt');
    if (value.shiftKey) parts.push('Shift');
    if (value.metaKey) parts.push(mac ? 'Cmd' : 'Meta');
    parts.push(formatShortcutKeyForDisplay(value.key));
    return parts.join('+');
  }

  function formatShortcutKeyForDisplay(key: string): string {
    if (!key) return '';
    if (key.length === 1) return key.toUpperCase();
    return key;
  }

  function shortcutMatchesEvent(shortcut: Shortcut, event: KeyboardEvent): boolean {
    const value = normalizeShortcut(shortcut);
    if (Boolean(event.ctrlKey) !== value.ctrlKey) return false;
    if (Boolean(event.altKey) !== value.altKey) return false;
    if (Boolean(event.shiftKey) !== value.shiftKey) return false;
    if (Boolean(event.metaKey) !== value.metaKey) return false;
    const key = normalizeShortcutKey(event.key);
    return key === value.key;
  }

  return {
    DEFAULT_SETTINGS,
    THEME_PRESETS,
    FONT_CHOICES,
    CODE_FONT_CHOICES,
    READING_PRESETS,
    load,
    save,
    normalize,
    normalizeTheme,
    getDefaultToggleShortcut,
    eventToShortcut,
    formatShortcut,
    shortcutMatchesEvent
  };
})();
