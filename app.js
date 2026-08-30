// ============================================================================
// WASSAPP - APPLICATION LOGIC (SUPABASE POWERED)
// ============================================================================

/* Global Application State */
let currentUser = null;
let teachers = [];
let selectedContact = null;
let currentMessages = [];
let selectedImage = null;
let profileImage = null;
let realtimeChannel = null;
let pollingInterval = null;

// ============================================================================
// INITIALIZATION & LIFECYCLE
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  setupOutsideClick();
  checkSupabaseConfig();
  restoreSession();
});

// Periksa apakah Supabase URL & Anon Key sudah terisi
function checkSupabaseConfig() {
  const config = getActiveSupabaseConfig();
  const banner = document.getElementById("configBanner");
  
  if (!config.url || !config.anonKey) {
    if (banner) banner.style.display = "flex";
    return false;
  } else {
    if (banner) banner.style.display = "none";
    if (!supabaseClient) initSupabaseClient();
    return true;
  }
}

// Buka modal konfigurasi Supabase
function openConfigModal() {
  const config = getActiveSupabaseConfig();
  document.getElementById("cfgSupabaseUrl").value = config.url || "";
  document.getElementById("cfgSupabaseKey").value = config.anonKey || "";
  document.getElementById("configModal").classList.add("show");
}

function closeConfigModal() {
  document.getElementById("configModal").classList.remove("show");
}

function saveSupabaseConfig() {
  const url = document.getElementById("cfgSupabaseUrl").value.trim();
  const key = document.getElementById("cfgSupabaseKey").value.trim();

  if (!url || !key) {
    toast("Harap isi Supabase Project URL dan Anon Public Key.");
    return;
  }

  localStorage.setItem("alghozali_supabase_url", url);
  localStorage.setItem("alghozali_supabase_key", key);

  initSupabaseClient();
  closeConfigModal();
  checkSupabaseConfig();
  toast("Konfigurasi Supabase berhasil disimpan!");
}

// ============================================================================
// AUTHENTICATION (LOGIN, REGISTER, SESSION, LOGOUT)
// ============================================================================
function toggleAuthView(view) {
  if (view === "register") {
    document.getElementById("formLoginView").style.display = "none";
    document.getElementById("formRegisterView").style.display = "block";
  } else {
    document.getElementById("formRegisterView").style.display = "none";
    document.getElementById("formLoginView").style.display = "block";
  }
}

async function submitLogin() {
  if (!ensureSupabaseReady()) return;

  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const pass = document.getElementById("loginPassword").value;

  if (!email || !pass) {
    toast("Email dan Password harus diisi.");
    return;
  }

  showLoading();
  try {
    const { data, error } = await supabaseClient
      .from("users")
      .select("*")
      .eq("email", email)
      .eq("password", pass)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      hideLoading();
      toast("Email atau Password salah!");
      return;
    }

    // Update status menjadi Online & last_seen
    await supabaseClient
      .from("users")
      .update({ status: "Online", last_seen: new Date().toISOString() })
      .eq("id", data.id);

    currentUser = {
      id: data.id,
      email: data.email,
      nama: data.nama,
      mataPelajaran: data.mata_pelajaran || "Belum diatur",
      avatar: data.avatar || ""
    };

    localStorage.setItem("alghozali_user_session", JSON.stringify(currentUser));
    hideLoading();
    startApplication();
  } catch (err) {
    hideLoading();
    console.error("Login error:", err);
    toast("Gagal masuk: " + (err.message || "Periksa koneksi"));
  }
}

