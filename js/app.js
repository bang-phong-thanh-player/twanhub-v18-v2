// app.js

(function () {
  const root = document.getElementById("twan-root");

  // ==== THEME TOGGLE ====
  const themeBtn = document.getElementById("theme-toggle");
  const themeIcon = themeBtn?.querySelector(".theme-icon");
  const themeLabel = themeBtn?.querySelector(".theme-label");

  function setTheme(mode) {
    root.dataset.theme = mode;
    if (mode === "dark") {
      themeIcon.textContent = "🌙";
      themeLabel.textContent = "Dark";
    } else {
      themeIcon.textContent = "🌞";
      themeLabel.textContent = "Light";
    }
  }

  themeBtn?.addEventListener("click", () => {
    const current = root.dataset.theme === "dark" ? "dark" : "light";
    setTheme(current === "dark" ? "light" : "dark");
  });

  // ==== BOTTOM NAV + SECTION ====
  const navButtons = document.querySelectorAll("[data-section-target]");
  const sections = document.querySelectorAll(".twan-section");

  function activateSection(id) {
    sections.forEach((s) => {
      s.classList.toggle("is-active", s.id === id);
    });
    navButtons.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.sectionTarget === id);
    });
  }

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.sectionTarget;
      if (id) activateSection(id);
    });
  });

  // default: home
  activateSection("home-section");

  // ==== SIDEBAR ====
  const sidebar = document.getElementById("twan-sidebar");
  const btnOpenSidebar = document.getElementById("btn-open-sidebar");
  const btnCloseSidebar = document.getElementById("btn-close-sidebar");

  btnOpenSidebar?.addEventListener("click", () => {
    sidebar?.classList.add("is-open");
  });

  btnCloseSidebar?.addEventListener("click", () => {
    sidebar?.classList.remove("is-open");
  });

  sidebar?.addEventListener("click", (e) => {
    if (e.target === sidebar) sidebar.classList.remove("is-open");
  });

  const sidebarLinks = sidebar?.querySelectorAll("[data-section-target]");
  sidebarLinks?.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.sectionTarget;
      if (id) {
        activateSection(id);
        sidebar.classList.remove("is-open");
      }
    });
  });

  // ==== LOCAL STORAGE DEMO CHO NOTES ====
  const notesArea = document.getElementById("notes-area");
  const quickNote = document.getElementById("quick-note");

  const NOTES_KEY = "twanhub_notes";
  const QUICK_KEY = "twanhub_quick_note";

  if (notesArea) {
    notesArea.value = localStorage.getItem(NOTES_KEY) || "";
    notesArea.addEventListener("input", () => {
      localStorage.setItem(NOTES_KEY, notesArea.value);
    });
  }

  if (quickNote) {
    quickNote.value = localStorage.getItem(QUICK_KEY) || "";
    quickNote.addEventListener("input", () => {
      localStorage.setItem(QUICK_KEY, quickNote.value);
    });
  }

  // ==== KICK OFF WEATHER CLOCK LOOP ====
  if (window.TwanWeather) {
    window.TwanWeather.init();
  }

  // ==== INIT TOOLS (timer / calc / translate) ====
  if (window.TwanTools) {
    window.TwanTools.init();
  }

  // ==== INIT MINI AI ====
  if (window.TwanAI) {
    window.TwanAI.init();
  }

  // ==== INIT SUPABASE PLACEHOLDER ====
  if (window.TwanSupabase) {
    window.TwanSupabase.init();
  }
})();
