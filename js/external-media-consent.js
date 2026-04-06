document.addEventListener("DOMContentLoaded", () => {
  const wrappers = Array.from(document.querySelectorAll(".external-media-consent"));

  const lang = (document.documentElement.lang || "fi").toLowerCase().startsWith("en") ? "en" : "fi";
  const messages = {
    fi: {
      text: "Tämä sisältö ladataan ulkoisesta palvelusta, joka voi asettaa evästeitä tai kerätä tietoja.",
      loadOne: "Lataa sisältö",
      allowAll: "Salli kaikki ulkoiset upotukset",
      resetConsent: "Peruuta ulkoisten upotusten lupa",
      resetDone: "Ulkoisten upotusten lupa on poistettu.",
    },
    en: {
      text: "This content is loaded from an external service that may set cookies or collect data.",
      loadOne: "Load content",
      allowAll: "Allow all external embeds",
      resetConsent: "Revoke external embed consent",
      resetDone: "External embed consent has been removed.",
    },
  };
  const ui = messages[lang];
  const consentKey = "external_media_consent";
  let hasGlobalConsent = false;
  try {
    hasGlobalConsent = localStorage.getItem(consentKey) === "accepted";
  } catch (_) {
    hasGlobalConsent = false;
  }

  function loadWrapper(wrapper) {
    const iframe = wrapper.querySelector("iframe[data-consent-src]");
    const notice = wrapper.querySelector("[data-external-media-notice]");
    if (!iframe) return;
    if (!iframe.getAttribute("src")) {
      iframe.setAttribute("src", iframe.getAttribute("data-consent-src"));
    }
    iframe.hidden = false;
    if (notice) notice.hidden = true;
  }

  function loadAllAndPersist() {
    try {
      localStorage.setItem(consentKey, "accepted");
    } catch (_) { }
    wrappers.forEach(loadWrapper);
  }

  function revokeConsent() {
    try {
      localStorage.removeItem(consentKey);
    } catch (_) { }
    wrappers.forEach((wrapper) => {
      const iframe = wrapper.querySelector("iframe[data-consent-src]");
      const notice = wrapper.querySelector("[data-external-media-notice]");
      if (iframe) {
        iframe.removeAttribute("src");
        iframe.hidden = true;
      }
      if (notice) notice.hidden = false;
    });
  }

  const resetButtons = Array.from(document.querySelectorAll("[data-external-media-reset]"));
  resetButtons.forEach((btn) => {
    if (!btn.textContent.trim()) btn.textContent = ui.resetConsent;
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      revokeConsent();
      const status = btn.parentElement?.querySelector("[data-external-media-reset-status]");
      if (status) status.textContent = ui.resetDone;
    });
  });

  if (wrappers.length === 0) return;

  wrappers.forEach((wrapper) => {
    const textEl = wrapper.querySelector("[data-external-media-text]");
    const loadBtn = wrapper.querySelector("[data-external-media-load]");
    const allowAllBtn = wrapper.querySelector("[data-external-media-allow-all]");

    if (textEl) textEl.textContent = ui.text;
    if (loadBtn) {
      loadBtn.textContent = ui.loadOne;
      loadBtn.addEventListener("click", () => loadWrapper(wrapper));
    }
    if (allowAllBtn) {
      allowAllBtn.textContent = ui.allowAll;
      allowAllBtn.addEventListener("click", loadAllAndPersist);
    }
  });

  if (hasGlobalConsent) {
    wrappers.forEach(loadWrapper);
  }
});
