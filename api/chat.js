// File: api/chat.js
export default async function handler(req, res) {
  // Android Capacitor serves bundled assets from this HTTPS origin.
  const origin = req.headers?.origin;
  if (origin === "https://localhost") {
    res.setHeader?.("Access-Control-Allow-Origin", origin);
    res.setHeader?.("Vary", "Origin");
    res.setHeader?.("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader?.("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
  if (req.method === "OPTIONS") {
    return res.status(origin === "https://localhost" ? 204 : 403).end();
  }
  // Hanya menerima metode POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt } = req.body || {};
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 20000) {
    return res.status(400).json({ error: "Prompt wajib berupa teks, maksimal 20000 karakter." });
  }

  const authorization = req.headers?.authorization;
  if (!authorization || !/^Bearer [A-Za-z0-9._~-]+$/.test(authorization)) {
    return res.status(401).json({ error: "Silakan masuk terlebih dahulu." });
  }
  const project = process.env.SUPABASE_URL || "https://yvvrdadchgvlpdpdlyyg.supabase.co";
  const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_DY_EwsJt0Vv1sU6xpiy0xA_cicTpUZo";
  try {
    const auth = await fetch(project + "/auth/v1/user", {
      headers: { apikey: publicKey, Authorization: authorization }, signal: AbortSignal.timeout(10000)
    });
    if (!auth.ok) return res.status(auth.status >= 500 ? 503 : 401).json({ error: "Sesi masuk tidak dapat diverifikasi." });
    const user = await auth.json();
    if (!user?.id || !user.email_confirmed_at) return res.status(403).json({ error: "Konfirmasi email terlebih dahulu." });
    const quota = await fetch(project + "/rest/v1/rpc/wa_claim_ai_request", {
      method: "POST", headers: { apikey: publicKey, Authorization: authorization, "Content-Type": "application/json" },
      body: "{}", signal: AbortSignal.timeout(10000)
    });
    if (!quota.ok) return res.status(503).json({ error: "Pembatasan layanan AI belum tersedia. Periksa migrasi database." });
    if (await quota.json() !== true) return res.status(429).json({ error: "Batas 10 permintaan per menit tercapai. Coba sebentar lagi." });
  } catch {
    return res.status(503).json({ error: "Layanan verifikasi akun belum dapat dihubungi." });
  }

  // Mengambil API Key dari Environment Variable Vercel
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GROQ_API_KEY belum disetel di Vercel Environment Variables." });
  }

  const systemInstruction = `Anda adalah Al-Ghozali AI Assistant, asisten cerdas untuk guru dan profesional.
ATURAN MUTLAK JAWABAN:
1. JANGAN PERNAH balik bertanya atau meminta klarifikasi dengan tabel kosong. Jika topik kurang detail, asumsikan standar terbaik kurikulum guru (Kurikulum Merdeka / Nasional) dan langsung buatkan secara LENGKAP.
2. Jika diminta MODUL AJAR / RPP: Langsung buatkan dokumen lengkap berisi: Identitas Modul, Tujuan Pembelajaran, Profil Pelajar Pancasila, Materi Pokok, Model Pembelajaran, Langkah-Langkah Kegiatan (Pendahuluan, Inti, Penutup), dan Asesmen/Penilaian.
3. Jika diminta KHUTBAH JUMAT: Buatkan teks lengkap Khutbah Pertama (pembukaan bahasa Arab, wasiat taqwa, materi berdalil Quran/Hadits, penutup), Khutbah Kedua, dan Doa.
4. Gunakan format tabel yang rapi jika menyajikan data berkolom.
5. Berikan jawaban dalam bahasa Indonesia yang sangat rapi, santun, dan siap pakai.`;

  try {
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(45000),
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        temperature: 0.6,
        max_tokens: 3000
      })
    });

    if (!groqResponse.ok) {
      return res.status(groqResponse.status).json({ error: "Layanan AI gagal merespons. Coba kembali nanti." });
    }

    const data = await groqResponse.json();
    const reply = data?.choices?.[0]?.message?.content || "Tidak ada respon.";
    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(500).json({ error: "Layanan AI belum dapat dihubungi. Coba kembali nanti." });
  }
}
