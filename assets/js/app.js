import { kelompokTani, lahanKelompok, namaBulan, namaTriwulan, BULAN_LAPORAN, BULAN_TERAKHIR, BULAN_BERJALAN, TENGGAT, TRIWULAN, HARI_INI } from './data.js';
const hariLewat = bulan => { const [y, m] = bulan.split('-').map(Number); return Math.round((HARI_INI - new Date(y, m, TENGGAT)) / 864e5); };
import { observasi, FITUR_BMP, kategoriSkor, rekomendasi, peringkat, obsLembaga, riwayatLembaga } from './dea.js';
import { hasilAturan, cocokAturan } from './cart.js';
import { esc, fmt, fmt0, pct, status, statusRekomendasi, statusKategori, scoreBar, lineChart, sparkline, store, downloadCSV } from './ui.js';

const Q_AKHIR = TRIWULAN.at(-1);
const qPendek = q => { const [y, k] = q.split('-Q'); return `Tw ${['I', 'II', 'III', 'IV'][k - 1]} ${y.slice(2)}`; };
const ktById = id => kelompokTani.find(k => k.id === id);
const app = document.getElementById('app');

// ---------------- peran pengguna ----------------
const PERAN = [
  { v: 'dinas', t: 'Staf Dinas Pertanian (Bidang Perkebunan)' },
  { v: 'penyuluh', t: 'Penyuluh Pendamping' },
  ...kelompokTani.map(k => ({ v: 'kt:' + k.id, t: `Pengurus ${k.nama}` })),
];
const peran = () => store.get().peran || 'dinas';
const NAV = {
  dinas: [['Pemantauan', [['#/ringkasan', 'Ringkasan'], ['#/rekap', 'Rekap laporan bulanan']]],
    ['Analisis', [['#/benchmark', 'Benchmarking DEA'], ['#/aturan', 'Aturan BMP acuan']]],
    ['Pembinaan', [['#/tindak-lanjut', 'Catatan tindak lanjut']]],
    ['Referensi', [['#/metode', 'Metode dan data']]]],
  penyuluh: [['Validasi', [['#/validasi', 'Validasi aturan BMP'], ['#/penilaian', 'Penilaian lembaga']]],
    ['Analisis', [['#/benchmark', 'Benchmarking DEA']]],
    ['Referensi', [['#/metode', 'Metode dan data']]]],
  kt: [['Pelaporan', [['#/lapor', 'Laporan bulanan'], ['#/riwayat', 'Riwayat laporan']]],
    ['Umpan balik', [['#/posisi', 'Posisi lembaga']]],
    ['Referensi', [['#/metode', 'Metode dan data']]]],
};
const navFor = p => NAV[p.startsWith('kt:') ? 'kt' : p];
const beranda = p => p.startsWith('kt:') ? '#/lapor' : p === 'penyuluh' ? '#/validasi' : '#/ringkasan';

function shell(content, active) {
  const p = peran();
  const nav = navFor(p).map(([g, items]) => `<div class="grp">${g}</div>` + items.map(([h, t]) => `<a href="${h}" class="${active === h ? 'on' : ''}">${t}</a>`).join('')).join('');
  document.getElementById('nav').innerHTML = nav;
  const sel = document.getElementById('peran');
  sel.innerHTML = PERAN.map(o => `<option value="${o.v}" ${o.v === p ? 'selected' : ''}>${esc(o.t)}</option>`).join('');
  app.innerHTML = content + `<footer class="foot">Prototipe SPK Pembinaan Lembaga Pekebun Sawit. Lomba Riset Mahasiswa BPDP 2026-2027, Politeknik Caltex Riau. Data simulasi, dihitung langsung di peramban.</footer>`;
  window.scrollTo(0, 0);
}
const head = (title, lead = '', right = '', crumb = '') =>
  `<div class="page-head"><div>${crumb ? `<div class="crumb">${crumb}</div>` : ''}<h1>${title}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}</div><div>${right}</div></div>`;
const figures = items => `<dl class="figures">${items.map(([t, v, cls = '']) => `<div class="${cls}"><dt>${t}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
const optTriwulan = q => TRIWULAN.map(t => `<option value="${t}" ${t === q ? 'selected' : ''}>${namaTriwulan(t)}</option>`).join('');

// ---------------- status laporan ----------------
function statusLaporan(r) {
  if (r.belumLapor) return { kode: 'belum', teks: 'Belum melapor', kind: 'alert' };
  if (r.tanggalLapor > TENGGAT) return { kode: 'terlambat', teks: `Terlambat ${r.tanggalLapor - TENGGAT} hari`, kind: 'warn' };
  return { kode: 'tepat', teks: 'Tepat waktu', kind: 'ok' };
}
function tglLapor(bulan, r) {
  if (r.belumLapor) return '';
  const [y, m] = bulan.split('-').map(Number); const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
  return `${String(r.tanggalLapor).padStart(2, '0')}/${String(nm).padStart(2, '0')}/${ny}`;
}

