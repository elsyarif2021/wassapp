# WassApp Android

WassApp memakai Capacitor 8 dengan antarmuka HTML/JavaScript yang dibundel di APK.
Package: `id.alghozali.wassapp`. Minimum Android 7.0 (API 24), target/compile API 36.
Backend tetap diperlukan untuk chat antarperangkat dan AI. Proyek Android ini tidak
mengubah Supabase menjadi database lokal dan tidak menyimpan kunci Groq di APK.

## Fitur dan alur

- Layar masuk/daftar, daftar kontak, chat, dan AI menggunakan aplikasi yang ada.
- Pustaka Supabase ikut dibundel: halaman awal tidak membutuhkan CDN.
- Tombol **Alamat Server AI** tersedia sebelum login dan di pengaturan. Masukkan
  origin HTTPS server WassApp yang menyediakan `/api/chat`, tanpa path atau kunci API.
- Tombol kembali menutup modal/panel chat, lalu meminimalkan aplikasi.
- Ekspor jawaban AI memakai panel berbagi Android melalui file cache `.doc`, tanpa
  izin penyimpanan luas. Pilih aplikasi tujuan untuk menyimpan atau membagikan file.
- Kamera dan mikrofon diminta ketika fitur memerlukannya oleh jembatan Capacitor.
  Tidak ada izin penyimpanan luas; pemilihan file memakai pemilih sistem.
- Backup aplikasi dinonaktifkan dan HTTP tanpa enkripsi ditolak.

## Struktur

- `android/`: proyek Android Gradle, manifest dan Activity.
- `capacitor.config.json`: nama aplikasi dan konfigurasi HTTPS lokal.
- `scripts/build-web.mjs`: menyalin aset UI dan SDK ke `dist/`.
- `android/app/src/main/java/id/alghozali/wassapp/DocumentExportPlugin.java`: berbagi dokumen native.
- `android-runtime.js`: alamat backend, status offline, dan tombol kembali.
- `api/chat.js`: handler AI yang berjalan di server/Vercel.
- `tests/`: pengujian API dan alur browser, termasuk simulasi bridge Android.

Database versi 0.2.0 menggunakan Supabase Auth dan tabel `wa_*` dengan RLS.
Ikuti [ONLINE-SETUP.md](ONLINE-SETUP.md) sebelum menggunakan APK untuk komunikasi
antar-HP. Akun/riwayat tabel lama tidak diklaim otomatis; data lama tetap dipertahankan.

## Menjalankan dan membangun

Butuh Node.js 22+, JDK 21, Android SDK platform 36 dan build-tools 35.0.0 (default AGP 8.13).
Android Studio dapat memasang SDK dan membuka direktori `android/`.

```sh
npm ci
npm run android:sync
npm run android:open
```

Atau gunakan Gradle setelah `ANDROID_HOME`/`android/local.properties` menunjuk SDK:

```sh
cd android
./gradlew assembleDebug --max-workers=2
```

APK debug: `android/app/build/outputs/apk/debug/app-debug.apk`.
APK debug untuk pengujian; bukan rilis Play Store. Untuk AAB rilis gunakan Android
Studio **Generate Signed Bundle / APK**, dengan keystore milik pengembang yang
tersimpan aman di luar Git. Jangan mengirim password/keystore ke percakapan.

Backend lokal dapat dijalankan dengan `npm start`; Android fisik membutuhkan alamat
HTTPS yang dapat dijangkau perangkat. Konfigurasikan `GROQ_API_KEY` hanya di backend.
Handler menerima preflight CORS dari origin Capacitor `https://localhost`.
Endpoint AI memverifikasi pengguna melalui Supabase Auth dan memakai kuota atomik
di database, 10 permintaan per menit per akun. GROQ_API_KEY tetap hanya di server.

## Pengujian

```sh
npm test
# Dengan server node berjalan di port 3000:
npm run test:browser
# Setelah build:web, layani dist/ di port 3002 untuk tes aset Android:
python3 -m http.server 3002 --bind 127.0.0.1 --directory dist
node tests/android-web.cjs
```

Pengujian browser menyimulasikan database/bridge; tidak membuktikan fitur perangkat.
Uji di HP: login akun uji nyata, dua perangkat bertukar pesan/gambar/voice note,
izin kamera/mikrofon diterima dan ditolak, panggilan dua arah, rotasi, keyboard,
koneksi terputus dan pemulihan. Notifikasi/panggilan saat aplikasi di latar belakang
belum memakai push/foreground service; jangan mengandalkan proses WebView tetap hidup.
Jaringan tertentu memerlukan TURN selain STUN yang sudah ada.

### Build di workspace cloud ini

SDK dan compiler JDK sudah disiapkan di luar repository. Gunakan:

```sh
npm run android:sync
cd android
ANDROID_HOME=/workspace/android-sdk \
ANDROID_USER_HOME=/workspace/android-user/.android \
GRADLE_USER_HOME=/workspace/gradle-cache \
JAVA_HOME=/workspace/jdk-root/usr/lib/jvm/java-21-openjdk-amd64 \
./gradlew -Duser.home=/workspace/android-user assembleDebug lintDebug --max-workers=2
```

JDK di `/usr/lib/jvm` pada image dasar hanya berisi runtime; gunakan compiler JDK di
lokasi di atas. Pengaturan proxy Gradle lokal berada di luar repository, dalam
`/workspace/gradle-cache/gradle.properties`; sesuaikan dengan proxy platform jika
alamat proxy pada task baru berubah. Jangan menonaktifkan verifikasi TLS.

## Verifikasi versi 0.2.0

- Pengujian migrasi/RLS dijalankan pada PostgreSQL sungguhan di Docker, termasuk
  pengulangan migrasi, penutupan akses legacy, tiga identitas dan kuota AI.
- Pengujian browser/Auth memakai provider tiruan; ini tidak membuktikan layanan Auth,
  email konfirmasi, WebSocket, atau komunikasi antar-HP pada proyek online.
- Tidak ada perubahan database produksi dan tidak ada deployment backend yang dilakukan.
- Lihat ONLINE-SETUP.md untuk langkah wajib sebelum uji perangkat.

APK tahap ini: `/workspace/artifacts/WassApp-0.2.0-debug.apk`, versionCode 2.
Build `:app:assembleDebug :app:lintDebug` berhasil, dengan 0 error / 13 peringatan
template. Tanda tangan debug v2 valid dan aset APK cocok dengan source bundel terbaru.
Pengujian API/browser serta PostgreSQL nyata lulus; belum ada pengujian HP atau
layanan Supabase/Groq produksi. Instruksi setup/startup cloud diperbarui dalam draft,
belum dipublikasikan atau diuji pemulihannya pada task baru.
