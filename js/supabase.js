// js/supabase.js (GLOBAL) - Auth UI + status + refresh storage
(function () {
  const SUPABASE_URL = "https://huhozlbnrztnwmabfevl.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_EH8VJeLy7ADMX1e43udEOA_4zGwZ1c9";

  const toast = (m) => window.TwanToast?.show?.(m);

  function $(id) { return document.getElementById(id); }

  function openModal() { $("auth-modal")?.classList.add("is-open"); }
  function closeModal() { $("auth-modal")?.classList.remove("is-open"); }

  function setStatus(txt) {
    const el = $("auth-status");
    if (el) el.textContent = txt;
  }

  function setAvatarLoggedIn(isIn) {
    const av = document.querySelector(".avatar-badge");
    if (!av) return;
    av.style.opacity = isIn ? "1" : "0.75";
    av.title = isIn ? "Đã đăng nhập Cloud" : "Chưa đăng nhập Cloud";
  }

  async function getSession(client) {
    const { data } = await client.auth.getSession();
    return data?.session || null;
  }

  async function refreshStorageIfAny() {
    // nếu có module storage thì refresh list file luôn
    try { await window.TwanStorage?.refresh?.(); } catch (_) {}
  }

  if (!window.supabase) {
    console.error("❌ Supabase SDK chưa load (thiếu CDN trong index.html)");
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  window.TwanSupabase = {
    client,

    async init() {
      console.log("✅ Supabase initialized (GLOBAL)");

      // Wire UI
      const avatar = document.querySelector(".avatar-badge");
      avatar?.addEventListener("click", openModal);

      $("btn-auth-close")?.addEventListener("click", closeModal);
      document.querySelector("[data-close-auth]")?.addEventListener("click", closeModal);

      $("btn-auth-login")?.addEventListener("click", async () => {
        const email = ($("auth-email")?.value || "").trim();
        if (!email) return toast?.("Nhập email trước đã 😅");

        setStatus("📩 Đang gửi link...");
        const { error } = await client.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.href }
        });

        if (error) {
          console.error(error);
          setStatus("❌ Gửi link lỗi. Check Auth URL settings.");
          return toast?.("❌ Gửi link lỗi");
        }

        setStatus("✅ Đã gửi magic link. Check email để bấm đăng nhập.");
        toast?.("📩 Check email nha");
      });

      $("btn-auth-logout")?.addEventListener("click", async () => {
        const { error } = await client.auth.signOut();
        if (error) {
          console.error(error);
          toast?.("❌ Logout lỗi");
          return;
        }
        setStatus("Đã logout.");
        setAvatarLoggedIn(false);
        toast?.("👋 Logout");
      });

      // Initial session
      const session = await getSession(client);
      if (session?.user) {
        setStatus(`✅ Đang đăng nhập: ${session.user.email || session.user.id}`);
        setAvatarLoggedIn(true);
        await refreshStorageIfAny();
      } else {
        setStatus("Chưa đăng nhập. Bấm avatar (T) để login.");
        setAvatarLoggedIn(false);
      }

      // Listen auth state change
      client.auth.onAuthStateChange(async (_event, session2) => {
        if (session2?.user) {
          setStatus(`✅ Đang đăng nhập: ${session2.user.email || session2.user.id}`);
          setAvatarLoggedIn(true);
          toast?.("✅ Login thành công");
          await refreshStorageIfAny();
        } else {
          setStatus("Chưa đăng nhập. Bấm avatar (T) để login.");
          setAvatarLoggedIn(false);
        }
      });
    },
  };
})();
