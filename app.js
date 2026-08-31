// ============================================================================
// WASSAPP - COMPLETE APP.JS (DENGAN GROQ AI STUDIO 2026 & PRODUCTION ENGINE)
// ============================================================================

// Model Produksi Groq Resmi 2026 (Pengganti resmi model deprecated)
const GROQ_PRODUCTION_MODELS = [
  "openai/gpt-oss-120b",  // Model Utama Penalaran Tinggi & Artikel/RPP
  "qwen/qwen3.6-27b",     // Model Bahasa & Sastra/Islami
  "openai/gpt-oss-20b"    // Model Cepat & Ringan
];

const DEFAULT_GROQ_KEY = "gsk_groq_production_stable_key";

// Entity Bot Al-Ghozali AI
const AI_BOT_TARGET = {
  type: "ai",
  id: "alghozali_groq_ai_bot",
  nama: "Al-Ghozali AI Assistant",
  mataPelajaran: "AI Studio (Groq GPT-OSS 120B / Qwen 3.6)",
  avatar: "",
  status: "Online"
};

let currentUser = null;
let teachers = [];
let groups = [];
let selectedTarget = null;
let currentMessages = [];
let selectedImage = null;
let activeSidebarTab = "all";
let realtimeChannel = null;
let editingMessageId = null;
let tempProfileAvatar = "";

let appSettings = {
  msgTone: "chime",
  msgVolume: 80,
  callTone: "melody",
  callVolume: 90,
  desktopNotif: true,
  groqKey: ""
};

// Voice Note State
let voiceMediaRecorder = null;
let voiceAudioChunks = [];
let voiceTimerInterval = null;
let voiceDuration = 0;

document.addEventListener("DOMContentLoaded", () => {
  loadSavedSettings();
  restoreSession();
  setupOutsideClick();
});

function showLoading() { const el = document.getElementById("loading"); if (el) el.style.display = "flex"; }
function hideLoading() { const el = document.getElementById("loading"); if (el) el.style.display = "none"; }
function toast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2800);
}

// ============================================================================
// AI STUDIO CONTROLLER (TOMBOL DI SEBELAH SETTING)
// ============================================================================
window.openAiStudioModal = function() {
  document.getElementById("aiStudioModal")?.classList.add("show");
};

window.closeAiStudioModal = function() {
  document.getElementById("aiStudioModal")?.classList.remove("show");
};

window.selectAiStudioTask = function(title, promptTemplate) {
  closeAiStudioModal();
  selectTarget(AI_BOT_TARGET);
  const input = document.getElementById("messageInput");
  if (input) {
    input.innerHTML = promptTemplate;
    input.focus();
  }
};

window.openGroqAiDirectly = function() {
  selectTarget(AI_BOT_TARGET);
};

// ============================================================================
// PENGATURAN / SETTINGS
// ============================================================================
function loadSavedSettings() {
  const saved = localStorage.getItem("wassapp_user_settings");
  if (saved) {
    try { appSettings = Object.assign({}, appSettings, JSON.parse(saved)); } catch(e) {}
  }
}

window.openSettingsModal = function() {
  const el = document.getElementById("settingGroqKey");
  if (el) el.value = appSettings.groqKey || "";
  document.getElementById("settingsModal")?.classList.add("show");
};

window.closeSettingsModal = function() {
  document.getElementById("settingsModal")?.classList.remove("show");
};

window.saveSettings = function() {
  const keyEl = document.getElementById("settingGroqKey");
  if (keyEl) appSettings.groqKey = keyEl.value.trim();
  localStorage.setItem("wassapp_user_settings", JSON.stringify(appSettings));
  closeSettingsModal();
  toast("Pengaturan berhasil disimpan!");
};

// ============================================================================
// AUTHENTIKASI & SESI
// ============================================================================
window.toggleAuthView = function(view) {
  const loginView = document.getElementById("formLoginView");
  const regView = document.getElementById("formRegisterView");
  if (!loginView || !regView) return;
  loginView.style.display = view === "register" ? "none" : "block";
  regView.style.display = view === "register" ? "block" : "none";
};

