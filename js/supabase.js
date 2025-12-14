// js/supabase.js
// Supabase init + auth cơ bản

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://huhozlbnrztnwmabfevl.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_EH8VJeLy7ADMX1e43udEOA_4zGwZ1c9";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.TwanSupabase = {
  supabase,

  async init() {
    console.log("✅ Supabase initialized");

    const { data } = await supabase.auth.getSession();
    if (data?.session) {
      console.log("🔐 Logged in:", data.session.user.email);
    } else {
      console.log("🔓 Not logged in");
    }
  },

  async signInWithEmail(email) {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      alert("Lỗi đăng nhập: " + error.message);
    } else {
      alert("📩 Đã gửi link đăng nhập về email!");
    }
  },

  async signOut() {
    await supabase.auth.signOut();
    location.reload();
  },
};
