// Model DEA-BCC berorientasi keluaran dengan frontier gabungan antartriwulan.
//   maks φo
//   Σ λj xij <= xio          (masukan: luas TM, pokok produktif, potensi produksi standar)
//   Σ λj y'j >= φo y'o       (keluaran: produksi TBS terkoreksi musim)
//   Σ λj = 1, λj >= 0        (skala hasil variabel)
// TE = 1/φ*, lembaga acuan = λ* > 0, target = φ* y'o × Iq, kesenjangan BMP Δk = Σ λj* bkj − bko
import { simplexMax } from './lp.js';
import { kelompokTani, TRIWULAN, kuartalDari, produktivitasStandar } from './data.js';

export const FITUR_BMP = [
  { key: 'pemupukan', label: 'Pemupukan', satuan: 'kali/tahun' },
  { key: 'pupukK', label: 'Pemupukan dengan pupuk berkalium', satuan: 'kali/tahun' },
  { key: 'penyiangan', label: 'Penyiangan piringan dan gawangan', satuan: 'kali/tahun' },
  { key: 'penyemprotan', label: 'Penyemprotan herbisida', satuan: 'kali/tahun' },
  { key: 'penunasan', label: 'Penunasan pelepah', satuan: 'kali/tahun' },
];

// Agregasi triwulan
export const observasi = [];
for (const kt of kelompokTani) {
  for (const q of TRIWULAN) {
    const rows = kt.bulanan.filter(r => kuartalDari(r.bulan) === q);
    if (!rows.length) continue;
    const idxQ = kt.bulanan.findIndex(r => kuartalDari(r.bulan) === q);
    const trailing = kt.bulanan.slice(Math.max(0, idxQ + rows.length - 12), idxQ + rows.length);
    const skala = 12 / trailing.length;
    const bmp = {};
    for (const f of FITUR_BMP) bmp[f.key] = Math.round(trailing.reduce((s, r) => s + r[f.key], 0) * skala * 10) / 10;
    const umur = rows[0].umur;
    observasi.push({
      kt, q,
      produksi: rows.reduce((s, r) => s + r.produksi, 0),
      luas: kt.luasTM, pokok: kt.pokok,
      potensi: kt.luasTM * produktivitasStandar(umur) / 4,
      umur, kelasUmur: umur <= 10 ? '≤ 10 tahun' : '> 10 tahun',
      bmp,
    });
  }
}
// Indeks musim triwulan Iq = rata-rata produksi triwulan ke-q / rata-rata seluruh triwulan
const rata = observasi.reduce((s, o) => s + o.produksi / o.potensi, 0) / observasi.length;
const idxMusim = {};
for (const k of [1, 2, 3, 4]) {
  const sub = observasi.filter(o => o.q.endsWith('Q' + k));
  idxMusim[k] = sub.reduce((s, o) => s + o.produksi / o.potensi, 0) / sub.length / rata;
}
for (const o of observasi) { o.Iq = idxMusim[+o.q.slice(-1)]; o.y = o.produksi / o.Iq; }

function hitung() {
  const n = observasi.length;
  const X = observasi.map(o => [o.luas, o.pokok, o.potensi]);
  const Y = observasi.map(o => o.y);
  for (let oi = 0; oi < n; oi++) {
    const o = observasi[oi];
    // variabel: λ1..λn, φ
    const c = new Array(n + 1).fill(0); c[n] = 1;
    const A = [], b = [], t = [];
    for (let i = 0; i < 3; i++) { const row = X.map(x => x[i]); row.push(0); A.push(row); b.push(X[oi][i]); t.push('<='); }
    const rowY = Y.map(v => -v); rowY.push(Y[oi]); A.push(rowY); b.push(0); t.push('<=');
    const rowC = new Array(n).fill(1); rowC.push(0); A.push(rowC); b.push(1); t.push('=');
    const res = simplexMax(c, A, b, t);
    const phi = res.status === 'optimal' ? res.x[n] : 1;
    const lam = res.status === 'optimal' ? res.x.slice(0, n) : [];
    o.phi = phi;
    o.skor = Math.min(1, 1 / phi);
    o.peers = [];
    lam.forEach((l, j) => { if (l > 1e-6 && j !== oi) o.peers.push({ obs: observasi[j], bobot: l }); });
    if (o.skor > 0.9995) o.peers = [];
    o.target = (phi * o.y) * o.Iq;
    o.gapBMP = {};
    if (o.peers.length) {
      const totalW = o.peers.reduce((s, p) => s + p.bobot, 0);
      for (const f of FITUR_BMP) {
        const acuan = o.peers.reduce((s, p) => s + p.bobot * p.obs.bmp[f.key], 0) / totalW;
        o.gapBMP[f.key] = { lembaga: o.bmp[f.key], acuan, selisih: acuan - o.bmp[f.key] };
      }
    }
  }
}
hitung();

export function kategoriSkor(s) {
  if (s >= 0.9995) return 'Efisien';
  if (s >= 0.90) return 'Hampir efisien';
  if (s >= 0.80) return 'Sedang';
  return 'Rendah';
}
export const AMBANG = { prioritas: 0.80 };

export const obsLembaga = (id, q) => observasi.find(o => o.kt.id === id && o.q === q);
export const riwayatLembaga = id => observasi.filter(o => o.kt.id === id);

// Rekomendasi: acuan (skor minimal 0,95 dua triwulan berturut-turut), prioritas (skor < 0,80 atau produksi
// turun dua triwulan), selain itu pantau. Catatan: dengan frontier gabungan dan masukan yang hampir tetap,
// sebuah lembaga praktis hanya dapat efisien penuh pada satu triwulan, sehingga syarat "efisien dua triwulan
// berturut-turut" hampir tidak mungkin terpenuhi. Karena itu prototipe memakai ambang 0,95.
export const AMBANG_ACUAN = 0.95;
export function rekomendasi(id, q) {
  const h = riwayatLembaga(id); const i = h.findIndex(o => o.q === q);
  const cur = h[i], prev = h[i - 1], prev2 = h[i - 2];
  if (cur.skor >= AMBANG_ACUAN && prev && prev.skor >= AMBANG_ACUAN) return 'Acuan';
  const turun = prev && prev2 && cur.y < prev.y && prev.y < prev2.y;
  if (cur.skor < AMBANG.prioritas || turun) return 'Prioritas pembinaan';
  return 'Pantau';
}

export function peringkat(q) {
  const rows = observasi.filter(o => o.q === q).slice().sort((a, b) => b.skor - a.skor || b.y / b.potensi - a.y / a.potensi);
  rows.forEach((o, i) => o.rank = i + 1);
  return rows;
}

export function labelAcuan(obs) { return `${obs.kt.nama}`; }