window.submitLogin = async function() {
  if (!ensureSupabaseReady()) return;

  const email = (document.getElementById("loginEmail")?.value || "").trim().toLowerCase();
  const pass = document.getElementById("loginPassword")?.value || "";
  if (!email || !pass) { toast("Email dan Password harus diisi."); return; }

  showLoading();
  try {
    const { data: users, error } = await supabaseClient.from("users").select("*").eq("email", email).limit(1);
    if (error) throw error;
    if (!users || users.length === 0) throw new Error("Email tidak terdaftar.");

    const dbUser = users[0];
    await supabaseClient.from("users").update({ status: "Online", last_seen: new Date().toISOString() }).eq("id", dbUser.id);

    currentUser = {
      id: dbUser.id,
      email: dbUser.email,
      nama: dbUser.nama,
      mataPelajaran: dbUser.mata_pelajaran || "Belum diatur",
      avatar: dbUser.avatar || ""
    };

    localStorage.setItem("alghozali_user_session", JSON.stringify(currentUser));
    hideLoading();
    startApplication();
  } catch (err) {
    hideLoading();
    toast("Gagal masuk: " + (err.message || "Periksa koneksi"));
  }
};

window.submitRegister = async function() {
  if (!ensureSupabaseReady()) return;

  const name = (document.getElementById("regName")?.value || "").trim();
  const phone = (document.getElementById("regSubject")?.value || "").trim();
  const email = (document.getElementById("regEmail")?.value || "").trim().toLowerCase();
  const pass = document.getElementById("regPassword")?.value || "";

  if (!name || !email || !pass) { toast("Nama, Email, dan Password wajib diisi."); return; }
  if (pass.length < 6) { toast("Password minimal 6 karakter."); return; }

  showLoading();
  try {
    const { data: insertedUser, error } = await supabaseClient
      .from("users")
      .insert([{
        nama: name,
        mata_pelajaran: phone || "Belum diatur",
        email: email,
        password: pass,
        status: "Online",
        last_seen: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    currentUser = {
      id: insertedUser.id,
      email: insertedUser.email,
      nama: insertedUser.nama,
      mataPelajaran: insertedUser.mata_pelajaran || "Belum diatur",
      avatar: ""
    };

    localStorage.setItem("alghozali_user_session", JSON.stringify(currentUser));
    hideLoading();
    startApplication();
  } catch (err) {
    hideLoading();
    toast("Gagal mendaftar: " + (err.message || "Periksa koneksi"));
  }
};

function restoreSession() {
  const saved = localStorage.getItem("alghozali_user_session");
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      if (currentUser && currentUser.id) {
        if (ensureSupabaseReady()) {
          supabaseClient.from("users").update({ status: "Online", last_seen: new Date().toISOString() }).eq("id", currentUser.id).then(() => {});
        }
        startApplication();
      }
    } catch (e) { localStorage.removeItem("alghozali_user_session"); }
  }
}

window.logout = async function() {
  if (currentUser && supabaseClient) {
    try {
      await supabaseClient.from("users").update({ status: "Offline", last_seen: new Date().toISOString() }).eq("id", currentUser.id);
    } catch (e) {}
  }
  currentUser = null;
  selectedTarget = null;
  localStorage.removeItem("alghozali_user_session");
  document.getElementById("app").style.display = "none";
  document.getElementById("loginScreen").style.display = "flex";
};

function startApplication() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("app").style.display = "flex";
  updateMyProfile();
  loadAllData();
  setupRealtime();
}

async function loadAllData() {
  await Promise.all([loadTeachers(), loadGroups()]);
  renderSidebarList();
}

function setupRealtime() {
  if (!supabaseClient) return;
  if (realtimeChannel) supabaseClient.removeChannel(realtimeChannel);

  realtimeChannel = supabaseClient
    .channel("public-messenger")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
      handleIncomingMessage(payload.new);
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
      handleMessageUpdate(payload.new);
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (payload) => {
      handleMessageDelete(payload.old);
    })
    .subscribe();
}

function handleIncomingMessage(msg) {
  if (!currentUser || !msg) return;
  const isGroup = Boolean(msg.group_id);
  const isCurrentChat = selectedTarget && selectedTarget.type !== "ai" && (
    (isGroup && selectedTarget.type === "group" && selectedTarget.id === msg.group_id) ||
    (!isGroup && selectedTarget.type !== "group" && (
      (msg.sender_id === selectedTarget.id && msg.receiver_id === currentUser.id) ||
      (msg.sender_id === currentUser.id && msg.receiver_id === selectedTarget.id)
    ))
  );

  if (isCurrentChat) {
    const exists = currentMessages.some((m) => m.id === msg.id);
    if (!exists) {
      currentMessages.push({
        id: msg.id,
        sender: msg.sender_id,
        receiver: msg.receiver_id,
        groupId: msg.group_id,
        messageText: msg.message_text,
        messageType: msg.message_type || "TEXT",
        attachment: msg.attachment_url,
        timestamp: msg.created_at
      });
      renderMessages();
    }
  }
}

function handleMessageUpdate(updatedMsg) {
  const target = currentMessages.find((m) => m.id === updatedMsg.id);
  if (target) { target.messageText = updatedMsg.message_text; renderMessages(); }
}

