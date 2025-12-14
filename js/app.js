// app.js (KHUNG PRO: theme persist + nav animation + sidebar pro)

(function () {
  const root = document.getElementById("twan-root");

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

  // init theme from storage
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

    // animate out current
    if (current) {
      current.classList.add("is-leaving");
      // after out animation, hide it
      setTimeout(() => {
        current.classList.remove("is-active", "is-leaving");
      }, 170);
    }

    // show new
    target.classList.add("is-active");
    target.classList.remove("is-leaving");

    // highlight buttons
    navButtons.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.sectionTarget === id);
    });

    // scroll to top of main content
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

  // ===== SIDEBAR (pro) =====
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

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSidebar();
  });

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

  // ===== LOCAL STORAGE DEMO (notes) =====
  const notesArea = document.getElementById("notes-area");
  const quickNote = document.getElementById("quick-note");

  const NOTES_KEY = "twanhub_notes";
  const QUICK_KEY = "twanhub_quick_note";

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

  // ===== INIT MODULES =====
  if (window.TwanWeather) window.TwanWeather.init();
  if (window.TwanTools) window.TwanTools.init();
  if (window.TwanAI) window.TwanAI.init();
  if (window.TwanSupabase) window.TwanSupabase.init();
})();
