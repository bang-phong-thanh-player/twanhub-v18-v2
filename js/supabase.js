// js/supabase.js — Settings Popup Auth (GLOBAL)
(function () {
  const SUPABASE_URL = "https://huhozlbnrztnwmabfevl.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_EH8VJeLy7ADMX1e43udEOA_4zGwZ1c9";

  function $(id){ return document.getElementById(id); }
  const toast = (m) => window.TwanToast?.show?.(m);

  if (!window.supabase) {
    console.error("❌ Supabase SDK chưa load");
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  function openSettings(){ $("settings-modal")?.classList.add("is-open"); }
  function closeSettings(){ $("settings-modal")?.classList.remove("is-open"); }

  async function setStatus() {
    const { data } = await client.auth.getSession();
    const s = $("cloud-status");
    if (!s) return;
    if (data?.session?.user) {
      s.textContent = `✅ Đã đăng nhập: ${data.session.user.email || data.session.user.id}`;
      try { await window.TwanStorage?.refresh?.(); } catch(_) {}
    } else {
      s.textContent = "Chưa đăng nhập.";
    }
  }

  window.TwanSupabase = {
    client,
    init() {
      console.log("✅ Supabase initialized (Settings Auth)");

      // mở settings bằng nút ⚙️
      document.getElementById("btn-open-settings")?.addEventListener("click", openSettings);

      $("btn-settings-close")?.addEventListener("click", closeSettings);
      document.querySelector("[data-close-settings]")?.addEventListener("click", closeSettings);

      $("btn-cloud-login")?.addEventListener("click", async () => {
        const email = ($("cloud-email")?.value || "").trim();
        if (!email) return toast?.("Nhập email trước đã 😅");

        const { error } = await client.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.href }
        });
        if (error) {
          console.error(error);
          toast?.("❌ Gửi link lỗi");
          return;
        }
        toast?.("📩 Check email để đăng nhập");
      });

      $("btn-cloud-logout")?.addEventListener("click", async () => {
        await client.auth.signOut();
        toast?.("👋 Logout");
        await setStatus();
      });

      client.auth.onAuthStateChange(async () => {
        await setStatus();
      });

      setStatus();
    },
  };
})();