function handleMessageDelete(deletedMsg) {
  currentMessages = currentMessages.filter((m) => m.id !== deletedMsg.id);
  renderMessages();
}

// ============================================================================
// KONTAK & GRUP
// ============================================================================
async function loadTeachers() {
  if (!ensureSupabaseReady()) return;
  try {
    const { data } = await supabaseClient.from("users").select("id, nama, mata_pelajaran, avatar, status, last_seen").order("nama", { ascending: true });
    teachers = (data || []).map((t) => ({ type: "user", id: t.id, nama: t.nama, mataPelajaran: t.mata_pelajaran, avatar: t.avatar, status: t.status }));
  } catch (e) {}
}

async function loadGroups() {
  if (!ensureSupabaseReady()) return;
  try {
    const { data } = await supabaseClient.from("groups").select("id, name, description, avatar, created_by").order("created_at", { ascending: false });
    groups = (data || []).map((g) => ({ type: "group", id: g.id, name: g.name, description: g.description || "Grup Chat", avatar: g.avatar, status: "Grup Chat" }));
  } catch (e) {}
}

window.setSidebarTab = function(tab) {
  activeSidebarTab = tab;
  document.getElementById("tabAll")?.classList.toggle("active", tab === "all");
  document.getElementById("tabDirect")?.classList.toggle("active", tab === "direct");
  document.getElementById("tabGroup")?.classList.toggle("active", tab === "group");
  document.getElementById("tabAi")?.classList.toggle("active", tab === "ai");
  renderSidebarList();
};

function renderSidebarList() {
  const container = document.getElementById("contacts");
  if (!container) return;

  const query = (document.getElementById("searchInput")?.value || "").trim().toLowerCase();
  let list = [];
  const otherUsers = teachers.filter((t) => !currentUser || t.id !== currentUser.id);

  if (activeSidebarTab === "all") list = [AI_BOT_TARGET, ...groups, ...otherUsers];
  else if (activeSidebarTab === "direct") list = [AI_BOT_TARGET, ...otherUsers];
  else if (activeSidebarTab === "group") list = groups;
  else if (activeSidebarTab === "ai") list = [AI_BOT_TARGET];

  if (query) {
    list = list.filter((item) => {
      const name = item.type === "group" ? item.name : item.nama;
      const sub = item.type === "group" ? item.description : item.mataPelajaran;
      return (name || "").toLowerCase().includes(query) || (sub || "").toLowerCase().includes(query);
    });
  }

  container.innerHTML = "";
  list.forEach((item) => {
    const isAi = item.type === "ai";
    const isGroup = item.type === "group";
    const el = document.createElement("div");
    el.className = "contact";
    if (selectedTarget && selectedTarget.type === item.type && selectedTarget.id === item.id) {
      el.classList.add("active");
    }
    el.onclick = () => selectTarget(item);

    const avatar = document.createElement("div");
    avatar.className = "avatar " + (isAi ? "ai-avatar" : isGroup ? "group-avatar" : "");
    if (isAi) avatar.innerHTML = "🤖";
    else if (item.avatar) avatar.innerHTML = `<img src="${item.avatar}" alt="avatar">`;
    else avatar.textContent = isGroup ? "👥" : getInitial(item.nama);

    const title = isGroup ? item.name : item.nama;
    const subtitle = isAi ? "Asisten AI Groq (GPT-OSS 120B / Qwen 3.6)" : isGroup ? (item.description || "Grup Chat") : (item.mataPelajaran || "Belum diatur");

    const details = document.createElement("div");
    details.className = "contact-details";
    details.innerHTML = `
      <div class="contact-name">
        <span>${escapeHtml(title)} ${isAi ? '<span class="ai-badge">BOT AI</span>' : isGroup ? '<span class="group-badge">GRUP</span>' : ''}</span>
      </div>
      <div class="contact-sub">
        <span>${!isGroup ? `<span class="online-dot ${item.status === 'Online' ? 'online' : ''}"></span>` : ''}${escapeHtml(subtitle)}</span>
      </div>
    `;

    el.appendChild(avatar);
    el.appendChild(details);
    container.appendChild(el);
  });
}

window.filterContacts = function() { renderSidebarList(); };

