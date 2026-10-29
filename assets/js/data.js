// Data simulasi 30 kelompok tani pekebun sawit swadaya di Kabupaten Siak.
// Dibangkitkan secara deterministik (seed tetap) agar tampilan selalu sama.
// Data ini BUKAN data lapangan; dipakai hanya untuk memperagakan alur sistem.

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261029);
const uni = (a, b) => a + (b - a) * rnd();
const pick = arr => arr[Math.floor(rnd() * arr.length)];
const gauss = () => { let u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

export const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const namaBulan = key => { const [y, m] = key.split('-').map(Number); return `${BULAN[m - 1]} ${y}`; };

// Indeks musim bulanan (rata-rata = 1)
const MUSIM = [0.80, 0.75, 0.85, 0.95, 1.00, 0.95, 0.95, 1.05, 1.20, 1.25, 1.20, 1.05];

// Produktivitas standar menurut umur tanaman (ton TBS/ha/tahun), pola umum kurva produksi sawit
export function produktivitasStandar(umur) {
  if (umur < 3) return 0;
  const tabel = { 3: 5, 4: 10, 5: 15, 6: 19, 7: 22, 8: 24 };
  if (umur <= 8) return tabel[umur];
  if (umur <= 14) return 26;
  if (umur <= 18) return 25;
  if (umur <= 22) return 23;
  return 20;
}

const DESA = ['Dayun', 'Banjar Seminai', 'Buantan Lestari', 'Merangkai', 'Lubuk Tilan', 'Pangkalan Makmur', 'Sawit Permai', 'Sialang Sakti', 'Teluk Merbau', 'Berumbung Baru'];
const NAMA = ['Sawit Jaya', 'Tunas Baru', 'Sumber Rezeki', 'Karya Bersama', 'Mekar Sari', 'Harapan Makmur', 'Sido Rukun', 'Bina Tani', 'Maju Mandiri', 'Tani Makmur',
  'Sri Rejeki', 'Bukit Lestari', 'Sinar Harapan', 'Tuah Sakato', 'Rukun Santoso', 'Lestari Abadi', 'Mitra Tani', 'Sejahtera', 'Usaha Bersama', 'Bunga Tanjung',
  'Cahaya Baru', 'Subur Makmur', 'Tani Mulia', 'Kencana', 'Makarti', 'Gemah Ripah', 'Rimba Jaya', 'Damai Sentosa', 'Setia Kawan', 'Pelita Tani'];
const GAPOKTAN = ['Gapoktan Maju Bersama', 'Gapoktan Sawit Lestari', 'Gapoktan Harapan Baru'];

// Periode: 12 bulan pemanasan (tidak ditampilkan) + 24 bulan laporan (Okt 2024 sampai Sep 2026)
const monthKeys = [];
for (let y = 2023, m = 10; !(y === 2026 && m === 10); ) {
  monthKeys.push(`${y}-${String(m).padStart(2, '0')}`);
  m++; if (m > 12) { m = 1; y++; }
}
export const BULAN_LAPORAN = monthKeys.slice(12);           // 24 bulan
export const BULAN_TERAKHIR = BULAN_LAPORAN[BULAN_LAPORAN.length - 1]; // 2026-09
export const BULAN_BERJALAN = '2026-10';
export const TENGGAT = 10; // laporan bulan N paling lambat tanggal 10 bulan N+1
export const HARI_INI = new Date(2026, 9, 29); // tanggal acuan peragaan

export const kuartalDari = key => { const [y, m] = key.split('-').map(Number); return `${y}-Q${Math.ceil(m / 3)}`; };
export const namaTriwulan = q => { const [y, k] = q.split('-Q'); return `Triwulan ${['I', 'II', 'III', 'IV'][k - 1]} ${y}`; };
export const TRIWULAN = [...new Set(BULAN_LAPORAN.map(kuartalDari))];  // 2024-Q4 .. 2026-Q3

export const kelompokTani = [];
for (let k = 0; k < 30; k++) {
  const luas = Math.round(uni(28, 135) * 10) / 10;
  const tahunTanam = Math.round(uni(2008, 2019));
  const kualitas = rnd();                          // kecenderungan praktik budidaya (laten)
  const efekLembaga = gauss() * 0.03;
  const kt = {
    id: `KT-${String(k + 1).padStart(2, '0')}`,
    nama: `KT ${NAMA[k]}`,
    desa: DESA[k % DESA.length],
    gapoktan: GAPOKTAN[k % 3],
    ketua: `Ketua ${String.fromCharCode(65 + (k % 26))}.`,
    luasTM: luas,
    pokok: Math.round(luas * 136 * uni(0.84, 0.97)),
    tahunTanam,
    jenisLahan: rnd() < 0.3 ? 'Gambut' : 'Mineral',
    // kebiasaan praktik per tahun
    pupukPerTahun: kualitas > 0.66 ? pick([2, 3, 3]) : kualitas > 0.33 ? pick([1, 2, 2]) : pick([0, 1, 1]),
    peluangK: kualitas > 0.5 ? uni(0.55, 0.95) : uni(0.05, 0.5),
    penyiangan: kualitas > 0.5 ? pick([4, 5, 6]) : pick([2, 3, 4]),
    penyemprotan: pick([1, 2, 3, 4]),
    penunasan: kualitas > 0.6 ? pick([1, 2, 2]) : pick([0, 0, 1]),
    efekLembaga,
    bulanan: [],
  };
  // catatan per bulan
  const hist = [];
  for (const [mi, key] of monthKeys.entries()) {
    const [y, m] = key.split('-').map(Number);
    const ev = {
      pemupukan: rnd() < kt.pupukPerTahun / 12 ? 1 : 0,
      penyiangan: rnd() < kt.penyiangan / 12 ? 1 : 0,
      penyemprotan: rnd() < kt.penyemprotan / 12 ? 1 : 0,
      penunasan: rnd() < kt.penunasan / 12 ? 1 : 0,
    };
    ev.pupukK = ev.pemupukan && rnd() < kt.peluangK ? 1 : 0;
    hist.push(ev);
    const last12 = hist.slice(-12);
    const sum = f => last12.reduce((s, e) => s + e[f], 0);
    const nPupuk = sum('pemupukan'), nK = sum('pupukK');
    let te = 0.66 + 0.045 * Math.min(nPupuk, 3) + (nPupuk > 0 && nK / nPupuk >= 0.5 ? 0.05 : 0)
      + 0.011 * Math.min(sum('penyiangan'), 6) + 0.02 * Math.min(sum('penunasan'), 2) + efekLembaga + gauss() * 0.012
      + (kualitas > 0.6 ? 0.03 : 0.005) * (mi / 12); // lembaga dengan praktik baik membaik dari waktu ke waktu
    te = Math.max(0.35, Math.min(0.97, te));
    const umur = y - tahunTanam;
    const potensiBulan = luas * produktivitasStandar(umur) / 12;
    const produksi = potensiBulan * MUSIM[m - 1] * te * 0.72 * (1 + gauss() * 0.02); // tingkat produksi rakyat di bawah standar
    kt.bulanan.push({ bulan: key, produksi: Math.round(produksi * 10) / 10, ...ev, umur });
  }
  kt.bulanan = kt.bulanan.slice(12); // hanya 24 bulan laporan yang disimpan
  kelompokTani.push(kt);
}

// Dua lembaga dengan praktik paling konsisten dijadikan contoh lembaga acuan pada enam bulan terakhir
for (const id of ['KT-05', 'KT-18']) {
  const kt = kelompokTani.find(k => k.id === id);
  Object.assign(kt, { pupukPerTahun: 3, penyiangan: 6, penunasan: 2 });
  kt.bulanan.slice(-9).forEach(r => { r.produksi = Math.round(r.produksi * 1.07 * 10) / 10; r.pemupukan = r.pemupukan || (r.bulan.endsWith('03') || r.bulan.endsWith('07') ? 1 : 0); r.pupukK = r.pemupukan; r.penyiangan = 1; });
}

// Status pelaporan bulanan (tanggal masuk); beberapa lembaga terlambat atau belum melapor
for (const kt of kelompokTani) {
  for (const r of kt.bulanan) {
    const p = rnd();
    r.tanggalLapor = p < 0.78 ? Math.round(uni(2, 10)) : p < 0.95 ? Math.round(uni(11, 20)) : Math.round(uni(21, 28));
    r.kelengkapan = rnd() < 0.85 ? 1 : Math.round(uni(0.72, 0.95) * 100) / 100;
  }
}
// Pada bulan terakhir: dua lembaga belum melapor
['KT-07', 'KT-23'].forEach(id => {
  const r = kelompokTani.find(k => k.id === id).bulanan.at(-1);
  r.belumLapor = true;
});

// Anggota dan lahan per kelompok tani (untuk form laporan)
export function lahanKelompok(kt) {
  const r = mulberry32(parseInt(kt.id.slice(3)) * 7919);
  const n = Math.max(8, Math.round(kt.luasTM / 2.6));
  const out = [];
  let sisa = kt.luasTM;
  for (let i = 0; i < n; i++) {
    const luas = i === n - 1 ? Math.max(0.5, Math.round(sisa * 10) / 10) : Math.round((kt.luasTM / n) * (0.7 + r() * 0.6) * 10) / 10;
    sisa -= luas;
    out.push({
      id: `${kt.id}-L${String(i + 1).padStart(2, '0')}`,
      pemilik: `P-${String(parseInt(kt.id.slice(3)) * 100 + i + 1).padStart(4, '0')}`,
      luas: Math.max(0.5, luas),
      tahunTanam: kt.tahunTanam + Math.round((r() - 0.5) * 4),
    });
  }
  return out;
}
