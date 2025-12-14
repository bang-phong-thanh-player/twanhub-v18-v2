// tools.js

window.TwanTools = (function () {
  let timerInterval = null;
  let timerRemaining = 0;

  let swInterval = null;
  let swElapsed = 0; // ms

  function formatTime(h, m, s) {
    const pad = (v) => String(v).padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  function formatStopwatch(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const tenth = Math.floor((ms % 1000) / 100);
    const pad = (v) => String(v).padStart(2, "0");
    return `${pad(minutes)}:${pad(seconds)}.${tenth}`;
  }

  function initTabs() {
    const tabs = document.querySelectorAll(".tool-tab");
    const panels = document.querySelectorAll(".tool-panel");

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.toolTab;
        tabs.forEach((t) => t.classList.remove("is-active"));
        panels.forEach((p) =>
          p.classList.toggle("is-active", p.dataset.toolPanel === target)
        );
        tab.classList.add("is-active");
      });
    });
  }

  function initTimer() {
    const hoursInput = document.getElementById("timer-hours");
    const minutesInput = document.getElementById("timer-minutes");
    const secondsInput = document.getElementById("timer-seconds");
    const display = document.getElementById("timer-display");

    const btnStart = document.getElementById("btn-timer-start");
    const btnPause = document.getElementById("btn-timer-pause");
    const btnReset = document.getElementById("btn-timer-reset");

    function updateDisplayFromRemaining() {
      const total = Math.max(0, timerRemaining);
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      display.textContent = formatTime(h, m, s);
    }

    btnStart?.addEventListener("click", () => {
      const h = parseInt(hoursInput.value, 10) || 0;
      const m = parseInt(minutesInput.value, 10) || 0;
      const s = parseInt(secondsInput.value, 10) || 0;
      if (!timerInterval && timerRemaining <= 0) {
        timerRemaining = h * 3600 + m * 60 + s;
      }
      if (timerRemaining <= 0) return;

      timerInterval = setInterval(() => {
        timerRemaining -= 1;
        if (timerRemaining <= 0) {
          timerRemaining = 0;
          clearInterval(timerInterval);
          timerInterval = null;
          // sau này có thể cho rung / beep
        }
        updateDisplayFromRemaining();
      }, 1000);
    });

    btnPause?.addEventListener("click", () => {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    });

    btnReset?.addEventListener("click", () => {
      clearInterval(timerInterval);
      timerInterval = null;
      timerRemaining = 0;
      updateDisplayFromRemaining();
    });

    updateDisplayFromRemaining();
  }

  function initStopwatch() {
    const display = document.getElementById("stopwatch-display");
    const btnStart = document.getElementById("btn-sw-start");
    const btnPause = document.getElementById("btn-sw-pause");
    const btnReset = document.getElementById("btn-sw-reset");

    let lastTick = null;

    function step(timestamp) {
      if (!lastTick) lastTick = timestamp;
      const delta = timestamp - lastTick;
      lastTick = timestamp;
      swElapsed += delta;
      display.textContent = formatStopwatch(swElapsed);
    }

    btnStart?.addEventListener("click", () => {
      if (swInterval) return;
      lastTick = performance.now();
      swInterval = setInterval(() => {
        const now = performance.now();
        const delta = now - lastTick;
        lastTick = now;
        swElapsed += delta;
        display.textContent = formatStopwatch(swElapsed);
      }, 100);
    });

    btnPause?.addEventListener("click", () => {
      if (swInterval) {
        clearInterval(swInterval);
        swInterval = null;
      }
    });

    btnReset?.addEventListener("click", () => {
      clearInterval(swInterval);
      swInterval = null;
      swElapsed = 0;
      display.textContent = formatStopwatch(swElapsed);
    });

    display.textContent = formatStopwatch(swElapsed);
  }

  function initCalculator() {
    const exprInput = document.getElementById("calc-expression");
    const btnEval = document.getElementById("btn-calc-eval");
    const btnClear = document.getElementById("btn-calc-clear");
    const resultEl = document.getElementById("calc-result");

    btnEval?.addEventListener("click", () => {
      const expr = exprInput.value.trim();
      if (!expr) return;
      try {
        const value = math.evaluate(expr);
        resultEl.textContent = String(value);
      } catch (err) {
        resultEl.textContent = "Lỗi cú pháp 🤯";
      }
    });

    btnClear?.addEventListener("click", () => {
      exprInput.value = "";
      resultEl.textContent = "—";
    });
  }

  function initTranslator() {
    const srcText = document.getElementById("trans-source");
    const dstText = document.getElementById("trans-result");
    const fromSel = document.getElementById("trans-from");
    const toSel = document.getElementById("trans-to");
    const btnTranslate = document.getElementById("btn-translate");

    async function translate() {
      const text = srcText.value.trim();
      if (!text) return;
      const from = fromSel.value;
      const to = toSel.value;
      if (from === to) {
        dstText.value = text;
        return;
      }

      dstText.value = "Đang dịch...";

      try {
        // Demo: dùng MyMemory API free (không cần key).
        const q = encodeURIComponent(text);
        const langpair = `${from}|${to}`;
        const url = `https://api.mymemory.translated.net/get?q=${q}&langpair=${langpair}`;

        const res = await fetch(url);
        const data = await res.json();
        const translated =
          data?.responseData?.translatedText || "[Lỗi dịch, thử lại sau]";
        dstText.value = translated;
      } catch (err) {
        dstText.value = "Không kết nối được server dịch 😢";
      }
    }

    btnTranslate?.addEventListener("click", translate);
  }

  function init() {
    initTabs();
    initTimer();
    initStopwatch();
    initCalculator();
    initTranslator();
  }

  return { init };
})();
