(() => {
    const DEFAULT_TOGGLE_SHORTCUT = getDefaultToggleShortcut();
    const DEFAULT_SETTINGS = {
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
        toggleShortcut: DEFAULT_TOGGLE_SHORTCUT
    };
    const THEME_PRESETS = {
        light: {
            bgColor: '#f5efe2',
            textColor: '#1f1b16',
            codeTheme: 'light'
        },
        dark: {
            bgColor: '#101827',
            textColor: '#e7e8ec',
            codeTheme: 'dark'
        }
    };
    const FONT_CHOICES = [
        { label: 'Literata', value: '"Literata", Georgia, "Times New Roman", serif' },
        { label: 'Charter', value: '"Charter", "Bitstream Charter", "Sitka Text", Cambria, serif' },
        { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
        { label: 'Atkinson Hyperlegible', value: '"Atkinson Hyperlegible", "Inter", Arial, sans-serif' },
        { label: 'Avenir Sans', value: '"Avenir Next", "Avenir", "Segoe UI", Arial, sans-serif' },
        { label: 'System Sans', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }
    ];
    const CODE_FONT_CHOICES = [
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
    const TOKEN_REGEX = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|--[^\n]*|#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|@[A-Za-z_][\w]*|\b[A-Za-z_][\w$]*\b/gm;
    const KEYWORDS_BY_LANGUAGE = {
        python: new Set([
            'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del',
            'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in',
            'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while',
            'with', 'yield', 'match', 'case'
        ]),
        javascript: new Set([
            'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'default',
            'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'from', 'function',
            'if', 'import', 'in', 'instanceof', 'let', 'new', 'of', 'return', 'switch', 'this',
            'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield'
        ]),
        sql: new Set([
            'select', 'from', 'where', 'group', 'by', 'order', 'having', 'join', 'left', 'right',
            'inner', 'outer', 'on', 'as', 'insert', 'into', 'values', 'update', 'set', 'delete',
            'create', 'table', 'view', 'drop', 'alter', 'with', 'union', 'all', 'distinct', 'limit',
            'offset', 'and', 'or', 'not', 'null', 'is', 'between', 'like', 'in', 'exists'
        ]),
        bash: new Set([
            'if', 'then', 'else', 'fi', 'for', 'do', 'done', 'while', 'case', 'esac', 'function',
            'local', 'export', 'readonly', 'unset', 'return', 'break', 'continue', 'in'
        ])
    };
    const BUILTIN_LITERALS = new Set(['true', 'false', 'null', 'none', 'undefined']);
    const HIGHLIGHT_STORE_KEY = 'rmHighlightsV1';
    const PENDING_OPEN_KEY = 'rmPendingOpenV1';
    const WORDS_PER_MINUTE = 220;
    const NUMBER_FORMATTER = new Intl.NumberFormat();
    let overlay = null;
    let settingsPanel = null;
    let contentRoot = null;
    let readerViewport = null;
    let selectionActionButton = null;
    let highlightDeleteButton = null;
    let activeHighlightDeleteId = '';
    let metaLine = null;
    let messageToast = null;
    let mediaModal = null;
    let mediaModalImage = null;
    let mediaModalCaption = null;
    let shortcutInput = null;
    let shortcutHint = null;
    let isCapturingShortcut = false;
    let currentSettings = { ...DEFAULT_SETTINGS };
    let pendingPageScrollSync = false;
    let pendingSelectionActionFrame = 0;
    let pendingSelectionAnchor = null;
    let currentPageHighlights = [];
    let currentReadingStats = { words: 0, minutes: 1 };
    let toastTimer = 0;
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg && msg.type === 'RM_TOGGLE') {
            toggleReader();
        }
    });
    initializeAutoOpenFromNavigation();
    async function toggleReader() {
        await ensureOverlay();
        if (!overlay)
            return;
        const isOpen = overlay.dataset.open === 'true';
        if (isOpen) {
            closeReader();
        }
        else {
            openReader();
        }
    }
    function openReader(options = {}) {
        const { resetToTop = false } = options;
        if (!overlay)
            return;
        overlay.dataset.open = 'true';
        overlay.setAttribute('aria-hidden', 'false');
        renderContent();
        if (resetToTop) {
            window.scrollTo(0, 0);
            if (readerViewport) {
                readerViewport.scrollTop = 0;
            }
        }
        else {
            syncReaderFromPageScroll();
        }
        window.requestAnimationFrame(() => {
            updateReadingProgress();
        });
    }
    function closeReader() {
        if (!overlay)
            return;
        closeMediaModal();
        hideSelectionAction();
        hideHighlightDeleteAction();
        overlay.classList.remove('rm-settings-open');
        const settingsToggle = overlay.querySelector('#rm-settings-toggle');
        if (settingsToggle) {
            settingsToggle.setAttribute('aria-expanded', 'false');
        }
        overlay.dataset.open = 'false';
        overlay.setAttribute('aria-hidden', 'true');
    }
    async function ensureOverlay() {
        if (overlay)
            return;
        currentSettings = await loadSettings();
        overlay = document.createElement('div');
        overlay.id = 'rm-overlay';
        overlay.dataset.open = 'false';
        overlay.setAttribute('aria-hidden', 'true');
        const toolbar = document.createElement('div');
        toolbar.id = 'rm-toolbar';
        const brand = document.createElement('div');
        brand.className = 'rm-brand';
        brand.textContent = 'Reader';
        const titleWrap = document.createElement('div');
        titleWrap.className = 'rm-title-wrap';
        const title = document.createElement('div');
        title.id = 'rm-title';
        title.textContent = document.title || 'Document';
        metaLine = document.createElement('div');
        metaLine.id = 'rm-meta';
        metaLine.textContent = 'Estimating reading time...';
        titleWrap.appendChild(title);
        titleWrap.appendChild(metaLine);
        const actions = document.createElement('div');
        actions.className = 'rm-actions';
        const settingsToggle = document.createElement('button');
        settingsToggle.type = 'button';
        settingsToggle.id = 'rm-settings-toggle';
        settingsToggle.setAttribute('aria-expanded', 'false');
        settingsToggle.setAttribute('aria-label', 'Settings');
        settingsToggle.setAttribute('title', 'Settings');
        settingsToggle.className = 'rm-icon-btn';
        setToolbarButtonIcon(settingsToggle, 'settings');
        actions.appendChild(settingsToggle);
        toolbar.appendChild(brand);
        toolbar.appendChild(titleWrap);
        toolbar.appendChild(actions);
        settingsPanel = document.createElement('div');
        settingsPanel.id = 'rm-settings';
        settingsPanel.innerHTML = `
      <div class="rm-settings-header">
        <div>Reading Settings</div>
        <div class="rm-settings-subtitle">Tune comfort and contrast for long sessions.</div>
      </div>
      <div class="rm-settings-group">
        <div class="rm-settings-group-title">Reading</div>
        <div class="rm-setting">
          <label>Quick presets</label>
          <div class="rm-presets" role="group" aria-label="Reading presets">
            <button id="rm-preset-comfort" type="button" class="rm-preset-btn">Comfort</button>
            <button id="rm-preset-focus" type="button" class="rm-preset-btn">Focus</button>
            <button id="rm-preset-dense" type="button" class="rm-preset-btn">Dense</button>
          </div>
        </div>
        <div class="rm-setting">
          <label>Theme</label>
          <div class="rm-theme-toggle" role="group" aria-label="Theme">
            <button id="rm-theme-light" type="button" class="rm-theme-btn" aria-pressed="false"><span class="rm-theme-icon">☀</span> Light</button>
            <button id="rm-theme-dark" type="button" class="rm-theme-btn" aria-pressed="false"><span class="rm-theme-icon">☾</span> Dark</button>
          </div>
        </div>
        <div class="rm-setting">
          <label for="rm-font">Font family</label>
          <select id="rm-font"></select>
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
      </div>
      <div class="rm-settings-group">
        <div class="rm-settings-group-title">Colors</div>
        <div class="rm-setting">
          <label for="rm-bg">Background</label>
          <input id="rm-bg" type="color" />
        </div>
        <div class="rm-setting">
          <label for="rm-text">Text color</label>
          <input id="rm-text" type="color" />
        </div>
      </div>
      <div class="rm-settings-group">
        <div class="rm-settings-group-title">Code</div>
        <div class="rm-setting">
          <label for="rm-code-font">Code font</label>
          <select id="rm-code-font"></select>
        </div>
        <div class="rm-setting rm-range">
          <label for="rm-code-size">Code size</label>
          <input id="rm-code-size" type="range" min="12" max="18" step="1" />
          <span id="rm-code-size-value"></span>
        </div>
        <div class="rm-setting">
          <label>Code theme</label>
          <div id="rm-code-theme-sync">Synced with reader theme</div>
        </div>
        <div class="rm-setting rm-inline">
          <label for="rm-wrap-code">Wrap code</label>
          <input id="rm-wrap-code" type="checkbox" />
        </div>
      </div>
      <div class="rm-settings-group">
        <div class="rm-settings-group-title">Shortcuts</div>
        <div class="rm-setting">
          <label for="rm-shortcut-input">Toggle shortcut</label>
          <div class="rm-shortcut-row">
            <input id="rm-shortcut-input" type="text" readonly />
            <button id="rm-shortcut-set" type="button">Set</button>
            <button id="rm-shortcut-reset" type="button">Reset</button>
          </div>
          <div id="rm-shortcut-hint">Press Set, then your key combo.</div>
        </div>
      </div>
      <div class="rm-setting rm-inline">
        <button id="rm-reset" type="button">Restore defaults</button>
      </div>
    `;
        const reader = document.createElement('div');
        reader.id = 'rm-reader';
        readerViewport = reader;
        readerViewport.addEventListener('scroll', onReaderScroll, { passive: true });
        contentRoot = document.createElement('div');
        contentRoot.id = 'rm-content';
        contentRoot.addEventListener('click', onReaderLinkClick, true);
        contentRoot.addEventListener('click', onMediaClick);
        contentRoot.addEventListener('mousedown', onReaderMouseDown);
        contentRoot.addEventListener('mouseup', onReaderMouseUp);
        contentRoot.addEventListener('click', onHighlightClick);
        reader.appendChild(contentRoot);
        messageToast = document.createElement('div');
        messageToast.id = 'rm-toast';
        messageToast.setAttribute('aria-live', 'polite');
        selectionActionButton = document.createElement('button');
        selectionActionButton.id = 'rm-selection-action';
        selectionActionButton.type = 'button';
        setToolbarButtonIcon(selectionActionButton, 'highlight');
        selectionActionButton.setAttribute('aria-label', 'Highlight selected text');
        selectionActionButton.setAttribute('title', 'Highlight');
        selectionActionButton.addEventListener('mousedown', (event) => {
            event.preventDefault();
        });
        selectionActionButton.addEventListener('click', () => {
            hideSelectionAction();
            applyHighlightFromSelection();
        });
        highlightDeleteButton = document.createElement('button');
        highlightDeleteButton.id = 'rm-highlight-delete-action';
        highlightDeleteButton.type = 'button';
        highlightDeleteButton.textContent = 'Delete';
        highlightDeleteButton.setAttribute('aria-label', 'Delete highlight');
        highlightDeleteButton.addEventListener('mousedown', (event) => {
            event.preventDefault();
        });
        highlightDeleteButton.addEventListener('click', () => {
            const id = activeHighlightDeleteId;
            const node = findHighlightNodeById(id);
            hideHighlightDeleteAction();
            if (id && node) {
                removeHighlightById(id, node);
            }
        });
        mediaModal = document.createElement('div');
        mediaModal.id = 'rm-media-modal';
        mediaModal.setAttribute('aria-hidden', 'true');
        mediaModal.innerHTML = `
      <div id="rm-media-modal-backdrop"></div>
      <div id="rm-media-modal-dialog" role="dialog" aria-modal="true" aria-label="Image preview">
        <button id="rm-media-close" type="button" aria-label="Close image preview">✕</button>
        <img id="rm-media-image" alt="" />
        <div id="rm-media-caption"></div>
      </div>
    `;
        mediaModalImage = mediaModal.querySelector('#rm-media-image');
        mediaModalCaption = mediaModal.querySelector('#rm-media-caption');
        overlay.appendChild(toolbar);
        overlay.appendChild(settingsPanel);
        overlay.appendChild(reader);
        overlay.appendChild(selectionActionButton);
        overlay.appendChild(highlightDeleteButton);
        overlay.appendChild(messageToast);
        overlay.appendChild(mediaModal);
        document.body.appendChild(overlay);
        settingsToggle.addEventListener('click', () => {
            const isOpen = overlay.classList.toggle('rm-settings-open');
            settingsToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            hideSelectionAction();
            hideHighlightDeleteAction();
        });
        mediaModal.querySelector('#rm-media-close').addEventListener('click', () => {
            closeMediaModal();
        });
        mediaModal.querySelector('#rm-media-modal-backdrop').addEventListener('click', () => {
            closeMediaModal();
        });
        mediaModal.addEventListener('click', (event) => {
            const dialog = mediaModal.querySelector('#rm-media-modal-dialog');
            if (!dialog)
                return;
            if (!(event.target instanceof Node) || !dialog.contains(event.target)) {
                closeMediaModal();
            }
        });
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay && overlay.classList.contains('rm-settings-open')) {
                overlay.classList.remove('rm-settings-open');
                settingsToggle.setAttribute('aria-expanded', 'false');
            }
            hideSelectionAction();
            hideHighlightDeleteAction();
        });
        document.addEventListener('keydown', (event) => {
            if (isCapturingShortcut)
                return;
            if (!isInputLikeElement(event.target) && shortcutMatchesEvent(currentSettings.toggleShortcut, event)) {
                event.preventDefault();
                event.stopPropagation();
                toggleReader();
                return;
            }
            if (overlay.dataset.open !== 'true')
                return;
            if (event.key === 'Escape') {
                if (isMediaModalOpen()) {
                    closeMediaModal();
                }
                else {
                    closeReader();
                }
                return;
            }
            if ((event.key === 'h' || event.key === 'H') && !event.metaKey && !event.ctrlKey && !event.altKey) {
                if (isInputLikeElement(event.target))
                    return;
                event.preventDefault();
                applyHighlightFromSelection();
                hideSelectionAction();
                hideHighlightDeleteAction();
            }
        });
        wireSettingsControls();
        applySettings(currentSettings);
    }
    function wireSettingsControls() {
        if (!settingsPanel)
            return;
        const themeLightButton = settingsPanel.querySelector('#rm-theme-light');
        const themeDarkButton = settingsPanel.querySelector('#rm-theme-dark');
        const presetComfortButton = settingsPanel.querySelector('#rm-preset-comfort');
        const presetFocusButton = settingsPanel.querySelector('#rm-preset-focus');
        const presetDenseButton = settingsPanel.querySelector('#rm-preset-dense');
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
        shortcutInput = settingsPanel.querySelector('#rm-shortcut-input');
        const shortcutSetButton = settingsPanel.querySelector('#rm-shortcut-set');
        const shortcutResetButton = settingsPanel.querySelector('#rm-shortcut-reset');
        shortcutHint = settingsPanel.querySelector('#rm-shortcut-hint');
        const codeSizeInput = settingsPanel.querySelector('#rm-code-size');
        const codeSizeValue = settingsPanel.querySelector('#rm-code-size-value');
        const codeThemeSync = settingsPanel.querySelector('#rm-code-theme-sync');
        const wrapCodeInput = settingsPanel.querySelector('#rm-wrap-code');
        const resetButton = settingsPanel.querySelector('#rm-reset');
        const presetButtons = {
            comfort: presetComfortButton,
            focus: presetFocusButton,
            dense: presetDenseButton
        };
        function syncControls(values) {
            const theme = normalizeTheme(values.readerTheme);
            setThemeButtons(themeLightButton, themeDarkButton, theme);
            setPresetButtons(values);
            populateSelect(fontInput, FONT_CHOICES, values.fontFamily);
            fontSizeInput.value = String(values.fontSize);
            fontSizeValue.textContent = `${values.fontSize}px`;
            lineHeightInput.value = String(values.lineHeight);
            lineHeightValue.textContent = values.lineHeight.toFixed(2);
            widthInput.value = String(values.widthCh);
            widthValue.textContent = `${values.widthCh}ch`;
            bgInput.value = values.bgColor;
            textInput.value = values.textColor;
            populateSelect(codeFontInput, CODE_FONT_CHOICES, values.codeFontFamily);
            shortcutInput.value = formatShortcut(values.toggleShortcut);
            codeSizeInput.value = String(values.codeFontSize);
            codeSizeValue.textContent = `${values.codeFontSize}px`;
            codeThemeSync.textContent = theme === 'dark' ? 'Dark (synced)' : 'Light (synced)';
            wrapCodeInput.checked = Boolean(values.wrapCode);
            if (!isCapturingShortcut) {
                shortcutHint.textContent = 'Press Set, then your key combo.';
            }
        }
        function setPresetButtons(values) {
            const activePreset = detectPreset(values);
            Object.entries(presetButtons).forEach(([name, button]) => {
                if (!button)
                    return;
                const isActive = activePreset === name;
                button.classList.toggle('active', isActive);
                button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });
        }
        function detectPreset(values) {
            const tolerance = 0.02;
            const keys = ['fontSize', 'lineHeight', 'widthCh', 'paragraphGap'];
            for (const [name, presetValues] of Object.entries(READING_PRESETS)) {
                const matches = keys.every((key) => {
                    const target = Number(values[key]);
                    const expected = Number(presetValues[key]);
                    if (!Number.isFinite(target) || !Number.isFinite(expected))
                        return false;
                    return Math.abs(target - expected) <= tolerance;
                });
                if (matches)
                    return name;
            }
            return '';
        }
        function updateSettings(partial) {
            currentSettings = normalizeSettings({ ...currentSettings, ...partial });
            applySettings(currentSettings);
            saveSettings(currentSettings);
            syncControls(currentSettings);
        }
        function applyReadingPreset(presetName) {
            const presetValues = READING_PRESETS[presetName];
            if (!presetValues)
                return;
            updateSettings({ ...presetValues });
            showToast(`Preset applied: ${capitalize(presetName)}.`);
        }
        themeLightButton.addEventListener('click', () => {
            updateSettings({ readerTheme: 'light', ...THEME_PRESETS.light, codeTheme: 'light' });
        });
        themeDarkButton.addEventListener('click', () => {
            updateSettings({ readerTheme: 'dark', ...THEME_PRESETS.dark, codeTheme: 'dark' });
        });
        presetComfortButton.addEventListener('click', () => {
            applyReadingPreset('comfort');
        });
        presetFocusButton.addEventListener('click', () => {
            applyReadingPreset('focus');
        });
        presetDenseButton.addEventListener('click', () => {
            applyReadingPreset('dense');
        });
        fontInput.addEventListener('change', (event) => {
            const target = event.currentTarget;
            updateSettings({ fontFamily: target.value.trim() || DEFAULT_SETTINGS.fontFamily });
        });
        fontSizeInput.addEventListener('input', (event) => {
            const target = event.currentTarget;
            updateSettings({ fontSize: Number(target.value) || DEFAULT_SETTINGS.fontSize });
        });
        lineHeightInput.addEventListener('input', (event) => {
            const target = event.currentTarget;
            updateSettings({ lineHeight: Number(target.value) || DEFAULT_SETTINGS.lineHeight });
        });
        widthInput.addEventListener('input', (event) => {
            const target = event.currentTarget;
            updateSettings({ widthCh: Number(target.value) || DEFAULT_SETTINGS.widthCh });
        });
        bgInput.addEventListener('input', (event) => {
            const target = event.currentTarget;
            updateSettings({
                bgColor: target.value || DEFAULT_SETTINGS.bgColor
            });
        });
        textInput.addEventListener('input', (event) => {
            const target = event.currentTarget;
            updateSettings({
                textColor: target.value || DEFAULT_SETTINGS.textColor
            });
        });
        codeFontInput.addEventListener('change', (event) => {
            const target = event.currentTarget;
            updateSettings({ codeFontFamily: target.value.trim() || DEFAULT_SETTINGS.codeFontFamily });
        });
        shortcutSetButton.addEventListener('click', () => {
            isCapturingShortcut = true;
            shortcutHint.textContent = 'Press keys now (Esc to cancel).';
            shortcutInput.value = 'Press keys...';
            shortcutInput.focus();
        });
        shortcutInput.addEventListener('keydown', (event) => {
            if (!isCapturingShortcut)
                return;
            event.preventDefault();
            event.stopPropagation();
            if (event.key === 'Escape') {
                isCapturingShortcut = false;
                shortcutHint.textContent = 'Capture cancelled.';
                shortcutInput.value = formatShortcut(currentSettings.toggleShortcut);
                return;
            }
            const nextShortcut = eventToShortcut(event);
            if (!nextShortcut) {
                shortcutHint.textContent = 'Use a non-modifier key (e.g. Ctrl+R).';
                return;
            }
            isCapturingShortcut = false;
            updateSettings({ toggleShortcut: nextShortcut });
            shortcutHint.textContent = `Saved: ${formatShortcut(nextShortcut)}`;
        });
        shortcutResetButton.addEventListener('click', () => {
            isCapturingShortcut = false;
            updateSettings({ toggleShortcut: getDefaultToggleShortcut() });
            shortcutHint.textContent = `Reset to ${formatShortcut(getDefaultToggleShortcut())}`;
        });
        codeSizeInput.addEventListener('input', (event) => {
            const target = event.currentTarget;
            updateSettings({ codeFontSize: Number(target.value) || DEFAULT_SETTINGS.codeFontSize });
        });
        wrapCodeInput.addEventListener('change', (event) => {
            const target = event.currentTarget;
            updateSettings({ wrapCode: Boolean(target.checked) });
        });
        resetButton.addEventListener('click', () => {
            currentSettings = normalizeSettings({ ...DEFAULT_SETTINGS });
            applySettings(currentSettings);
            saveSettings(currentSettings);
            syncControls(currentSettings);
        });
        syncControls(currentSettings);
    }
    function applySettings(values) {
        if (!overlay)
            return;
        const syncedTheme = normalizeTheme(values.readerTheme);
        overlay.style.setProperty('--rm-font', values.fontFamily);
        overlay.style.setProperty('--rm-font-size', `${values.fontSize}px`);
        overlay.style.setProperty('--rm-line-height', String(values.lineHeight));
        overlay.style.setProperty('--rm-width', `${values.widthCh}ch`);
        overlay.style.setProperty('--rm-paragraph-gap', `${values.paragraphGap}em`);
        overlay.style.setProperty('--rm-bg', values.bgColor);
        overlay.style.setProperty('--rm-text', values.textColor);
        overlay.style.setProperty('--rm-code-font', values.codeFontFamily);
        overlay.style.setProperty('--rm-code-size', `${values.codeFontSize}px`);
        overlay.dataset.codeTheme = syncedTheme;
        overlay.dataset.theme = syncedTheme;
        if (values.wrapCode) {
            overlay.classList.add('rm-code-wrap');
        }
        else {
            overlay.classList.remove('rm-code-wrap');
        }
    }
    function loadSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get({ rmSettings: DEFAULT_SETTINGS }, (result) => {
                const stored = result && result.rmSettings ? result.rmSettings : {};
                resolve(normalizeSettings({ ...DEFAULT_SETTINGS, ...stored }));
            });
        });
    }
    function saveSettings(values) {
        chrome.storage.sync.set({ rmSettings: normalizeSettings(values) });
    }
    function renderContent() {
        if (!contentRoot)
            return;
        hideSelectionAction();
        hideHighlightDeleteAction();
        contentRoot.innerHTML = '';
        currentPageHighlights = [];
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
        currentReadingStats = calculateReadingStats(contentRoot);
        updateReadingProgress();
        restoreHighlightsForCurrentPage();
    }
    async function initializeAutoOpenFromNavigation() {
        const pending = await loadPendingOpen();
        if (!pending)
            return;
        const now = Date.now();
        if (!pending.expiresAt || pending.expiresAt < now) {
            clearPendingOpen();
            return;
        }
        const currentUrl = toComparableUrl(window.location.href);
        const referrerUrl = toComparableUrl(document.referrer || '');
        const sourceUrl = toComparableUrl(pending.sourceUrl || '');
        const destinationUrl = toComparableUrl(pending.destinationUrl || '');
        const destinationMatches = Boolean(destinationUrl && destinationUrl === currentUrl);
        const sourceMatchesReferrer = Boolean(sourceUrl && referrerUrl && sourceUrl === referrerUrl);
        if (!destinationMatches && !sourceMatchesReferrer) {
            return;
        }
        clearPendingOpen();
        await ensureOverlay();
        openReader({ resetToTop: Boolean(pending.resetToTop) });
    }
    function onReaderLinkClick(event) {
        if (isMediaModalOpen()) {
            event.preventDefault();
            return;
        }
        const target = event.target;
        if (!target || !target.closest)
            return;
        const anchor = target.closest('a[href]');
        if (!anchor)
            return;
        if (target.closest('.rm-highlight'))
            return;
        if (event.defaultPrevented)
            return;
        if (!isPrimaryNavigationClick(event))
            return;
        if (anchor.hasAttribute('download'))
            return;
        const href = anchor.getAttribute('href') || '';
        const targetAttr = (anchor.getAttribute('target') || '').toLowerCase();
        if (!href || href.startsWith('#'))
            return;
        if (href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:'))
            return;
        if (targetAttr && targetAttr !== '_self')
            return;
        const destinationUrl = resolveAbsoluteUrl(href);
        if (!destinationUrl)
            return;
        event.preventDefault();
        markReaderOpenForNextNavigation(destinationUrl, { resetToTop: true });
        const newTab = window.open(destinationUrl, '_blank', 'noopener');
        if (!newTab) {
            showToast('Popup blocked. Enable popups for new-tab open.');
        }
    }
    function onMediaClick(event) {
        if (event.defaultPrevented)
            return;
        const target = event.target;
        if (!target || target.tagName !== 'IMG')
            return;
        if (target.closest('#rm-media-modal'))
            return;
        if (!contentRoot || !contentRoot.contains(target))
            return;
        if (target.closest('pre'))
            return;
        if (target.closest('a[href]'))
            return;
        event.preventDefault();
        event.stopPropagation();
        openMediaModal(target);
    }
    function onHighlightClick(event) {
        const node = event.target && event.target.closest ? event.target.closest('.rm-highlight') : null;
        if (!node || !contentRoot || !contentRoot.contains(node))
            return;
        if (event.defaultPrevented)
            return;
        event.preventDefault();
        event.stopPropagation();
        hideSelectionAction();
        const id = node.dataset.highlightId || '';
        if (!id)
            return;
        if (highlightDeleteButton?.classList.contains('show') && activeHighlightDeleteId === id) {
            hideHighlightDeleteAction();
            return;
        }
        showHighlightDeleteAction(node, {
            x: event.clientX,
            y: event.clientY
        });
    }
    function applyHighlightFromSelection() {
        if (!contentRoot || overlay?.dataset.open !== 'true')
            return;
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            showToast('Select text first.');
            return;
        }
        const range = selection.getRangeAt(0);
        if (range.collapsed) {
            showToast('Select text first.');
            return;
        }
        if (!isRangeInsideContainer(range, contentRoot)) {
            showToast('Selection must be inside the reader.');
            return;
        }
        const startBlock = getNearestBlock(range.startContainer);
        const endBlock = getNearestBlock(range.endContainer);
        if (!startBlock || !endBlock || startBlock !== endBlock) {
            showToast('Highlight one paragraph at a time.');
            return;
        }
        const startHighlight = getParentHighlight(range.startContainer);
        const endHighlight = getParentHighlight(range.endContainer);
        if (startHighlight || endHighlight) {
            showToast('Selection overlaps an existing highlight.');
            return;
        }
        const offsets = getTextOffsetsForRange(contentRoot, range);
        if (!offsets || offsets.end <= offsets.start) {
            showToast('Cannot highlight that selection.');
            return;
        }
        const id = `h-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        const applied = applyHighlightRange(range, id);
        if (!applied) {
            showToast('Highlight failed for that selection.');
            return;
        }
        currentPageHighlights.push({
            id,
            start: offsets.start,
            end: offsets.end
        });
        currentPageHighlights.sort((a, b) => a.start - b.start);
        persistCurrentHighlights();
        selection.removeAllRanges();
        hideSelectionAction();
        hideHighlightDeleteAction();
    }
    function applyHighlightRange(range, id) {
        const wrapper = document.createElement('span');
        wrapper.className = 'rm-highlight';
        wrapper.dataset.highlightId = id;
        try {
            const fragment = range.extractContents();
            if (!fragment || !fragment.textContent || !fragment.textContent.trim()) {
                return false;
            }
            wrapper.appendChild(fragment);
            range.insertNode(wrapper);
            return true;
        }
        catch (err) {
            return false;
        }
    }
    function restoreHighlightsForCurrentPage() {
        loadHighlightsForPage(getPageKey()).then((entries) => {
            if (!contentRoot)
                return;
            const normalized = normalizeHighlightEntries(entries);
            const restored = [];
            normalized.forEach((entry) => {
                const applied = applyHighlightByOffsets(contentRoot, entry.start, entry.end, entry.id);
                if (applied) {
                    restored.push({
                        id: entry.id,
                        start: entry.start,
                        end: entry.end
                    });
                }
            });
            currentPageHighlights = restored;
            if (entries.length !== restored.length) {
                persistCurrentHighlights();
            }
        });
    }
    function applyHighlightByOffsets(root, start, end, id) {
        if (!root || !Number.isFinite(start) || !Number.isFinite(end) || end <= start)
            return null;
        const position = resolveTextPosition(root, start, end);
        if (!position)
            return null;
        const { startNode, startOffset, endNode, endOffset } = position;
        const startBlock = getNearestBlock(startNode);
        const endBlock = getNearestBlock(endNode);
        if (!startBlock || !endBlock || startBlock !== endBlock)
            return null;
        const range = document.createRange();
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);
        return applyHighlightRange(range, id);
    }
    function resolveTextPosition(root, start, end) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
                if (!node.nodeValue || !node.nodeValue.length)
                    return NodeFilter.FILTER_REJECT;
                const parent = node.parentElement;
                if (!parent)
                    return NodeFilter.FILTER_REJECT;
                if (parent.closest('#rm-settings'))
                    return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        });
        let current = walker.nextNode();
        let index = 0;
        let startNode = null;
        let startOffset = 0;
        let endNode = null;
        let endOffset = 0;
        while (current) {
            const length = current.nodeValue.length;
            if (!startNode && start >= index && start <= index + length) {
                startNode = current;
                startOffset = start - index;
            }
            if (!endNode && end >= index && end <= index + length) {
                endNode = current;
                endOffset = end - index;
                break;
            }
            index += length;
            current = walker.nextNode();
        }
        if (!startNode || !endNode)
            return null;
        return { startNode, startOffset, endNode, endOffset };
    }
    function getTextOffsetsForRange(root, range) {
        try {
            const startRange = document.createRange();
            startRange.selectNodeContents(root);
            startRange.setEnd(range.startContainer, range.startOffset);
            const endRange = document.createRange();
            endRange.selectNodeContents(root);
            endRange.setEnd(range.endContainer, range.endOffset);
            return {
                start: startRange.toString().length,
                end: endRange.toString().length
            };
        }
        catch (err) {
            return null;
        }
    }
    function removeHighlightById(id, node) {
        if (!id || !node)
            return;
        if (activeHighlightDeleteId === id) {
            hideHighlightDeleteAction();
        }
        const parent = node.parentNode;
        if (!parent)
            return;
        while (node.firstChild) {
            parent.insertBefore(node.firstChild, node);
        }
        parent.removeChild(node);
        parent.normalize();
        currentPageHighlights = currentPageHighlights.filter((item) => item.id !== id);
        persistCurrentHighlights();
    }
    function loadHighlightsForPage(pageKey) {
        return new Promise((resolve) => {
            chrome.storage.local.get({ [HIGHLIGHT_STORE_KEY]: {} }, (result) => {
                const store = result && result[HIGHLIGHT_STORE_KEY] ? result[HIGHLIGHT_STORE_KEY] : {};
                const entries = Array.isArray(store[pageKey]) ? store[pageKey] : [];
                resolve(entries);
            });
        });
    }
    function persistCurrentHighlights() {
        const pageKey = getPageKey();
        chrome.storage.local.get({ [HIGHLIGHT_STORE_KEY]: {} }, (result) => {
            const store = result && result[HIGHLIGHT_STORE_KEY] ? result[HIGHLIGHT_STORE_KEY] : {};
            if (currentPageHighlights.length > 0) {
                store[pageKey] = currentPageHighlights;
            }
            else {
                delete store[pageKey];
            }
            chrome.storage.local.set({ [HIGHLIGHT_STORE_KEY]: store });
        });
    }
    function normalizeHighlightEntries(entries) {
        if (!Array.isArray(entries))
            return [];
        const clean = entries
            .filter((entry) => entry && Number.isFinite(entry.start) && Number.isFinite(entry.end))
            .map((entry) => ({
            id: entry.id || `h-${entry.start}-${entry.end}`,
            start: Math.max(0, Math.floor(entry.start)),
            end: Math.max(0, Math.floor(entry.end))
        }))
            .filter((entry) => entry.end > entry.start)
            .sort((a, b) => a.start - b.start);
        const deduped = [];
        clean.forEach((entry) => {
            const prev = deduped[deduped.length - 1];
            if (prev && entry.start < prev.end) {
                return;
            }
            deduped.push(entry);
        });
        return deduped;
    }
    function isRangeInsideContainer(range, container) {
        if (!range || !container)
            return false;
        return container.contains(range.startContainer) && container.contains(range.endContainer);
    }
    function getParentHighlight(node) {
        if (!node)
            return null;
        const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        return el ? el.closest('.rm-highlight') : null;
    }
    function getNearestBlock(node) {
        let el = node && node.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
        while (el && el !== contentRoot) {
            const tag = el.tagName;
            if (['P', 'LI', 'BLOCKQUOTE', 'PRE', 'TD', 'TH', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tag)) {
                return el;
            }
            el = el.parentElement;
        }
        return null;
    }
    function getPageKey() {
        return `${window.location.origin}${window.location.pathname}`;
    }
    function openMediaModal(img) {
        if (!mediaModal || !mediaModalImage || !mediaModalCaption)
            return;
        const source = getBestModalImageSource(img);
        if (!source)
            return;
        mediaModalImage.setAttribute('src', source);
        mediaModalImage.setAttribute('alt', img.getAttribute('alt') || '');
        const alt = (img.getAttribute('alt') || '').trim();
        if (alt) {
            mediaModalCaption.textContent = alt;
            mediaModalCaption.style.display = 'block';
        }
        else {
            mediaModalCaption.textContent = '';
            mediaModalCaption.style.display = 'none';
        }
        mediaModal.classList.add('open');
        mediaModal.setAttribute('aria-hidden', 'false');
    }
    function closeMediaModal() {
        if (!mediaModal)
            return;
        mediaModal.classList.remove('open');
        mediaModal.setAttribute('aria-hidden', 'true');
        if (mediaModalImage) {
            mediaModalImage.removeAttribute('src');
        }
    }
    function isMediaModalOpen() {
        return Boolean(mediaModal && mediaModal.classList.contains('open'));
    }
    function getBestModalImageSource(img) {
        const current = img.currentSrc || img.getAttribute('src') || '';
        const largestFromImg = pickLargestFromSrcset(img.getAttribute('srcset') || '');
        const picture = img.closest('picture');
        const candidates = [largestFromImg, current];
        if (picture) {
            picture.querySelectorAll('source').forEach((sourceNode) => {
                candidates.push(pickLargestFromSrcset(sourceNode.getAttribute('srcset') || ''));
            });
        }
        for (const candidate of candidates) {
            if (!candidate)
                continue;
            try {
                return new URL(candidate, window.location.href).href;
            }
            catch (err) {
                // ignore malformed candidate
            }
        }
        return '';
    }
    function pickLargestFromSrcset(srcset) {
        if (!srcset)
            return '';
        const items = srcset
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean)
            .map((part) => {
            const pieces = part.split(/\s+/);
            const url = pieces[0] || '';
            const descriptor = pieces[1] || '';
            const wMatch = descriptor.match(/^(\d+)w$/);
            return {
                url,
                width: wMatch ? Number(wMatch[1]) : 0
            };
        })
            .filter((item) => item.url);
        if (!items.length)
            return '';
        items.sort((a, b) => b.width - a.width);
        return items[0].url;
    }
    function markReaderOpenForNextNavigation(destinationUrl, options = {}) {
        const { resetToTop = false } = options;
        const payload = {
            sourceUrl: toComparableUrl(window.location.href),
            destinationUrl: toComparableUrl(destinationUrl),
            resetToTop: Boolean(resetToTop),
            expiresAt: Date.now() + 20000
        };
        chrome.storage.local.set({ [PENDING_OPEN_KEY]: payload });
    }
    function loadPendingOpen() {
        return new Promise((resolve) => {
            chrome.storage.local.get({ [PENDING_OPEN_KEY]: null }, (result) => {
                const pending = result && result[PENDING_OPEN_KEY] ? result[PENDING_OPEN_KEY] : null;
                resolve(pending);
            });
        });
    }
    function clearPendingOpen() {
        chrome.storage.local.remove(PENDING_OPEN_KEY);
    }
    function resolveAbsoluteUrl(rawHref) {
        try {
            return new URL(rawHref, window.location.href).href;
        }
        catch (err) {
            return null;
        }
    }
    function toComparableUrl(rawUrl) {
        if (!rawUrl)
            return '';
        try {
            const parsed = new URL(rawUrl, window.location.href);
            parsed.hash = '';
            return `${parsed.origin}${parsed.pathname}${parsed.search}`;
        }
        catch (err) {
            return '';
        }
    }
    function isPrimaryNavigationClick(event) {
        if (!event)
            return false;
        if (event.button !== 0)
            return false;
        if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)
            return false;
        return true;
    }
    function showToast(message) {
        if (!messageToast)
            return;
        messageToast.textContent = message;
        messageToast.classList.add('show');
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => {
            if (messageToast) {
                messageToast.classList.remove('show');
            }
        }, 1800);
    }
    function onReaderMouseDown() {
        hideSelectionAction();
        hideHighlightDeleteAction();
    }
    function onReaderMouseUp(event) {
        if (!event || event.button !== 0) {
            hideSelectionAction();
            hideHighlightDeleteAction();
            return;
        }
        scheduleSelectionActionUpdate({
            x: event.clientX,
            y: event.clientY
        });
    }
    function scheduleSelectionActionUpdate(anchorPoint = null) {
        if (anchorPoint && Number.isFinite(anchorPoint.x) && Number.isFinite(anchorPoint.y)) {
            pendingSelectionAnchor = {
                x: anchorPoint.x,
                y: anchorPoint.y
            };
        }
        else {
            pendingSelectionAnchor = null;
        }
        if (pendingSelectionActionFrame)
            return;
        pendingSelectionActionFrame = window.requestAnimationFrame(() => {
            pendingSelectionActionFrame = 0;
            updateSelectionAction(pendingSelectionAnchor);
            pendingSelectionAnchor = null;
        });
    }
    function updateSelectionAction(anchorPoint = null) {
        if (!overlay || overlay.dataset.open !== 'true' || !selectionActionButton || !contentRoot) {
            hideSelectionAction();
            return;
        }
        if (overlay.classList.contains('rm-settings-open') || isMediaModalOpen()) {
            hideSelectionAction();
            return;
        }
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            hideSelectionAction();
            return;
        }
        const range = selection.getRangeAt(0);
        if (!isRangeInsideContainer(range, contentRoot)) {
            hideSelectionAction();
            return;
        }
        const rects = range.getClientRects();
        const rect = rects && rects.length ? rects[rects.length - 1] : range.getBoundingClientRect();
        if (!rect || (!rect.width && !rect.height)) {
            hideSelectionAction();
            return;
        }
        selectionActionButton.classList.add('show');
        const buttonWidth = selectionActionButton.offsetWidth || 30;
        const buttonHeight = selectionActionButton.offsetHeight || 30;
        const margin = 8;
        const overlayWidth = overlay.clientWidth || window.innerWidth;
        const overlayHeight = overlay.clientHeight || window.innerHeight;
        const anchorX = anchorPoint && Number.isFinite(anchorPoint.x)
            ? anchorPoint.x
            : rect.left + (rect.width / 2);
        const anchorY = anchorPoint && Number.isFinite(anchorPoint.y)
            ? anchorPoint.y
            : rect.bottom;
        const cursorOffset = 4;
        const left = clamp(anchorX + cursorOffset, margin, overlayWidth - buttonWidth - margin);
        let top = anchorY + cursorOffset;
        if (top + buttonHeight > overlayHeight - margin) {
            top = anchorY - buttonHeight - cursorOffset;
        }
        top = clamp(top, margin, overlayHeight - buttonHeight - margin);
        selectionActionButton.style.left = `${Math.round(left)}px`;
        selectionActionButton.style.top = `${Math.round(top)}px`;
    }
    function hideSelectionAction() {
        if (!selectionActionButton)
            return;
        selectionActionButton.classList.remove('show');
        selectionActionButton.style.left = '';
        selectionActionButton.style.top = '';
    }
    function showHighlightDeleteAction(node, anchorPoint = null) {
        if (!highlightDeleteButton || !node || !overlay)
            return;
        const id = node.dataset.highlightId || '';
        if (!id)
            return;
        activeHighlightDeleteId = id;
        highlightDeleteButton.classList.add('show');
        const rect = node.getBoundingClientRect();
        const buttonWidth = highlightDeleteButton.offsetWidth || 64;
        const buttonHeight = highlightDeleteButton.offsetHeight || 30;
        const margin = 8;
        const overlayWidth = overlay.clientWidth || window.innerWidth;
        const overlayHeight = overlay.clientHeight || window.innerHeight;
        const anchorX = anchorPoint && Number.isFinite(anchorPoint.x)
            ? anchorPoint.x
            : rect.left + (rect.width / 2);
        const anchorY = anchorPoint && Number.isFinite(anchorPoint.y)
            ? anchorPoint.y
            : rect.bottom;
        const cursorOffset = 4;
        const left = clamp(anchorX + cursorOffset, margin, overlayWidth - buttonWidth - margin);
        let top = anchorY + cursorOffset;
        if (top + buttonHeight > overlayHeight - margin) {
            top = anchorY - buttonHeight - cursorOffset;
        }
        top = clamp(top, margin, overlayHeight - buttonHeight - margin);
        highlightDeleteButton.style.left = `${Math.round(left)}px`;
        highlightDeleteButton.style.top = `${Math.round(top)}px`;
    }
    function hideHighlightDeleteAction() {
        activeHighlightDeleteId = '';
        if (!highlightDeleteButton)
            return;
        highlightDeleteButton.classList.remove('show');
        highlightDeleteButton.style.left = '';
        highlightDeleteButton.style.top = '';
    }
    function findHighlightNodeById(id) {
        if (!id || !contentRoot)
            return null;
        const nodes = contentRoot.querySelectorAll('.rm-highlight');
        for (const node of nodes) {
            if (node.dataset.highlightId === id) {
                return node;
            }
        }
        return null;
    }
    function updateReadingMeta(progressPercent = 0) {
        if (!metaLine)
            return;
        const safePercent = Number.isFinite(progressPercent)
            ? Math.min(Math.max(Math.round(progressPercent), 0), 100)
            : 0;
        metaLine.textContent = `${NUMBER_FORMATTER.format(currentReadingStats.words)} words • ~${currentReadingStats.minutes} min read • ${safePercent}%`;
    }
    function updateReadingProgress() {
        if (!readerViewport) {
            updateReadingMeta(0);
            return;
        }
        const readerMax = readerViewport.scrollHeight - readerViewport.clientHeight;
        const ratio = readerMax > 0 ? Math.min(Math.max(readerViewport.scrollTop / readerMax, 0), 1) : 0;
        updateReadingMeta(ratio * 100);
    }
    function calculateReadingStats(root) {
        const text = normalizeText((root && root.textContent) || '');
        if (!text) {
            return { words: 0, minutes: 1 };
        }
        const words = text.split(/\s+/).filter(Boolean).length;
        return {
            words,
            minutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE))
        };
    }
    function isInputLikeElement(target) {
        if (!(target instanceof Element))
            return false;
        const tag = target.tagName.toUpperCase();
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')
            return true;
        return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
    }
    function onReaderScroll() {
        if (!readerViewport || overlay?.dataset.open !== 'true')
            return;
        hideSelectionAction();
        hideHighlightDeleteAction();
        updateReadingProgress();
        if (pendingPageScrollSync)
            return;
        pendingPageScrollSync = true;
        requestAnimationFrame(() => {
            pendingPageScrollSync = false;
            const readerMax = readerViewport.scrollHeight - readerViewport.clientHeight;
            const pageMax = document.documentElement.scrollHeight - window.innerHeight;
            if (readerMax <= 0 || pageMax <= 0)
                return;
            const progress = readerViewport.scrollTop / readerMax;
            window.scrollTo(0, Math.round(progress * pageMax));
            updateReadingProgress();
        });
    }
    function syncReaderFromPageScroll() {
        if (!readerViewport)
            return;
        requestAnimationFrame(() => {
            const readerMax = readerViewport.scrollHeight - readerViewport.clientHeight;
            const pageMax = document.documentElement.scrollHeight - window.innerHeight;
            if (readerMax <= 0 || pageMax <= 0) {
                readerViewport.scrollTop = 0;
                updateReadingProgress();
                return;
            }
            const progress = window.scrollY / pageMax;
            readerViewport.scrollTop = Math.round(progress * readerMax);
            updateReadingProgress();
            hideSelectionAction();
            hideHighlightDeleteAction();
        });
    }
    function extractArticle() {
        const source = pickMainContentRoot();
        const clone = source.cloneNode(true);
        pruneGlobalNoise(clone);
        stripPresentation(clone);
        removeInteractiveElements(clone);
        removeBoilerplateNodes(clone);
        removeTopMatterNoise(clone);
        unwrapSingleChildChains(clone);
        removeEmptyNodes(clone);
        return clone;
    }
    function pickMainContentRoot() {
        const candidates = getCandidateNodes();
        let best = null;
        let bestScore = -Infinity;
        candidates.forEach((node) => {
            const score = scoreContentCandidate(node);
            if (score > bestScore) {
                best = node;
                bestScore = score;
            }
        });
        const root = best || document.body;
        return shrinkToReadableSubtree(root);
    }
    function getCandidateNodes() {
        const selectors = [
            'article',
            'main',
            '[role="main"]',
            '#main',
            '#main-content',
            '#main-col-body',
            '#content',
            '#doc-content',
            '.content',
            '.main-content',
            '.article',
            '.post',
            '.entry-content',
            '.awsui-doc-content'
        ];
        const nodes = [];
        const seen = new Set();
        const add = (node) => {
            if (!node || seen.has(node))
                return;
            if (!node.isConnected)
                return;
            seen.add(node);
            nodes.push(node);
        };
        selectors.forEach((selector) => {
            document.querySelectorAll(selector).forEach(add);
        });
        if (document.body) {
            let inspected = 0;
            document.body.querySelectorAll('article, main, section, div').forEach((node) => {
                if (inspected >= 1200)
                    return;
                inspected += 1;
                const textLen = normalizeText(node.textContent || '').length;
                if (textLen < 220)
                    return;
                add(node);
            });
        }
        if (!nodes.length && document.body) {
            nodes.push(document.body);
        }
        return nodes;
    }
    function scoreContentCandidate(node) {
        if (!node)
            return -Infinity;
        const textLen = normalizeText(node.textContent || '').length;
        if (textLen < 180)
            return -Infinity;
        const linkTextLen = getLinkTextLength(node);
        const linkRatio = linkTextLen / Math.max(textLen, 1);
        const paragraphCount = node.querySelectorAll('p').length;
        const headingCount = node.querySelectorAll('h1, h2, h3').length;
        const preCount = node.querySelectorAll('pre').length;
        const tableCount = node.querySelectorAll('table').length;
        const listCount = node.querySelectorAll('ul, ol').length;
        const mediaCount = node.querySelectorAll('img, figure').length;
        let score = textLen;
        score -= linkTextLen * 1.35;
        score += paragraphCount * 90;
        score += headingCount * 45;
        score += preCount * 80;
        score += tableCount * 55;
        score += mediaCount * 25;
        score -= listCount * 12;
        const tag = node.tagName ? node.tagName.toLowerCase() : '';
        if (tag === 'article')
            score += 260;
        if (tag === 'main')
            score += 220;
        if (tag === 'section')
            score += 60;
        if (tag === 'body')
            score -= 220;
        const idClass = `${node.id || ''} ${node.className || ''}`.toLowerCase();
        if (/(article|content|main|post|entry|read|doc)/.test(idClass)) {
            score += 180;
        }
        if (/(nav|menu|sidebar|toc|footer|header|breadcrumb|related|share|social|promo|advert|ads?)/.test(idClass)) {
            score -= 300;
        }
        if (linkRatio > 0.72) {
            score -= 320;
        }
        if (paragraphCount === 0 && preCount === 0 && tableCount === 0) {
            score -= 120;
        }
        return score;
    }
    function shrinkToReadableSubtree(root) {
        if (!root)
            return document.body;
        let current = root;
        for (let i = 0; i < 6; i += 1) {
            const textLen = normalizeText(current.textContent || '').length;
            if (!textLen)
                break;
            const children = Array.from(current.children).filter((child) => {
                const childTextLen = normalizeText(child.textContent || '').length;
                return childTextLen >= 90;
            });
            if (children.length !== 1)
                break;
            const onlyChild = children[0];
            const childLen = normalizeText(onlyChild.textContent || '').length;
            if (childLen / textLen < 0.85)
                break;
            current = onlyChild;
        }
        return current;
    }
    function pruneGlobalNoise(root) {
        if (!root || !root.querySelectorAll)
            return;
        const removeSelectors = [
            '#rm-overlay',
            'script',
            'style',
            'noscript',
            '[hidden]',
            '[aria-hidden="true"]',
            'nav',
            'header',
            'footer',
            'aside',
            '[role="navigation"]',
            '[role="search"]',
            '.toc',
            '.table-of-contents',
            '.contents',
            '.breadcrumbs',
            '.breadcrumb',
            '.sidebar',
            '.related',
            '.related-links',
            '.share',
            '.social',
            '.newsletter',
            '.advertisement',
            '.ads',
            '.promo',
            '.pagination',
            '#leftNav',
            '#rightNav',
            '.awsui-toc',
            '.awsdocs-toc',
            '.awsdocs-nav',
            '.awsdocs-feedback'
        ];
        removeSelectors.forEach((selector) => {
            root.querySelectorAll(selector).forEach((node) => node.remove());
        });
    }
    function removeBoilerplateNodes(root) {
        if (!root || !root.querySelectorAll)
            return;
        const nodes = Array.from(root.querySelectorAll('section, div, ul, ol, p, table'));
        nodes.reverse();
        nodes.forEach((node) => {
            if (node === root)
                return;
            if (shouldPruneBoilerplateNode(node)) {
                node.remove();
            }
        });
    }
    function shouldPruneBoilerplateNode(node) {
        if (!node || !node.tagName)
            return false;
        if (node.querySelector('pre, code, blockquote'))
            return false;
        if (node.tagName.toLowerCase() === 'table' && node.querySelectorAll('tr').length > 1)
            return false;
        const textLen = normalizeText(node.textContent || '').length;
        const anchorCount = node.querySelectorAll('a').length;
        const paragraphCount = node.querySelectorAll('p').length;
        const headingCount = node.querySelectorAll('h1, h2, h3, h4').length;
        const mediaCount = node.querySelectorAll('img, picture, figure, video').length;
        const linkRatio = getAnchorTextRatio(node);
        const idClass = `${node.id || ''} ${node.className || ''}`.toLowerCase();
        if (mediaCount > 0 && anchorCount <= 4)
            return false;
        if (textLen === 0)
            return true;
        if (textLen < 40 && anchorCount >= 2)
            return true;
        if (anchorCount >= 12 && paragraphCount === 0 && headingCount <= 1)
            return true;
        if (linkRatio > 0.68 && textLen < 900)
            return true;
        if (/(toc|table[-_ ]?of[-_ ]?contents|breadcrumb|related|footer|header|sidebar|share|social|promo|advert|ads?)/.test(idClass) && textLen < 1400) {
            return true;
        }
        return false;
    }
    function unwrapSingleChildChains(root) {
        if (!root || !root.children || root.children.length !== 1)
            return;
        let current = root;
        for (let i = 0; i < 4; i += 1) {
            const child = current.children && current.children[0];
            if (!child)
                break;
            if (current.children.length !== 1)
                break;
            if (!['DIV', 'SECTION', 'MAIN', 'ARTICLE'].includes(child.tagName))
                break;
            const childTextLen = normalizeText(child.textContent || '').length;
            if (childTextLen < 120)
                break;
            current = child;
        }
        if (current !== root) {
            root.innerHTML = current.innerHTML;
        }
    }
    function removeEmptyNodes(root) {
        if (!root || !root.querySelectorAll)
            return;
        const nodes = Array.from(root.querySelectorAll('div, section, article, p, li'));
        nodes.reverse();
        nodes.forEach((node) => {
            if (node === root)
                return;
            if (node.children.length > 0)
                return;
            const text = normalizeText(node.textContent || '');
            if (!text) {
                node.remove();
            }
        });
    }
    function normalizeMedia(container) {
        container.querySelectorAll('img').forEach((img) => {
            const src = img.getAttribute('src');
            if (!src)
                return;
            img.removeAttribute('width');
            img.removeAttribute('height');
            img.removeAttribute('sizes');
            img.classList.add('rm-zoomable-media');
            try {
                const abs = new URL(src, window.location.href).href;
                img.setAttribute('src', abs);
            }
            catch (err) {
                // ignore invalid URLs
            }
        });
        container.querySelectorAll('picture, figure').forEach((node) => {
            node.classList.add('rm-zoomable-media');
        });
        container.querySelectorAll('a').forEach((anchor) => {
            const href = anchor.getAttribute('href');
            if (!href || href.startsWith('#'))
                return;
            try {
                const abs = new URL(href, window.location.href).href;
                anchor.setAttribute('href', abs);
            }
            catch (err) {
                // ignore invalid URLs
            }
        });
    }
    function enhanceCodeBlocks(container) {
        container.querySelectorAll('pre').forEach((pre) => {
            if (pre.parentElement && pre.parentElement.tagName === 'CODE' && pre.parentElement.childElementCount === 1) {
                pre.parentElement.replaceWith(pre);
            }
            pre.classList.add('rm-code-block');
            const shell = ensureCodeShell(pre);
            const raw = extractCodeText(pre);
            let code = pre.querySelector(':scope > code');
            if (!code) {
                code = document.createElement('code');
                pre.textContent = '';
                pre.appendChild(code);
            }
            code.textContent = raw;
            const language = detectCodeLanguage(raw);
            pre.dataset.lang = language;
            if (raw.length) {
                code.innerHTML = highlightCode(raw, language);
            }
            const copyButton = ensureCopyButton(shell);
            copyButton.onclick = () => {
                navigator.clipboard.writeText(raw).then(() => {
                    setCopyButtonState(copyButton, true);
                    window.clearTimeout(copyButton._resetTimer);
                    copyButton._resetTimer = window.setTimeout(() => {
                        setCopyButtonState(copyButton, false);
                    }, 1200);
                }).catch(() => {
                    showToast('Copy failed.');
                });
            };
        });
    }
    function ensureCodeShell(pre) {
        const parent = pre.parentElement;
        if (parent && parent.classList.contains('rm-code-shell')) {
            return parent;
        }
        const shell = document.createElement('div');
        shell.className = 'rm-code-shell';
        pre.replaceWith(shell);
        shell.appendChild(pre);
        return shell;
    }
    function ensureCopyButton(shell) {
        let button = shell.querySelector(':scope > .rm-copy');
        if (!button) {
            button = document.createElement('button');
            button.type = 'button';
            button.className = 'rm-copy';
            shell.appendChild(button);
        }
        setCopyButtonState(button, false);
        return button;
    }
    function setCopyButtonState(button, isCopied) {
        if (!button)
            return;
        button.classList.toggle('is-copied', Boolean(isCopied));
        button.setAttribute('aria-label', isCopied ? 'Copied' : 'Copy code block');
        button.setAttribute('title', isCopied ? 'Copied' : 'Copy');
        button.textContent = '';
    }
    function extractCodeText(pre) {
        if (!pre)
            return '';
        const rowsText = extractLineNumberedRowsText(pre);
        if (rowsText !== null) {
            return normalizeCodeText(rowsText);
        }
        return normalizeCodeText(pre.textContent || '');
    }
    function extractLineNumberedRowsText(pre) {
        const rows = Array.from(pre.children).filter((child) => child.tagName !== 'BUTTON');
        if (rows.length < 2)
            return null;
        const lines = [];
        let numberedRows = 0;
        let sequentialRows = 0;
        let expectedLineNumber = null;
        for (const row of rows) {
            const parsed = parseLineNumberedCodeRow(row);
            if (!parsed) {
                return null;
            }
            lines.push(parsed.code);
            if (Number.isFinite(parsed.lineNumber)) {
                numberedRows += 1;
                if (expectedLineNumber === null || parsed.lineNumber === expectedLineNumber) {
                    sequentialRows += 1;
                }
                expectedLineNumber = parsed.lineNumber + 1;
            }
            else {
                expectedLineNumber = null;
            }
        }
        const hasMostlyNumberedRows = numberedRows >= 2 && (numberedRows / rows.length) >= 0.6;
        const numbersMostlySequential = numberedRows > 0 && (sequentialRows / numberedRows) >= 0.6;
        if (!hasMostlyNumberedRows || !numbersMostlySequential) {
            return null;
        }
        return lines.join('\n');
    }
    function parseLineNumberedCodeRow(row) {
        if (!row || row.nodeType !== Node.ELEMENT_NODE)
            return null;
        const cells = Array.from(row.children);
        if (!cells.length)
            return null;
        if (cells.length >= 2) {
            const maybeLineNumber = compactText(cells[0].textContent || '');
            const candidateCodeCells = cells.slice(1);
            const codeCell = candidateCodeCells.reduce((best, cell) => {
                const bestLen = best ? (best.textContent || '').length : -1;
                const cellLen = (cell.textContent || '').length;
                return cellLen > bestLen ? cell : best;
            }, null);
            if (isLikelyLineNumber(maybeLineNumber)) {
                return {
                    lineNumber: Number(maybeLineNumber),
                    code: codeCell ? (codeCell.textContent || '') : ''
                };
            }
        }
        const text = row.textContent || '';
        const compact = compactText(text);
        if (!compact || isLikelyLineNumber(compact))
            return null;
        return {
            lineNumber: null,
            code: text
        };
    }
    function compactText(text) {
        return (text || '').replace(/\s+/g, ' ').trim();
    }
    function isLikelyLineNumber(text) {
        return /^\d{1,6}$/.test((text || '').trim());
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
        const labelRegex = new RegExp(`^\\s*(${Object.values(labels).join('|')})\\s*[:\\-–—]?\\s*`, 'i');
        container.querySelectorAll('p').forEach((para) => {
            if (para.closest('pre') || para.closest('code'))
                return;
            const firstChild = para.firstElementChild;
            let label = null;
            if (firstChild && ['STRONG', 'B', 'SPAN'].includes(firstChild.tagName)) {
                const text = (firstChild.textContent || '').trim();
                const match = text.match(labelRegex);
                if (match) {
                    label = match[1];
                }
            }
            else {
                const text = (para.textContent || '').trim();
                const match = text.match(labelRegex);
                if (match) {
                    label = match[1];
                }
            }
            if (!label)
                return;
            const normalized = label.toLowerCase();
            if (!labels[normalized])
                return;
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
            }
            else {
                clonedPara.textContent = clonedPara.textContent.replace(labelRegex, '');
            }
            body.appendChild(clonedPara);
            callout.appendChild(title);
            callout.appendChild(body);
            para.replaceWith(callout);
        });
        container.querySelectorAll('div, section, aside').forEach((box) => {
            if (box.classList.contains('rm-callout'))
                return;
            const first = box.firstElementChild;
            if (!first)
                return;
            const labelText = (first.textContent || '').trim();
            const match = labelText.match(labelRegex);
            if (!match || labelText.length > 20)
                return;
            const normalized = match[1].toLowerCase();
            if (!labels[normalized])
                return;
            if (box.textContent.trim().length <= match[1].length + 2)
                return;
            const callout = document.createElement('div');
            callout.className = `rm-callout rm-callout-${normalized}`;
            const title = document.createElement('div');
            title.className = 'rm-callout-title';
            title.textContent = labels[normalized];
            const body = document.createElement('div');
            body.className = 'rm-callout-body';
            box.childNodes.forEach((node, index) => {
                if (index === 0)
                    return;
                body.appendChild(node.cloneNode(true));
            });
            callout.appendChild(title);
            callout.appendChild(body);
            box.replaceWith(callout);
        });
    }
    function highlightCode(raw, language = 'plain') {
        TOKEN_REGEX.lastIndex = 0;
        let result = '';
        let lastIndex = 0;
        let match;
        while ((match = TOKEN_REGEX.exec(raw)) !== null) {
            const token = match[0];
            result += escapeHtml(raw.slice(lastIndex, match.index));
            const cls = classifyToken(token, language);
            if (cls === 'plain') {
                result += escapeHtml(token);
            }
            else {
                result += `<span class="rm-token rm-${cls}">${escapeHtml(token)}</span>`;
            }
            lastIndex = match.index + token.length;
        }
        result += escapeHtml(raw.slice(lastIndex));
        return result;
    }
    function classifyToken(token, language) {
        if (token.startsWith('/*') ||
            token.startsWith('//') ||
            token.startsWith('#') ||
            token.startsWith('--')) {
            return 'comment';
        }
        if (token.startsWith('"') || token.startsWith("'") || token.startsWith('`')) {
            return 'string';
        }
        if (token.startsWith('@')) {
            return 'decorator';
        }
        if (/^\d/.test(token)) {
            return 'number';
        }
        const lowered = token.toLowerCase();
        if (BUILTIN_LITERALS.has(lowered)) {
            return 'builtin';
        }
        if (isLanguageKeyword(token, language)) {
            return 'keyword';
        }
        return 'plain';
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
        if (!root || !root.querySelectorAll)
            return;
        if (root.removeAttribute) {
            root.removeAttribute('class');
            root.removeAttribute('style');
            root.removeAttribute('tabindex');
            root.removeAttribute('contenteditable');
            root.removeAttribute('data-nextjs-scroll-focus-boundary');
        }
        root.querySelectorAll('*').forEach((node) => {
            node.removeAttribute('class');
            node.removeAttribute('style');
            node.removeAttribute('tabindex');
            node.removeAttribute('contenteditable');
            node.removeAttribute('data-nextjs-scroll-focus-boundary');
            node.removeAttribute('autofocus');
        });
    }
    function removeInteractiveElements(root) {
        if (!root || !root.querySelectorAll)
            return;
        root.querySelectorAll('button, input, select, textarea, label, form').forEach((node) => {
            node.remove();
        });
        root.querySelectorAll('[role="button"]').forEach((node) => {
            node.remove();
        });
    }
    function removeTopMatterNoise(root) {
        if (!root || !root.querySelector)
            return;
        const heading = root.querySelector('h1');
        if (!heading)
            return;
        let node = heading.nextElementSibling;
        let scanned = 0;
        while (node && scanned < 16) {
            const next = node.nextElementSibling;
            if (isLikelyBodyStart(node)) {
                break;
            }
            if (isLikelyNoiseBlock(node)) {
                node.remove();
            }
            scanned += 1;
            node = next;
        }
    }
    function isLikelyBodyStart(node) {
        if (!node || !node.tagName)
            return false;
        const tag = node.tagName.toUpperCase();
        if (tag === 'H2' || tag === 'H3' || tag === 'H4')
            return true;
        const text = normalizeText(node.textContent || '');
        if (!text)
            return false;
        const linkRatio = getAnchorTextRatio(node);
        if (tag === 'P' && text.length >= 90 && linkRatio < 0.45)
            return true;
        return text.length >= 160 && linkRatio < 0.45;
    }
    function isLikelyNoiseBlock(node) {
        if (!node)
            return false;
        const text = normalizeText(node.textContent || '').toLowerCase();
        if (!text)
            return true;
        const anchorCount = node.querySelectorAll('a').length;
        const linkRatio = getAnchorTextRatio(node);
        if ((text === 'pdf' || text === 'rss' || text === 'focus mode' || text === 'pdf rss focus mode')) {
            return true;
        }
        if (text.includes('focus mode') && text.length <= 40) {
            return true;
        }
        if (anchorCount >= 5 && linkRatio > 0.65) {
            return true;
        }
        if (anchorCount >= 10) {
            return true;
        }
        return false;
    }
    function getAnchorTextRatio(node) {
        const total = normalizeText(node.textContent || '').length;
        if (!total)
            return 0;
        let anchorChars = 0;
        node.querySelectorAll('a').forEach((anchor) => {
            anchorChars += normalizeText(anchor.textContent || '').length;
        });
        return anchorChars / total;
    }
    function getLinkTextLength(node) {
        let total = 0;
        if (!node || !node.querySelectorAll)
            return total;
        node.querySelectorAll('a').forEach((anchor) => {
            total += normalizeText(anchor.textContent || '').length;
        });
        return total;
    }
    function normalizeCodeText(text) {
        if (!text)
            return '';
        return text
            .replace(/\r\n?/g, '\n')
            .replace(/\u00a0/g, ' ')
            .replace(/^\n+|\n+$/g, '');
    }
    function detectCodeLanguage(raw) {
        const sample = raw.slice(0, 3500);
        if (!sample.trim())
            return 'plain';
        if (looksLikeJson(sample))
            return 'json';
        if (/\b(def|class|import|from|elif|lambda|print)\b/.test(sample) || /:\s*\n\s+/.test(sample)) {
            return 'python';
        }
        if (/\b(function|const|let|var|import|export|return|=>)\b/.test(sample)) {
            return 'javascript';
        }
        if (/^\s*(select|insert|update|delete|create|alter|drop|with)\b/im.test(sample)) {
            return 'sql';
        }
        if (/^\s*#!/.test(sample) || /\b(curl|aws|kubectl|docker|npm|yarn|pip|bash|sh)\b/.test(sample)) {
            return 'bash';
        }
        return 'plain';
    }
    function looksLikeJson(sample) {
        const trimmed = sample.trim();
        if (!trimmed)
            return false;
        if (!(trimmed.startsWith('{') || trimmed.startsWith('[')))
            return false;
        try {
            JSON.parse(trimmed);
            return true;
        }
        catch (err) {
            return false;
        }
    }
    function isLanguageKeyword(token, language) {
        const languageSet = KEYWORDS_BY_LANGUAGE[language];
        if (!languageSet)
            return false;
        if (language === 'sql') {
            return languageSet.has(token.toLowerCase());
        }
        return languageSet.has(token);
    }
    function normalizeTheme(theme) {
        return theme === 'dark' ? 'dark' : 'light';
    }
    function normalizeSettings(values) {
        const merged = { ...DEFAULT_SETTINGS, ...values };
        const theme = normalizeTheme(merged.readerTheme);
        merged.readerTheme = theme;
        merged.codeTheme = theme;
        merged.toggleShortcut = normalizeShortcut(merged.toggleShortcut);
        return merged;
    }
    function setThemeButtons(lightButton, darkButton, theme) {
        const isLight = theme === 'light';
        const isDark = theme === 'dark';
        lightButton.classList.toggle('active', isLight);
        darkButton.classList.toggle('active', isDark);
        lightButton.setAttribute('aria-pressed', isLight ? 'true' : 'false');
        darkButton.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    }
    function populateSelect(selectElement, choices, currentValue) {
        if (!selectElement)
            return;
        const options = [...choices];
        if (!options.some((item) => item.value === currentValue)) {
            options.push({ label: 'Custom', value: currentValue });
        }
        selectElement.innerHTML = options
            .map((item) => `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`)
            .join('');
        selectElement.value = currentValue;
    }
    function getDefaultToggleShortcut() {
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
    function isMacOS() {
        return /Mac|iPhone|iPad|iPod/.test(navigator.platform || '');
    }
    function normalizeShortcut(shortcut) {
        const base = getDefaultToggleShortcut();
        if (!shortcut || typeof shortcut !== 'object')
            return base;
        const key = normalizeShortcutKey(shortcut.key);
        if (!key)
            return base;
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
                // Keep mac default on Option+R and avoid browser reload conflicts.
                normalized.metaKey = false;
                normalized.ctrlKey = false;
                normalized.altKey = true;
            }
        }
        return normalized;
    }
    function eventToShortcut(event) {
        const key = normalizeShortcutKey(event.key);
        if (!key)
            return null;
        if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta')
            return null;
        return {
            key,
            ctrlKey: Boolean(event.ctrlKey),
            altKey: Boolean(event.altKey),
            shiftKey: Boolean(event.shiftKey),
            metaKey: Boolean(event.metaKey)
        };
    }
    function normalizeShortcutKey(key) {
        if (!key || typeof key !== 'string')
            return '';
        if (key.length === 1)
            return key.toLowerCase();
        const alias = {
            ' ': 'Space',
            Spacebar: 'Space',
            Esc: 'Escape',
            Del: 'Delete'
        };
        return alias[key] || key;
    }
    function formatShortcut(shortcut) {
        const value = normalizeShortcut(shortcut);
        const mac = isMacOS();
        const parts = [];
        if (value.ctrlKey)
            parts.push(mac ? '^' : 'Ctrl');
        if (value.altKey)
            parts.push(mac ? 'Option' : 'Alt');
        if (value.shiftKey)
            parts.push('Shift');
        if (value.metaKey)
            parts.push(mac ? 'Cmd' : 'Meta');
        parts.push(formatShortcutKeyForDisplay(value.key));
        return parts.join('+');
    }
    function formatShortcutKeyForDisplay(key) {
        if (!key)
            return '';
        if (key.length === 1)
            return key.toUpperCase();
        return key;
    }
    function shortcutMatchesEvent(shortcut, event) {
        const value = normalizeShortcut(shortcut);
        if (Boolean(event.ctrlKey) !== value.ctrlKey)
            return false;
        if (Boolean(event.altKey) !== value.altKey)
            return false;
        if (Boolean(event.shiftKey) !== value.shiftKey)
            return false;
        if (Boolean(event.metaKey) !== value.metaKey)
            return false;
        const key = normalizeShortcutKey(event.key);
        return key === value.key;
    }
    function setToolbarButtonIcon(button, iconName) {
        if (!button)
            return;
        button.innerHTML = getToolbarIconMarkup(iconName);
    }
    function getToolbarIconMarkup(iconName) {
        switch (iconName) {
            case 'settings':
                return `
          <svg class="rm-toolbar-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.6 1.6 0 0 0 .32 1.78l.06.06a2 2 0 0 1 0 2.82 2 2 0 0 1-2.82 0l-.06-.06a1.6 1.6 0 0 0-1.78-.32 1.6 1.6 0 0 0-.98 1.47V21a2 2 0 0 1-4 0v-.09a1.6 1.6 0 0 0-.98-1.47 1.6 1.6 0 0 0-1.78.32l-.06.06a2 2 0 0 1-2.82 0 2 2 0 0 1 0-2.82l.06-.06a1.6 1.6 0 0 0 .32-1.78 1.6 1.6 0 0 0-1.47-.98H3a2 2 0 0 1 0-4h.09a1.6 1.6 0 0 0 1.47-.98 1.6 1.6 0 0 0-.32-1.78l-.06-.06a2 2 0 0 1 0-2.82 2 2 0 0 1 2.82 0l.06.06a1.6 1.6 0 0 0 1.78.32 1.6 1.6 0 0 0 .98-1.47V3a2 2 0 0 1 4 0v.09a1.6 1.6 0 0 0 .98 1.47 1.6 1.6 0 0 0 1.78-.32l.06-.06a2 2 0 0 1 2.82 0 2 2 0 0 1 0 2.82l-.06.06a1.6 1.6 0 0 0-.32 1.78 1.6 1.6 0 0 0 1.47.98H21a2 2 0 0 1 0 4h-.09a1.6 1.6 0 0 0-1.47.98z"></path>
          </svg>
        `;
            case 'highlight':
                return `
          <svg class="rm-toolbar-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M5 16l8-8 4 4-8 8H5z"></path>
            <path d="M13 8l4 4"></path>
            <path d="M3 21h7"></path>
          </svg>
        `;
            case 'close':
            default:
                return `
          <svg class="rm-toolbar-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6L6 18"></path>
          </svg>
        `;
        }
    }
    function normalizeText(value) {
        return value.replace(/\s+/g, ' ').trim();
    }
    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    function capitalize(value) {
        if (!value)
            return '';
        return value.charAt(0).toUpperCase() + value.slice(1);
    }
})();