window.selectTarget = function(item) {
  selectedTarget = item;
  cancelEditMessage();
  const isAi = item.type === "ai";
  const isGroup = item.type === "group";
  const title = isGroup ? item.name : item.nama;

  document.getElementById("chatName").textContent = title;
  const statusEl = document.getElementById("chatStatus");

  if (isAi) {
    statusEl.textContent = "🟢 Model Produksi: openai/gpt-oss-120b (Siap Menjawab)";
    statusEl.className = "chat-status status-ai";
    document.getElementById("aiPromptsBar")?.classList.add("show");
  } else {
    statusEl.textContent = isGroup ? (item.description || "Grup Chat") : (item.status === "Online" ? "Online" : (item.mataPelajaran || "Offline"));
    statusEl.className = "chat-status " + (!isGroup && item.status === "Online" ? "status-online" : "");
    document.getElementById("aiPromptsBar")?.classList.remove("show");
  }

  setAvatar("chatAvatar", item.avatar, isGroup, isAi);
  const callActions = document.getElementById("callActions");
  if (callActions) callActions.style.display = (!isGroup && !isAi) ? "flex" : "none";

  renderSidebarList();
  document.getElementById("app")?.classList.add("mobile-chat-open");
  refreshMessages();
};

window.closeMobileChat = function() { document.getElementById("app")?.classList.remove("mobile-chat-open"); };
window.applyAiPrompt = function(promptText) {
  const input = document.getElementById("messageInput");
  if (input) { input.innerHTML = promptText; input.focus(); }
};

// ============================================================================
// CHAT MESSAGES & GROQ AI ENGINE
// ============================================================================
window.refreshMessages = async function() {
  if (!currentUser || !selectedTarget) return;

  if (selectedTarget.type === "ai") {
    loadAiMessagesLocal();
    return;
  }

  if (!ensureSupabaseReady()) return;

  try {
    let query = supabaseClient.from("messages").select("*");
    if (selectedTarget.type === "group") {
      query = query.eq("group_id", selectedTarget.id);
    } else {
      query = query.or(
        `and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedTarget.id}),and(sender_id.eq.${selectedTarget.id},receiver_id.eq.${currentUser.id})`
      );
    }

    const { data } = await query.order("created_at", { ascending: true });
    currentMessages = (data || []).map((m) => ({
      id: m.id,
      sender: m.sender_id,
      receiver: m.receiver_id,
      groupId: m.group_id,
      messageText: m.message_text,
      messageType: m.message_type || "TEXT",
      attachment: m.attachment_url,
      timestamp: m.created_at
    }));

    renderMessages();
  } catch (err) { console.error("Refresh messages error:", err); }
};

function loadAiMessagesLocal() {
  const saved = localStorage.getItem("alghozali_ai_chat_history_" + (currentUser?.id || "guest"));
  if (saved) {
    try { currentMessages = JSON.parse(saved); } catch(e) { currentMessages = []; }
  } else {
    currentMessages = [{
      id: "ai_welcome",
      sender: "ai_bot",
      messageText: "Assalamu'alaikum! Saya **Al-Ghozali AI Assistant** (didukung oleh *Groq Model Produksi GPT-OSS 120B*).\n\nAda yang bisa saya bantu hari ini?\n- 💡 Membuat ide artikel & esai ilmiah\n- 📚 Menyusun modul bahan ajar / RPP lengkap\n- 🕌 Naskah Khutbah Jumat & Kultum berdalil\n- 📜 Menulis puisi & pantun indah\n- 🎵 Membuat lirik lagu bermakna\n- 💻 Coding semua bahasa pemrograman (HTML, JS, Python, PHP, C++, SQL, dll)\n- 🎨 Merancang susunan stiker & seni emoji",
      messageType: "TEXT",
      timestamp: new Date().toISOString()
    }];
  }
  renderMessages();
}

function saveAiMessagesLocal() {
  if (currentUser) {
    localStorage.setItem("alghozali_ai_chat_history_" + currentUser.id, JSON.stringify(currentMessages));
  }
}

