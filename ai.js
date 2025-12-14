// ai.js

window.TwanAI = (function () {
  let logEl, formEl, inputEl;

  function addMessage(text, type) {
    const div = document.createElement("div");
    div.className = "ai-msg " + type;
    div.textContent = text;
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function reply(userText) {
    // mini logic vui vui
    const lower = userText.toLowerCase();
    if (lower.includes("khoá quá") || lower.includes("khó quá")) {
      return "Cái gì khó quá thì mình chọn D thôi 😎.";
    }
    if (lower.includes("twanhub")) {
      return "TwanHub là trung tâm não bộ – Twan Style, nơi Tú gom hết tool & idea lại 1 chỗ.";
    }
    if (lower.includes("hello") || lower.includes("hi")) {
      return "Hello hello, huynh đệ gọi gì TwanGPT mini đây? ✨";
    }
    return "Mini AI nghe rõ. Sau này gắn GPT thật sẽ trả lời xịn hơn, giờ mình coi như note nhanh nha 😌.";
  }

  function init() {
    logEl = document.getElementById("ai-chat-log");
    formEl = document.getElementById("ai-chat-form");
    inputEl = document.getElementById("ai-input");

    if (!logEl || !formEl || !inputEl) return;

    formEl.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = inputEl.value.trim();
      if (!text) return;
      addMessage(text, "user");
      inputEl.value = "";

      const res = reply(text);
      setTimeout(() => addMessage(res, "bot"), 200);
    });
  }

  return { init };
})();