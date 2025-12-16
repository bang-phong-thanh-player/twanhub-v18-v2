// js/supabase.js (A3+ SUPERVIP)
window.TwanSupabase = (function () {
  const SUPABASE_URL = "https://huhozlbnrztnwmabfevl.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_EH8VJeLy7ADMX1e43udEOA_4zGwZ1c9";

  const LS_KEYS = {
    notes: "twanhub_notes",
    quick: "twanhub_quick_note",
    theme: "twanhub_theme",
    settings: "twanhub_settings_v1",
    lastLocalEditAt: "twanhub_last_local_edit_at",
    lastSyncedHash: "twanhub_last_synced_hash",
    lastVersionAt: "twanhub_last_version_at",
  };

  let client = null;
  let user = null;
  let saveTimer = null;
  let realtimeChannel = null;

  const VERSION_COOLDOWN_MS = 10_000; // 10s mới tạo version 1 lần để khỏi spam

  function toast(msg) {
    window.TwanToast?.show?.(msg);
    console.log("[TwanSupabase]", msg);
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function getLocalState() {
    return {
      meta: {
        v: "A3+",
        lastLocalEditAt: localStorage.getItem(LS_KEYS.lastLocalEditAt) || nowISO(),
      },
      notes: {
        main: localStorage.getItem(LS_KEYS.notes) || "",
        quick: localStorage.getItem(LS_KEYS.quick) || "",
      },
      ui: {
        theme: localStorage.getItem(LS_KEYS.theme) || "light",
        settingsRaw: localStorage.getItem(LS_KEYS.settings) || "",
      },
      // sau này đệ mở rộng resources/tools/mxh/universe thì nhét vào đây luôn
    };
  }

  function applyStateToUI(state) {
    if (!state) return;

    const notesArea = document.getElementById("notes-area");
    const quickNote = document.getElementById("quick-note");

    const notes = state?.notes?.main;
    const quick = state?.notes?.quick;

    if (notesArea && typeof notes === "string") {
      notesArea.value = notes;
      localStorage.setItem(LS_KEYS.notes, notes);
    }
    if (quickNote && typeof quick === "string") {
      quickNote.value = quick;
      localStorage.setItem(LS_KEYS.quick, quick);
    }

    if (state?.ui?.theme) {
      localStorage.setItem(LS_KEYS.theme, state.ui.theme);
    }
    if (typeof state?.ui?.settingsRaw === "string") {
      localStorage.setItem(LS_KEYS.settings, state.ui.settingsRaw);
    }
  }

  function updateCloudStatus() {
    const el = document.getElementById("cloud-status");
    if (!el) return;
    if (user?.email) el.textContent = `✅ Đã đăng nhập: ${user.email}`;
    else el.textContent = "❌ Chưa đăng nhập.";
  }

  async function sha256(text) {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function markLocalEdited() {
    try {
      localStorage.setItem(LS_KEYS.lastLocalEditAt, nowISO());
    } catch (_) {}
  }

  function shouldCreateVersion(newHash) {
    const lastHash = localStorage.getItem(LS_KEYS.lastSyncedHash) || "";
    if (newHash === lastHash) return false;

    const lastV = Number(localStorage.getItem(LS_KEYS.lastVersionAt) || "0");
    const now = Date.now();
    if (now - lastV < VERSION_COOLDOWN_MS) return false;

    return true;
  }

  async function loadRemoteCurrent() {
    if (!user) return null;

    const { data, error } = await client
      .from("twanhub_state")
      .select("data, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error(error);
      toast("⚠️ Không load được cloud CURRENT");
      return null;
    }
    return data || null;
  }

  // merge strategy: ưu tiên “edit mới hơn”
  function mergeLocalRemote(localState, remoteState) {
    const localAt = Date.parse(localState?.meta?.lastLocalEditAt || "1970-01-01");
    const remoteAt = Date.parse(remoteState?.meta?.lastLocalEditAt || "1970-01-01");

    // remote mới hơn -> lấy remote
    if (remoteAt > localAt) return { merged: remoteState, source: "remote" };

    // local mới hơn -> giữ local (sau đó save lên)
    return { merged: localState, source: "local" };
  }

  async function ensureRowExists() {
    if (!user) return;

    const remote = await loadRemoteCurrent();
    if (remote?.data) return;

    const localState = getLocalState();
    const text = JSON.stringify(localState);
    const hash = await sha256(text);

    const { error } = await client
      .from("twanhub_state")
      .upsert({ user_id: user.id, data: localState, updated_at: nowISO() }, { onConflict: "user_id" });

    if (!error) {
      localStorage.setItem(LS_KEYS.lastSyncedHash, hash);
      toast("☁️ Khởi tạo CURRENT trên cloud");
    }
  }

  async function saveNow(forceVersion = false) {
    if (!user) return;

    const localState = getLocalState();
    const payloadText = JSON.stringify(localState);
    const hash = await sha256(payloadText);

    // 1) upsert CURRENT
    const { error } = await client
      .from("twanhub_state")
      .upsert({ user_id: user.id, data: localState, updated_at: nowISO() }, { onConflict: "user_id" });

    if (error) {
      console.error(error);
      toast("❌ Lưu CURRENT thất bại");
      return;
    }

    // 2) create VERSION (khi hash đổi, và không spam)
    const createV = forceVersion || shouldCreateVersion(hash);
    if (createV) {
      const { error: vErr } = await client
        .from("twanhub_state_versions")
        .insert({ user_id: user.id, hash, data: localState });

      if (!vErr) {
        localStorage.setItem(LS_KEYS.lastVersionAt, String(Date.now()));
        toast("📌 Đã lưu VERSION");
      } else {
        console.error(vErr);
      }
    }

    localStorage.setItem(LS_KEYS.lastSyncedHash, hash);
    toast("✅ Đã lưu cloud");
  }

  function scheduleSave() {
    if (!user) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveNow(false), 650);
  }

  async function loadAndSync() {
    if (!user) return;

    await ensureRowExists();

    const remote = await loadRemoteCurrent();
    const remoteState = remote?.data || null;

    const localState = getLocalState();
    const { merged, source } = mergeLocalRemote(localState, remoteState || localState);

    applyStateToUI(merged);

    if (source === "local") {
      // local mới hơn -> đẩy lên cloud
      await saveNow(false);
      toast("🔁 Local mới hơn → đã sync lên cloud");
    } else {
      toast("⬇️ Cloud mới hơn → đã sync xuống");
    }
  }

  async function sendMagicLink(email) {
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });

    if (error) {
      console.error(error);
      toast("❌ Gửi link lỗi");
      return;
    }
    toast("📩 Đã gửi magic link. Mở mail để đăng nhập!");
  }

  async function logout() {
    try { realtimeChannel?.unsubscribe?.(); } catch (_) {}
    realtimeChannel = null;

    await client.auth.signOut();
    user = null;
    updateCloudStatus();
    toast("👋 Đã logout");
  }

  function wireUI() {
    const btnLogin = document.getElementById("btn-cloud-login");
    const btnLogout = document.getElementById("btn-cloud-logout");
    const emailInput = document.getElementById("cloud-email");

    btnLogin?.addEventListener("click", async () => {
      const email = (emailInput?.value || "").trim();
      if (!email) return toast("Nhập email trước đã");
      await sendMagicLink(email);
    });

    btnLogout?.addEventListener("click", logout);

    // mark local edits (so merge works)
    const notesArea = document.getElementById("notes-area");
    const quickNote = document.getElementById("quick-note");

    notesArea?.addEventListener("input", () => markLocalEdited());
    quickNote?.addEventListener("input", () => markLocalEdited());
  }

  function setupRealtime() {
    if (!user) return;

    // nghe thay đổi CURRENT của chính user (mở 2 máy sẽ sync)
    realtimeChannel?.unsubscribe?.();
    realtimeChannel = client
      .channel("twanhub_state_realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "twanhub_state",
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          // có update từ nơi khác -> kéo xuống
          const remote = await loadRemoteCurrent();
          if (remote?.data) {
            applyStateToUI(remote.data);
            toast("🔄 Realtime: đã cập nhật từ cloud");
          }
        }
      )
      .subscribe();
  }

  async function init() {
    if (!window.supabase?.createClient) {
      console.error("Supabase SDK chưa load (@supabase/supabase-js@2).");
      return;
    }
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    wireUI();

    const { data: { session } } = await client.auth.getSession();
    user = session?.user || null;
    updateCloudStatus();

    client.auth.onAuthStateChange(async (_event, session2) => {
      user = session2?.user || null;
      updateCloudStatus();

      if (user) {
        toast("✅ Login thành công");
        await loadAndSync();
        setupRealtime();
      } else {
        toast("ℹ️ Chưa login (đang chạy local)");
      }
    });

    if (user) {
      await loadAndSync();
      setupRealtime();
    } else {
      toast("ℹ️ Notes đang chạy local (chưa sync cloud)");
    }
  }

  return { init, scheduleSave, saveNow, loadAndSync };
})();