function renderMessages() {
  const container = document.getElementById("messages");
  if (!container) return;

  if (!selectedTarget) {
    container.innerHTML = '<div class="empty-chat"><div class="big">💬</div><h3>WassApp</h3><p style="margin-top:8px">Pilih kontak, grup, atau Al-Ghozali AI Assistant.</p></div>';
    return;
  }

  if (!currentMessages.length) {
    const title = selectedTarget.type === "group" ? selectedTarget.name : selectedTarget.nama;
    container.innerHTML = `<div class="empty-chat"><div class="big">👋</div><h3>Belum ada percakapan</h3><p>Kirim pesan pertama kepada ${escapeHtml(title)}</p></div>`;
    return;
  }

  container.innerHTML = "";
  currentMessages.forEach((message) => {
    const mine = String(message.sender) === String(currentUser.id);
    const isAi = message.sender === "ai_bot";
    const wrapper = document.createElement("div");
    wrapper.className = "message " + (mine ? "me" : isAi ? "ai" : "other");

    let html = "";
    const type = message.messageType || "TEXT";

    if (mine && selectedTarget.type !== "ai") {
      html += `
        <button type="button" class="msg-action-trigger" onclick="toggleMsgMenu(event, '${message.id}')">⋮</button>
        <div class="msg-menu" id="menu_${message.id}">
          ${type === 'TEXT' ? `<button type="button" class="msg-menu-item" onclick="startEditMessage('${message.id}')">✏️ Edit Pesan</button>` : ''}
          <button type="button" class="msg-menu-item danger" onclick="deleteMessage('${message.id}')">🗑️ Hapus Pesan</button>
        </div>
      `;
    }

    if (type === "IMAGE" && message.attachment) {
      html += `<img src="${message.attachment}" alt="foto">`;
    }

    if (type === "AUDIO" && message.attachment) {
      html += `
        <div class="vn-container">
          <button type="button" class="vn-play-btn" onclick="playAudio('${message.attachment}', this)">▶</button>
          <div class="vn-body">
            <div class="vn-waveform"><span class="vn-bar"></span><span class="vn-bar" style="height:14px;"></span><span class="vn-bar" style="height:8px;"></span><span class="vn-bar" style="height:16px;"></span><span class="vn-bar"></span></div>
            <span class="vn-time">${message.messageText || 'Pesan Suara'}</span>
          </div>
        </div>
      `;
    } else if (message.messageText) {
      html += `<span>${formatAiMarkdown(message.messageText)}</span>`;
    }

    html += `<span class="message-meta">${formatTime(message.timestamp)} ${mine ? '<span class="message-status">✓✓</span>' : ''}</span>`;
    wrapper.innerHTML = html;
    container.appendChild(wrapper);
  });

  setTimeout(() => { container.scrollTop = container.scrollHeight; }, 40);
}

function formatAiMarkdown(text) {
  if (!text) return "";
  let s = escapeHtml(text);
  s = s.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/\n/g, "<br>");
  return s;
}

window.toggleMsgMenu = function(e, msgId) {
  e.stopPropagation();
  document.querySelectorAll(".msg-menu.show").forEach((m) => { if (m.id !== "menu_" + msgId) m.classList.remove("show"); });
  document.getElementById("menu_" + msgId)?.classList.toggle("show");
};

window.startEditMessage = function(msgId) {
  const msg = currentMessages.find((m) => String(m.id) === String(msgId));
  if (!msg) return;
  editingMessageId = msgId;
  const input = document.getElementById("messageInput");
  input.innerHTML = msg.messageText || "";
  input.focus();
  document.getElementById("editingBanner")?.classList.add("show");
  document.getElementById("sendBtn").textContent = "✓";
  document.getElementById("menu_" + msgId)?.classList.remove("show");
};

window.cancelEditMessage = function() {
  editingMessageId = null;
  const input = document.getElementById("messageInput");
  if (input) input.innerHTML = "";
  document.getElementById("editingBanner")?.classList.remove("show");
  document.getElementById("sendBtn").textContent = "➤";
};

window.deleteMessage = async function(msgId) {
  if (!confirm("Apakah Anda yakin ingin menghapus pesan ini?")) return;
  document.getElementById("menu_" + msgId)?.classList.remove("show");
  showLoading();
  try {
    await supabaseClient.from("messages").delete().eq("id", msgId);
    currentMessages = currentMessages.filter((m) => String(m.id) !== String(msgId));
    renderMessages();
    hideLoading();
    toast("Pesan berhasil dihapus.");
  } catch (err) {
    hideLoading();
    toast("Gagal menghapus: " + err.message);
  }
};

