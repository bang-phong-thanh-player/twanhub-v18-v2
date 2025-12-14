// tools.js (Tool tabs + Timer/Stopwatch PRO + Calculator PRO + Translator PRO)
// Uses: window.TwanSettings.soundEnabled, window.TwanToast.show

window.TwanTools = (function () {
  // ===== utils =====
  const toast = (m) => window.TwanToast?.show?.(m);

  function soundClick() {
    if (!window.TwanSettings?.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = 520;
      g.gain.value = 0.03;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      setTimeout(() => { o.stop(); ctx.close(); }, 70);
    } catch (_) {}
  }

  function soundTing() {
    if (!window.TwanSettings?.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.value = 0.06;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      setTimeout(() => { o.frequency.value = 660; }, 80);
      setTimeout(() => { o.stop(); ctx.close(); }, 220);
    } catch (_) {}
  }

  function pad2(n) { return String(n).padStart(2, "0"); }
  function pad3(n) { return String(n).padStart(3, "0"); }

  function formatMs(totalMs) {
    totalMs = Math.max(0, Math.floor(totalMs));
    const ms = totalMs % 1000;
    const totalSec = Math.floor(totalMs / 1000);
    const s = totalSec % 60;
    const totalMin = Math.floor(totalSec / 60);
    const m = totalMin % 60;
    const h = Math.floor(totalMin / 60);
    return `${pad2(h)}:${pad2(m)}:${pad2(s)}.${pad3(ms)}`;
  }

  // ===== Tool tabs switching =====
  function initToolTabs() {
    const tabs = Array.from(document.querySelectorAll(".tool-tab"));
    const panels = Array.from(document.querySelectorAll(".tool-panel"));

    function setActive(tabKey) {
      tabs.forEach(t => t.classList.toggle("is-active", t.dataset.toolTab === tabKey));
      panels.forEach(p => p.classList.toggle("is-active", p.dataset.toolPanel === tabKey));
    }

    tabs.forEach(t => {
      t.addEventListener("click", () => {
        soundClick();
        setActive(t.dataset.toolTab);
      });
    });

    // default
    setActive("time-weather");
  }

  // ===== Timer PRO =====
  let timerRunning = false;
  let timerTargetMs = 0;
  let timerRemainingMs = 0;
  let timerLastTick = 0;
  let timerRAF = 0;

  function readTimerInputMs() {
    const h = Number(document.getElementById("timer-hours")?.value || 0);
    const m = Number(document.getElementById("timer-minutes")?.value || 0);
    const s = Number(document.getElementById("timer-seconds")?.value || 0);
    const ms = Number(document.getElementById("timer-ms")?.value || 0);
    const total = (h * 3600 + m * 60 + s) * 1000 + ms;
    return Math.max(0, Math.floor(total));
  }

  function renderTimer(ms) {
    const el = document.getElementById("timer-display");
    if (el) el.textContent = formatMs(ms);
  }

  function timerLoop(now) {
    if (!timerRunning) return;

    if (!timerLastTick) timerLastTick = now;
    const delta = now - timerLastTick;
    timerLastTick = now;

    timerRemainingMs -= delta;
    if (timerRemainingMs <= 0) {
      timerRemainingMs = 0;
      renderTimer(0);
      timerRunning = false;
      cancelAnimationFrame(timerRAF);
      timerRAF = 0;
      timerLastTick = 0;
      soundTing();
      toast?.("⏳ Timer: Hết giờ!");
      return;
    }

    renderTimer(timerRemainingMs);
    timerRAF = requestAnimationFrame(timerLoop);
  }

  function timerStart() {
    const inputMs = readTimerInputMs();
    if (!timerRunning && timerRemainingMs === 0) {
      timerTargetMs = inputMs;
      timerRemainingMs = inputMs;
    }
    if (timerRemainingMs <= 0) {
      toast?.("Nhập thời gian trước đã bro 😄");
      return;
    }
    timerRunning = true;
    timerLastTick = 0;
    cancelAnimationFrame(timerRAF);
    timerRAF = requestAnimationFrame(timerLoop);
  }

  function timerPause() {
    timerRunning = false;
    cancelAnimationFrame(timerRAF);
    timerRAF = 0;
    timerLastTick = 0;
  }

  function timerReset() {
    timerRunning = false;
    cancelAnimationFrame(timerRAF);
    timerRAF = 0;
    timerLastTick = 0;
    timerTargetMs = 0;
    timerRemainingMs = 0;
    renderTimer(0);
  }

  function initTimer() {
    renderTimer(0);
    document.getElementById("btn-timer-start")?.addEventListener("click", () => { soundClick(); timerStart(); });
    document.getElementById("btn-timer-pause")?.addEventListener("click", () => { soundClick(); timerPause(); });
    document.getElementById("btn-timer-reset")?.addEventListener("click", () => { soundClick(); timerReset(); });

    // clamp ms input
    const msEl = document.getElementById("timer-ms");
    msEl?.addEventListener("input", () => {
      const v = Math.max(0, Math.min(999, Number(msEl.value || 0)));
      msEl.value = String(Math.floor(v));
    });
  }

  // ===== Stopwatch PRO (Lap) =====
  let swRunning = false;
  let swStartAt = 0;
  let swElapsed = 0;
  let swRAF = 0;
  let lapCount = 0;

  function renderStopwatch(ms) {
    const el = document.getElementById("stopwatch-display");
    if (el) el.textContent = formatMs(ms);
  }

  function swLoop(now) {
    if (!swRunning) return;
    const ms = (now - swStartAt) + swElapsed;
    renderStopwatch(ms);
    swRAF = requestAnimationFrame(swLoop);
  }

  function swStart() {
    if (swRunning) return;
    swRunning = true;
    swStartAt = performance.now();
    cancelAnimationFrame(swRAF);
    swRAF = requestAnimationFrame(swLoop);
  }

  function swPause() {
    if (!swRunning) return;
    swRunning = false;
    const now = performance.now();
    swElapsed += (now - swStartAt);
    cancelAnimationFrame(swRAF);
    swRAF = 0;
  }

  function swReset() {
    swRunning = false;
    cancelAnimationFrame(swRAF);
    swRAF = 0;
    swStartAt = 0;
    swElapsed = 0;
    lapCount = 0;
    renderStopwatch(0);
    const list = document.getElementById("laps-list");
    if (list) list.innerHTML = "";
  }

  function swLap() {
    const now = performance.now();
    const ms = swRunning ? (now - swStartAt) + swElapsed : swElapsed;
    lapCount += 1;

    const list = document.getElementById("laps-list");
    if (!list) return;

    const row = document.createElement("div");
    row.className = "lap-item";
    row.innerHTML = `
      <div class="lap-left">Lap ${lapCount}</div>
      <div class="lap-right">${formatMs(ms)}</div>
    `;
    list.prepend(row);
  }

  function initStopwatch() {
    renderStopwatch(0);
    document.getElementById("btn-sw-start")?.addEventListener("click", () => { soundClick(); swStart(); });
    document.getElementById("btn-sw-pause")?.addEventListener("click", () => { soundClick(); swPause(); });
    document.getElementById("btn-sw-reset")?.addEventListener("click", () => { soundClick(); swReset(); });
    document.getElementById("btn-sw-lap")?.addEventListener("click", () => { soundClick(); swLap(); });
    document.getElementById("btn-sw-clear-laps")?.addEventListener("click", () => { soundClick(); const list = document.getElementById("laps-list"); if (list) list.innerHTML = ""; lapCount = 0; });
  }

  // ===== Calculator PRO =====
  const CALC_H_KEY = "twanhub_calc_history";
  function loadCalcHistory() {
    try {
      const raw = localStorage.getItem(CALC_H_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) { return []; }
  }
  function saveCalcHistory(arr) {
    try { localStorage.setItem(CALC_H_KEY, JSON.stringify(arr.slice(0, 25))); } catch (_) {}
  }

  function renderHistory() {
    const list = document.getElementById("calc-history-list");
    if (!list) return;
    const arr = loadCalcHistory();
    list.innerHTML = "";
    arr.forEach((x) => {
      const item = document.createElement("div");
      item.className = "history-item";
      item.innerHTML = `<div class="h-exp">${x.exp}</div><div class="h-res">= ${x.res}</div>`;
      item.addEventListener("click", () => {
        const input = document.getElementById("calc-expression");
        if (input) input.value = x.exp;
        soundClick();
      });
      list.appendChild(item);
    });
  }

  function pushHistory(exp, res) {
    const arr = loadCalcHistory();
    arr.unshift({ exp, res, at: Date.now() });
    saveCalcHistory(arr);
    renderHistory();
  }

  function calcEval() {
    const input = document.getElementById("calc-expression");
    const out = document.getElementById("calc-result");
    if (!input || !out) return;

    const exp = String(input.value || "").trim();
    if (!exp) return;

    try {
      const val = window.math.evaluate(exp);
      const res = typeof val === "number" ? String(val) : String(val);
      out.textContent = res;
      pushHistory(exp, res);
      toast?.("🧮 Done");
    } catch (e) {
      out.textContent = "❌ Lỗi biểu thức";
    }
  }

  function calcClear() {
    const input = document.getElementById("calc-expression");
    const out = document.getElementById("calc-result");
    if (input) input.value = "";
    if (out) out.textContent = "—";
  }

  function insertAtCursor(el, text) {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    el.value = el.value.slice(0, start) + text + el.value.slice(end);
    const pos = start + text.length;
    el.setSelectionRange(pos, pos);
    el.focus();
  }

  function buildKeypad() {
    const grid = document.getElementById("calc-grid");
    const input = document.getElementById("calc-expression");
    if (!grid || !input) return;

    const keys = [
      { t: "7" }, { t: "8" }, { t: "9" }, { t: "÷", v: "/" , cls:"op"},
      { t: "4" }, { t: "5" }, { t: "6" }, { t: "×", v: "*" , cls:"op"},
      { t: "1" }, { t: "2" }, { t: "3" }, { t: "−", v: "-" , cls:"op"},
      { t: "0" }, { t: ".", v: "." }, { t: "(", v: "(" }, { t: ")", v: ")" },
      { t: "sin", v: "sin(" , cls:"op"}, { t: "cos", v: "cos(" , cls:"op"}, { t: "tan", v: "tan(" , cls:"op"}, { t: "+", v: "+" , cls:"op"},
      { t: "√", v: "sqrt(" , cls:"op"}, { t: "^", v: "^" , cls:"op"}, { t: "⌫", v: "back" , cls:"ghost"}, { t: "=", v: "eq" , cls:"eq"},
    ];

    grid.innerHTML = "";
    keys.forEach((k) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `calc-key ${k.cls || ""}`;
      b.textContent = k.t;
      b.addEventListener("click", () => {
        soundClick();
        if (k.v === "eq") return calcEval();
        if (k.v === "back") {
          const v = input.value;
          input.value = v.slice(0, -1);
          input.focus();
          return;
        }
        insertAtCursor(input, k.v ?? k.t);
      });
      grid.appendChild(b);
    });
  }

  function initCalculator() {
    document.getElementById("btn-calc-eval")?.addEventListener("click", () => { soundClick(); calcEval(); });
    document.getElementById("btn-calc-clear")?.addEventListener("click", () => { soundClick(); calcClear(); });

    document.getElementById("btn-calc-clear-history")?.addEventListener("click", () => {
      soundClick();
      try { localStorage.removeItem(CALC_H_KEY); } catch (_) {}
      renderHistory();
      toast?.("🧹 Cleared history");
    });

    // Enter => eval
    const input = document.getElementById("calc-expression");
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        soundClick();
        calcEval();
      }
    });

    buildKeypad();
    renderHistory();
  }

  // ===== Translator PRO (MyMemory free) =====
  async function translate() {
    const src = document.getElementById("trans-source");
    const dst = document.getElementById("trans-result");
    const from = document.getElementById("trans-from");
    const to = document.getElementById("trans-to");
    const hint = document.getElementById("translate-hint");
    if (!src || !dst || !from || !to) return;

    const text = String(src.value || "").trim();
    if (!text) { toast?.("Nhập text trước bro 😄"); return; }

    const langpair = `${from.value}|${to.value}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langpair)}`;

    try {
      if (hint) hint.textContent = "⏳ Đang dịch...";
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      const translated = data?.responseData?.translatedText;
      dst.value = translated || "❌ Không có kết quả";
      if (hint) hint.textContent = "✅ Done";
      toast?.("🌐 Dịch xong");
    } catch (e) {
      if (hint) hint.textContent = "❌ Lỗi dịch (net/giới hạn). Bấm lại.";
      dst.value = "";
    }
  }

  async function copyTextFrom(el) {
    try {
      await navigator.clipboard.writeText(el.value || "");
      toast?.("📋 Copied");
    } catch (_) {
      // fallback
      el.select();
      document.execCommand("copy");
      toast?.("📋 Copied");
    }
  }

  function initTranslator() {
    document.getElementById("btn-translate")?.addEventListener("click", () => { soundClick(); translate(); });

    document.getElementById("btn-trans-swap")?.addEventListener("click", () => {
      soundClick();
      const from = document.getElementById("trans-from");
      const to = document.getElementById("trans-to");
      if (!from || !to) return;
      const tmp = from.value;
      from.value = to.value;
      to.value = tmp;

      // swap text too
      const src = document.getElementById("trans-source");
      const dst = document.getElementById("trans-result");
      if (src && dst) {
        const t = src.value;
        src.value = dst.value;
        dst.value = t;
      }
      toast?.("⇄ Swapped");
    });

    document.getElementById("btn-copy-source")?.addEventListener("click", () => {
      soundClick();
      const src = document.getElementById("trans-source");
      if (src) copyTextFrom(src);
    });
    document.getElementById("btn-copy-result")?.addEventListener("click", () => {
      soundClick();
      const dst = document.getElementById("trans-result");
      if (dst) copyTextFrom(dst);
    });
  }

  // ===== init =====
  function init() {
    initToolTabs();
    initTimer();
    initStopwatch();
    initCalculator();
    initTranslator();
  }

  return { init };
})();
