(() => {
  const DEFAULT_SETTINGS = {
    readerTheme: 'light',
    fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
    fontSize: 18,
    lineHeight: 1.7,
    widthCh: 72,
    paragraphGap: 1.15,
    bgColor: '#f7f1e3',
    textColor: '#1b1b1b',
    codeFontFamily: '"SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    codeFontSize: 14,
    codeTheme: 'light',
    wrapCode: false
  };

  const THEME_PRESETS = {
    light: {
      bgColor: '#f7f1e3',
      textColor: '#1b1b1b',
      codeTheme: 'light'
    },
    dark: {
      bgColor: '#0f172a',
      textColor: '#e2e8f0',
      codeTheme: 'dark'
    }
  };

  const KEYWORDS = [
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do',
    'switch', 'case', 'break', 'continue', 'class', 'extends', 'new', 'this', 'try',
    'catch', 'finally', 'throw', 'import', 'from', 'export', 'default', 'await', 'async',
    'yield', 'true', 'false', 'null', 'undefined', 'in', 'of', 'with', 'as', 'typeof',
    'instanceof', 'void', 'delete', 'enum', 'interface', 'type', 'implements', 'package',
    'public', 'private', 'protected', 'static', 'get', 'set', 'def', 'elif', 'lambda',
    'pass', 'raise', 'except', 'global', 'nonlocal'
  ];

  const TOKEN_REGEX = new RegExp([
    '\\/\\*[\\s\\S]*?\\*\\/',
    '\\/\\/[^\\n]*',
    '#[^\\n]*',
    '"(?:\\\\.|[^"\\\\])*"',
    "'(?:\\\\.|[^'\\\\])*'",
    '`(?:\\\\.|[^`\\\\])*`',
    '\\b\\d+(?:\\.\\d+)?\\b',
    `\\b(?:${KEYWORDS.join('|')})\\b`
  ].join('|'), 'gm');

  let overlay = null;
  let settingsPanel = null;
  let contentRoot = null;
  let currentSettings = { ...DEFAULT_SETTINGS };
  let savedScrollY = 0;
  let savedOverflow = '';
  let savedHeight = '';

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'RM_TOGGLE') {
      toggleReader();
    }
  });

  async function toggleReader() {
    await ensureOverlay();
    if (!overlay) return;
    const isOpen = overlay.dataset.open === 'true';
    if (isOpen) {
      closeReader();
    } else {
      openReader();
    }
  }

  function openReader() {
    if (!overlay) return;
    overlay.dataset.open = 'true';
    overlay.setAttribute('aria-hidden', 'false');
    savedScrollY = window.scrollY;
    savedOverflow = document.documentElement.style.overflow;
    savedHeight = document.documentElement.style.height;
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100%';
    renderContent();
  }

  function closeReader() {
    if (!overlay) return;
    overlay.dataset.open = 'false';
    overlay.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = savedOverflow || '';
    document.documentElement.style.height = savedHeight || '';
    window.scrollTo(0, savedScrollY || 0);
  }

  async function ensureOverlay() {
    if (overlay) return;
    currentSettings = await loadSettings();
    overlay = document.createElement('div');
    overlay.id = 'rm-overlay';
    overlay.dataset.open = 'false';
    overlay.setAttribute('aria-hidden', 'true');

    const toolbar = document.createElement('div');
    toolbar.id = 'rm-toolbar';

    const brand = document.createElement('div');
    brand.className = 'rm-brand';
    brand.textContent = 'Reading Mode';

    const title = document.createElement('div');
    title.id = 'rm-title';
    title.textContent = document.title || 'Document';

    const actions = document.createElement('div');
    actions.className = 'rm-actions';

    const settingsToggle = document.createElement('button');
    settingsToggle.type = 'button';
    settingsToggle.id = 'rm-settings-toggle';
    settingsToggle.textContent = 'Settings';

    const exitButton = document.createElement('button');
    exitButton.type = 'button';
    exitButton.id = 'rm-exit';
    exitButton.textContent = 'Exit';

    actions.appendChild(settingsToggle);
    actions.appendChild(exitButton);
    toolbar.appendChild(brand);
    toolbar.appendChild(title);
    toolbar.appendChild(actions);

    settingsPanel = document.createElement('div');
    settingsPanel.id = 'rm-settings';
    settingsPanel.innerHTML = `
      <div class="rm-settings-header">Reading Settings</div>
      <div class="rm-setting">
        <label for="rm-theme">Theme</label>
        <select id="rm-theme">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="custom">Custom</option>
        </select>
      </div>
      <div class="rm-setting">
        <label for="rm-font">Font family</label>
        <input id="rm-font" type="text" />
      </div>
      <div class="rm-setting rm-range">
        <label for="rm-font-size">Font size</label>
        <input id="rm-font-size" type="range" min="14" max="28" step="1" />
        <span id="rm-font-size-value"></span>
      </div>
      <div class="rm-setting rm-range">
        <label for="rm-line-height">Line height</label>
        <input id="rm-line-height" type="range" min="1.3" max="2.1" step="0.05" />
        <span id="rm-line-height-value"></span>
      </div>
      <div class="rm-setting rm-range">
        <label for="rm-width">Paragraph width</label>
        <input id="rm-width" type="range" min="50" max="100" step="1" />
        <span id="rm-width-value"></span>
      </div>
      <div class="rm-setting">
        <label for="rm-bg">Background</label>
        <input id="rm-bg" type="color" />
      </div>
      <div class="rm-setting">
        <label for="rm-text">Text color</label>
        <input id="rm-text" type="color" />
      </div>
      <div class="rm-setting">
        <label for="rm-code-font">Code font</label>
        <input id="rm-code-font" type="text" />
      </div>
      <div class="rm-setting rm-range">
        <label for="rm-code-size">Code size</label>
        <input id="rm-code-size" type="range" min="12" max="18" step="1" />
        <span id="rm-code-size-value"></span>
      </div>
      <div class="rm-setting">
        <label for="rm-code-theme">Code theme</label>
        <select id="rm-code-theme">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
      <div class="rm-setting rm-inline">
        <label for="rm-wrap-code">Wrap code</label>
        <input id="rm-wrap-code" type="checkbox" />
      </div>
      <div class="rm-setting rm-inline">
        <button id="rm-reset" type="button">Restore defaults</button>
      </div>
    `;

    const reader = document.createElement('div');
    reader.id = 'rm-reader';

    contentRoot = document.createElement('div');
    contentRoot.id = 'rm-content';
    reader.appendChild(contentRoot);

    overlay.appendChild(toolbar);
    overlay.appendChild(settingsPanel);
    overlay.appendChild(reader);
    document.body.appendChild(overlay);

    settingsToggle.addEventListener('click', () => {
      overlay.classList.toggle('rm-settings-open');
    });

    exitButton.addEventListener('click', () => {
      closeReader();
    });

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay && overlay.classList.contains('rm-settings-open')) {
        overlay.classList.remove('rm-settings-open');
      }
    });

    document.addEventListener('keydown', (event) => {
      if (overlay.dataset.open !== 'true') return;
      if (event.key === 'Escape') {
        closeReader();
      }
    });

    wireSettingsControls();
    applySettings(currentSettings);
  }

  function wireSettingsControls() {
    const themeInput = settingsPanel.querySelector('#rm-theme');
    const fontInput = settingsPanel.querySelector('#rm-font');
    const fontSizeInput = settingsPanel.querySelector('#rm-font-size');
    const fontSizeValue = settingsPanel.querySelector('#rm-font-size-value');
    const lineHeightInput = settingsPanel.querySelector('#rm-line-height');
    const lineHeightValue = settingsPanel.querySelector('#rm-line-height-value');
    const widthInput = settingsPanel.querySelector('#rm-width');
    const widthValue = settingsPanel.querySelector('#rm-width-value');
    const bgInput = settingsPanel.querySelector('#rm-bg');
    const textInput = settingsPanel.querySelector('#rm-text');
    const codeFontInput = settingsPanel.querySelector('#rm-code-font');
    const codeSizeInput = settingsPanel.querySelector('#rm-code-size');
    const codeSizeValue = settingsPanel.querySelector('#rm-code-size-value');
    const codeThemeInput = settingsPanel.querySelector('#rm-code-theme');
    const wrapCodeInput = settingsPanel.querySelector('#rm-wrap-code');
    const resetButton = settingsPanel.querySelector('#rm-reset');

    function syncControls(values) {
      themeInput.value = values.readerTheme || 'custom';
      fontInput.value = values.fontFamily;
      fontSizeInput.value = String(values.fontSize);
      fontSizeValue.textContent = `${values.fontSize}px`;
      lineHeightInput.value = String(values.lineHeight);
      lineHeightValue.textContent = values.lineHeight.toFixed(2);
      widthInput.value = String(values.widthCh);
      widthValue.textContent = `${values.widthCh}ch`;
      bgInput.value = values.bgColor;
      textInput.value = values.textColor;
      codeFontInput.value = values.codeFontFamily;
      codeSizeInput.value = String(values.codeFontSize);
      codeSizeValue.textContent = `${values.codeFontSize}px`;
      codeThemeInput.value = values.codeTheme;
      wrapCodeInput.checked = Boolean(values.wrapCode);
    }

    function updateSettings(partial) {
      currentSettings = { ...currentSettings, ...partial };
      applySettings(currentSettings);
      saveSettings(currentSettings);
      syncControls(currentSettings);
    }

    themeInput.addEventListener('change', (event) => {
      const theme = event.target.value;
      if (theme === 'light' || theme === 'dark') {
        updateSettings({ readerTheme: theme, ...THEME_PRESETS[theme] });
      } else {
        updateSettings({ readerTheme: 'custom' });
      }
    });

    fontInput.addEventListener('input', (event) => {
      updateSettings({ fontFamily: event.target.value.trim() || DEFAULT_SETTINGS.fontFamily });
    });

    fontSizeInput.addEventListener('input', (event) => {
      updateSettings({ fontSize: Number(event.target.value) || DEFAULT_SETTINGS.fontSize });
    });

    lineHeightInput.addEventListener('input', (event) => {
      updateSettings({ lineHeight: Number(event.target.value) || DEFAULT_SETTINGS.lineHeight });
    });

    widthInput.addEventListener('input', (event) => {
      updateSettings({ widthCh: Number(event.target.value) || DEFAULT_SETTINGS.widthCh });
    });

    bgInput.addEventListener('input', (event) => {
      updateSettings({
        readerTheme: 'custom',
        bgColor: event.target.value || DEFAULT_SETTINGS.bgColor
      });
    });

    textInput.addEventListener('input', (event) => {
      updateSettings({
        readerTheme: 'custom',
        textColor: event.target.value || DEFAULT_SETTINGS.textColor
      });
    });

    codeFontInput.addEventListener('input', (event) => {
      updateSettings({ codeFontFamily: event.target.value.trim() || DEFAULT_SETTINGS.codeFontFamily });
    });

    codeSizeInput.addEventListener('input', (event) => {
      updateSettings({ codeFontSize: Number(event.target.value) || DEFAULT_SETTINGS.codeFontSize });
    });

    codeThemeInput.addEventListener('change', (event) => {
      updateSettings({ codeTheme: event.target.value || DEFAULT_SETTINGS.codeTheme });
    });

    wrapCodeInput.addEventListener('change', (event) => {
      updateSettings({ wrapCode: Boolean(event.target.checked) });
    });

    resetButton.addEventListener('click', () => {
      currentSettings = { ...DEFAULT_SETTINGS };
      applySettings(currentSettings);
      saveSettings(currentSettings);
      syncControls(currentSettings);
    });

    syncControls(currentSettings);
  }

  function applySettings(values) {
    if (!overlay) return;
    overlay.style.setProperty('--rm-font', values.fontFamily);
    overlay.style.setProperty('--rm-font-size', `${values.fontSize}px`);
    overlay.style.setProperty('--rm-line-height', String(values.lineHeight));
    overlay.style.setProperty('--rm-width', `${values.widthCh}ch`);
    overlay.style.setProperty('--rm-paragraph-gap', `${values.paragraphGap}em`);
    overlay.style.setProperty('--rm-bg', values.bgColor);
    overlay.style.setProperty('--rm-text', values.textColor);
    overlay.style.setProperty('--rm-code-font', values.codeFontFamily);
    overlay.style.setProperty('--rm-code-size', `${values.codeFontSize}px`);
    overlay.dataset.codeTheme = values.codeTheme;
    overlay.dataset.theme = isDarkColor(values.bgColor) ? 'dark' : 'light';
    if (values.wrapCode) {
      overlay.classList.add('rm-code-wrap');
    } else {
      overlay.classList.remove('rm-code-wrap');
    }
  }

  function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get({ rmSettings: DEFAULT_SETTINGS }, (result) => {
        const stored = result && result.rmSettings ? result.rmSettings : {};
        resolve({ ...DEFAULT_SETTINGS, ...stored });
      });
    });
  }

  function saveSettings(values) {
    chrome.storage.sync.set({ rmSettings: values });
  }

  function renderContent() {
    if (!contentRoot) return;
    contentRoot.innerHTML = '';
    const article = extractArticle();
    const titleNode = article.querySelector('h1');
    const titleEl = overlay.querySelector('#rm-title');
    if (titleEl) {
      titleEl.textContent = titleNode ? titleNode.textContent.trim() : (document.title || 'Document');
    }
    contentRoot.appendChild(article);
    normalizeMedia(contentRoot);
    enhanceCallouts(contentRoot);
    enhanceCodeBlocks(contentRoot);
  }

  function extractArticle() {
    const selectors = [
      '#main-content',
      '#main-col-body',
      'main',
      'article',
      '#doc-content',
      '#content',
      '.awsui-doc-content',
      '.main-content'
    ];

    let best = null;
    let bestScore = 0;

    selectors.forEach((selector) => {
      const node = document.querySelector(selector);
      if (!node) return;
      const text = (node.textContent || '').trim();
      const score = text.length;
      if (score > bestScore) {
        best = node;
        bestScore = score;
      }
    });

    const source = best || document.body;
    const clone = source.cloneNode(true);

    const removeSelectors = [
      'nav',
      'header',
      'footer',
      'aside',
      '#leftNav',
      '#rightNav',
      '.toc',
      '.table-of-contents',
      '.breadcrumbs',
      '.breadcrumb',
      '.awsui-toc',
      '.awsdocs-toc',
      '.awsdocs-nav',
      '.awsdocs-feedback',
      '[role="navigation"]'
    ];

    removeSelectors.forEach((selector) => {
      clone.querySelectorAll(selector).forEach((node) => node.remove());
    });

    clone.querySelectorAll('#rm-overlay').forEach((node) => node.remove());
    clone.querySelectorAll('script, style, noscript').forEach((node) => node.remove());
    clone.querySelectorAll('[hidden], [aria-hidden="true"]').forEach((node) => node.remove());
    stripPresentation(clone);
    removeInteractiveElements(clone);

    return clone;
  }

  function normalizeMedia(container) {
    container.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src');
      if (!src) return;
      try {
        const abs = new URL(src, window.location.href).href;
        img.setAttribute('src', abs);
      } catch (err) {
        // ignore invalid URLs
      }
    });

    container.querySelectorAll('a').forEach((anchor) => {
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      try {
        const abs = new URL(href, window.location.href).href;
        anchor.setAttribute('href', abs);
      } catch (err) {
        // ignore invalid URLs
      }
    });
  }

  function enhanceCodeBlocks(container) {
    container.querySelectorAll('pre').forEach((pre) => {
      pre.classList.add('rm-code-block');
      const code = pre.querySelector('code');
      if (code && code.children.length === 0) {
        const raw = code.textContent || '';
        if (raw.length) {
          code.innerHTML = highlightCode(raw);
        }
      }
      if (!pre.querySelector('.rm-copy')) {
        const copyButton = document.createElement('button');
        copyButton.type = 'button';
        copyButton.className = 'rm-copy';
        copyButton.textContent = 'Copy';
        copyButton.addEventListener('click', () => {
          const text = (code ? code.textContent : pre.textContent) || '';
          navigator.clipboard.writeText(text).then(() => {
            copyButton.textContent = 'Copied';
            setTimeout(() => {
              copyButton.textContent = 'Copy';
            }, 1200);
          });
        });
        pre.appendChild(copyButton);
      }
    });
  }

  function enhanceCallouts(container) {
    const labels = {
      note: 'Note',
      important: 'Important',
      warning: 'Warning',
      caution: 'Caution',
      tip: 'Tip',
      info: 'Info'
    };
    const labelRegex = new RegExp(
      `^\\s*(${Object.values(labels).join('|')})\\s*[:\\-–—]?\\s*`,
      'i'
    );

    container.querySelectorAll('p').forEach((para) => {
      if (para.closest('pre') || para.closest('code')) return;
      const firstChild = para.firstElementChild;
      let label = null;
      if (firstChild && ['STRONG', 'B', 'SPAN'].includes(firstChild.tagName)) {
        const text = (firstChild.textContent || '').trim();
        const match = text.match(labelRegex);
        if (match) {
          label = match[1];
        }
      } else {
        const text = (para.textContent || '').trim();
        const match = text.match(labelRegex);
        if (match) {
          label = match[1];
        }
      }

      if (!label) return;
      const normalized = label.toLowerCase();
      if (!labels[normalized]) return;

      const callout = document.createElement('div');
      callout.className = `rm-callout rm-callout-${normalized}`;
      const title = document.createElement('div');
      title.className = 'rm-callout-title';
      title.textContent = labels[normalized];
      const body = document.createElement('div');
      body.className = 'rm-callout-body';

      const clonedPara = para.cloneNode(true);
      const strongChild = clonedPara.firstElementChild;
      if (strongChild && ['STRONG', 'B', 'SPAN'].includes(strongChild.tagName)) {
        strongChild.remove();
      } else {
        clonedPara.textContent = clonedPara.textContent.replace(labelRegex, '');
      }
      body.appendChild(clonedPara);

      callout.appendChild(title);
      callout.appendChild(body);
      para.replaceWith(callout);
    });

    container.querySelectorAll('div, section, aside').forEach((box) => {
      if (box.classList.contains('rm-callout')) return;
      const first = box.firstElementChild;
      if (!first) return;
      const labelText = (first.textContent || '').trim();
      const match = labelText.match(labelRegex);
      if (!match || labelText.length > 20) return;
      const normalized = match[1].toLowerCase();
      if (!labels[normalized]) return;
      if (box.textContent.trim().length <= match[1].length + 2) return;

      const callout = document.createElement('div');
      callout.className = `rm-callout rm-callout-${normalized}`;
      const title = document.createElement('div');
      title.className = 'rm-callout-title';
      title.textContent = labels[normalized];
      const body = document.createElement('div');
      body.className = 'rm-callout-body';

      box.childNodes.forEach((node, index) => {
        if (index === 0) return;
        body.appendChild(node.cloneNode(true));
      });
      callout.appendChild(title);
      callout.appendChild(body);
      box.replaceWith(callout);
    });
  }

  function highlightCode(raw) {
    TOKEN_REGEX.lastIndex = 0;
    let result = '';
    let lastIndex = 0;
    let match;
    while ((match = TOKEN_REGEX.exec(raw)) !== null) {
      const token = match[0];
      result += escapeHtml(raw.slice(lastIndex, match.index));
      const cls = classifyToken(token);
      result += `<span class="rm-token rm-${cls}">${escapeHtml(token)}</span>`;
      lastIndex = match.index + token.length;
    }
    result += escapeHtml(raw.slice(lastIndex));
    return result;
  }

  function classifyToken(token) {
    if (token.startsWith('/*') || token.startsWith('//') || token.startsWith('#')) {
      return 'comment';
    }
    if (token.startsWith('"') || token.startsWith("'") || token.startsWith('`')) {
      return 'string';
    }
    if (/^\d/.test(token)) {
      return 'number';
    }
    return 'keyword';
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function stripPresentation(root) {
    if (!root || !root.querySelectorAll) return;
    if (root.removeAttribute) {
      root.removeAttribute('class');
      root.removeAttribute('style');
    }
    root.querySelectorAll('*').forEach((node) => {
      node.removeAttribute('class');
      node.removeAttribute('style');
    });
  }

  function removeInteractiveElements(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('button, input, select, textarea, label, form').forEach((node) => {
      node.remove();
    });
    root.querySelectorAll('[role="button"]').forEach((node) => {
      node.remove();
    });
  }

  function isDarkColor(hex) {
    if (!hex || typeof hex !== 'string') return false;
    const normalized = hex.replace('#', '');
    if (normalized.length !== 6) return false;
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return false;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance < 140;
  }
})();
