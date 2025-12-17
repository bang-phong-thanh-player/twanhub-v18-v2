// js/storage.js
window.TwanStorage = (function () {
  let client = null;
  let user = null;

  const fileInput = document.getElementById("file-picker");
  const btnUpload = document.getElementById("btn-upload");
  const btnRefresh = document.getElementById("btn-refresh-files");
  const filesList = document.getElementById("files-list");

  async function init() {
    if (!window.supabase) return;

    client = window.supabaseClient || null;
    if (!client && window.TwanSupabase?.getClient) {
      client = window.TwanSupabase.getClient();
    }

    const { data } = await supabase.auth.getUser();
    user = data.user;

    if (!user) return;

    btnUpload?.addEventListener("click", uploadFile);
    btnRefresh?.addEventListener("click", loadFiles);

    loadFiles();
  }

  async function uploadFile() {
    if (!user || !fileInput?.files?.length) return;

    const file = fileInput.files[0];
    const path = `${user.id}/${Date.now()}_${file.name}`;

    const { error } = await supabase
      .storage
      .from("twanhub-files")
      .upload(path, file);

    if (error) {
      alert("Upload lỗi");
      console.error(error);
      return;
    }

    fileInput.value = "";
    loadFiles();
  }

  async function loadFiles() {
    if (!user || !filesList) return;

    const { data, error } = await supabase
      .storage
      .from("twanhub-files")
      .list(user.id, { limit: 100, sortBy: { column: "created_at", order: "desc" } });

    if (error) {
      console.error(error);
      return;
    }

    filesList.innerHTML = "";

    if (!data.length) {
      filesList.innerHTML = "<div class='tool-note'>Chưa có file nào.</div>";
      return;
    }

    data.forEach((file) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "center";
      row.style.marginBottom = "6px";

      const name = document.createElement("span");
      name.textContent = file.name;

      const del = document.createElement("button");
      del.textContent = "Xoá";
      del.className = "btn-ghost";
      del.onclick = () => deleteFile(file.name);

      row.appendChild(name);
      row.appendChild(del);
      filesList.appendChild(row);
    });
  }

  async function deleteFile(name) {
    if (!user) return;

    const { error } = await supabase
      .storage
      .from("twanhub-files")
      .remove([`${user.id}/${name}`]);

    if (error) {
      console.error(error);
      return;
    }

    loadFiles();
  }

  return { init };
})();