async function submitRegister() {
  if (!ensureSupabaseReady()) return;

  const name = document.getElementById("regName").value.trim();
  const subject = document.getElementById("regSubject").value.trim();
  const email = document.getElementById("regEmail").value.trim().toLowerCase();
  const pass = document.getElementById("regPassword").value;

  if (!name || !email || !pass) {
    toast("Nama, Email, dan Password wajib diisi.");
    return;
  }

  showLoading();
  try {
    // Cek apakah email sudah terdaftar
    const { data: existingUser, error: checkErr } = await supabaseClient
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (checkErr) throw checkErr;

    if (existingUser) {
      hideLoading();
      toast("Email ini sudah terdaftar. Silakan login.");
      return;
    }

    // Insert user baru
    const { data, error } = await supabaseClient
      .from("users")
      .insert([
        {
          nama: name,
          mata_pelajaran: subject || "Belum diatur",
          email: email,
          password: pass,
          status: "Online",
          last_seen: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;

    currentUser = {
      id: data.id,
      email: data.email,
      nama: data.nama,
      mataPelajaran: data.mata_pelajaran || "Belum diatur",
      avatar: data.avatar || ""
    };

    localStorage.setItem("alghozali_user_session", JSON.stringify(currentUser));
    hideLoading();
    startApplication();
  } catch (err) {
    hideLoading();
    console.error("Register error:", err);
    toast("Gagal mendaftar: " + (err.message || "Periksa koneksi"));
  }
}

async function restoreSession() {
  const saved = localStorage.getItem("alghozali_user_session");
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      if (currentUser && currentUser.id) {
        if (ensureSupabaseReady()) {
          // Update status online
          supabaseClient
            .from("users")
            .update({ status: "Online", last_seen: new Date().toISOString() })
            .eq("id", currentUser.id)
            .then(() => {});
        }
        startApplication();
      }
    } catch (e) {
      localStorage.removeItem("alghozali_user_session");
    }
  }
}

async function logout() {
  if (currentUser && supabaseClient) {
    try {
      await supabaseClient
        .from("users")
        .update({ status: "Offline", last_seen: new Date().toISOString() })
        .eq("id", currentUser.id);
    } catch (e) {
      console.warn("Logout status update err:", e);
    }
  }

  if (realtimeChannel) {
    supabaseClient.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  currentUser = null;
  selectedContact = null;
  localStorage.removeItem("alghozali_user_session");

  document.getElementById("app").style.display = "none";
  document.getElementById("loginScreen").style.display = "flex";
  toast("Anda telah keluar.");
}

// ============================================================================
// MAIN APP WORKFLOW & REALTIME SUBSCRIPTION
// ============================================================================
function startApplication() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("app").style.display = "flex";
  updateMyProfile();
  loadTeachers();
  setupRealtime();
  toast("Selamat datang, " + currentUser.nama);
}

// Setup Supabase Realtime Subscription
function setupRealtime() {
  if (!supabaseClient) return;

  if (realtimeChannel) {
    supabaseClient.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabaseClient
    .channel("public-messenger")
    // Listen to new messages
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload) => {
        handleIncomingMessage(payload.new);
      }
    )
    // Listen to user status / profile updates
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "users" },
      (payload) => {
        handleUserUpdate(payload.new);
      }
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "users" },
      () => {
        loadTeachers();
      }
    )
    .subscribe((status) => {
      console.log("Realtime subscription status:", status);
    });
}

function handleIncomingMessage(msg) {
  if (!currentUser) return;

  const isCurrentChat =
    selectedContact &&
    ((msg.sender_id === selectedContact.id && msg.receiver_id === currentUser.id) ||
      (msg.sender_id === currentUser.id && msg.receiver_id === selectedContact.id));

  if (isCurrentChat) {
    // Cek duplikasi ID
    const exists = currentMessages.some((m) => m.id === msg.id);
    if (!exists) {
      currentMessages.push({
        id: msg.id,
        sender: msg.sender_id,
        receiver: msg.receiver_id,
        messageText: msg.message_text,
        messageType: msg.message_type,
        attachment: msg.attachment_url,
        timestamp: msg.created_at
      });
      renderMessages();
      
      // Mainkan suara notifikasi jika pesan dari orang lain
      if (msg.sender_id !== currentUser.id) {
        playNotificationSound();
      }
    }
  } else if (msg.receiver_id === currentUser.id) {
    // Pesan dari guru lain di luar chat aktif
    playNotificationSound();
    toast("Pesan baru dari guru!");
    loadTeachers();
  }
}

