// supabase.js (Auth + Cloud Sync twanhub_state)
// Requires: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

window.TwanSupabase = (function () {
  // ⚠️ Điền đúng project của đệ:
  const SUPABASE_URL = "PASTE_YOUR_SUPABASE_URL_HERE";
  const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";

  let supabase = null;
  let user = null;

  // Minimal "state" we sync now
  const STATE_TABLE = "twanhub_state";
  const STATE_SCHEMA_VERSION = 1;

  // Debounce save
  let saveTimer = null;
  const SAVE_DEBOUNCE_MS = 900;

  // ===== UI DOM =====
  const modal = () => document.getElementById("auth-modal");
  const emailInput = () => document.getElementById("auth-email");
  const statusEl = () => document.getElementById("auth-status");

  const setStatus = (txt) => {
    const el = statusEl();
    if (el) el.textContent = txt;
  };

  const toast = (m) => window.TwanToast?.show?.(m);

  function isReady() {
    return !!supabase;
  }

  function getUser() {
    return user;
  }

  // ===== Build State from UI =====
  function buildStateFromUI() {
    const quick = document.getElementById("quick-note")?.value ?? "";
    const notes = document.getElementById("notes-area")?.value ?? "";

    // Bạn có thể mở rộng thêm (ideas, resources, tools prefs...) sau
    return {
      schemaVersion: STATE_SCHEMA_VERSION,
      updatedAtLocal: new Date().toISOString(),
      notes: {
        quick,
        notes,
      },
    };
  }

  // ===== Apply State to UI =====
  function applyStateToUI(state) {
    if (!state || typeof state !== "object") return;

    const quick = state?.notes?.quick ?? "";
    const notes = state?.notes?.notes ?? "";

    const quickEl = document.getElementById("quick-note");
    const notesEl = document.getElementById("notes-area");

    if (quickEl) quickEl.value = quick;
    if (notesEl) notesEl.value = notes;
  }

  // ===== Upsert state row =====
  async function upsertState(data) {
    if (!user) return;

    const payload = {
      user_id: user.id,
      data: data || {},
    };

    const { error } = await supabase
      .from(STATE_TABLE)
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      console.error("Supabase upsert error:", error);
      toast?.("❌ Lưu cloud lỗi");
      return;
    }
    // ok
  }

  // ===== Load state row =====
  async function loadState() {
    if (!user) return null;

    const { data, error } = await supabase
      .from(STATE_TABLE)
      .select("data, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Supabase load error:", error);
      return null;
    }
    return data?.data || null;
  }

  // ===== Debounced save =====
  function scheduleSave() {
    if (!user) return; // chưa login thì không sync
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const state = buildStateFromUI();
      await upsertState(state);
      setStatus(`✅ Đã sync cloud • ${new Date().toLocaleTimeString("vi-VN")}`);
    }, SAVE_DEBOUNCE_MS);
  }

  function wireAutoSave() {
    const quickEl = document.getElementById("quick-note");
    const notesEl = document.getElementById("notes-area");

    const onChange = () => scheduleSave();

    quickEl?.addEventListener("input", onChange);
    notesEl?.addEventListener("input", onChange);
  }

  // ===== Auth UI =====
  function openAuthModal() {
    modal()?.classList.add("is-open");
  }
  function closeAuthModal() {
    modal()?.classList.remove("is-open");
  }

  async function sendMagicLink(email) {
    if (!email) return;

    // IMPORTANT: set Site URL / Redirect URL in Supabase Auth settings
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.href, // simple: quay về đúng trang
      },
    });

    if (error) {
      console.error(error);
      toast?.("❌ Gửi link lỗi");
      setStatus("❌ Gửi link lỗi. Check Auth settings.");
      return;
    }

    toast?.("📩 Đã gửi link đăng nhập");
    setStatus("📩 Check email để bấm link đăng nhập.");
  }

  async function doLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error(error);
      toast?.("❌ Logout lỗi");
      return;
    }
    user = null;
    setStatus("Đã logout.");
    toast?.("👋 Logout");
  }

  function wireAuthUI() {
    // open modal when click avatar
    const avatar = document.querySelector(".avatar-badge");
    avatar?.addEventListener("click", openAuthModal);

    document.getElementById("btn-auth-close")?.addEventListener("click", closeAuthModal);
    modal()?.querySelector("[data-close-auth]")?.addEventListener("click", closeAuthModal);

    document.getElementById("btn-auth-login")?.addEventListener("click", () => {
      const email = emailInput()?.value?.trim();
      sendMagicLink(email);
    });

    document.getElementById("btn-auth-logout")?.addEventListener("click", doLogout);
  }

  function renderAuthState() {
    if (user) {
      setStatus(`✅ Đang đăng nhập: ${user.email || user.id}`);
    } else {
      setStatus("Chưa đăng nhập. Bấm avatar (T) → nhập email → gửi link.");
    }
  }

  async function onSignedIn() {
    renderAuthState();
    toast?.("✅ Login thành công");

    // 1) load cloud state
    const cloudState = await loadState();
    if (cloudState) {
      applyStateToUI(cloudState);
      setStatus("✅ Đã load data từ cloud");
    } else {
      // 2) nếu chưa có row -> tạo row rỗng (hoặc save ngay)
      await upsertState(buildStateFromUI());
      setStatus("✅ Cloud row đã tạo");
    }

    // start autosave
    wireAutoSave();
  }

  async function init() {
    // init client
    try {
      if (!SUPABASE_URL.includes("http") || SUPABASE_ANON_KEY.includes("PASTE_")) {
        console.warn("Supabase not configured yet. Please set URL/ANON KEY in js/supabase.js");
        setStatus("⚠️ Chưa set SUPABASE_URL / ANON KEY trong js/supabase.js");
        return;
      }

      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
      console.error(e);
      return;
    }

    wireAuthUI();

    // check session
    const { data } = await supabase.auth.getSession();
    user = data?.session?.user || null;
    renderAuthState();

    if (user) {
      await onSignedIn();
    }

    // listen auth changes
    supabase.auth.onAuthStateChange(async (_event, session) => {
      user = session?.user || null;
      renderAuthState();

      if (user) {
        await onSignedIn();
      }
    });
  }

  // Public API
  return {
    init,
    isReady,
    getUser,
    scheduleSave, // nếu cần gọi tay
    loadState,
    upsertState,
  };
})();