// ---------------- Dinas: ringkasan ----------------
function vRingkasan() {
  const b = BULAN_TERAKHIR;
  const rows = kelompokTani.map(kt => ({ kt, r: kt.bulanan.find(x => x.bulan === b) }));
  const st = rows.map(x => statusLaporan(x.r).kode);
  const masuk = st.filter(s => s !== 'belum').length, telat = st.filter(s => s === 'terlambat').length;
  const komp = rows.filter(x => !x.r.belumLapor).reduce((s, x) => s + x.r.kelengkapan, 0) / masuk;
  const rank = peringkat(Q_AKHIR);
  const prior = rank.filter(o => rekomendasi(o.kt.id, Q_AKHIR) === 'Prioritas pembinaan').sort((a, b) => a.skor - b.skor);
  const s = store.get(); const val = s.validasi || {};
  const semuaAturan = Object.values(hasilAturan).flatMap(h => h.aturan);
  const menunggu = semuaAturan.filter(a => !val[a.id]).length;
  shell(head('Ringkasan', `Kondisi pelaporan ${namaBulan(b)} dan hasil benchmarking ${namaTriwulan(Q_AKHIR)} untuk ${kelompokTani.length} kelompok tani mitra.`) +
    figures([
      ['Laporan masuk', `${masuk} <small>dari ${rows.length}</small>`],
      ['Terlambat', `${telat}`, telat ? 'is-warn' : ''],
      ['Belum melapor', `${rows.length - masuk}`, rows.length - masuk ? 'is-alert' : ''],
      ['Kelengkapan isian', pct(komp, 1)],
      ['Prioritas pembinaan', `${prior.length} <small>lembaga</small>`, prior.length ? 'is-alert' : ''],
      ['Aturan BMP menunggu validasi', `${menunggu}`],
    ]) +
    `<div class="cols-3-2"><section class="block"><h2>Lembaga prioritas pembinaan, ${namaTriwulan(Q_AKHIR)}</h2>
      <div class="tbl-wrap"><table class="data"><thead><tr><th>Kelompok tani</th><th>Skor efisiensi</th><th class="num">Produksi (ton)</th><th class="num">Target (ton)</th><th>Aspek BMP terbesar</th></tr></thead><tbody>
      ${prior.slice(0, 8).map(o => {
        const g = Object.entries(o.gapBMP).sort((a, b) => b[1].selisih - a[1].selisih)[0];
        const lab = g ? FITUR_BMP.find(f => f.key === g[0]).label : '';
        return `<tr class="row-link" data-href="#/lembaga/${o.kt.id}?q=${Q_AKHIR}"><td><a href="#/lembaga/${o.kt.id}?q=${Q_AKHIR}">${esc(o.kt.nama)}</a><div class="small muted">${esc(o.kt.gapoktan)}</div></td><td>${scoreBar(o.skor)}</td><td class="num">${fmt(o.produksi)}</td><td class="num">${fmt(o.target)}</td><td>${esc(lab)}${g ? ` <span class="muted small">(+${fmt(g[1].selisih)} kali/tahun)</span>` : ''}</td></tr>`;
      }).join('')}</tbody></table></div>
      <p class="small" style="margin-top:8px"><a href="#/benchmark">Lihat seluruh peringkat</a></p></section>
      <section class="block"><h2>Belum melapor, ${namaBulan(b)}</h2>
      ${rows.filter(x => x.r.belumLapor).length ? `<div class="tbl-wrap"><table class="data"><thead><tr><th>Kelompok tani</th><th>Gapoktan</th><th>Tenggat</th></tr></thead><tbody>${rows.filter(x => x.r.belumLapor).map(x => `<tr><td>${esc(x.kt.nama)}</td><td>${esc(x.kt.gapoktan)}</td><td>${status('Lewat ' + hariLewat(b) + ' hari', 'alert')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Semua lembaga sudah melapor.</p>'}
      <h2 style="margin-top:24px;padding-bottom:6px;border-bottom:1px solid var(--rule)">Produksi bulanan seluruh lembaga</h2>
      <div style="margin-top:10px">${(() => { const tot = BULAN_LAPORAN.map(bl => kelompokTani.reduce((s, k) => s + k.bulanan.find(x => x.bulan === bl).produksi, 0)); return `${sparkline(tot, { w: 360, h: 60 })}<p class="small muted">${namaBulan(BULAN_LAPORAN[0])} sampai ${namaBulan(b)}. Terakhir ${fmt0(tot.at(-1))} ton.</p>`; })()}</div>
      </section></div>`, '#/ringkasan');
}

// ---------------- Dinas: rekap laporan ----------------
function vRekap(params) {
  const b = params.get('bulan') || BULAN_TERAKHIR;
  const iB = BULAN_LAPORAN.indexOf(b);
  const rows = kelompokTani.map(kt => {
    const r = kt.bulanan.find(x => x.bulan === b), prev = kt.bulanan[iB - 1];
    return { kt, r, prev, st: statusLaporan(r) };
  });
  const masuk = rows.filter(x => x.st.kode !== 'belum');
  const total = masuk.reduce((s, x) => s + x.r.produksi, 0);
  shell(head('Rekap laporan bulanan', 'Rekap otomatis dari laporan yang dikirim pengurus kelompok tani. Tidak ada pengetikan ulang di Dinas.',
    `<button class="btn" id="ekspor">Ekspor ke Excel (CSV)</button>`) +
    `<div class="toolbar"><div class="field"><label for="bulan">Bulan laporan</label><select id="bulan">${BULAN_LAPORAN.slice().reverse().map(x => `<option value="${x}" ${x === b ? 'selected' : ''}>${namaBulan(x)}</option>`).join('')}</select></div>
     <span class="hint">Tenggat laporan: tanggal ${TENGGAT} bulan berikutnya.</span></div>` +
    figures([
      ['Laporan masuk', `${masuk.length} <small>dari ${rows.length}</small>`],
      ['Tepat waktu', pct(rows.filter(x => x.st.kode === 'tepat').length / rows.length)],
      ['Kelengkapan isian wajib', pct(masuk.reduce((s, x) => s + x.r.kelengkapan, 0) / Math.max(masuk.length, 1), 1)],
      ['Total produksi TBS', `${fmt0(total)} <small>ton</small>`],
    ]) +
    `<div class="tbl-wrap"><table class="data"><thead><tr><th>Kelompok tani</th><th>Gapoktan</th><th>Desa</th><th>Diterima</th><th>Status</th><th class="num">Kelengkapan</th><th class="num">Produksi (ton)</th><th class="num">ton/ha</th><th class="num">Perubahan</th></tr></thead><tbody>
    ${rows.map(x => {
      const dlt = x.prev && !x.r.belumLapor ? (x.r.produksi - x.prev.produksi) / x.prev.produksi : null;
      return `<tr><td><a href="#/lembaga/${x.kt.id}">${esc(x.kt.nama)}</a></td><td>${esc(x.kt.gapoktan.replace('Gapoktan ', ''))}</td><td>${esc(x.kt.desa)}</td><td class="mono">${tglLapor(b, x.r) || '<span class="muted">-</span>'}</td><td>${status(x.st.teks, x.st.kind)}</td>
      <td class="num">${x.r.belumLapor ? '-' : x.r.kelengkapan < 1 ? `<span class="st-warn">${pct(x.r.kelengkapan)}</span>` : '100%'}</td>
      <td class="num">${x.r.belumLapor ? '-' : fmt(x.r.produksi)}</td><td class="num">${x.r.belumLapor ? '-' : fmt(x.r.produksi / x.kt.luasTM, 2)}</td>
      <td class="num">${dlt == null ? '-' : (dlt >= 0 ? '+' : '') + fmt(dlt * 100) + '%'}</td></tr>`;
    }).join('')}</tbody><tfoot><tr><td colspan="6">Jumlah ${masuk.length} laporan</td><td class="num">${fmt(total)}</td><td></td><td></td></tr></tfoot></table></div>`, '#/rekap');
  document.getElementById('bulan').onchange = e => location.hash = `#/rekap?bulan=${e.target.value}`;
  document.getElementById('ekspor').onclick = () => downloadCSV(`rekap-laporan-${b}.csv`, [
    ['ID', 'Kelompok tani', 'Gapoktan', 'Desa', 'Luas TM (ha)', 'Tanggal diterima', 'Status', 'Kelengkapan', 'Produksi TBS (ton)', 'Pemupukan', 'Pupuk K', 'Penyiangan', 'Penyemprotan', 'Penunasan'],
    ...rows.map(x => [x.kt.id, x.kt.nama, x.kt.gapoktan, x.kt.desa, fmt(x.kt.luasTM), tglLapor(b, x.r), x.st.teks, x.r.belumLapor ? '' : pct(x.r.kelengkapan),
      x.r.belumLapor ? '' : fmt(x.r.produksi), x.r.pemupukan, x.r.pupukK, x.r.penyiangan, x.r.penyemprotan, x.r.penunasan])]);
}

// ---------------- benchmarking ----------------
function vBenchmark(params) {
  const q = params.get('q') || Q_AKHIR, kelas = params.get('kelas') || 'semua', rek = params.get('rek') || 'semua';
  let rows = peringkat(q).map(o => ({ o, rek: rekomendasi(o.kt.id, q) }));
  const all = rows;
  if (kelas !== 'semua') rows = rows.filter(x => x.o.kelasUmur === kelas);
  if (rek !== 'semua') rows = rows.filter(x => x.rek === rek);
  const cnt = r => all.filter(x => x.rek === r).length;
  const nav = (k, v) => { const p = new URLSearchParams({ q, kelas, rek }); p.set(k, v); location.hash = '#/benchmark?' + p; };
  shell(head('Benchmarking DEA', 'Skor efisiensi relatif kelompok tani dari model DEA-BCC berorientasi keluaran. Masukan: luas tanaman menghasilkan, pokok produktif, dan potensi produksi standar. Keluaran: produksi TBS terkoreksi musim.') +
    `<div class="toolbar">
      <div class="field"><label for="q">Triwulan</label><select id="q">${optTriwulan(q)}</select></div>
      <div class="field"><label for="kelas">Kelas umur tanaman</label><select id="kelas">${['semua', '≤ 10 tahun', '> 10 tahun'].map(k => `<option ${k === kelas ? 'selected' : ''} value="${k}">${k === 'semua' ? 'Semua' : k}</option>`).join('')}</select></div>
      <div class="field"><label for="rek">Rekomendasi</label><select id="rek">${['semua', 'Prioritas pembinaan', 'Pantau', 'Acuan'].map(k => `<option ${k === rek ? 'selected' : ''} value="${k}">${k === 'semua' ? 'Semua' : k}</option>`).join('')}</select></div>
      <span class="hint">Garis tegak pada bar menandai ambang 0,80 dan 0,90.</span></div>` +
    figures([
      ['Rata-rata skor', fmt(all.reduce((s, x) => s + x.o.skor, 0) / all.length, 3)],
      ['Prioritas pembinaan', `${cnt('Prioritas pembinaan')}`, 'is-alert'],
      ['Pantau', `${cnt('Pantau')}`],
      ['Acuan', `${cnt('Acuan')}`],
      ['Potensi tambahan produksi', `${fmt0(all.reduce((s, x) => s + Math.max(0, x.o.target - x.o.produksi), 0))} <small>ton/triwulan</small>`],
    ]) +
    `<div class="tbl-wrap"><table class="data"><thead><tr><th class="num">#</th><th>Kelompok tani</th><th>Umur</th><th class="num">Produksi (ton)</th><th class="num">Target (ton)</th><th>Skor efisiensi dan kategori</th><th>Rekomendasi</th><th>Lembaga acuan (triwulan, bobot)</th></tr></thead><tbody>
    ${rows.map(({ o, rek }) => `<tr class="row-link" data-href="#/lembaga/${o.kt.id}?q=${q}"><td class="num muted">${o.rank}</td><td><a href="#/lembaga/${o.kt.id}?q=${q}">${esc(o.kt.nama)}</a></td><td class="nw">${o.kelasUmur.replace(' tahun', ' th')}</td><td class="num">${fmt(o.produksi)}</td><td class="num">${fmt(o.target)}</td><td>${scoreBar(o.skor)}<div class="small muted" style="margin-top:2px">${kategoriSkor(o.skor)}</div></td><td>${statusRekomendasi(rek)}</td>
      <td class="small">${o.peers.length ? o.peers.sort((a, b) => b.bobot - a.bobot).slice(0, 2).map(p => `<span class="nw">${esc(p.obs.kt.nama.replace('KT ', ''))} <span class="muted">${qPendek(p.obs.q)}, ${fmt(p.bobot, 2)}</span></span>`).join('<br>') : '<span class="muted">Berada di garis batas efisien</span>'}</td></tr>`).join('')}
    </tbody></table></div><p class="small muted" style="margin-top:8px">Garis batas efisien dibentuk dari seluruh triwulan sekaligus (frontier gabungan), sehingga lembaga acuan dapat berasal dari triwulan lain. Angka dalam kurung adalah bobot λ lembaga acuan.</p>`, '#/benchmark');
  ['q', 'kelas', 'rek'].forEach(k => document.getElementById(k).onchange = e => nav(k, e.target.value));
}

// ---------------- detail lembaga ----------------
function bmpGapTable(o) {
  if (!o.peers.length) return '<p class="muted">Lembaga berada di garis batas efisien pada triwulan ini, sehingga tidak memiliki lembaga acuan. Praktiknya dapat menjadi contoh bagi lembaga lain.</p>';
  return `<div class="tbl-wrap"><table class="data"><thead><tr><th>Praktik BMP (12 bulan terakhir)</th><th class="num">Lembaga ini</th><th class="num">Rata-rata acuan</th><th class="num">Selisih</th><th>Catatan</th></tr></thead><tbody>
  ${FITUR_BMP.map(f => { const g = o.gapBMP[f.key]; const perlu = g.selisih >= 1;
    return `<tr><td>${f.label}</td><td class="num">${fmt(g.lembaga)}</td><td class="num">${fmt(g.acuan)}</td><td class="num">${(g.selisih >= 0 ? '+' : '') + fmt(g.selisih)}</td><td>${perlu ? status('Perlu dibina', 'warn') : '<span class="muted">Setara</span>'}</td></tr>`; }).join('')}
  </tbody></table></div><p class="small muted" style="margin-top:6px">Satuan kali per tahun. Selisih adalah rata-rata tertimbang lembaga acuan dikurangi lembaga ini (Δ = Σλ·b − b). Selisih positif minimal 1 kali per tahun ditandai perlu dibina. Ini bahan diskusi pembinaan, bukan bukti sebab-akibat.</p>`;
}
function aturanCocok(o) {
  const h = hasilAturan[o.kelasUmur]; const val = store.get().validasi || {};
  const disetujui = h.aturan.filter(a => val[a.id]?.status === 'setuju');
  const list = disetujui.length ? disetujui : h.aturan;
  return `<p class="small muted">${disetujui.length ? 'Aturan yang sudah disetujui penyuluh' : 'Belum ada aturan yang disetujui penyuluh. Ditampilkan seluruh aturan hasil pohon keputusan'} untuk kelas umur ${o.kelasUmur}.</p>` +
    list.map(a => { const ok = cocokAturan(a, o.bmp);
      return `<div class="rule-box"><div class="head"><span class="kw">${a.id}</span>${ok ? status('Sudah dipenuhi', 'ok') : status('Belum dipenuhi', 'warn')}</div>
      <span class="kw">JIKA</span><ol>${a.syarat.map(s => `<li>${esc(s.teks)} ${o.bmp[s.f] != null ? `<span class="muted small">(lembaga ini: ${fmt(o.bmp[s.f])})</span>` : ''}</li>`).join('')}</ol>
      <span class="kw">MAKA</span> lembaga cenderung termasuk acuan.</div>`; }).join('');
}
function vLembaga(id, params, asPengurus = false) {
  const kt = ktById(id); if (!kt) return vTidakAda();
  const q = params.get('q') || Q_AKHIR;
  const o = obsLembaga(id, q), hist = riwayatLembaga(id), rek = rekomendasi(id, q);
  const rank = peringkat(q); const pos = rank.findIndex(x => x.kt.id === id) + 1;
  const s = store.get(); const tl = (s.tindakLanjut || []).filter(t => t.id === id);
  const p = peran();
  shell(head(asPengurus ? 'Posisi lembaga' : esc(kt.nama), asPengurus ? `Umpan balik untuk ${esc(kt.nama)} berdasarkan laporan bulanan yang sudah dikirim.` : `${esc(kt.gapoktan)}, Desa ${esc(kt.desa)}. ${namaTriwulan(q)}.`,
    `<div class="field"><label for="q">Triwulan</label><select id="q">${optTriwulan(q)}</select></div>`, asPengurus ? '' : '<a href="#/benchmark">Benchmarking DEA</a> / Profil lembaga') +
    figures([
      ['Skor efisiensi', fmt(o.skor, 3), o.skor < 0.8 ? 'is-alert' : ''],
      ['Peringkat', `${pos} <small>dari ${rank.length}</small>`],
      ['Kategori', kategoriSkor(o.skor)],
      ['Rekomendasi', rek, rek === 'Prioritas pembinaan' ? 'is-alert' : ''],
      ['Produksi', `${fmt(o.produksi)} <small>ton</small>`],
      ['Target', `${fmt(o.target)} <small>ton</small>`],
    ]) +
    `<div class="cols-3-2"><section class="block"><h2>Produksi per triwulan</h2>
      ${lineChart(hist.map(h => ({ aktual: h.produksi, target: h.target, potensi: h.potensi * h.Iq })), { labels: hist.map(h => qPendek(h.q)) })}
      <div class="legend"><span>Produksi aktual</span><span class="l-target">Target DEA</span><span class="l-std">Potensi standar menurut umur</span></div></section>
     <section class="block"><h2>Data lembaga</h2><table class="kv">
      <tr><th>Gapoktan</th><td>${esc(kt.gapoktan)}</td></tr><tr><th>Desa</th><td>${esc(kt.desa)}</td></tr>
      <tr><th>Luas tanaman menghasilkan</th><td>${fmt(kt.luasTM)} ha</td></tr><tr><th>Pokok produktif</th><td>${fmt0(kt.pokok)} pohon</td></tr>
      <tr><th>Tahun tanam dominan</th><td>${kt.tahunTanam} (umur ${o.umur} tahun, kelas ${o.kelasUmur})</td></tr><tr><th>Jenis lahan</th><td>${kt.jenisLahan}</td></tr>
      <tr><th>Lembaga acuan</th><td>${o.peers.length ? o.peers.sort((a, b) => b.bobot - a.bobot).map(pp => `${p.startsWith('kt:') ? esc(pp.obs.kt.nama) : `<a href="#/lembaga/${pp.obs.kt.id}?q=${pp.obs.q}">${esc(pp.obs.kt.nama)}</a>`} <span class="muted small">${qPendek(pp.obs.q)}, bobot ${fmt(pp.bobot, 2)}${pp.obs.kt.id === id ? ', capaian lembaga ini sendiri pada triwulan lain' : ''}</span>`).join('<br>') : 'Tidak ada (efisien)'}</td></tr>
     </table></section></div>
     <div class="cols"><section class="block"><h2>Kesenjangan BMP terhadap lembaga acuan</h2>${bmpGapTable(o)}</section>
     <section class="block"><h2>Aturan BMP acuan</h2>${aturanCocok(o)}</section></div>
     <section class="block"><h2>Riwayat skor</h2><div class="tbl-wrap"><table class="data"><thead><tr><th>Triwulan</th><th class="num">Produksi (ton)</th><th class="num">Target (ton)</th><th>Skor efisiensi</th><th>Kategori</th></tr></thead><tbody>
      ${hist.slice().reverse().map(h => `<tr class="${h.q === q ? 'sel' : ''}"><td>${namaTriwulan(h.q)}</td><td class="num">${fmt(h.produksi)}</td><td class="num">${fmt(h.target)}</td><td>${scoreBar(h.skor)}</td><td>${statusKategori(kategoriSkor(h.skor))}</td></tr>`).join('')}</tbody></table></div></section>
     ${p === 'dinas' ? `<section class="block"><h2>Catatan tindak lanjut pembinaan</h2>
      <form id="tl" class="cols" autocomplete="off"><div>
        <div class="field" style="margin-bottom:10px"><label for="kep">Keputusan pembinaan</label><select id="kep" required><option value="">Pilih keputusan</option><option>Kunjungan pembinaan</option><option>Pelatihan BMP</option><option>Prioritas bantuan sarana produksi</option><option>Dijadikan lembaga contoh</option><option>Pantau triwulan berikutnya</option></select></div>
        <div class="field" style="margin-bottom:10px"><label><input type="checkbox" id="rujuk" checked> Keputusan merujuk rekomendasi SPK</label></div>
        <button class="btn btn-primary" type="submit">Simpan catatan</button> <span id="tl-msg" class="small"></span></div>
        <div class="field"><label for="cat">Catatan</label><textarea id="cat" placeholder="Misalnya: fokus pemupukan berkalium, jadwal kunjungan minggu kedua November."></textarea></div></form>
      ${tl.length ? `<div class="tbl-wrap" style="margin-top:14px"><table class="data"><thead><tr><th>Tanggal</th><th>Triwulan</th><th>Keputusan</th><th>Merujuk SPK</th><th>Catatan</th></tr></thead><tbody>${tl.slice().reverse().map(t => `<tr><td class="mono">${esc(t.tgl)}</td><td>${namaTriwulan(t.q)}</td><td>${esc(t.kep)}</td><td>${t.rujuk ? 'Ya' : 'Tidak'}</td><td>${esc(t.cat)}</td></tr>`).join('')}</tbody></table></div>` : ''}
     </section>` : ''}`, asPengurus ? '#/posisi' : '#/benchmark');
  document.getElementById('q').onchange = e => location.hash = (asPengurus ? '#/posisi' : `#/lembaga/${id}`) + `?q=${e.target.value}`;
  const f = document.getElementById('tl');
  if (f) f.onsubmit = e => {
    e.preventDefault();
    const kep = document.getElementById('kep').value;
    if (!kep) { document.getElementById('tl-msg').innerHTML = '<span class="err">Pilih keputusan pembinaan terlebih dahulu.</span>'; return; }
    store.update(s => { (s.tindakLanjut ||= []).push({ id, q, kep, rujuk: document.getElementById('rujuk').checked, cat: document.getElementById('cat').value.trim(), tgl: new Date().toLocaleDateString('id-ID'), rek }); });
    vLembaga(id, params);
  };
}

// ---------------- aturan BMP ----------------
function aturanBlock(h, editable) {
  const val = store.get().validasi || {};
  const latest = observasi.filter(o => o.q === Q_AKHIR && o.kelasUmur === h.kelas);
  return `<section class="block"><h2>Kelas umur ${h.kelas}</h2>
   <table class="kv" style="max-width:640px;margin-bottom:14px">
    <tr><th>Observasi lembaga-triwulan</th><td>${h.n} (${h.nLembaga} kelompok tani, Triwulan III 2025 sampai III 2026)</td></tr>
    <tr><th>Label acuan</th><td>${h.nAcuan} observasi, skor minimal ${fmt(h.batas, 3)} (30% tertinggi)</td></tr>
    <tr><th>Balanced accuracy (validasi silang per lembaga)</th><td><b>${fmt(h.ba, 2)}</b> <span class="muted small">target minimal 0,60, tebakan acak 0,50</span></td></tr>
   </table>
   ${h.aturan.map(a => { const v = val[a.id];
     const n = latest.filter(o => cocokAturan(a, o.bmp)).length;
     const st = v?.status === 'setuju' ? status('Disetujui penyuluh', 'ok') : v?.status === 'tolak' ? status('Ditolak penyuluh', 'alert') : status('Menunggu validasi', 'warn');
     return `<div class="rule-box"><div class="head"><span><span class="kw">${a.id}</span> <span class="small muted">didukung ${a.n} observasi, ketepatan ${pct(a.ketepatan)}; dipenuhi ${n} lembaga pada ${namaTriwulan(Q_AKHIR)}</span></span>${st}</div>
     <span class="kw">JIKA</span><ol>${a.syarat.map(s => `<li>${esc(s.teks)}</li>`).join('')}</ol><span class="kw">MAKA</span> lembaga cenderung termasuk acuan.
     ${v?.catatan ? `<p class="small" style="margin:8px 0 0"><b>Catatan penyuluh:</b> ${esc(v.catatan)}</p>` : ''}
     ${editable ? `<div class="toolbar" style="margin:10px 0 0"><input type="text" data-cat="${a.id}" placeholder="Catatan (opsional)" value="${esc(v?.catatan || '')}" style="flex:1;min-width:220px">
       <button class="btn btn-small" data-val="${a.id}" data-st="setuju">Setujui</button><button class="btn btn-small" data-val="${a.id}" data-st="tolak">Tolak</button></div>` : ''}</div>`; }).join('')}
  </section>`;
}
function vAturan(editable = false) {
  const val = store.get().validasi || {};
  const semua = Object.values(hasilAturan).flatMap(h => h.aturan);
  const setuju = semua.filter(a => val[a.id]?.status === 'setuju').length, dinilai = semua.filter(a => val[a.id]).length;
  shell(head(editable ? 'Validasi aturan BMP acuan' : 'Aturan BMP acuan',
    'Aturan JIKA-MAKA hasil pohon keputusan CART (kedalaman maksimal 3, minimal 5 observasi per daun, bobot kelas seimbang) yang membedakan lembaga acuan dari lembaga lainnya. Aturan adalah hipotesis pembinaan yang harus divalidasi penyuluh, bukan bukti sebab-akibat.') +
    figures([['Jumlah aturan', `${semua.length}`], ['Sudah dinilai', `${dinilai}`], ['Disetujui', `${setuju} <small>(${dinilai ? pct(setuju / dinilai) : '0%'} dari yang dinilai)</small>`], ['Target persetujuan', 'minimal 70%']]) +
    Object.values(hasilAturan).map(h => aturanBlock(h, editable)).join(''), editable ? '#/validasi' : '#/aturan');
  if (editable) document.querySelectorAll('[data-val]').forEach(b => b.onclick = () => {
    const id = b.dataset.val; const cat = document.querySelector(`[data-cat="${id}"]`).value.trim();
    store.update(s => { (s.validasi ||= {})[id] = { status: b.dataset.st, catatan: cat }; });
    vAturan(true);
  });
}

// ---------------- penyuluh: penilaian tertutup ----------------
function vPenilaian() {
  const s = store.get(); const nilai = s.penilaian || {};
  const rows = kelompokTani.slice().sort((a, b) => a.nama.localeCompare(b.nama));
  const rank = peringkat(Q_AKHIR);
  const dinilai = rows.filter(k => nilai[k.id]);
  let rho = null;
  if (dinilai.length >= 5) {
    const r1 = dinilai.map(k => rank.findIndex(o => o.kt.id === k.id) + 1);
    const ord = dinilai.map(k => nilai[k.id]);
    const rk = arr => { const idx = arr.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]); const r = new Array(arr.length); idx.forEach(([, i], j) => r[i] = j + 1); return r; };
    const a = rk(r1), b = rk(ord.map(v => -v)); const n = a.length;
    rho = 1 - 6 * a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0) / (n * (n * n - 1));
  }
  shell(head('Penilaian lembaga', `Penilaian tertutup oleh penyuluh untuk ${namaTriwulan(Q_AKHIR)}, tanpa melihat hasil DEA. Hasilnya dipakai untuk menguji kesesuaian peringkat DEA (korelasi Spearman).`) +
    figures([['Lembaga dinilai', `${dinilai.length} <small>dari ${rows.length}</small>`], ['Korelasi Spearman dengan DEA', rho == null ? '<small>minimal 5 penilaian</small>' : fmt(rho, 2), rho != null && rho < 0.6 ? 'is-warn' : ''], ['Target', 'ρ minimal 0,60']]) +
    `<div class="tbl-wrap"><table class="data"><thead><tr><th>Kelompok tani</th><th>Gapoktan</th><th>Penilaian kinerja (1 = sangat kurang, 5 = sangat baik)</th></tr></thead><tbody>
    ${rows.map(k => `<tr><td>${esc(k.nama)}</td><td>${esc(k.gapoktan)}</td><td><select data-n="${k.id}"><option value="">Belum dinilai</option>${[1, 2, 3, 4, 5].map(v => `<option ${nilai[k.id] === v ? 'selected' : ''}>${v}</option>`).join('')}</select></td></tr>`).join('')}
    </tbody></table></div>`, '#/penilaian');
  document.querySelectorAll('[data-n]').forEach(el => el.onchange = () => { store.update(s => { (s.penilaian ||= {})[el.dataset.n] = el.value ? +el.value : undefined; }); vPenilaian(); });
}