function handleUserUpdate(updatedUser) {
  if (!updatedUser) return;
  
  // Jika profil saya sendiri diupdate di perangkat lain
  if (currentUser && updatedUser.id === currentUser.id) {
    currentUser.nama = updatedUser.nama;
    currentUser.mataPelajaran = updatedUser.mata_pelajaran;
    currentUser.avatar = updatedUser.avatar;
    updateMyProfile();
  }

  // Update data guru di list
  const idx = teachers.findIndex((t) => t.id === updatedUser.id);
  if (idx !== -1) {
    teachers[idx] = {
      id: updatedUser.id,
      nama: updatedUser.nama,
      mataPelajaran: updatedUser.mata_pelajaran,
      avatar: updatedUser.avatar,
      status: updatedUser.status
    };
    renderContacts();

    if (selectedContact && selectedContact.id === updatedUser.id) {
      selectedContact = teachers[idx];
      document.getElementById("chatName").textContent = selectedContact.nama;
      document.getElementById("chatStatus").textContent =
        selectedContact.status === "Online" ? "Online" : (selectedContact.mataPelajaran || "Offline");
      document.getElementById("chatStatus").className =
        "chat-status " + (selectedContact.status === "Online" ? "status-online" : "");
    }
  }
}

// ============================================================================
// CONTACTS & USERS
// ============================================================================
async function loadTeachers() {
  if (!ensureSupabaseReady()) return;

  try {
    const { data, error } = await supabaseClient
      .from("users")
      .select("id, nama, mata_pelajaran, avatar, status, last_seen")
      .order("nama", { ascending: true });

    if (error) throw error;

    teachers = Array.isArray(data)
      ? data.map((t) => ({
          id: t.id,
          nama: t.nama,
          mataPelajaran: t.mata_pelajaran,
          avatar: t.avatar,
          status: t.status
        }))
      : [];

    renderContacts();
  } catch (err) {
    console.error("Load teachers error:", err);
  }
}

function renderContacts(list) {
  const container = document.getElementById("contacts");
  const data =
    list ||
    teachers.filter((t) => !currentUser || t.id !== currentUser.id);

  if (!data.length) {
    container.innerHTML = '<div style="padding:30px; text-align:center; color:#777">Guru tidak ditemukan.</div>';
    return;
  }

  container.innerHTML = "";
  data.forEach((teacher) => {
    const item = document.createElement("div");
    item.className = "contact";
    if (selectedContact && selectedContact.id === teacher.id) {
      item.classList.add("active");
    }
    item.onclick = () => selectContact(teacher);

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    if (teacher.avatar) {
      avatar.innerHTML = `<img src="${escapeAttribute(teacher.avatar)}" alt="avatar">`;
    } else {
      avatar.textContent = getInitial(teacher.nama);
    }

    const details = document.createElement("div");
    details.className = "contact-details";
    details.innerHTML = `
      <div class="contact-name">
        <span>${escapeHtml(teacher.nama)}</span>
      </div>
      <div class="contact-sub">
        <span>
          <span class="online-dot ${teacher.status === "Online" ? "online" : ""}"></span>
          ${escapeHtml(teacher.mataPelajaran || "Belum diatur")}
        </span>
      </div>
    `;

    item.appendChild(avatar);
    item.appendChild(details);
    container.appendChild(item);
  });
}

function filterContacts() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  const result = teachers.filter((teacher) => {
    if (currentUser && teacher.id === currentUser.id) return false;
    return (
      teacher.nama.toLowerCase().includes(query) ||
      (teacher.mataPelajaran || "").toLowerCase().includes(query)
    );
  });
  renderContacts(result);
}

function selectContact(teacher) {
  selectedContact = teacher;
  document.getElementById("chatName").textContent = teacher.nama;
  const statusEl = document.getElementById("chatStatus");
  statusEl.textContent = teacher.status === "Online" ? "Online" : (teacher.mataPelajaran || "Offline");
  statusEl.className = "chat-status " + (teacher.status === "Online" ? "status-online" : "");
  
  setAvatar("chatAvatar", teacher.avatar);
  renderContacts();
  document.getElementById("app").classList.add("mobile-chat-open");
  refreshMessages();
}

function closeMobileChat() {
  document.getElementById("app").classList.remove("mobile-chat-open");
}

