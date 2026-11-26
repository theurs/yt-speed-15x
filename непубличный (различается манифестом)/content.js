(() => {
  const FALLBACK_SPEED = 1.5;
  const FALLBACK_SHORTS_SPEED = 1.0;

  let defaultSpeed = FALLBACK_SPEED;
  let shortsDefaultSpeed = FALLBACK_SHORTS_SPEED;
  let pageSpeeds = {};
  let lastUrl = "";
  let enforceUntil = 0;

  const hookedVideos = new WeakSet();
  const adState = new WeakMap();

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

  function getTargetSpeed() {
    const key = getPageKey(location.href);
    if (key && pageSpeeds[key] && typeof pageSpeeds[key].speed === "number") {
      return pageSpeeds[key].speed;
    }
    if (key && key.startsWith("shorts:")) {
      return shortsDefaultSpeed;
    }
    return defaultSpeed;
  }

  function syncSessionStorage(speed) {
    try {
      sessionStorage.setItem(
        "yt-player-playback-rate",
        JSON.stringify({
          data: String(speed),
          creation: Date.now()
        })
      );
    } catch (e) {}
  }

  function isAdPlaying(video) {
    const player = video.closest(".html5-video-player");
    return Boolean(
      player &&
        (player.classList.contains("ad-showing") ||
          player.classList.contains("ad-interrupting"))
    );
  }

  function applySpeed(video) {
    if (!video || isAdPlaying(video)) return;
    const target = getTargetSpeed();
    syncSessionStorage(target);
    if (video.playbackRate !== target) {
      video.playbackRate = target;
    }
  }

  function triggerEnforce(video) {
    enforceUntil = Date.now() + 1500;
    applySpeed(video);
  }

  function applyToAllVideos() {
    document.querySelectorAll("video").forEach(triggerEnforce);
  }

  const settingsReady = browser.storage.local
    .get(["defaultSpeed", "shortsDefaultSpeed", "pageSpeeds"])
    .then((data) => {
      if (typeof data.defaultSpeed === "number") {
        defaultSpeed = data.defaultSpeed;
      }
      if (typeof data.shortsDefaultSpeed === "number") {
        shortsDefaultSpeed = data.shortsDefaultSpeed;
      }
      if (data.pageSpeeds && typeof data.pageSpeeds === "object") {
        pageSpeeds = data.pageSpeeds;
      }
      syncSessionStorage(getTargetSpeed());
      applyToAllVideos();
    })
    .catch(() => {
      syncSessionStorage(getTargetSpeed());
    });

  // Обновление настроек в реальном времени при изменениях в popup-меню
  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.defaultSpeed && typeof changes.defaultSpeed.newValue === "number") {
      defaultSpeed = changes.defaultSpeed.newValue;
    }
    if (changes.shortsDefaultSpeed && typeof changes.shortsDefaultSpeed.newValue === "number") {
      shortsDefaultSpeed = changes.shortsDefaultSpeed.newValue;
    }
    if (changes.pageSpeeds) {
      pageSpeeds = changes.pageSpeeds.newValue || {};
    }
    applyToAllVideos();
  });

  // Прямая команда из popup-меню для мгновенного отклика
  browser.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === "APPLY_SPEED") {
      applyToAllVideos();
    }
  });

  function hookVideo(video) {
    if (hookedVideos.has(video)) return;
    hookedVideos.add(video);

    video.addEventListener("loadedmetadata", async () => {
      await settingsReady;
      triggerEnforce(video);
    });

    video.addEventListener("playing", async () => {
      await settingsReady;
      const inAd = isAdPlaying(video);
      if (inAd) {
        adState.set(video, true);
        return;
      }

      const wasAd = adState.get(video);
      if (wasAd || location.href !== lastUrl) {
        adState.set(video, false);
        lastUrl = location.href;
        triggerEnforce(video);
      }
    });

    video.addEventListener("ratechange", () => {
      if (Date.now() < enforceUntil && !isAdPlaying(video)) {
        const target = getTargetSpeed();
        if (video.playbackRate !== target) {
          video.playbackRate = target;
        }
      }
    });

    if (video.readyState >= 1) {
      lastUrl = location.href;
      settingsReady.then(() => triggerEnforce(video));
    }
  }

  function scanVideos() {
    document.querySelectorAll("video").forEach(hookVideo);
  }

  const observer = new MutationObserver(scanVideos);

  if (document.documentElement) {
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } else {
    window.addEventListener("DOMContentLoaded", () => {
      scanVideos();
      observer.observe(document.documentElement, { childList: true, subtree: true });
    });
  }

  const onNavigate = async () => {
    lastUrl = "";
    await settingsReady;
    scanVideos();
    applyToAllVideos();
  };

  window.addEventListener("yt-navigate-finish", onNavigate);
  window.addEventListener("state-navigateend", onNavigate);
  window.addEventListener("popstate", onNavigate);
})();