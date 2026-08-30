# 💬 Al-Ghozali Messenger (Supabase + Vercel)

Aplikasi pesan instan (messenger) khusus guru **YPI Al-Ghozali** yang telah diintegrasikan dengan database PostgreSQL & Realtime **Supabase**, serta siap di-deploy secara instan ke **Vercel**.

---

## 🚀 Fitur Utama
- ⚡ **Pesan Instan (Realtime)**: Menggunakan *Supabase Realtime Channel* sehingga pesan langsung muncul seketika tanpa perlu refresh.
- 🖼️ **Kirim Gambar & Foto**: Mendukung pengiriman foto dan pratinjau gambar layar penuh (*lightbox*).
- 👤 **Manajemen Akun & Profil**: Pendaftaran guru, ganti foto profil, dan status mata pelajaran.
- 🟢 **Status Online & Aktif**: Indikator guru yang sedang aktif/online.
- 🔔 **Notifikasi Audio Instan**: Efek suara ketika ada pesan masuk (*Web Audio API* bawaan browser).
- 📱 **Desain Responsif**: Tampilan rapi dan nyaman digunakan baik di Laptop/PC maupun HP Android/iOS.
- ⚙️ **Konfigurasi Fleksibel**: URL & API Key Supabase dapat diisi langsung di file kodingan atau disetel melalui tombol *Pengaturan Supabase* pada antarmuka web.

---

## 🛠️ Langkah 1: Setup Database di Supabase (Hanya 2 Menit)

1. Buka [https://supabase.com](https://supabase.com) dan buat akun / login.
2. Klik **New Project**, beri nama (misal: `alghozali-messenger`), buat password database, dan pilih region terdekat (misal: *Singapore*).
3. Setelah project siap, buka menu **SQL Editor** di sidebar kiri.
4. Klik **New query**, lalu salin seluruh isi file **[`schema.sql`](file:///d:/AlGhozali_Messenger/schema.sql)** dan tempel (*paste*) ke editor.
5. Klik tombol **Run** (atau tekan `Ctrl + Enter`).
6. Database tabel `users`, `messages`, indeks, serta fitur Realtime sudah aktif!

---

## 🔑 Langkah 2: Hubungkan Kredensial Supabase

Ada 2 cara mudah untuk mengisi kredensial Supabase:

### Cara A: Melalui Kode File (Direkomendasikan Sebelum Deploy)
1. Di Supabase Dashboard, buka menu **Project Settings** (ikon gear di kiri bawah) > **API**.
2. Salin **Project URL** dan **anon / public key**.
3. Buka file **[`js/supabase-config.js`](file:///d:/AlGhozali_Messenger/js/supabase-config.js)**:
   ```javascript
   const DEFAULT_SUPABASE_CONFIG = {
     url: "https://your-project-id.supabase.co", // Ganti dengan Project URL Anda
     anonKey: "eyJhbGciOi..."                   // Ganti dengan anon public key Anda
   };
   ```

### Cara B: Melalui Antarmuka Web Langsung
- Buka web aplikasi di browser Anda.
- Klik tombol **⚙️ Pengaturan Supabase** (di pojok atas atau halaman login).
- Masukkan URL dan Anon Key Anda, lalu klik **Simpan & Hubungkan**. Kredensial akan tersimpan di browser Anda.

---

## ☁️ Langkah 3: Hosting ke Vercel

### Opsi 1: Deploy via GitHub (Paling Praktis)
1. Buat repository baru di [GitHub](https://github.com/new).
2. Upload semua file folder proyek ini ke repository GitHub Anda.
3. Buka [https://vercel.com](https://vercel.com) dan login.
4. Klik **Add New...** > **Project** > Import repository GitHub Anda tadi.
5. Pada *Framework Preset*, pilih **Other** (karena ini pure static HTML/JS).
6. Klik **Deploy**. Website Al-Ghozali Messenger Anda akan langsung online dan memiliki domain publik (misal: `alghozali-messenger.vercel.app`).

### Opsi 2: Deploy via Vercel CLI (Lewat Terminal)
Jika Anda memiliki Node.js dan Vercel CLI:
```bash
npm install -g vercel
vercel
```
Ikuti petunjuk di terminal, dan aplikasi langsung ter-hosting.

---

## 📁 Struktur Folder Proyek
```
AlGhozali_Messenger/
├── index.html            # Halaman utama dan struktur antarmuka
├── vercel.json           # Konfigurasi deployment Vercel
├── schema.sql            # Skrip database Supabase DDL & Realtime
├── README.md             # Panduan setup dan deployment
├── css/
│   └── style.css         # Styling CSS modern, responsive & clean
└── js/
    ├── supabase-config.js # Konfigurasi Supabase Client
    └── app.js            # Logika pesan realtime, auth, dan profil
```