// ============================================================================
// CHAT MESSAGES
// ============================================================================
async function refreshMessages() {
  if (!currentUser || !selectedContact || !ensureSupabaseReady()) return;

  try {
    const { data, error } = await supabaseClient
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedContact.id}),and(sender_id.eq.${selectedContact.id},receiver_id.eq.${currentUser.id})`
      )
      .order("created_at", { ascending: true });

    if (error) throw error;

    currentMessages = Array.isArray(data)
      ? data.map((m) => ({
          id: m.id,
          sender: m.sender_id,
          receiver: m.receiver_id,
          messageText: m.message_text,
          messageType: m.message_type,
          attachment: m.attachment_url,
          timestamp: m.created_at
        }))
      : [];

    renderMessages();
  } catch (err) {
    console.error("Refresh messages error:", err);
  }
}

function renderMessages() {
  const container = document.getElementById("messages");
  if (!selectedContact) {
    container.innerHTML = `
      <div class="empty-chat">
        <div class="big">💬</div>
        <h3>WassApp</h3>
        <p style="margin-top:8px">Pilih guru di sebelah kiri untuk memulai percakapan.</p>
      </div>
    `;
    return;
  }

  if (!currentMessages.length) {
    container.innerHTML = `
      <div class="empty-chat">
        <div class="big">👋</div>
        <h3>Belum ada percakapan</h3>
        <p>Kirim pesan pertama kepada ${escapeHtml(selectedContact.nama)}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = "";
  currentMessages.forEach((message) => {
    const mine = String(message.sender) === String(currentUser.id);
    const wrapper = document.createElement("div");
    wrapper.className = "message " + (mine ? "me" : "other");

    let html = "";
    const type = message.messageType || "TEXT";
    const attachment = message.attachment || "";

    if (type === "IMAGE" && attachment) {
      html += `<img src="${escapeAttribute(attachment)}" alt="foto" onclick="openLightbox('${escapeAttribute(attachment)}')">`;
    }

    if (message.messageText) {
      html += `<span>${escapeHtml(message.messageText).replace(/\n/g, "<br>")}</span>`;
    }

    html += `
      <span class="message-meta">
        ${formatTime(message.timestamp)}
        ${mine ? '<span class="message-status">✓✓</span>' : ""}
      </span>
    `;

    wrapper.innerHTML = html;
    container.appendChild(wrapper);
  });

  scrollMessages();
}

async function sendMessage() {
  if (!currentUser || !selectedContact || !ensureSupabaseReady()) return;

  const input = document.getElementById("messageInput");
  const text = input.value.trim();

  if (!text && !selectedImage) return;

  const payload = {
    sender_id: currentUser.id,
    receiver_id: selectedContact.id,
    message_text: text,
    message_type: selectedImage ? "IMAGE" : "TEXT",
    attachment_url: selectedImage || ""
  };

  input.value = "";
  input.style.height = "42px";
  removeAttachment();
  hideEmoji();

  try {
    const { data, error } = await supabaseClient
      .from("messages")
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    // Realtime channel will automatically handle the append, but we can also handle fallback
    if (!realtimeChannel) {
      refreshMessages();
    }
  } catch (err) {
    console.error("Send message error:", err);
    toast("Gagal mengirim pesan: " + err.message);
  }
}

// ============================================================================
// PROFILE MANAGEMENT
// ============================================================================
function updateMyProfile() {
  if (!currentUser) return;
  document.getElementById("myName").textContent = currentUser.nama;
  document.getElementById("mySubject").textContent = currentUser.mataPelajaran || "Belum diatur";
  setAvatar("myAvatar", currentUser.avatar);
}

function openProfile() {
  if (!currentUser) return;
  document.getElementById("profileModal").classList.add("show");
  document.getElementById("profileName").value = currentUser.nama;
  document.getElementById("profileSubject").value =
    currentUser.mataPelajaran === "Belum diatur" ? "" : currentUser.mataPelajaran;
  profileImage = currentUser.avatar || "";
  setAvatar("profilePreview", profileImage);
}

function closeProfile() {
  document.getElementById("profileModal").classList.remove("show");
}

function previewProfile(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) {
    toast("Ukuran foto maksimal 3 MB.");
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    profileImage = e.target.result;
    setAvatar("profilePreview", profileImage);
  };
  reader.readAsDataURL(file);
}

