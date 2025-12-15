// js/storage.js
// Supabase Storage: upload/list/download/delete (user folder)

window.TwanStorage = (function () {
  const BUCKET = "twanhub_files";

  const picker = () => document.getElementById("file-picker");
  const btnUpload = () => document.getElementById("btn-upload");
  const btnRefresh = () => document.getElementById("btn-refresh-files");
  const listEl = () => document.getElementById("files-list");

  const toast = (m) => window.TwanToast?.show?.(m);

  function requireClient() {
    const c = window.TwanSupabase?.client;
    if (!c) {
      console.error("Supabase client missing");
      toast?.("❌ Supabase chưa init");
      return null;
    }
    return c;
  }

  async function getUserId() {
    const c = requireClient();
    if (!c) return null;
    const { data } = await c.auth.getSession();
    const uid = data?.session?.user?.id || null;
    if (!uid) toast?.("🔐 Cần login trước");
    return uid;
  }

  function renderEmpty(msg) {
    const el = listEl();
    if (!el) return;
    el.innerHTML = `<div class="tool-note">${msg}</div>`;
  }

  function fileRow({ name, updated_at, metadata }, onDownload, onDelete) {
    const size = metadata?.size ? `${Math.round(metadata.size / 1024)} KB` : "";
    const dt = updated_at ? new Date(updated_at).toLocaleString("vi-VN") : "";
    return `
      <div style="
        display:flex; justify-content:space-between; gap:10px; align-items:center;
        padding:10px; border-radius:14px; margin-bottom:8px;
        background: var(--bg-soft); border:1px solid var(--card-border);
      ">
        <div style="min-width:0;">
          <div style="font-weight:900; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${name}</div>
          <div style="font-size:12px; color: var(--text-sub);">${size} • ${dt}</div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn-secondary" data-dl="${encodeURIComponent(name)}">Download</button>
          <button class="btn-ghost" data-del="${encodeURIComponent(name)}">Delete</button>
        </div>
      </div>
    `;
  }

  async function refresh() {
    const c = requireClient();
    if (!c) return;
    const uid = await getUserId();
    if (!uid) return;

    renderEmpty("⏳ Đang load...");

    const prefix = `${uid}/`;
    const { data, error } = await c.storage.from(BUCKET).list(prefix, {
      limit: 100,
      offset: 0,
      sortBy: { column: "updated_at", order: "desc" },
    });

    if (error) {
      console.error(error);
      renderEmpty("❌ Không load được list file (check policy/bucket).");
      return;
    }

    if (!data?.length) {
      renderEmpty("Chưa có file nào. Upload thử 1 file nhé.");
      return;
    }

    const el = listEl();
    el.innerHTML = data
      .map((f) =>
        fileRow(
          f,
          () => {},
          () => {}
        )
      )
      .join("");

    // Bind buttons
    el.querySelectorAll("[data-dl]").forEach((b) => {
      b.addEventListener("click", async () => {
        const name = decodeURIComponent(b.getAttribute("data-dl"));
        await download(name);
      });
    });

    el.querySelectorAll("[data-del]").forEach((b) => {
      b.addEventListener("click", async () => {
        const name = decodeURIComponent(b.getAttribute("data-del"));
        await remove(name);
      });
    });
  }

  async function upload() {
    const c = requireClient();
    if (!c) return;
    const uid = await getUserId();
    if (!uid) return;

    const file = picker()?.files?.[0];
    if (!file) {
      toast?.("Chọn file trước đã 😅");
      return;
    }

    // Path: user_id/filename_timestamp.ext
    const safeName = file.name.replace(/[^\w.\-()+\s]/g, "_");
    const path = `${uid}/${Date.now()}_${safeName}`;

    toast?.("⏳ Uploading...");

    const { error } = await c.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      console.error(error);
      toast?.("❌ Upload lỗi");
      return;
    }

    toast?.("✅ Upload xong");
    picker().value = "";
    await refresh();
  }

  async function download(objectName) {
    const c = requireClient();
    if (!c) return;
    const uid = await getUserId();
    if (!uid) return;

    const path = `${uid}/${objectName}`;

    const { data, error } = await c.storage.from(BUCKET).download(path);
    if (error) {
      console.error(error);
      toast?.("❌ Download lỗi");
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;

    // make a nicer filename
    const base = objectName.replace(/^\d+_/, "");
    a.download = base || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    toast?.("⬇️ Download OK");
  }

  async function remove(objectName) {
    const c = requireClient();
    if (!c) return;
    const uid = await getUserId();
    if (!uid) return;

    const path = `${uid}/${objectName}`;
    const ok = confirm(`Xóa file này?\n${objectName}`);
    if (!ok) return;

    const { error } = await c.storage.from(BUCKET).remove([path]);
    if (error) {
      console.error(error);
      toast?.("❌ Xóa lỗi");
      return;
    }

    toast?.("🗑️ Đã xóa");
    await refresh();
  }

  function init() {
    btnUpload()?.addEventListener("click", upload);
    btnRefresh()?.addEventListener("click", refresh);

    // Auto refresh when open tools tab (optional)
    // You can manually click Refresh anyway
  }

  return { init, refresh, upload };
})();
