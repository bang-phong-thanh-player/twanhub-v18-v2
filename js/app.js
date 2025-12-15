// ==== NOTES: Cloud sync via Supabase (online-first) ====
const notesArea = document.getElementById("notes-area");
const quickNote = document.getElementById("quick-note");

// Nếu chưa login thì vẫn cho gõ bình thường (nhưng không sync)
notesArea?.addEventListener("input", () => {
  window.TwanSupabase?.scheduleSave?.();
});
quickNote?.addEventListener("input", () => {
  window.TwanSupabase?.scheduleSave?.();
});


(function () {
  const root = document.getElementById("twan-root");

  // ===== TOAST =====
  const toastEl = document.getElementById("toast");
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove("show"), 1400);
  }
  window.TwanToast = { show: toast };

  // ===== SETTINGS STATE =====
  const SETTINGS_KEY = "twanhub_settings_v1";
  const defaults = { sound: true, reduceMotion: false };
  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      return { ...defaults, ...(obj || {}) };
    } catch (_) {
      return { ...defaults };
    }
  }
  function saveSettings(s) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (_) {}
  }
  const settings = loadSettings();

  function applyReduceMotion(on) {
    if (!root) return;
    root.dataset.reduceMotion = on ? "true" : "false";
  }
  applyReduceMotion(!!settings.reduceMotion);

  window.TwanSettings = {
    get soundEnabled() { return !!settings.sound; },
    setSoundEnabled(v) { settings.sound = !!v; saveSettings(settings); },
    get reduceMotion() { return !!settings.reduceMotion; },
    setReduceMotion(v) { settings.reduceMotion = !!v; saveSettings(settings); applyReduceMotion(!!v); },
    toast,
  };

  // ===== THEME (persist) =====
  const THEME_KEY = "twanhub_theme";
  const themeBtn = document.getElementById("theme-toggle");
  const themeIcon = themeBtn?.querySelector(".theme-icon");
  const themeLabel = themeBtn?.querySelector(".theme-label");

  function setTheme(mode) {
    if (!root) return;
    root.dataset.theme = mode;

    if (themeIcon && themeLabel) {
      if (mode === "dark") {
        themeIcon.textContent = "🌙";
        themeLabel.textContent = "Dark";
      } else {
        themeIcon.textContent = "🌞";
        themeLabel.textContent = "Light";
      }
    }

    try { localStorage.setItem(THEME_KEY, mode); } catch (_) {}
  }

  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") setTheme(saved);
    else setTheme(root?.dataset.theme || "light");
  } catch (_) {
    setTheme(root?.dataset.theme || "light");
  }

  themeBtn?.addEventListener("click", () => {
    const current = root?.dataset.theme === "dark" ? "dark" : "light";
    setTheme(current === "dark" ? "light" : "dark");
  });

  // ===== SECTION NAV (with animation) =====
  const navButtons = document.querySelectorAll("[data-section-target]");
  const sections = Array.from(document.querySelectorAll(".twan-section"));

  function getActiveSection() {
    return sections.find((s) => s.classList.contains("is-active")) || null;
  }

  function activateSection(id) {
    const target = document.getElementById(id);
    if (!target) return;

    const current = getActiveSection();
    if (current && current.id === id) return;

    if (current) {
      current.classList.add("is-leaving");
      setTimeout(() => current.classList.remove("is-active", "is-leaving"), 170);
    }

    target.classList.add("is-active");
    target.classList.remove("is-leaving");

    navButtons.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.sectionTarget === id);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.sectionTarget;
      if (id) activateSection(id);
    });
  });

  activateSection("home-section");

  // ===== SIDEBAR =====
  const sidebar = document.getElementById("twan-sidebar");
  const backdrop = document.getElementById("sidebar-backdrop");
  const btnOpenSidebar = document.getElementById("btn-open-sidebar");
  const btnCloseSidebar = document.getElementById("btn-close-sidebar");

  function openSidebar() {
    if (!sidebar) return;
    sidebar.classList.add("is-open");
    sidebar.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeSidebar() {
    if (!sidebar) return;
    sidebar.classList.remove("is-open");
    sidebar.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  btnOpenSidebar?.addEventListener("click", openSidebar);
  btnCloseSidebar?.addEventListener("click", closeSidebar);
  backdrop?.addEventListener("click", closeSidebar);

  // click sidebar links -> go + close
  const sidebarLinks = sidebar?.querySelectorAll("[data-section-target]");
  sidebarLinks?.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.sectionTarget;
      if (id) {
        activateSection(id);
        closeSidebar();
      }
    });
  });

  // ===== SETTINGS MODAL =====
  const settingsModal = document.getElementById("settings-modal");
  const btnOpenSettings = document.getElementById("btn-open-settings");
  const btnCloseSettings = document.getElementById("btn-close-settings");
  const settingsBackdrop = document.getElementById("settings-backdrop");
  const toggleSound = document.getElementById("toggle-sound");
  const toggleReduce = document.getElementById("toggle-reduce-motion");

  function openSettings() {
    if (!settingsModal) return;
    settingsModal.classList.add("is-open");
    settingsModal.setAttribute("aria-hidden", "false");
  }
  function closeSettings() {
    if (!settingsModal) return;
    settingsModal.classList.remove("is-open");
    settingsModal.setAttribute("aria-hidden", "true");
  }

  btnOpenSettings?.addEventListener("click", openSettings);
  btnCloseSettings?.addEventListener("click", closeSettings);
  settingsBackdrop?.addEventListener("click", closeSettings);

  // init toggles
  if (toggleSound) toggleSound.checked = !!settings.sound;
  if (toggleReduce) toggleReduce.checked = !!settings.reduceMotion;

  toggleSound?.addEventListener("change", () => {
    window.TwanSettings.setSoundEnabled(toggleSound.checked);
    toast(toggleSound.checked ? "🔊 Âm thanh: ON" : "🔇 Âm thanh: OFF");
  });

  toggleReduce?.addEventListener("change", () => {
    window.TwanSettings.setReduceMotion(toggleReduce.checked);
    toast(toggleReduce.checked ? "🧊 Reduce motion: ON" : "🔥 Reduce motion: OFF");
  });

  // clear actions
  const notesArea = document.getElementById("notes-area");
  const quickNote = document.getElementById("quick-note");

  const NOTES_KEY = "twanhub_notes";
  const QUICK_KEY = "twanhub_quick_note";
  const RECENT_CITIES_KEY = "twanhub_recent_cities";

  // restore notes
  if (notesArea) {
    try { notesArea.value = localStorage.getItem(NOTES_KEY) || ""; } catch (_) {}
    notesArea.addEventListener("input", () => {
      try { localStorage.setItem(NOTES_KEY, notesArea.value); } catch (_) {}
    });
  }
  if (quickNote) {
    try { quickNote.value = localStorage.getItem(QUICK_KEY) || ""; } catch (_) {}
    quickNote.addEventListener("input", () => {
      try { localStorage.setItem(QUICK_KEY, quickNote.value); } catch (_) {}
    });
  }

  document.getElementById("btn-clear-notes")?.addEventListener("click", () => {
    if (notesArea) notesArea.value = "";
    try { localStorage.removeItem(NOTES_KEY); } catch (_) {}
    toast("🧹 Đã xóa Notes");
  });

  document.getElementById("btn-clear-quick")?.addEventListener("click", () => {
    if (quickNote) quickNote.value = "";
    try { localStorage.removeItem(QUICK_KEY); } catch (_) {}
    toast("🧹 Đã xóa Quick Note");
  });

  document.getElementById("btn-clear-recent-cities")?.addEventListener("click", () => {
    try { localStorage.removeItem(RECENT_CITIES_KEY); } catch (_) {}
    if (window.TwanWeather?.init) window.TwanWeather.init(); // re-render chips
    toast("🧹 Đã xóa Recent Cities");
  });

  // ESC closes both
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeSidebar();
      closeSettings();
    }
  });

  // ===== INIT MODULES =====
  if (window.TwanWeather) window.TwanWeather.init();
  if (window.TwanTools) window.TwanTools.init();
  if (window.TwanAI) window.TwanAI.init();
  if (window.TwanSupabase) window.TwanSupabase.init();
  if (window.TwanStorage) {
  window.TwanStorage.init();
}

})();
