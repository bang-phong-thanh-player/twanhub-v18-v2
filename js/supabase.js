// js/supabase.js
// TwanSupabase: Auth (magic link) + Notes/QuickNote sync to table public.twanhub_state
// Requires: <script src="https://unpkg.com/@supabase/supabase-js@2"></script>

window.TwanSupabase = (function () {
  const SUPABASE_URL = "https://huhozlbnrztnwmabfevl.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_EH8VJeLy7ADMX1e43udEOA_4zGwZ1c9";

  const NOTES_KEY = "twanhub_notes";
  const QUICK_KEY = "twanhub_quick_note";

  let client = null;
  let user = null;
  let saveTimer = null;

  function toast(msg) {
    window.TwanToast?.show?.(msg);
    console.log("[TwanSupabase]", msg);
  }

  function getLocalState() {
    return {
      notes: localStorage.getItem(NOTES_KEY) || "",
      quick: localStorage.getItem(QUICK_KEY) || "",
      updatedAt: new Date().toISOString(),
    };
  }

  function setLocalState(data) {
    if (!data) return;
    if (typeof data.notes === "string") localStorage.setItem(NOTES_KEY, data.notes);
    if (typeof data.quick === "string") localStorage.setItem(QUICK_KEY, data.quick);

    const notesArea = document.getElementById("notes-area");
    const quickNote = document.getElementById("quick-note");
    if (notesArea && typeof data.notes === "string") notesArea.value = data.notes;
    if (quickNote && typeof data.quick === "string") quickNote.value = data.quick;
  }

  function updateCloudStatus() {
    const el = document.getElementById("cloud-status");
    if (!el) return;
    if (user?.email) el.textContent = `✅ Đã đăng nhập: ${user.email}`;
    else el.textContent = "❌ Chưa đăng nhập.";
  }

  async function loadRemoteState() {
    if (!user) return;

    const { data, error } = await client
      .from("twanhub_state")
      .select("data")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error(error);
      toast("⚠️ Không load được cloud state");
      return;
    }

    if (data?.data) {
      setLocalState(data.data);
      toast("☁️ Đã đồng bộ từ cloud");
    } else {
      // chưa có row -> tạo luôn (upsert)
      await saveNow();
    }
  }

  async function saveNow() {
    if (!user) return;

    const payload = getLocalState();

    const { error } = await client
      .from("twanhub_state")
      .upsert(
        { user_id: user.id, data: payload, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error(error);
      toast("⚠️ Lưu cloud thất bại");
      return;
    }

    toast("✅ Đã lưu cloud");
  }

  function scheduleSave() {
    if (!user) return; // chưa login thì không sync cloud
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveNow();
    }, 600);
  }

  async function sendMagicLink(email) {
    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.href, // giữ lại ngay trang này
      },
    });

    if (error) {
      console.error(error);
      toast("❌ Gửi link lỗi");
      return;
    }

    toast("📩 Đã gửi magic link. Mở mail để đăng nhập!");
  }

  async function logout() {
    await client.auth.signOut();
    user = null;
    updateCloudStatus();
    toast("👋 Đã logout");
  }

  function wireUI() {
    // Settings modal buttons
    const btnLogin = document.getElementById("btn-cloud-login");
    const btnLogout = document.getElementById("btn-cloud-logout");
    const emailInput = document.getElementById("cloud-email");

    btnLogin?.addEventListener("click", async () => {
      const email = (emailInput?.value || "").trim();
      if (!email) return toast("Nhập email trước đã");
      await sendMagicLink(email);
    });

    btnLogout?.addEventListener("click", logout);
  }

  async function init() {
    // 1) init client
    if (!window.supabase?.createClient) {
      console.error("Supabase SDK chưa load. Kiểm tra script @supabase/supabase-js@2");
      return;
    }
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 2) restore local notes into UI (offline-first)
    setLocalState(getLocalState());

    // 3) ui
    wireUI();

    // 4) auth state
    const { data: { session } } = await client.auth.getSession();
    user = session?.user || null;
    updateCloudStatus();

    client.auth.onAuthStateChange(async (_event, session2) => {
      user = session2?.user || null;
      updateCloudStatus();

      if (user) {
        toast("✅ Login thành công");
        await loadRemoteState();
      } else {
        toast("ℹ️ Chưa login");
      }
    });

    // 5) nếu đã login sẵn -> load
    if (user) {
      await loadRemoteState();
    } else {
      toast("ℹ️ Notes đang chạy local (chưa sync cloud)");
    }
  }

  return { init, scheduleSave, saveNow, loadRemoteState };
})();
