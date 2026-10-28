# Mengaktifkan WassApp antar-HP

Versi 0.2.0 memakai Supabase Auth dan tabel `wa_*`. APK memuat antarmuka secara lokal;
chat antarperangkat tetap membutuhkan proyek Supabase online. Perubahan database
produksi belum dijalankan dari workspace ini karena akses proxy masih ditolak.

## 1. Migrasi database oleh pemilik proyek

Proyek yang dikonfigurasi di aplikasi: `yvvrdadchgvlpdpdlyyg.supabase.co`.
Masuk ke dashboard Supabase melalui akun pemilik proyek, buat backup database,
lalu periksa dan jalankan **seluruh** [migrasi](migrations/001_authenticated_chat.sql)
di SQL Editor. Jangan jalankan `schema.sql` lama.

Migrasi berjalan dalam satu transaksi dan sudah diuji dua kali berurutan pada
PostgreSQL 17.7. Tabel baru: `wa_profiles`, `wa_contacts`, `wa_groups`,
`wa_group_members`, `wa_messages`, `wa_calls`, dan `wa_ai_limits`.

Perubahan terhadap aplikasi lama harus diperhatikan saat penjadwalan:

- Akses API anonim/lama ke enam tabel lama ditutup. Aplikasi web/APK lama akan
  berhenti mengakses tabel tersebut setelah migrasi.
- Tabel dan riwayat lama **tidak dihapus**, tetapi tidak disalin atau diklaim otomatis
  berdasarkan alamat email. Pengguna akun tabel lama perlu mendaftar melalui Auth.
- Identitas yang sudah ada di Supabase Auth memperoleh profil baru. Pemetaan riwayat
  lama membutuhkan pekerjaan migrasi terpisah dengan bukti kepemilikan akun.
- Realtime diaktifkan untuk pesan, panggilan, profil dan kontak pada publication
  `supabase_realtime`. Publication ini harus sudah tersedia di proyek Supabase.

Jangan menempelkan service-role key, password database, atau token admin ke chat/APK.
Migrasi menggunakan SQL Editor pemilik; APK hanya memakai publishable key.

## 2. Konfigurasi Auth dan email

Di Supabase Authentication:

- Aktifkan provider Email dan **Confirm email**. Atur minimum password setidaknya
  delapan karakter; aktifkan proteksi penyalahgunaan/SMTP sesuai penggunaan proyek.
- Atur Site URL ke alamat HTTPS web WassApp yang benar-benar telah dihosting.
  Halaman web tersebut menangani tautan konfirmasi/pemulihan password.
- Gunakan email yang dapat menerima pesan konfirmasi. Setelah mengonfirmasi di
  browser, kembali ke aplikasi Android dan masuk dengan email/password tersebut.
- Pemulihan memakai tombol **Lupa password?** setelah mengisi email. Tautan membuka
  web WassApp untuk membuat password baru, lalu pengguna bisa masuk lagi di Android.

Tidak ada server password/hash buatan di aplikasi. Sesi dikelola Supabase Auth;
pemulihan sesi memverifikasi pengguna melalui provider sebelum membuka profil.

## 3. Uji dua HP

Pasang APK debug 0.2.0 pada dua HP. Daftarkan dua akun berbeda, konfirmasikan email,
lalu masuk. Pada HP pertama pilih Tambah Kontak dan masukkan **email akun HP kedua**.
Kontak harus sudah terdaftar dan terkonfirmasi; menambah kontak tidak membuat akun.

Kirim pesan dari A ke B lalu balas dari B ke A. UI memuat 200 pesan terakhir
per percakapan; riwayat yang lebih lama tetap tersimpan, tetapi pagination belum ada. Percakapan masuk muncul meskipun
pengirim belum disimpan sebagai kontak. Pastikan pesan bertahan setelah aplikasi
ditutup/dibuka dan tetap terisolasi dari akun C. Hapus kontak harus mempertahankan
akun teman dan riwayat; hapus pesan oleh pengirim mengosongkan kontennya di server.

Gambar dikompres di perangkat, dengan batas lampiran inline 512 KiB. Voice note
maksimal 60 detik, bitrate target 24 kbps dan batas payload yang sama. Ini adalah
batas MVP agar payload Realtime tetap kecil; penyimpanan media berskala besar belum
menggunakan Supabase Storage. Pengujian hardware kamera/mikrofon tetap diperlukan.

Panggilan WebRTC menunggu ICE terkumpul sebelum mengirim SDP. STUN belum menjamin
koneksi di semua jaringan; TURN dan panggilan/notifikasi latar belakang belum ada.
Tanda centang pesan menunjukkan tersimpan di server, bukan telah dibaca penerima.

## 4. Backend AI (opsional untuk tahap chat)

Deploy source repository ini ke backend Node/Vercel yang menjalankan `api/chat.js`
dan menyajikan `index.html` dari origin yang sama. Deployment belum dijalankan oleh
pekerjaan ini. `GROQ_API_KEY` hanya disimpan di environment server. `SUPABASE_URL` dan
`SUPABASE_PUBLISHABLE_KEY` dapat diatur jika menggunakan proyek lain (keduanya nilai
publik; aplikasi juga harus dibangun dengan konfigurasi proyek yang sama).

Masukkan origin HTTPS backend tersebut lewat **Alamat Server AI** di Android.
Endpoint memverifikasi bearer token ke Auth, memastikan email terkonfirmasi,
lalu meminta slot kuota atomik di database: 10 permintaan per menit per akun.
CORS mengizinkan origin Android `https://localhost` dan header Authorization.
Jika verifikasi/kuota tidak tersedia, permintaan ditolak tanpa memanggil Groq.

## Hasil yang sudah dibuktikan

- PostgreSQL sungguhan: migrasi dapat diulang, data lama tetap ada, akses anonim ke
  tabel lama ditutup, penerima dapat membaca, pihak ketiga tidak dapat membaca,
  pengirim palsu dan perubahan identitas pesan ditolak, hanya pengirim bisa edit,
  grup/call/kontak terisolasi dan kuota AI berfungsi.
- Browser dengan provider tiruan: login/konfirmasi/pemulihan, sesi palsu ditolak,
  logout, kompresi gambar, deduplikasi realtime, draft kegagalan kirim, dan pergantian
  percakapan ketika pengiriman berlangsung.
- Belum dibuktikan: migrasi pada proyek Supabase sebenarnya, pengiriman email,
  koneksi WebSocket Supabase, komunikasi dua HP dan provider AI nyata.

Jalankan `npm run test:database` untuk PostgreSQL terisolasi lewat Docker (tanpa
port publik), `npm test` untuk handler API, dan `npm run test:browser` untuk UI.
