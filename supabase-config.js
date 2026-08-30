// ============================================================================
// AL-GHOZALI MESSENGER - SUPABASE CONFIGURATION
// ============================================================================

/**
 * PANDUAN PENGISIAN KREDENSIAL:
 * 1. Buka https://supabase.com/dashboard
 * 2. Pilih Project Anda -> Masuk ke menu "Project Settings" -> "API"
 * 3. Copy "Project URL" dan masukkan ke SUPABASE_URL di bawah ini
 * 4. Copy "anon / public key" dan masukkan ke SUPABASE_ANON_KEY di bawah ini
 * 
 * Catatan: Anda juga dapat memasukkan URL & Key langsung melalui menu Pengaturan di web.
 */

const DEFAULT_SUPABASE_CONFIG = {
  // Project URL Supabase Anda
  url: "https://yvvrdadchgvlpdpdlyyg.supabase.co",
  // Anon Public API Key Supabase Anda
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2dnJkYWRjaGd2bHBkcGRseXlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwNjc5ODcsImV4cCI6MjEwMzY0Mzk4N30.pvYhyfecxbr7N1-OvDod4AbayO9EwtqP0-1_TzMuvrQ"
};

// Ambil konfigurasi dari localStorage jika pengguna menyetelnya via antarmuka UI
function getActiveSupabaseConfig() {
  const customUrl = localStorage.getItem("alghozali_supabase_url");
  const customKey = localStorage.getItem("alghozali_supabase_key");

  let rawUrl = (customUrl && customUrl.trim()) ? customUrl.trim() : DEFAULT_SUPABASE_CONFIG.url.trim();
  // Bersihkan format jika ada /rest/v1 atau trailing slash
  rawUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");

  return {
    url: rawUrl,
    anonKey: (customKey && customKey.trim()) ? customKey.trim() : DEFAULT_SUPABASE_CONFIG.anonKey.trim()
  };
}

let supabaseClient = null;

function initSupabaseClient() {
  const config = getActiveSupabaseConfig();
  
  if (!config.url || !config.anonKey) {
    console.warn("Supabase URL atau Anon Key belum dikonfigurasi.");
    return null;
  }

  try {
    if (typeof window.supabase !== "undefined" && window.supabase.createClient) {
      supabaseClient = window.supabase.createClient(config.url, config.anonKey, {
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });
      console.log("Supabase Client berhasil diinisialisasi.");
      return supabaseClient;
    } else {
      console.error("Supabase JS Library CDN belum termuat.");
      return null;
    }
  } catch (err) {
    console.error("Gagal menginisialisasi Supabase Client:", err);
    return null;
  }
}

// Inisialisasi awal saat script dimuat
window.addEventListener("DOMContentLoaded", () => {
  initSupabaseClient();
});
