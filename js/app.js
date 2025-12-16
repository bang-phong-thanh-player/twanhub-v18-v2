// js/app.js
// TwanHub SIGNATURE V2 - App Core (clean, no-duplicate)
// - Theme toggle (persist)
// - Section navigation (bottom nav + sidebar)
// - Sidebar open/close
// - Settings modal open/close
// - Tool tabs switch
// - Notes localStorage + Cloud sync trigger (D2)
// - Init modules: Weather, Tools, AI, Supabase, Storage

(function () {
  const root = document.getElementById("twan-root");
  if (!root) {
    console.warn("[app] #twan-root not found");
    return;
  }

  // =========================
  // TOAST (optional)
  // =========================
  // Nếu đệ có #toast thì dùng, không có cũng không sao
  const toastEl = document.getElementById("toast");
  function toast(msg) {
    if (toastEl) {
      toastEl.textContent = msg;
      toastEl.classList.add("show");
      clearTimeout(toastEl._t);
      toastEl._t = setTimeout(() => toastEl.classList.remove("show"), 1400);
    }
    // luôn log cho dễ debug
    console.log("[toast]", msg);
  }
  window.TwanToast = window.TwanToast || { show: toast };

  // =========================
  // THEME (persist)
  // =========================
  const THEME_KEY = "twanhub_theme";
  const themeBtn = document.getElementById("theme-toggle");
  const themeIcon = themeBtn?.querySelector(".theme-icon");
  const themeLabel = themeBtn?.querySelector(".theme-label");

  function setTheme(mode) {
    root.dataset.theme = mode === "dark" ? "dark" : "light";

    if (themeIcon && themeLabel) {
      if (root.dataset.theme === "dark") {
        themeIcon.textContent = "🌙";
        themeLabel.textContent = "Dark";
      } else {
        themeIcon.textContent = "🌞";
        themeLabel.textContent = "Light";
      }
    }

    try {
      localStorage.setItem(THEME_KEY, root.dataset.theme);
    } catch (_) {}
  }

  // restore theme
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") setTheme(saved);
    else setTheme(root.dataset.theme || "light");
  } catch (_) {
    setTheme(root.dataset.theme || "light");
  }

  themeBtn?.addEventListener("click", () => {
    setTheme(root.dataset.theme === "dark" ? "light" : "dark");
  });

  // =========================
  // SECTION NAV (bottom nav + sidebar links)
  // =========================
  const navButtons = document.querySelectorAll("[data-section-target]");
  const sections = Array.from(document.querySelectorAll(".twan-section"));

  function activateSection(id) {
    const target = document.getElementById(id);
    if (!target) return;

    sections.forEach((s) => s.classList.toggle("is-active", s.id === id));
    navButtons.forEach((btn) =>
      btn.classList.toggle("is-active", btn.dataset.sectionTarget === id)
    );

    // scroll to top for mobile feel
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.sectionTarget;
      if (id) activateSection(id);
    });
  });

  // default home
  activateSection("home-section");

  // =========================
  // SIDEBAR open/close
  // =========================
  const sidebar = document.getElementById("twan-sidebar");
  const btnOpenSidebar = document.getElementById("btn-open-sidebar");
  const btnCloseSidebar = document.getElementById("btn-close-sidebar");

  function openSidebar() {
    if (!sidebar) return;
    sidebar.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }
  function closeSidebar() {
    if (!sidebar) return;
    sidebar.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  btnOpenSidebar?.addEventListener("click", openSidebar);
  btnCloseSidebar?.addEventListener("click", closeSidebar);

  // click vào vùng tối (chính aside) để đóng nếu click trúng nền
  sidebar?.addEventListener("click", (e) => {
    if (e.target === sidebar) closeSidebar();
  });

  // sidebar links -> navigate + close
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

  // =========================
  // SETTINGS MODAL open/close
  // =========================
  const settingsModal = document.getElementById("settings-modal");
  const btnOpenSettings = document.getElementById("btn-open-settings");
  const btnSettingsClose = document.getElementById("btn-settings-close");

  function openSettings() {
    if (!settingsModal) return;
    settingsModal.classList.add("is-open");
  }
  function closeSettings() {
    if (!settingsModal) return;
    settingsModal.classList.remove("is-open");
  }

  btnOpenSettings?.addEventListener("click", openSettings);
  btnSettingsClose?.addEventListener("click", closeSettings);

  // click backdrop to close (element có attribute data-close-settings)
  settingsModal
    ?.querySelector("[data-close-settings]")
    ?.addEventListener("click", closeSettings);

  // ESC closes both
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeSidebar();
      closeSettings();
    }
  });

  // =========================
  // NOTES localStorage (offline) + D2 Cloud sync trigger
  // =========================
  const NOTES_KEY = "twanhub_notes";
  const QUICK_KEY = "twanhub_quick_note";

  const notesArea = document.getElementById("notes-area");
  const quickNote = document.getElementById("quick-note");

  // restore local
  if (notesArea) {
    try {
      notesArea.value = localStorage.getItem(NOTES_KEY) || "";
    } catch (_) {}
  }
  if (quickNote) {
    try {
      quickNote.value = localStorage.getItem(QUICK_KEY) || "";
    } catch (_) {}
  }

  // save local + trigger cloud sync (D2)
  notesArea?.addEventListener("input", () => {
    try {
      localStorage.setItem(NOTES_KEY, notesArea.value);
    } catch (_) {}
    window.TwanSupabase?.scheduleSave?.();
  });

  quickNote?.addEventListener("input", () => {
    try {
      localStorage.setItem(QUICK_KEY, quickNote.value);
    } catch (_) {}
    window.TwanSupabase?.scheduleSave?.();
  });

  // =========================
  // TOOL TABS (Tools section)
  // =========================
  const toolTabs = Array.from(document.querySelectorAll(".tool-tab"));
  const toolPanels = Array.from(document.querySelectorAll(".tool-panel"));

  function activateToolTab(key) {
    toolTabs.forEach((t) => t.classList.toggle("is-active", t.dataset.toolTab === key));
    toolPanels.forEach((p) =>
      p.classList.toggle("is-active", p.dataset.toolPanel === key)
    );
  }

  toolTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const key = tab.dataset.toolTab;
      if (key) activateToolTab(key);
    });
  });

  // default tool tab
  activateToolTab("time-weather");

  // =========================
  // INIT MODULES
  // =========================
  if (window.TwanWeather?.init) window.TwanWeather.init();
  if (window.TwanTools?.init) window.TwanTools.init();
  if (window.TwanAI?.init) window.TwanAI.init();
  if (window.TwanSupabase?.init) window.TwanSupabase.init();
  if (window.TwanStorage?.init) window.TwanStorage.init();

  toast("✅ TwanHub loaded");
})();