// ---------------- tindak lanjut ----------------
function vTindakLanjut() {
  const s = store.get(); const tl = s.tindakLanjut || [];
  const rujuk = tl.filter(t => t.rujuk).length;
  shell(head('Catatan tindak lanjut pembinaan', 'Keputusan pembinaan yang dicatat Dinas. Proporsi keputusan yang merujuk rekomendasi SPK dipakai sebagai indikator pemakaian sistem.') +
    figures([['Keputusan tercatat', `${tl.length}`], ['Merujuk rekomendasi SPK', tl.length ? pct(rujuk / tl.length) : '-'], ['Target', 'minimal 70%']]) +
    (tl.length ? `<div class="tbl-wrap"><table class="data"><thead><tr><th>Tanggal</th><th>Kelompok tani</th><th>Triwulan</th><th>Rekomendasi SPK</th><th>Keputusan</th><th>Merujuk SPK</th><th>Catatan</th></tr></thead><tbody>
      ${tl.slice().reverse().map(t => `<tr><td class="mono">${esc(t.tgl)}</td><td><a href="#/lembaga/${t.id}?q=${t.q}">${esc(ktById(t.id).nama)}</a></td><td>${namaTriwulan(t.q)}</td><td>${statusRekomendasi(t.rek)}</td><td>${esc(t.kep)}</td><td>${t.rujuk ? 'Ya' : 'Tidak'}</td><td>${esc(t.cat)}</td></tr>`).join('')}
      </tbody></table></div>` : `<div class="callout">Belum ada catatan. Buka profil lembaga dari halaman <a href="#/benchmark">Benchmarking DEA</a> untuk mencatat keputusan pembinaan.</div>`), '#/tindak-lanjut');
}

