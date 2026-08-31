# 💬 WassApp (Supabase + Vercel)

Aplikasi pesan instan (messenger) modern bernuansa Islami untuk guru & staf **Al-Ghozali**, dilengkapi dengan panggilan suara & video P2P WebRTC, voice note, dan realtime database **Supabase**, siap di-deploy langsung ke **Vercel**.

---

## 🚀 Fitur Unggulan

- 📹 **Video Call (Panggilan Video WebRTC)**:
  - Video dua arah real-time berkecepatan tinggi P2P.
  - Tampilan video lawan layar penuh (*Remote Viewport*) dan cermin kamera lokal (*Picture-in-Picture*).
  - Kontrol lengkap: Nyalakan/Matikan kamera, Balik kamera (Depan/Belakang), Bisukan Mikrofon (*Mute*), dan Mode Speaker.
  - Nada dering keluar & masuk menggunakan browser *Web Audio API*.
- 🎙️ **Voice Note (Pesan Suara WhatsApp Style)**:
  - Rekam suara langsung dari bilah chat dengan indikator timer dan animasi gelombang audio.
  - Tombol batal (❌) dan kirim langsung (➤).
  - Pemutar audio interaktif dengan visual waveform progress scrubber, tombol play/pause, durasi, dan pengatur kecepatan (*1.0x*, *1.5x*, *2.0x*).
- 📞 **Voice Call (Panggilan Suara)**:
  - Panggilan suara P2P jernih dengan visual ombak audio dan durasi panggilan real-time.
- ⚡ **Pesan Instan (Realtime Chat)**:
  - Pengiriman pesan teks dan foto seketika tanpa refresh.
  - Fitur **Edit Pesan** dan **Hapus Pesan**.
- 👥 **Grup Chat & Kontak Guru**:
  - Buat grup khusus dengan memilih guru anggota.
  - Tambah kontak guru baru langsung dari aplikasi.
- 🕌 **Koleksi Emoji Islami & Dzikir Cepat**:
  - Tab stiker salam (*Assalamu'alaikum, Bismillah, Alhamdulillah, Insya Allah, Barakallah*).
  - Kalimat thoyyibah, dzikir harian, dan emoji ekspresi.
- 🔔 **Notifikasi Browser & In-App Banner**:
  - Notifikasi desktop/HP saat tab di latar belakang dan badge unread pesan.
- ⚙️ **Konfigurasi Fleksibel**:
  - Supabase REST Engine siap pakai atau kustomisasi URL & Anon Key via UI.

---

## 🛠️ Langkah 1: Setup Database di Supabase (Hanya 2 Menit)

1. Buka [https://supabase.com](https://supabase.com) dan buat akun / login.
2. Buat project baru (misal: `alghozali-messenger`).
3. Buka menu **SQL Editor** di sidebar Supabase.
4. Salin seluruh isi file **[`schema.sql`](file:///d:/AlGhozali_Messenger/schema.sql)** dan tempel (*paste*) ke SQL editor.
5. Klik tombol **Run** (atau tekan `Ctrl + Enter`).
6. Tabel `users`, `messages`, `groups`, `group_members`, `calls` dan publication Realtime akan otomatis dibuat dan dikonfigurasi!

---

## 🔑 Langkah 2: Hubungkan Kredensial Supabase

### Cara A: Melalui Kode File (Direkomendasikan Sebelum Deploy)

1. Di Supabase Dashboard, buka **Project Settings** > **API**.
2. Salin **Project URL** dan **anon / public key**.
3. Buka file **[`js/supabase-config.js`](file:///d:/AlGhozali_Messenger/js/supabase-config.js)**:

   ```javascript
   const DEFAULT_SUPABASE_CONFIG = {
     url: "https://your-project-id.supabase.co",
     anonKey: "eyJhbGciOi..."
   };
   ```

### Cara B: Melalui Antarmuka Web Langsung

- Buka web aplikasi di browser.
- Klik tombol **⚙️ Pengaturan Supabase** di pojok atas atau halaman login.
- Masukkan URL dan Anon Key Anda, lalu klik **Simpan & Hubungkan**.

---

## ☁️ Langkah 3: Hosting ke Vercel

### Deploy via GitHub (Paling Praktis)

1. Buat repository baru di [GitHub](https://github.com/new).
2. Push / upload semua file proyek ini ke repository Anda.
3. Buka [https://vercel.com](https://vercel.com) > Klik **Add New...** > **Project** > Import repo GitHub Anda.
4. Klik **Deploy**. Web WassApp Al-Ghozali siap diakses secara publik dengan HTTPS (diperlukan untuk izin kamera & mikrofon WebRTC).

---

## 📁 Struktur Folder Proyek

```text
AlGhozali_Messenger/
├── index.html            # Halaman utama & aplikasi lengkap standalone
├── vercel.json           # Konfigurasi deployment Vercel
├── schema.sql            # Skrip database DDL, migrasi & WebRTC calls table
├── README.md             # Dokumentasi fitur dan panduan instalasi
├── css/
│   └── style.css         # Styling modular
└── js/
    ├── supabase-config.js # Konfigurasi default Supabase
    └── app.js            # Modul logika aplikasi
```
