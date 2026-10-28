// Public endpoint configuration only. API keys belong on the server, never in the APK.
window.wassappApiEndpoint = function() {
  const base = localStorage.getItem('wassapp_backend_url') || '';
  if (window.Capacitor?.isNativePlatform() && !base) {
    throw new Error('Atur alamat server AI melalui Pengaturan terlebih dahulu.');
  }
  return base ? base + '/api/chat' : '/api/chat';
};
window.openConnectionSettings = function() {
  document.getElementById('backendUrl').value = localStorage.getItem('wassapp_backend_url') || '';
  document.getElementById('connectionModal').classList.add('show');
};
window.saveConnectionSettings = function() {
  const value = document.getElementById('backendUrl').value.trim();
  try {
    if (value) {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
        throw new Error('Gunakan alamat HTTPS tanpa path, misalnya https://server-anda.vercel.app');
      }
      localStorage.setItem('wassapp_backend_url',url.origin);
    } else localStorage.removeItem('wassapp_backend_url');
    document.getElementById('connectionModal').classList.remove('show');
    toast('Alamat server disimpan.');
  } catch (error) { toast(error.message); }
};
window.wassappHandleBack = function() {
  const modal = Array.from(document.querySelectorAll('.modal.show')).at(-1);
  if (modal) { modal.classList.remove('show'); return true; }
  const emoji = document.getElementById('emojiPanel');
  if (emoji?.classList.contains('show')) { hideEmoji(); return true; }
  const app = document.getElementById('app');
  if (app?.classList.contains('mobile-chat-open')) { closeMobileChat(); return true; }
  return false;
};
document.addEventListener('DOMContentLoaded', async () => {
  const nativeApp = window.Capacitor?.isNativePlatform() ? window.Capacitor.Plugins?.App : null;
  if (nativeApp) {
    try {
      await nativeApp.addListener('backButton',async () => {
        if (!window.wassappHandleBack()) await nativeApp.minimizeApp();
      });
    } catch { console.warn('Navigasi Android belum tersedia.'); }
  }
  window.addEventListener('offline',()=>toast('Tidak ada koneksi internet. Pesan belum dapat dikirim.'));
});