// ---------------- pengurus: laporan bulanan ----------------
const JENIS_PUPUK = ['NPK 15-15-15', 'Urea', 'KCl (MOP)', 'Dolomit', 'TSP/SP-36', 'Pupuk organik'];
function vLapor(id) {
  const kt = ktById(id); const lahan = lahanKelompok(kt);
  const s = store.get(); const sudah = s.laporan?.[id]?.[BULAN_BERJALAN];
  if (sudah) return vTandaTerima(kt, sudah);
  const umurDominan = 2026 - kt.tahunTanam;
  shell(head('Laporan bulanan', `${esc(kt.nama)}, ${esc(kt.gapoktan)}. Laporan ${namaBulan(BULAN_BERJALAN)}, paling lambat ${TENGGAT} November 2026.`) +
    `<div class="callout">Isi produksi setiap lahan dalam kilogram TBS sesuai nota timbang. Kegiatan BMP diisi untuk tingkat kelompok. Laporan dikirim satu kali dan langsung diterima Dinas.</div>
    <form id="f" novalidate autocomplete="off">
    <section class="block"><h2>1. Produksi per lahan</h2>
     <div class="toolbar"><button type="button" class="btn btn-small" id="isi-contoh">Isi dengan data contoh</button><span class="hint">Untuk keperluan peragaan.</span></div>
     <div class="tbl-wrap"><table class="data"><thead><tr><th>ID lahan</th><th class="hide-sm">Pemilik (kode)</th><th class="num">Luas (ha)</th><th class="num hide-sm">Tahun tanam</th><th class="num">Produksi (kg)</th><th class="num hide-sm">kg/ha</th><th>Pemeriksaan</th></tr></thead><tbody>
     ${lahan.map((l, i) => `<tr><td class="mono nw">${l.id.slice(6)}</td><td class="mono hide-sm">${l.pemilik}</td><td class="num">${fmt(l.luas)}</td><td class="num hide-sm">${l.tahunTanam}</td>
       <td class="num"><input type="number" min="0" step="1" data-l="${i}" aria-label="Produksi ${l.id} dalam kg"></td><td class="num hide-sm" data-kgha="${i}">-</td><td data-cek="${i}" class="small"></td></tr>`).join('')}
     </tbody><tfoot><tr><td colspan="2">Jumlah ${lahan.length} lahan</td><td class="hide-sm" colspan="2"></td><td class="num" id="tot">0</td><td colspan="2"></td></tr></tfoot></table></div>
    </section>
    <section class="block"><h2>2. Kegiatan BMP bulan ini</h2>
     <div class="tbl-wrap"><table class="data"><thead><tr><th>Kegiatan</th><th>Dilakukan</th><th>Tanggal</th><th>Rincian</th><th class="num">Luas cakupan (ha)</th></tr></thead><tbody>
     ${[['pemupukan', 'Pemupukan'], ['penyemprotan', 'Penyemprotan herbisida'], ['penyiangan', 'Penyiangan piringan dan gawangan'], ['penunasan', 'Penunasan pelepah']].map(([k, t]) => `<tr><td>${t}</td>
       <td><select data-b="${k}"><option value="">Pilih</option><option value="1">Ya</option><option value="0">Tidak</option></select></td>
       <td><input type="text" data-bt="${k}" placeholder="dd/mm/2026" style="width:120px" disabled></td>
       <td>${k === 'pemupukan' ? `<select data-bj="${k}" disabled><option value="">Jenis pupuk</option>${JENIS_PUPUK.map(j => `<option>${j}</option>`).join('')}</select> <input type="number" data-bd="${k}" placeholder="kg" min="0" disabled style="width:90px">` : k === 'penyemprotan' ? `<input type="text" data-bj="${k}" placeholder="Bahan aktif" disabled style="width:160px">` : '<span class="muted">-</span>'}</td>
       <td class="num"><input type="number" data-bl="${k}" min="0" step="0.1" disabled></td></tr>`).join('')}
     </tbody></table></div></section>
    <section class="block"><h2>3. Kirim laporan</h2><div id="ringkas" class="callout">Lengkapi isian di atas.</div>
     <button class="btn btn-primary" type="submit">Kirim laporan ke Dinas</button> <span id="msg" class="small"></span></section></form>`, '#/lapor');

  const inputs = [...document.querySelectorAll('[data-l]')];
  const cek = () => {
    let tot = 0, isi = 0, salah = 0;
    inputs.forEach((el, i) => {
      const l = lahan[i]; const v = el.value === '' ? null : Number(el.value);
      const cell = document.querySelector(`[data-cek="${i}"]`), kgha = document.querySelector(`[data-kgha="${i}"]`);
      el.classList.remove('bad'); cell.innerHTML = '';
      if (v == null) { kgha.textContent = '-'; return; }
      isi++; tot += v; const p = v / l.luas; kgha.textContent = fmt0(p);
      const umur = 2026 - l.tahunTanam;
      if (v < 0 || !Number.isFinite(v)) { el.classList.add('bad'); cell.innerHTML = '<span class="err">Angka tidak valid</span>'; salah++; }
      else if (umur >= 4 && (p < 300 || p > 3800)) { el.classList.add('bad'); cell.innerHTML = `<span class="err">Di luar kisaran wajar (300-3.800 kg/ha/bulan)</span>`; salah++; }
      else cell.innerHTML = '<span class="muted">Sesuai</span>';
    });
    document.getElementById('tot').textContent = fmt0(tot);
    const bmpIsi = [...document.querySelectorAll('[data-b]')].filter(el => el.value !== '').length;
    document.getElementById('ringkas').innerHTML = `Produksi terisi ${isi} dari ${lahan.length} lahan, total ${fmt(tot / 1000)} ton (${fmt(tot / 1000 / kt.luasTM, 2)} ton/ha). Kegiatan BMP terisi ${bmpIsi} dari 4. ${salah ? `<b class="st-alert">${salah} isian perlu diperiksa.</b>` : ''}`;
    return { tot, isi, salah, bmpIsi };
  };
  inputs.forEach(el => el.oninput = cek);
  document.querySelectorAll('[data-b]').forEach(sel => sel.onchange = () => {
    const k = sel.dataset.b, on = sel.value === '1';
    document.querySelectorAll(`[data-bt="${k}"],[data-bj="${k}"],[data-bd="${k}"],[data-bl="${k}"]`).forEach(x => { x.disabled = !on; if (!on) x.value = ''; });
    cek();
  });
  document.getElementById('isi-contoh').onclick = () => {
    const r = kt.bulanan.find(x => x.bulan === '2025-10');
    const per = r.produksi * 1000 / kt.luasTM;
    inputs.forEach((el, i) => el.value = Math.round(per * lahan[i].luas * (0.85 + ((i * 37) % 30) / 100)));
    const set = (k, on, extra = {}) => { const s = document.querySelector(`[data-b="${k}"]`); s.value = on ? '1' : '0'; s.onchange();
      if (on) { document.querySelector(`[data-bt="${k}"]`).value = extra.t; document.querySelector(`[data-bl="${k}"]`).value = fmt(kt.luasTM).replace(',', '.');
        if (extra.j) document.querySelector(`[data-bj="${k}"]`).value = extra.j; if (extra.d) document.querySelector(`[data-bd="${k}"]`).value = extra.d; } };
    set('pemupukan', true, { t: '08/10/2026', j: 'KCl (MOP)', d: Math.round(kt.luasTM * 150) });
    set('penyemprotan', true, { t: '15/10/2026', j: 'Glifosat' });
    set('penyiangan', true, { t: '21/10/2026' });
    set('penunasan', false);
    cek();
  };
  document.getElementById('f').onsubmit = e => {
    e.preventDefault();
    const c = cek(); const msg = document.getElementById('msg');
    const errs = [];
    if (c.isi < lahan.length) errs.push(`${lahan.length - c.isi} lahan belum diisi produksinya`);
    if (c.salah) errs.push(`${c.salah} isian produksi di luar kisaran wajar`);
    if (c.bmpIsi < 4) errs.push('kegiatan BMP belum dipilih semua');
    document.querySelectorAll('[data-b]').forEach(sel => { if (sel.value === '1' && !document.querySelector(`[data-bt="${sel.dataset.b}"]`).value) errs.push(`tanggal ${sel.dataset.b} belum diisi`); });
    if (errs.length) { msg.innerHTML = `<span class="err">Laporan belum dapat dikirim: ${errs.join(', ')}.</span>`; return; }
    const lap = {
      noTerima: `LP-${id}-${BULAN_BERJALAN.replace('-', '')}-${String(Date.now()).slice(-4)}`,
      waktu: new Date().toLocaleString('id-ID'), totalKg: c.tot,
      lahan: inputs.map((el, i) => ({ id: lahan[i].id, kg: Number(el.value) })),
      bmp: Object.fromEntries([...document.querySelectorAll('[data-b]')].map(sel => [sel.dataset.b, sel.value === '1'])),
    };
    store.update(s => { ((s.laporan ||= {})[id] ||= {})[BULAN_BERJALAN] = lap; });
    vTandaTerima(kt, lap);
  };
}
function vTandaTerima(kt, lap) {
  shell(head('Laporan bulanan', `${esc(kt.nama)}. Laporan ${namaBulan(BULAN_BERJALAN)}.`) +
    `<div class="callout ok"><b>Laporan sudah diterima Dinas.</b> Nomor tanda terima <span class="mono">${esc(lap.noTerima)}</span>, dikirim ${esc(lap.waktu)}.</div>
    <table class="kv" style="max-width:560px"><tr><th>Jumlah lahan</th><td>${lap.lahan.length}</td></tr><tr><th>Total produksi</th><td>${fmt(lap.totalKg / 1000)} ton TBS</td></tr>
    ${Object.entries(lap.bmp).map(([k, v]) => `<tr><th>${k[0].toUpperCase() + k.slice(1)}</th><td>${v ? 'Dilakukan' : 'Tidak dilakukan'}</td></tr>`).join('')}</table>
    <p style="margin-top:16px"><button class="btn" id="ulang">Batalkan dan isi ulang (peragaan)</button></p>`, '#/lapor');
  document.getElementById('ulang').onclick = () => { store.update(s => { delete s.laporan[kt.id][BULAN_BERJALAN]; }); vLapor(kt.id); };
}
function vRiwayat(id) {
  const kt = ktById(id);
  const kode = r => ['pemupukan', 'penyemprotan', 'penyiangan', 'penunasan'].filter(k => r[k]).map(k => ({ pemupukan: r.pupukK ? 'Pemupukan (K)' : 'Pemupukan', penyemprotan: 'Penyemprotan', penyiangan: 'Penyiangan', penunasan: 'Penunasan' }[k])).join(', ') || '-';
  shell(head('Riwayat laporan', `${esc(kt.nama)}. Seluruh laporan bulanan yang tercatat di sistem.`) +
    `<div class="tbl-wrap"><table class="data"><thead><tr><th>Bulan</th><th>Diterima</th><th>Status</th><th class="num">Produksi (ton)</th><th class="num">ton/ha</th><th>Kegiatan BMP</th></tr></thead><tbody>
    ${kt.bulanan.slice().reverse().map(r => { const st = statusLaporan(r); return `<tr><td>${namaBulan(r.bulan)}</td><td class="mono">${tglLapor(r.bulan, r) || '-'}</td><td>${status(st.teks, st.kind)}</td><td class="num">${r.belumLapor ? '-' : fmt(r.produksi)}</td><td class="num">${r.belumLapor ? '-' : fmt(r.produksi / kt.luasTM, 2)}</td><td class="small">${r.belumLapor ? '-' : kode(r)}</td></tr>`; }).join('')}
    </tbody></table></div>`, '#/riwayat');
}

