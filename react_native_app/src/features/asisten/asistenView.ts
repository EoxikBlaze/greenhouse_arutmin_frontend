export interface AsistenReply { jawaban: string; saran: string[] }

const saranOf = (v: unknown) => (Array.isArray(v) ? v.map((s) => String(s ?? '').trim()).filter(Boolean) : []);

// Kontrak /api/ai/chat (garap.net): NDJSON, baris akhir {tipe:'selesai', jawaban, saran_pertanyaan}.
// Server lama membalas JSON biasa {jawaban}. Pratinjau per kalimat tidak dipakai.
export function parseAsisten(raw: string): AsistenReply {
  let sawStream = false;
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let o: any;
    try { o = JSON.parse(line); } catch { continue; }
    if (o?.tipe === 'kalimat') sawStream = true;
    const done = o?.tipe === 'selesai' || (o?.tipe === undefined && typeof o?.jawaban === 'string');
    if (done) {
      const jawaban = String(o.jawaban ?? '').trim();
      if (jawaban) return { jawaban, saran: saranOf(o.saran_pertanyaan) };
    }
  }
  throw new Error(sawStream ? 'Jawaban asisten terputus. Coba lagi.' : 'Jawaban asisten tidak dapat dibaca. Coba lagi.');
}
