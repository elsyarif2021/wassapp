# WassApp Android & Web

Aplikasi chat untuk guru/staf Al-Ghozali. Versi 0.2.0 memakai Capacitor 8, Supabase
Auth, PostgreSQL dengan Row Level Security, dan Supabase Realtime. Antarmuka/SDK
ikut dibundel dalam APK. Backend online belum diaktifkan atau diuji pada proyek nyata.

Mulai dari [mengaktifkan chat antar-HP](ONLINE-SETUP.md), kemudian lihat
[panduan build Android](ANDROID.md).

Fitur pada source saat ini:

- Daftar dengan konfirmasi email, login, pemulihan password, sesi terverifikasi.
- Kontak dari email akun terdaftar dan alias pribadi; profil hanya dapat diedit pemilik.
- Chat pribadi, deduplikasi realtime, pemulihan setelah koneksi kembali, edit/hapus
  milik sendiri, dan riwayat tersimpan di backend dengan RLS.
- Kompresi gambar dan voice note pendek; payload dibatasi untuk MVP.
- Pengaturan suara foreground, profil sendiri, navigasi Android, dan ekspor dokumen AI.
- Handler AI dengan verifikasi akun dan kuota database, membutuhkan kunci server Groq.

Panggilan WebRTC ada di source, tetapi belum diuji antarperangkat. TURN, push/latar
belakang dan distribusi Play Store belum disiapkan. Tidak ada klaim enkripsi ujung
ke ujung; akses data ditegakkan di server dan koneksi memakai HTTPS.

## Pengembangan

Node.js 22+, lalu:

```sh
npm ci
npm start
npm test
npm run test:browser
npm run test:database # memerlukan Docker; PostgreSQL nyata, tanpa database produksi
npm run android:sync
```

UI aktif ada di `index.html`; backend AI di `api/chat.js`; proyek Android di
`android/`. `app.js` dan `supabase-config.js` merupakan implementasi lama dan tidak
dimuat oleh UI aktif. `schema.sql` lama dinonaktifkan karena membuka akses anonim;
skema baru berada di `migrations/001_authenticated_chat.sql`.

Akun lama pada tabel `users` tidak otomatis menjadi akun Auth. Data lama tetap
tersimpan; baca dampak migrasi sebelum menjalankannya. Jangan simpan password,
service-role key, API key privat, atau keystore rilis di repository/APK/chat.