// ============================================================================
// PENGIRIMAN PESAN & QUERY KE GROQ AI
// ============================================================================
window.sendMessage = async function() {
  if (!currentUser) { toast("Silakan masuk terlebih dahulu."); return; }
  if (!selectedTarget) { toast("Pilih kontak, grup, atau AI terlebih dahulu."); return; }

  const input = document.getElementById("messageInput");
  const text = input.innerHTML;

  if (editingMessageId) {
    if (!text.replace(/<[^>]*>?/gm, "").trim()) { toast("Pesan tidak boleh kosong."); return; }
    const updateId = editingMessageId;
    cancelEditMessage();
    try {
      await supabaseClient.from("messages").update({ message_text: text }).eq("id", updateId);
      const target = currentMessages.find((m) => String(m.id) === String(updateId));
      if (target) { target.messageText = text; renderMessages(); }
      toast("Pesan berhasil diubah.");
    } catch (err) { toast("Gagal mengubah: " + err.message); }
    return;
  }

  if (!text.replace(/<[^>]*>?/gm, "").trim() && !selectedImage) return;

  const rawText = input.innerText.trim();
  input.innerHTML = "";
  input.style.height = "40px";
  removeAttachment();
  hideEmoji();

  // CHAT DENGAN GROQ AI
  if (selectedTarget.type === "ai") {
    currentMessages.push({
      id: "usr_" + Date.now(),
      sender: currentUser.id,
      messageText: rawText,
      messageType: "TEXT",
      timestamp: new Date().toISOString()
    });
    renderMessages();
    saveAiMessagesLocal();

    const aiTempId = "ai_res_" + Date.now();
    currentMessages.push({
      id: aiTempId,
      sender: "ai_bot",
      messageText: "✍️ *Sedang memproses dan menyusun respon terbaik...*",
      messageType: "TEXT",
      timestamp: new Date().toISOString()
    });
    renderMessages();

    try {
      const groqResponse = await queryGroqAiWithFallback(rawText);
      const aiMsgObj = currentMessages.find((m) => m.id === aiTempId);
      if (aiMsgObj) {
        aiMsgObj.messageText = groqResponse;
        renderMessages();
        saveAiMessagesLocal();
      }
    } catch (err) {
      const aiMsgObj = currentMessages.find((m) => m.id === aiTempId);
      if (aiMsgObj) {
        aiMsgObj.messageText = "⚠️ **Kendala Koneksi Groq AI:**\n" + (err.message || "Pastikan koneksi internet stabil.");
        renderMessages();
      }
    }
    return;
  }

  // PESAN NORMAL KE SUPABASE
  const isGroup = selectedTarget.type === "group";
  const payload = {
    sender_id: currentUser.id,
    receiver_id: isGroup ? null : selectedTarget.id,
    group_id: isGroup ? selectedTarget.id : null,
    message_text: text,
    message_type: selectedImage ? "IMAGE" : "TEXT",
    attachment_url: selectedImage || ""
  };

  try {
    const { data, error } = await supabaseClient.from("messages").insert([payload]).select().single();
    if (error) throw error;
    if (data) {
      currentMessages.push({
        id: data.id,
        sender: data.sender_id,
        receiver: data.receiver_id,
        groupId: data.group_id,
        messageText: data.message_text,
        messageType: data.message_type || "TEXT",
        attachment: data.attachment_url,
        timestamp: data.created_at
      });
      renderMessages();
    }
  } catch (err) {
    console.error("Send error:", err);
    toast("Gagal mengirim: " + err.message);
  }
};

// ============================================================================
// GROQ AI RESILIENT ENGINE (AUTO-FALLBACK KE MODEL AKTIF)
// ============================================================================
async function queryGroqAiWithFallback(prompt) {
  const apiKey = appSettings.groqKey || DEFAULT_GROQ_KEY;

  const conversationContext = [
    {
      role: "system",
      content: "Anda adalah Al-Ghozali AI Assistant, asisten cerdas dan komprehensif. Anda ahli membuat ide inovatif, artikel ilmiah, bahan ajar kurikulum guru, teks khutbah Jumat berdalil shahih, puisi & pantun, lirik lagu, mahir coding semua bahasa pemrograman (HTML, JS, Python, PHP, C++, SQL, Java), dan seni emotikon. Berikan jawaban yang terstruktur dan rapi."
    }
  ];

  const lastHistory = currentMessages.slice(-6);
  lastHistory.forEach((msg) => {
    if (msg.sender === "ai_bot") {
      conversationContext.push({ role: "assistant", content: msg.messageText.replace(/\*/g, "") });
    } else {
      conversationContext.push({ role: "user", content: msg.messageText });
    }
  });

  conversationContext.push({ role: "user", content: prompt });

  let lastError = null;

  for (const modelName of GROQ_PRODUCTION_MODELS) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: modelName,
          messages: conversationContext,
          temperature: 0.7,
          max_tokens: 2500
        })
      });

      if (res.ok) {
        const json = await res.json();
        const output = json?.choices?.[0]?.message?.content;
        if (output) return output;
      } else {
        const errTxt = await res.text();
        lastError = new Error(`Model ${modelName} error: ${errTxt}`);
      }
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error("Gagal mendapatkan respon dari server Groq AI.");
}

// ============================================================================
// PROFILE
// ============================================================================
window.openProfile = function() {
  document.getElementById("profileModal")?.classList.add("show");
  document.getElementById("profileName").value = currentUser.nama || "";
  document.getElementById("profileSubject").value = currentUser.mataPelajaran || "";
  tempProfileAvatar = currentUser.avatar || "";
  setAvatar("profilePreview", tempProfileAvatar);
};

window.closeProfile = function() { document.getElementById("profileModal")?.classList.remove("show"); };

