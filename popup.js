(() => {
  const SPEEDS = [1.0, 1.25, 1.5, 1.6, 1.75, 2.0];
  const MAX_SAVED_PAGES = 500;
  const FALLBACK_SPEED = 1.5;

  const t = (key, subs) => browser.i18n.getMessage(key, subs) || key;

  document.documentElement.lang = browser.i18n.getUILanguage();
  document.documentElement.dir = browser.i18n.getMessage("@@bidi_dir") || "ltr";
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const msg = browser.i18n.getMessage(el.dataset.i18n);
    if (msg) el.textContent = msg;
  });

  const activeBadge = document.getElementById("activeBadge");
  const pageSubtitle = document.getElementById("pageSubtitle");
  const resetPageBtn = document.getElementById("resetPageBtn");
  const pageSpeedGrid = document.getElementById("pageSpeedGrid");
  const notYoutubeHint = document.getElementById("notYoutubeHint");
  const defaultSpeedGrid = document.getElementById("defaultSpeedGrid");
  const footerBar = document.getElementById("footerBar");
  const savedCountText = document.getElementById("savedCountText");
  const clearAllBtn = document.getElementById("clearAllBtn");

  let currentTab = null;
  let currentPageKey = null;
  let defaultSpeed = FALLBACK_SPEED;
  let pageSpeeds = {};

  function getPageKey(urlString) {
    try {
      const url = new URL(urlString);
      const host = url.hostname.toLowerCase();
      if (
        host !== "youtube.com" &&
        host !== "www.youtube.com" &&
        host !== "m.youtube.com"
      ) {
        return null;
      }
      if (url.pathname === "/watch") {
        const v = url.searchParams.get("v");
        if (v) return `watch:${v}`;
      }
      if (url.pathname.startsWith("/shorts/")) {
        const id = url.pathname.split("/")[2];
        if (id) return `shorts:${id}`;
      }
      if (url.pathname.startsWith("/live/")) {
        const id = url.pathname.split("/")[2];
        if (id) return `live:${id}`;
      }
      return `path:${url.pathname}`;
    } catch {
      return null;
    }
  }

  function formatSpeed(speed) {
    return `${Number(speed)}×`;
  }

  function prunePages(map) {
    const entries = Object.entries(map);
    if (entries.length <= MAX_SAVED_PAGES) return map;
    entries.sort((a, b) => (b[1]?.updatedAt || 0) - (a[1]?.updatedAt || 0));
    return Object.fromEntries(entries.slice(0, MAX_SAVED_PAGES));
  }

  async function notifyCurrentTab() {
    if (!currentTab || !currentTab.id || !currentPageKey) return;
    try {
      await browser.tabs.sendMessage(currentTab.id, { type: "APPLY_SPEED" });
    } catch {
      // Вкладка могла ещё не загрузить скрипт
    }
  }

  function render() {
    const savedForPage = currentPageKey ? pageSpeeds[currentPageKey]?.speed : null;
    const effectiveSpeed = typeof savedForPage === "number" ? savedForPage : defaultSpeed;

    activeBadge.textContent = formatSpeed(effectiveSpeed);

    // Блок "Эта страница"
    if (!currentPageKey) {
      pageSubtitle.textContent = t("notOnYoutube");
      pageSpeedGrid.classList.add("hidden");
      resetPageBtn.classList.add("hidden");
      notYoutubeHint.classList.remove("hidden");
    } else {
      notYoutubeHint.classList.add("hidden");
      pageSpeedGrid.classList.remove("hidden");

      const cleanTitle = (currentTab?.title || "").replace(/\s*-\s*YouTube$/, "");
      if (typeof savedForPage === "number") {
        pageSubtitle.textContent = cleanTitle
          ? `${t("savedPrefix")} • ${cleanTitle}`
          : t("savedForPage");
        resetPageBtn.classList.remove("hidden");
      } else {
        pageSubtitle.textContent = cleanTitle
          ? `${t("defaultPrefix")} • ${cleanTitle}`
          : t("usingDefault");
        resetPageBtn.classList.add("hidden");
      }

      pageSpeedGrid.textContent = "";
      SPEEDS.forEach((speed) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "speed-btn";
        if (savedForPage === speed) btn.classList.add("active");
        btn.textContent = formatSpeed(speed);
        btn.addEventListener("click", () => setPageSpeed(speed));
        pageSpeedGrid.appendChild(btn);
      });
    }

    // Блок "По умолчанию"
    defaultSpeedGrid.textContent = "";
    SPEEDS.forEach((speed) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "speed-btn";
      if (defaultSpeed === speed) btn.classList.add("active");
      btn.textContent = formatSpeed(speed);
      btn.addEventListener("click", () => setDefaultSpeed(speed));
      defaultSpeedGrid.appendChild(btn);
    });

    // Подвал со счётчиком сохранённых страниц
    const totalSaved = Object.keys(pageSpeeds).length;
    if (totalSaved > 0) {
      footerBar.classList.remove("hidden");
      savedCountText.textContent = t("savedCount", [String(totalSaved)]);
    } else {
      footerBar.classList.add("hidden");
    }
  }

  async function setPageSpeed(speed) {
    if (!currentPageKey) return;
    pageSpeeds[currentPageKey] = {
      speed,
      updatedAt: Date.now()
    };
    pageSpeeds = prunePages(pageSpeeds);
    await browser.storage.local.set({ pageSpeeds });
    render();
    await notifyCurrentTab();
  }

  async function resetPageSpeed() {
    if (!currentPageKey || !pageSpeeds[currentPageKey]) return;
    delete pageSpeeds[currentPageKey];
    await browser.storage.local.set({ pageSpeeds });
    render();
    await notifyCurrentTab();
  }

  async function setDefaultSpeed(speed) {
    defaultSpeed = speed;
    await browser.storage.local.set({ defaultSpeed });
    render();
    await notifyCurrentTab();
  }

  async function clearAllPages() {
    pageSpeeds = {};
    await browser.storage.local.set({ pageSpeeds });
    render();
    await notifyCurrentTab();
  }

  resetPageBtn.addEventListener("click", resetPageSpeed);
  clearAllBtn.addEventListener("click", clearAllPages);

  async function init() {
    const [tabs, stored] = await Promise.all([
      browser.tabs.query({ active: true, currentWindow: true }),
      browser.storage.local.get(["defaultSpeed", "pageSpeeds"])
    ]);

    currentTab = tabs[0] || null;
    currentPageKey = currentTab?.url ? getPageKey(currentTab.url) : null;

    if (typeof stored.defaultSpeed === "number") {
      defaultSpeed = stored.defaultSpeed;
    }
    if (stored.pageSpeeds && typeof stored.pageSpeeds === "object") {
      pageSpeeds = stored.pageSpeeds;
    }

    render();
  }

  init();
})();