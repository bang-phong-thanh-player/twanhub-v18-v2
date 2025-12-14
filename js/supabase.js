// js/supabase.js
// Supabase init (GLOBAL VERSION - NO MODULE)

(function () {
  const SUPABASE_URL = "https://huhozlbnrztnwmabfevl.supabase.co";
  const SUPABASE_ANON_KEY =
    "sb_publishable_EH8VJeLy7ADMX1e43udEOA_4zGwZ1c9";

  if (!window.supabase) {
    console.error("❌ Supabase SDK chưa load");
    return;
  }

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  window.TwanSupabase = {
    client,

    init() {
      console.log("✅ Supabase initialized (GLOBAL)");
    },

    async signInWithEmail(email) {
      const { error } = await client.auth.signInWithOtp({ email });
      if (error) {
        alert("❌ Login lỗi: " + error.message);
      } else {
        alert("📩 Đã gửi magic link về email!");
      }
    },

    async signOut() {
      await client.auth.signOut();
      location.reload();
    },

    async getSession() {
      const { data } = await client.auth.getSession();
      return data?.session;
    },
  };
})();