// ---------------- metode ----------------
function vMetode() {
  const nObs = observasi.length;
  shell(head('Metode dan data', 'Cara sistem menghitung skor efisiensi, lembaga acuan, target produksi, kesenjangan BMP, dan aturan BMP acuan.') +
    `<div class="callout warn"><b>Data simulasi.</b> Prototipe ini memakai data bangkitan untuk ${kelompokTani.length} kelompok tani selama 24 bulan (${namaBulan(BULAN_LAPORAN[0])} sampai ${namaBulan(BULAN_TERAKHIR)}). Nama lembaga dan angka produksi bukan data lapangan Kabupaten Siak.</div>
    <div class="cols"><section class="block"><h2>1. Model DEA-BCC berorientasi keluaran</h2>
     <p>Setiap kelompok tani pada setiap triwulan adalah satu DMU (${nObs} DMU). Seluruh triwulan digabung menjadi satu garis batas efisien.</p>
     <div class="formula">maks  φo
dengan  Σj λj xij ≤ xio     i = luas TM, pokok, potensi
        Σj λj y′j ≥ φo y′o   y′ = produksi / Iq
        Σj λj = 1,  λj ≥ 0</div>
     <p style="margin-top:10px">Skor efisiensi TE = 1/φ*. Lembaga acuan adalah DMU dengan λ* &gt; 0. Target produksi = φ* × y′ × Iq. Potensi produksi standar = luas TM × produktivitas standar menurut umur. Indeks musim Iq = rata-rata produksi triwulan ke-q dibagi rata-rata seluruh triwulan.</p>
     <p>Model diselesaikan dengan metode simpleks dua fase yang berjalan langsung di peramban.</p></section>
    <section class="block"><h2>2. Kesenjangan BMP dan aturan BMP acuan</h2>
     <div class="formula">Δk = Σj λj* bkj − bko</div>
     <p style="margin-top:10px">Karena Σλ = 1, Δ adalah selisih praktik BMP ke-k antara rata-rata tertimbang lembaga acuan dan lembaga yang dinilai, dihitung dari kegiatan 12 bulan terakhir.</p>
     <p>Aturan BMP acuan dirumuskan per kelas umur (≤ 10 dan &gt; 10 tahun) dengan pohon keputusan CART: label acuan = 30% skor tertinggi, kedalaman maksimal 3, minimal 5 observasi per daun, bobot kelas seimbang, dan diuji dengan validasi silang per lembaga (balanced accuracy).</p></section></div>
    <section class="block"><h2>3. Kategori dan rekomendasi</h2><div class="tbl-wrap"><table class="data"><thead><tr><th>Kategori skor</th><th>Rentang</th><th>Rekomendasi</th><th>Kriteria</th></tr></thead><tbody>
     <tr><td>Efisien</td><td>1,00</td><td>${statusRekomendasi('Acuan')}</td><td>Skor minimal 0,95 dua triwulan berturut-turut (lihat catatan)</td></tr>
     <tr><td>Hampir efisien</td><td>0,90 sampai 0,99</td><td>${statusRekomendasi('Pantau')}</td><td>Selain kriteria acuan dan prioritas</td></tr>
     <tr><td>Sedang</td><td>0,80 sampai 0,89</td><td>${statusRekomendasi('Pantau')}</td><td></td></tr>
     <tr><td>Rendah</td><td>di bawah 0,80</td><td>${statusRekomendasi('Prioritas pembinaan')}</td><td>Skor di bawah 0,80 atau produksi turun dua triwulan berturut-turut</td></tr>
    </tbody></table></div>
    <p class="small" style="margin-top:8px"><b>Catatan desain.</b> Dengan frontier gabungan antartriwulan, setiap lembaga juga dibandingkan dengan dirinya sendiri pada triwulan lain. Karena luas dan pokok produktif hampir tetap, praktis hanya satu triwulan per lembaga yang dapat bernilai 1,00. Syarat acuan "efisien dua triwulan berturut-turut" karena itu diganti dengan skor minimal 0,95 dua triwulan berturut-turut.</p></section>
    <section class="block"><h2>4. Rujukan utama</h2><ol class="small">
     <li>Banker, R. D., Charnes, A., & Cooper, W. W. (1984). Some models for estimating technical and scale inefficiencies in data envelopment analysis. <i>Management Science, 30</i>(9), 1078-1092.</li>
     <li>Bogetoft, P., & Otto, L. (2011). <i>Benchmarking with DEA, SFA, and R</i>. Springer.</li>
     <li>Breiman, L., Friedman, J. H., Olshen, R. A., & Stone, C. J. (2017). <i>Classification and regression trees</i>. Routledge.</li>
     <li>Tulkens, H., & Vanden Eeckaut, P. (1995). Non-parametric efficiency, progress and regress measures for panel data. <i>European Journal of Operational Research, 80</i>(3), 474-499.</li>
    </ol></section>`, '#/metode');
}
function vTidakAda() { shell(head('Halaman tidak ditemukan', '<a href="' + beranda(peran()) + '">Kembali ke beranda</a>'), ''); }

