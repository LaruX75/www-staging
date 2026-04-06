document.addEventListener('DOMContentLoaded', () => {
    // Oletusasetukset
    const defaultSettings = {
        textSize: 'normal', // normal, large, xlarge
        highContrast: false,
        reducedMotion: false,
        dyslexiaFont: false
    };

    // Lataa asetukset tai käytä oletuksia
    let a11ySettings;
    try {
        const stored = localStorage.getItem('a11y-settings');
        a11ySettings = stored ? JSON.parse(stored) : { ...defaultSettings };
    } catch (e) {
        a11ySettings = { ...defaultSettings };
    }

    // DOM elementit
    const textSizeSelect = document.getElementById('a11yTextSize');
    const highContrastToggle = document.getElementById('a11yHighContrast');
    const reducedMotionToggle = document.getElementById('a11yReducedMotion');
    const dyslexiaFontToggle = document.getElementById('a11yDyslexiaFont');

    // Set initial states in UI
    if (textSizeSelect) textSizeSelect.value = a11ySettings.textSize || 'normal';
    if (highContrastToggle) highContrastToggle.checked = !!a11ySettings.highContrast;
    if (reducedMotionToggle) reducedMotionToggle.checked = !!a11ySettings.reducedMotion;
    if (dyslexiaFontToggle) dyslexiaFontToggle.checked = !!a11ySettings.dyslexiaFont;

    // Tallennus ja päivitys
    const saveAndApply = () => {
        localStorage.setItem('a11y-settings', JSON.stringify(a11ySettings));
        applyA11ySettings(a11ySettings);
    };

    // Event listenerit kytkimille
    if (textSizeSelect) {
        textSizeSelect.addEventListener('change', (e) => {
            a11ySettings.textSize = e.target.value;
            saveAndApply();
        });
    }

    if (highContrastToggle) {
        highContrastToggle.addEventListener('change', (e) => {
            a11ySettings.highContrast = e.target.checked;
            saveAndApply();
        });
    }

    if (reducedMotionToggle) {
        reducedMotionToggle.addEventListener('change', (e) => {
            a11ySettings.reducedMotion = e.target.checked;
            saveAndApply();
        });
    }

    if (dyslexiaFontToggle) {
        dyslexiaFontToggle.addEventListener('change', (e) => {
            a11ySettings.dyslexiaFont = e.target.checked;
            saveAndApply();
        });
    }

    // Palautuspainike
    const resetBtn = document.getElementById('a11yResetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            a11ySettings = { ...defaultSettings };
            if (textSizeSelect) textSizeSelect.value = 'normal';
            if (highContrastToggle) highContrastToggle.checked = false;
            if (reducedMotionToggle) reducedMotionToggle.checked = false;
            if (dyslexiaFontToggle) dyslexiaFontToggle.checked = false;
            saveAndApply();
        });
    }
});
