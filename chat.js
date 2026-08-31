// File: api/chat.js
export default async function handler(req, res) {
  // Hanya menerima metode POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Prompt tidak boleh kosong." });
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
      const errText = await groqResponse.text();
      return res.status(groqResponse.status).json({ error: errText });
    }

    const data = await groqResponse.json();
    const reply = data?.choices?.[0]?.message?.content || "Tidak ada respon.";
    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
