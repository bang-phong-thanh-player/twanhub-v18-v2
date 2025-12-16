// js/app.js

// ==== NOTES: Cloud sync via Supabase (online-first) ====
// Nếu chưa login thì vẫn cho gõ bình thường (nhưng không sync)
const notesAreaTop = document.getElementById("notes-area");
const quickNoteTop = document.getElementById("quick-note");

notesAreaTop?.addEventListener("input", () => {
  window.TwanSupabase?.scheduleSave?.();
});
quickNoteTop?.addEventListener("input", () => {
  window.TwanSupabase?.scheduleSave?.();
});

(function () {
  const root = document.getElementById("twan-root");

  // ==== ANTI-FREEZE: FORCE CLOSE OVERLAYS ON LOAD ====
  window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("settings-modal")?.classList.remove("is-open");
    document.getElementById("twan-sidebar")?.classList.remove("is-open");
    document.body.style.overflow = "";
  });

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
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch (_) {}
  }

  const settings = loadSettings();

  function applyReduceMotion(on) {
    if (!root) return;
    root.dataset.reduceMotion = on ? "true" : "false";
  }
  applyReduceMotion(!!settings.reduceMotion);

  window.TwanSettings = {
    get soundEnabled() {
      return !!settings.sound;
    },
    setSoundEnabled(v) {
      settings.sound = !!v;
      saveSettings(settings);
    },
    get reduceMotion() {
      return !!settings.reduceMotion;
    },
    setReduceMotion(v) {
      settings.reduceMotion = !!v;
      saveSettings(settings);
      applyReduceMotion(!!v);
    },
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

    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch (_) {}
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

  // ===== SECTION NAV =====
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

    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (_) {
      window.scrollTo(0, 0);
    }
  }

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.sectionTarget;
      if (id) activateSection(id);
    });
  });

  // default
  activateSection("home-section");

  // ===== SIDEBAR =====
  const sidebar = document.getElementById("twan-sidebar");
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

  // bấm ngoài sidebar (vùng trống) để đóng
  sidebar?.addEventListener("click", (e) => {
    if (e.target === sidebar) closeSidebar();
  });

  // ===== SETTINGS MODAL =====
  const settingsModal = document.getElementById("settings-modal");
  const btnOpenSettings = document.getElementById("btn-open-settings");
  const btnCloseSettings = document.getElementById("btn-settings-close");

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

  // click nền mờ để đóng (đúng với index.html)
  settingsModal
    ?.querySelector("[data-close-settings]")
    ?.addEventListener("click", closeSettings);

  // ===== INIT SETTINGS TOGGLES (nếu có) =====
  const toggleSound = document.getElementById("toggle-sound");
  const toggleReduce = document.getElementById("toggle-reduce-motion");

  if (toggleSound) toggleSound.checked = !!settings.sound;
  if (toggleReduce) toggleReduce.checked = !!settings.reduceMotion;

  toggleSound?.addEventListener("change", () => {
    window.TwanSettings.setSoundEnabled(toggleSound.checked);
  });

  toggleReduce?.addEventListener("change", () => {
    window.TwanSettings.setReduceMotion(toggleReduce.checked);
  });

  // ===== LOCAL STORAGE DEMO CHO NOTES (fallback) =====
  const notesArea = document.getElementById("notes-area");
  const quickNote = document.getElementById("quick-note");

  const NOTES_KEY = "twanhub_notes";
  const QUICK_KEY = "twanhub_quick_note";

  if (notesArea) {
    try {
      notesArea.value = localStorage.getItem(NOTES_KEY) || "";
    } catch (_) {}
    notesArea.addEventListener("input", () => {
      try {
        localStorage.setItem(NOTES_KEY, notesArea.value);
      } catch (_) {}
    });
  }

  if (quickNote) {
    try {
      quickNote.value = localStorage.getItem(QUICK_KEY) || "";
    } catch (_) {}
    quickNote.addEventListener("input", () => {
      try {
        localStorage.setItem(QUICK_KEY, quickNote.value);
      } catch (_) {}
    });
  }

  // ===== ESC closes overlays =====
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
  if (window.TwanStorage) window.TwanStorage.init();
})();
