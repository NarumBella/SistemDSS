// Pohon keputusan CART (indeks Gini, bobot kelas seimbang) untuk merumuskan aturan BMP acuan.
// Label: observasi lembaga-triwulan termasuk acuan bila skornya 30% tertinggi dalam kelas umurnya
// (skor 1 selalu acuan). Kedalaman maksimal 3, minimal 5 observasi per daun.
import { observasi, FITUR_BMP } from './dea.js';

const MAX_DEPTH = 3, MIN_LEAF = 5;

function gini(rows, w) {
  let p = 0, t = 0;
  for (const r of rows) { const wi = w[r.label]; t += wi; if (r.label) p += wi; }
  if (t === 0) return 0;
  const f = p / t; return 1 - f * f - (1 - f) * (1 - f);
}
function wsum(rows, w) { return rows.reduce((s, r) => s + w[r.label], 0); }

function build(rows, w, depth) {
  const node = { n: rows.length, pos: rows.filter(r => r.label).length };
  const wp = rows.reduce((s, r) => s + (r.label ? w[1] : 0), 0), wn = rows.reduce((s, r) => s + (r.label ? 0 : w[0]), 0);
  node.pred = wp >= wn ? 1 : 0;
  if (depth >= MAX_DEPTH || rows.length < 2 * MIN_LEAF || node.pos === 0 || node.pos === node.n) return node;
  const base = gini(rows, w) * wsum(rows, w);
  let best = null;
  for (const f of FITUR_BMP) {
    const vals = [...new Set(rows.map(r => r.x[f.key]))].sort((a, b) => a - b);
    for (let i = 0; i < vals.length - 1; i++) {
      const thr = (vals[i] + vals[i + 1]) / 2;
      const L = rows.filter(r => r.x[f.key] <= thr), R = rows.filter(r => r.x[f.key] > thr);
      if (L.length < MIN_LEAF || R.length < MIN_LEAF) continue;
      const imp = gini(L, w) * wsum(L, w) + gini(R, w) * wsum(R, w);
      if (base - imp > 1e-9 && (!best || imp < best.imp)) best = { f: f.key, thr, L, R, imp };
    }
  }
  if (!best) return node;
  node.f = best.f; node.thr = best.thr;
  node.left = build(best.L, w, depth + 1);
  node.right = build(best.R, w, depth + 1);
  return node;
}
function predict(node, x) { while (node.f) node = x[node.f] <= node.thr ? node.left : node.right; return node.pred; }
function weights(rows) {
  const pos = rows.filter(r => r.label).length, neg = rows.length - pos;
  return { 1: rows.length / (2 * Math.max(pos, 1)), 0: rows.length / (2 * Math.max(neg, 1)) };
}
// pangkas cabang yang kedua daunnya memberi prediksi sama
function prune(node) {
  if (!node.f) return node;
  node.left = prune(node.left); node.right = prune(node.right);
  if (!node.left.f && !node.right.f && node.left.pred === node.right.pred) return { n: node.n, pos: node.pos, pred: node.left.pred };
  return node;
}
export function fit(rows) { return prune(build(rows, weights(rows), 0)); }

function balancedAccuracy(rows, preds) {
  let tp = 0, fn = 0, tn = 0, fp = 0;
  rows.forEach((r, i) => { if (r.label) preds[i] ? tp++ : fn++; else preds[i] ? fp++ : tn++; });
  const tpr = tp / Math.max(tp + fn, 1), tnr = tn / Math.max(tn + fp, 1);
  return (tpr + tnr) / 2;
}

// Ubah jalur pohon menjadi aturan JIKA-MAKA
const fmt = v => (Math.round(v * 10) / 10).toLocaleString('id-ID');
function rules(node, path = []) {
  if (!node.f) return node.pred ? [{ syarat: path, n: node.n, pos: node.pos }] : [];
  const lab = FITUR_BMP.find(f => f.key === node.f).label.toLowerCase();
  return [
    ...rules(node.left, [...path, { f: node.f, op: '≤', thr: node.thr, teks: `${lab} paling banyak ${fmt(node.thr)} kali per tahun` }]),
    ...rules(node.right, [...path, { f: node.f, op: '>', thr: node.thr, teks: `${lab} lebih dari ${fmt(node.thr)} kali per tahun` }]),
  ];
}
// gabungkan syarat ganda pada fitur yang sama
function sederhanakan(r) {
  const by = {};
  for (const s of r.syarat) (by[s.f + s.op] ||= []).push(s);
  const pilih = {};
  for (const k in by) {
    const arr = by[k];
    pilih[k] = arr[0].op === '≤' ? arr.reduce((a, b) => (b.thr < a.thr ? b : a)) : arr.reduce((a, b) => (b.thr > a.thr ? b : a));
  }
  const out = [];
  for (const f of new Set(r.syarat.map(s => s.f))) {
    const lo = pilih[f + '>'], hi = pilih[f + '≤'];
    if (lo && hi) {
      const lab = FITUR_BMP.find(x => x.key === f).label.toLowerCase();
      out.push({ f, op: 'antara', lo: lo.thr, hi: hi.thr, teks: `${lab} lebih dari ${fmt(lo.thr)} sampai ${fmt(hi.thr)} kali per tahun` });
    } else out.push(lo || hi);
  }
  return { ...r, syarat: out };
}

export const hasilAturan = {};
for (const kelas of ['≤ 10 tahun', '> 10 tahun']) {
  const sub = observasi.filter(o => o.kelasUmur === kelas && o.q >= '2025-Q3'); // butuh riwayat 4 triwulan
  const sorted = sub.map(o => o.skor).sort((a, b) => b - a);
  const batas = sorted[Math.max(0, Math.ceil(sorted.length * 0.3) - 1)];
  const rows = sub.map(o => ({ obs: o, x: o.bmp, label: o.skor >= batas || o.skor >= 0.9995 ? 1 : 0, grup: o.kt.id }));
  const tree = fit(rows);
  // validasi silang per lembaga (leave-one-group-out)
  const grup = [...new Set(rows.map(r => r.grup))];
  const preds = new Array(rows.length);
  for (const g of grup) {
    const tr = rows.filter(r => r.grup !== g);
    const t = fit(tr);
    rows.forEach((r, i) => { if (r.grup === g) preds[i] = predict(t, r.x); });
  }
  const ba = balancedAccuracy(rows, preds);
  const aturan = rules(tree).map(sederhanakan).map((r, i) => ({
    id: `${kelas.startsWith('≤') ? 'M' : 'D'}${i + 1}`,
    ...r, ketepatan: r.pos / r.n,
  }));
  hasilAturan[kelas] = { kelas, n: rows.length, nLembaga: grup.length, nAcuan: rows.filter(r => r.label).length, batas, ba, tree, aturan };
}

export function cocokAturan(aturan, x) {
  return aturan.syarat.every(s => (s.op === 'antara' ? x[s.f] > s.lo && x[s.f] <= s.hi : s.op === '≤' ? x[s.f] <= s.thr : x[s.f] > s.thr));
}