window.previewProfilePhoto = function(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) { toast("Ukuran foto maksimal 3MB."); return; }

  const reader = new FileReader();
  reader.onload = (e) => {
    tempProfileAvatar = e.target.result;
    setAvatar("profilePreview", tempProfileAvatar);
  };
  reader.readAsDataURL(file);
};

window.saveProfile = async function() {
  const name = document.getElementById("profileName").value.trim();
  const subject = document.getElementById("profileSubject").value.trim();
  if (!name) { toast("Nama tidak boleh kosong."); return; }

  showLoading();
  try {
    await supabaseClient.from("users").update({
      nama: name,
      mata_pelajaran: subject,
      avatar: tempProfileAvatar
    }).eq("id", currentUser.id);

    currentUser.nama = name;
    currentUser.mataPelajaran = subject;
    currentUser.avatar = tempProfileAvatar;
    localStorage.setItem("alghozali_user_session", JSON.stringify(currentUser));

    updateMyProfile();
    closeProfile();
    hideLoading();
    toast("Profil & Foto berhasil disimpan!");
    loadTeachers().then(renderSidebarList);
  } catch (err) {
    hideLoading();
    toast("Gagal menyimpan profil: " + err.message);
  }
};

// ============================================================================
// VOICE NOTE RECORDING & PLAYBACK
// ============================================================================
window.toggleVoiceRecording = async function() {
  const bar = document.getElementById("recordingBar");
  if (bar.classList.contains("show")) sendVoiceRecording();
  else startVoiceRecording();
};

async function startVoiceRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    voiceAudioChunks = [];
    voiceDuration = 0;
    voiceMediaRecorder = new MediaRecorder(stream);
    voiceMediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) voiceAudioChunks.push(e.data);
    };
    voiceMediaRecorder.start();
    document.getElementById("recordingBar")?.classList.add("show");

    clearInterval(voiceTimerInterval);
    voiceTimerInterval = setInterval(() => {
      voiceDuration++;
      const m = String(Math.floor(voiceDuration / 60)).padStart(2, "0");
      const s = String(voiceDuration % 60).padStart(2, "0");
      document.getElementById("recordingTimer").textContent = `${m}:${s}`;
    }, 1000);
  } catch (err) { toast("Akses mikrofon tidak diizinkan."); }
}

window.cancelVoiceRecording = function() {
  if (voiceMediaRecorder) voiceMediaRecorder.stop();
  clearInterval(voiceTimerInterval);
  document.getElementById("recordingBar")?.classList.remove("show");
  toast("Rekaman dibatalkan.");
};

window.sendVoiceRecording = function() {
  if (!voiceMediaRecorder) return;
  const m = Math.floor(voiceDuration / 60);
  const s = String(voiceDuration % 60).padStart(2, "0");
  const timeLabel = `${m}:${s}`;

  voiceMediaRecorder.onstop = async () => {
    const audioBlob = new Blob(voiceAudioChunks, { type: "audio/webm" });
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Audio = reader.result;
      if (!currentUser || !selectedTarget) return;

      const isGroup = selectedTarget.type === "group";
      const payload = {
        sender_id: currentUser.id,
        receiver_id: isGroup ? null : selectedTarget.id,
        group_id: isGroup ? selectedTarget.id : null,
        message_text: `🎙️ ${timeLabel}`,
        message_type: "AUDIO",
        attachment_url: base64Audio
      };

      const { data } = await supabaseClient.from("messages").insert([payload]).select().single();
      if (data) {
        currentMessages.push({
          id: data.id,
          sender: data.sender_id,
          receiver: data.receiver_id,
          groupId: data.group_id,
          messageText: data.message_text,
          messageType: "AUDIO",
          attachment: data.attachment_url,
          timestamp: data.created_at
        });
        renderMessages();
      }
    };
    reader.readAsDataURL(audioBlob);
  };

  voiceMediaRecorder.stop();
  clearInterval(voiceTimerInterval);
  document.getElementById("recordingBar")?.classList.remove("show");
};

window.playAudio = function(src, btn) {
  const audio = new Audio(src);
  btn.textContent = "⏸";
  audio.play();
  audio.onended = () => { btn.textContent = "▶"; };
};

// WhatsApp Invite
window.inviteViaWa = function() {
  if (!selectedTarget || selectedTarget.type === "ai") return;
  const phone = (selectedTarget.mataPelajaran || "").replace(/\D/g, "");
  let waPhone = phone;
  if (waPhone.startsWith("0")) waPhone = "62" + waPhone.substring(1);
  const text = encodeURIComponent(`Assalamu'alaikum ${selectedTarget.nama}, mari bergabung di WassApp: ${window.location.href}`);
  window.open(`https://api.whatsapp.com/send?phone=${waPhone}&text=${text}`, "_blank");
};