async function saveProfile() {
  if (!currentUser || !ensureSupabaseReady()) return;

  const subject = document.getElementById("profileSubject").value.trim();
  showLoading();

  try {
    const { error } = await supabaseClient
      .from("users")
      .update({
        mata_pelajaran: subject || "Belum diatur",
        avatar: profileImage || ""
      })
      .eq("id", currentUser.id);

    if (error) throw error;

    currentUser.mataPelajaran = subject || "Belum diatur";
    currentUser.avatar = profileImage || "";
    localStorage.setItem("alghozali_user_session", JSON.stringify(currentUser));

    updateMyProfile();
    closeProfile();
    hideLoading();
    toast("Profil berhasil diperbarui.");
    loadTeachers();
  } catch (err) {
    hideLoading();
    console.error("Save profile error:", err);
    toast("Gagal menyimpan profil: " + err.message);
  }
}

// ============================================================================
// UI HELPERS & UTILITIES
// ============================================================================
function ensureSupabaseReady() {
  if (!supabaseClient) {
    initSupabaseClient();
  }
  if (!supabaseClient) {
    toast("Harap masukkan kredensial Supabase terlebih dahulu.");
    openConfigModal();
    return false;
  }
  return true;
}

function showLoading() {
  document.getElementById("loading").style.display = "flex";
}

function hideLoading() {
  document.getElementById("loading").style.display = "none";
}

function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => {
    el.classList.remove("show");
  }, 2800);
}

function setAvatar(elementId, avatar) {
  const element = document.getElementById(elementId);
  if (!element) return;
  if (avatar) {
    element.innerHTML = `<img src="${escapeAttribute(avatar)}" alt="avatar">`;
  } else {
    element.textContent = "👤";
  }
}

function getInitial(name) {
  const words = String(name || "").trim().split(/\s+/);
  if (!words.length || !words[0]) return "👤";
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function handleMessageKey(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResize(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
}

function toggleEmoji() {
  document.getElementById("emojiPanel").classList.toggle("show");
}

function hideEmoji() {
  document.getElementById("emojiPanel").classList.remove("show");
}

function addEmoji(emoji) {
  const input = document.getElementById("messageInput");
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const val = input.value;
  input.value = val.substring(0, start) + emoji + val.substring(end);
  input.focus();
  input.selectionStart = input.selectionEnd = start + emoji.length;
  autoResize(input);
}

function previewImage(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    toast("File harus berupa gambar.");
    return;
  }
  if (file.size > 4 * 1024 * 1024) {
    toast("Ukuran gambar maksimal 4 MB.");
    input.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    selectedImage = e.target.result;
    document.getElementById("previewImage").src = selectedImage;
    document.getElementById("attachmentPreview").classList.add("show");
  };
  reader.readAsDataURL(file);
}

function removeAttachment() {
  selectedImage = null;
  document.getElementById("imageInput").value = "";
  document.getElementById("attachmentPreview").classList.remove("show");
}

function openLightbox(src) {
  const lb = document.getElementById("lightbox");
  const img = document.getElementById("lightboxImg");
  img.src = src;
  lb.classList.add("show");
}

function closeLightbox() {
  document.getElementById("lightbox").classList.remove("show");
}

function scrollMessages() {
  const container = document.getElementById("messages");
  setTimeout(() => {
    container.scrollTop = container.scrollHeight;
  }, 40);
}

function setupOutsideClick() {
  document.addEventListener("click", (e) => {
    const panel = document.getElementById("emojiPanel");
    if (panel && !panel.contains(e.target) && !e.target.closest(".composer .icon-btn")) {
      hideEmoji();
    }
  });
}

function escapeHtml(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttribute(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

// Audio notifikasi pesan masuk instan dengan Web Audio API
function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
    
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // audio policy silently ignored
  }
}

// Update status Offline saat tab / browser ditutup
window.addEventListener("beforeunload", () => {
  if (currentUser && supabaseClient) {
    navigator.sendBeacon?.(
      `${getActiveSupabaseConfig().url}/rest/v1/users?id=eq.${currentUser.id}`,
      JSON.stringify({ status: "Offline" })
    );
  }
});
