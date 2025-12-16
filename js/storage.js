// js/storage.js
// Upload + list files in Supabase Storage bucket 'twanhub-files'
// Rule: path must be `${userId}/${filename}`

window.TwanStorage = (function () {
  const BUCKET = "twanhub-files";

  function toast(msg) {
    window.TwanToast?.show?.(msg);
    console.log("[TwanStorage]", msg);
  }

  function getClient() {
    // TwanSupabase tạo client nội bộ, nên mình lấy lại qua window.supabase + key/url là khó
    // Cách dễ: dùng client từ TwanSupabase bằng việc expose -> nhưng hiện chưa expose.
    // => giải pháp gọn: tạo lại client từ global config đã hardcode trong supabase.js (same anon).
    const url = "https://huhozlbnrztnwmabfevl.supabase.co";
    const key = "sb_publishable_EH8VJeLy7ADMX1e43udEOA_4zGwZ1c9";
    return window.supabase.createClient(url, key);
  }

  async function getUser(client) {
    const { data: { session } } = await client.auth.getSession();
    return session?.user || null;
  }

  function renderFiles(items) {
    const list = document.getElementById("files-list");
    if (!list) return;
    if (!items?.length) {
      list.innerHTML = `<div style="color:var(--text-sub); font-size:13px;">(Chưa có file)</div>`;
      return;
    }

    list.innerHTML = items
      .map((it) => {
        const name = it.name;
        return `
          <div style="display:flex; justify-content:space-between; gap:10px; padding:6px 0; border-bottom:1px solid rgba(148,163,184,.25);">
            <div style="font-size:13px; word-break:break-all;">${name}</div>
          </div>
        `;
      })
      .join("");
  }

  async function refreshList() {
    const client = getClient();
    const user = await getUser(client);
    if (!user) return toast("⚠️ Login trước đã");

    const { data, error } = await client.storage.from(BUCKET).list(user.id, {
      limit: 100,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      console.error(error);
      toast("❌ List file lỗi");
      return;
    }

    renderFiles(data || []);
    toast("✅ Đã load danh sách file");
  }

  async function uploadSelected() {
    const client = getClient();
    const user = await getUser(client);
    if (!user) return toast("⚠️ Login trước đã");

    const picker = document.getElementById("file-picker");
    const file = picker?.files?.[0];
    if (!file) return toast("Chọn file trước đã");

    const path = `${user.id}/${Date.now()}-${file.name}`;

    const { error } = await client.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      console.error(error);
      toast("❌ Upload lỗi");
      return;
    }

    toast("✅ Upload xong");
    await refreshList();
    picker.value = "";
  }

  function init() {
    const btnUpload = document.getElementById("btn-upload");
    const btnRefresh = document.getElementById("btn-refresh-files");

    btnUpload?.addEventListener("click", uploadSelected);
    btnRefresh?.addEventListener("click", refreshList);
  }

  return { init, refreshList, uploadSelected };
})();