// ---------------- router ----------------
function route() {
  const [path, qs] = (location.hash.slice(1) || '').split('?');
  const params = new URLSearchParams(qs || '');
  const p = peran(); const ktId = p.startsWith('kt:') ? p.slice(3) : null;
  const parts = path.split('/').filter(Boolean);
  if (!parts.length) { location.replace(beranda(p)); return; }
  const r = parts[0];
  if (ktId && !['lapor', 'riwayat', 'posisi', 'metode'].includes(r)) { location.replace('#/lapor'); return; }
  switch (r) {
    case 'ringkasan': return vRingkasan();
    case 'rekap': return vRekap(params);
    case 'benchmark': return vBenchmark(params);
    case 'lembaga': return vLembaga(parts[1], params);
    case 'aturan': return vAturan(false);
    case 'validasi': return vAturan(true);
    case 'penilaian': return vPenilaian();
    case 'tindak-lanjut': return vTindakLanjut();
    case 'metode': return vMetode();
    case 'lapor': return ktId ? vLapor(ktId) : location.replace(beranda(p));
    case 'riwayat': return ktId ? vRiwayat(ktId) : location.replace(beranda(p));
    case 'posisi': return ktId ? vLembaga(ktId, params, true) : location.replace(beranda(p));
    default: return vTidakAda();
  }
}
document.getElementById('peran').onchange = e => { store.update(s => { s.peran = e.target.value; }); location.hash = beranda(e.target.value); route(); };
app.addEventListener('click', e => {
  const tr = e.target.closest('tr.row-link');
  if (tr && !e.target.closest('a')) location.hash = tr.dataset.href;
});
window.addEventListener('hashchange', route);
route();