// ============================================================================
// STIKER ARAB, EMOJI & ATTACHMENT
// ============================================================================
window.switchEmojiTab = function(e, tabKey) {
  document.querySelectorAll(".emoji-tab-item").forEach((btn) => btn.classList.remove("active"));
  if (e && e.currentTarget) e.currentTarget.classList.add("active");

  document.getElementById("tabContent_arabic").style.display   = tabKey === "arabic"   ? "block" : "none";
  document.getElementById("tabContent_islamic").style.display  = tabKey === "islamic"  ? "block" : "none";
  document.getElementById("tabContent_faces").style.display    = tabKey === "faces"    ? "block" : "none";
  document.getElementById("tabContent_gestures").style.display = tabKey === "gestures" ? "block" : "none";
  document.getElementById("tabContent_school").style.display   = tabKey === "school"   ? "block" : "none";
};

window.toggleEmoji = function() { document.getElementById("emojiPanel")?.classList.toggle("show"); };
window.hideEmoji = function() { document.getElementById("emojiPanel")?.classList.remove("show"); };
window.addEmoji = function(emoji) { const input = document.getElementById("messageInput"); if (input) { input.innerHTML += emoji; input.focus(); } };
window.addText = function(text) { const input = document.getElementById("messageInput"); if (input) { input.innerHTML = (input.innerHTML ? input.innerHTML + " " : "") + text; input.focus(); hideEmoji(); } };

window.previewImage = function(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    selectedImage = e.target.result;
    document.getElementById("previewImage").src = selectedImage;
    document.getElementById("attachmentPreview")?.classList.add("show");
  };
  reader.readAsDataURL(file);
};

window.removeAttachment = function() {
  selectedImage = null;
  const fileEl = document.getElementById("fileInput");
  if (fileEl) fileEl.value = "";
  document.getElementById("attachmentPreview")?.classList.remove("show");
};

window.handleMessageKey = function(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
};

function setupOutsideClick() {
  document.addEventListener("click", (e) => {
    const panel = document.getElementById("emojiPanel");
    if (panel && !panel.contains(e.target) && !e.target.closest(".composer .icon-btn")) {
      hideEmoji();
    }
    if (!e.target.closest(".msg-action-trigger") && !e.target.closest(".msg-menu")) {
      document.querySelectorAll(".msg-menu.show").forEach((m) => m.classList.remove("show"));
    }
  });
}

// Tambah Kontak
window.openAddContactModal = function() { document.getElementById("addContactModal")?.classList.add("show"); };
window.closeAddContactModal = function() { document.getElementById("addContactModal")?.classList.remove("show"); };

window.saveNewContact = async function() {
  const name = document.getElementById("addContactName").value.trim();
  const phone = document.getElementById("addContactPhone").value.trim();
  if (!name || !phone) { toast("Harap isi nama dan nomor HP."); return; }

  showLoading();
  try {
    const { data: newUser, error } = await supabaseClient
      .from("users")
      .insert([{
        nama: name,
        mata_pelajaran: phone,
        email: phone.replace(/\D/g, "") + "@wassapp.local",
        password: "password123",
        status: "Offline"
      }])
      .select()
      .single();

    if (error) throw error;
    hideLoading();
    closeAddContactModal();
    toast("Kontak berhasil ditambahkan!");
    await loadAllData();
    selectTarget({ type: "user", id: newUser.id, nama: newUser.nama, mataPelajaran: newUser.mata_pelajaran, avatar: "" });
  } catch (err) {
    hideLoading();
    toast("Gagal tambah kontak: " + err.message);
  }
};

function updateMyProfile() {
  if (!currentUser) return;
  document.getElementById("myName").textContent = currentUser.nama;
  document.getElementById("mySubject").textContent = currentUser.mataPelajaran || "Belum diatur";
}

function setAvatar(elementId, avatar, isGroup = false, isAi = false) {
  const element = document.getElementById(elementId);
  if (!element) return;
  if (isAi) {
    element.innerHTML = "🤖";
  } else if (avatar) {
    element.innerHTML = `<img src="${avatar}" alt="avatar">`;
  } else {
    element.textContent = isGroup ? "👥" : "👤";
  }
}

function getInitial(name) {
  const words = String(name || "").trim().split(/\s+/);
  if (!words.length || !words[0]) return "👤";
  return words[0].substring(0, 2).toUpperCase();
}

function ensureSupabaseReady() {
  if (!supabaseClient && typeof initSupabaseClient === "function") initSupabaseClient();
  return Boolean(supabaseClient);
}

function escapeHtml(v) { return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
```
