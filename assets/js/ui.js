// Utilitas tampilan: format angka, elemen status, bar skor, grafik SVG sederhana, dan penyimpanan lokal.

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmt = (v, d = 1) => Number(v).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmt0 = v => Number(v).toLocaleString('id-ID', { maximumFractionDigits: 0 });
export const pct = (v, d = 0) => fmt(v * 100, d) + '%';

export function status(text, kind = 'ok') { return `<span class="st st-${kind}">${esc(text)}</span>`; }
export const statusRekomendasi = r => r === 'Prioritas pembinaan' ? status(r, 'alert') : r === 'Acuan' ? status(r, 'acuan') : status(r, 'ok');
export const statusKategori = k => k === 'Rendah' ? status(k, 'alert') : k === 'Sedang' ? status(k, 'warn') : status(k, 'ok');

export function scoreBar(s) {
  const w = Math.max(0, Math.min(1, (s - 0.5) / 0.5)) * 100; // skala 0,50 sampai 1,00
  const tick = v => `<b style="left:${((v - 0.5) / 0.5) * 100}%" title="ambang ${fmt(v, 2)}"></b>`;
  return `<div class="bar-cell"><span class="v">${fmt(s, 3)}</span><div class="bar ${s < 0.8 ? 'low' : ''}" role="img" aria-label="Skor ${fmt(s, 3)}"><i style="width:${w}%"></i>${tick(0.8)}${tick(0.9)}</div></div>`;
}

// Grafik garis produksi aktual, target DEA, dan potensi standar per triwulan
export function lineChart(points, { w = 640, h = 220, labels = [] } = {}) {
  const pad = { l: 52, r: 28, t: 16, b: 34 };
  const all = points.flatMap(p => [p.aktual, p.target, p.potensi].filter(v => v != null));
  const max = Math.max(...all) * 1.08, min = 0;
  const X = i => pad.l + (i * (w - pad.l - pad.r)) / Math.max(points.length - 1, 1);
  const Y = v => pad.t + (1 - (v - min) / (max - min)) * (h - pad.t - pad.b);
  const path = key => points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p[key]).toFixed(1)}`).join('');
  const ticks = 4; let grid = '';
  for (let k = 0; k <= ticks; k++) {
    const v = min + ((max - min) * k) / ticks, y = Y(v);
    grid += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y}" y2="${y}" stroke="#e6e8eb"/><text x="${pad.l - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#6b7580">${fmt0(v)}</text>`;
  }
  const xl = points.map((p, i) => `<text x="${X(i)}" y="${h - 12}" text-anchor="middle" font-size="11" fill="#6b7580">${esc(labels[i] || '')}</text>`).join('');
  const dots = points.map((p, i) => `<circle cx="${X(i)}" cy="${Y(p.aktual)}" r="3" fill="#1a1f24"/>`).join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Grafik produksi per triwulan">
    ${grid}<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(0)}" y2="${Y(0)}" stroke="#4a545e"/>
    <path d="${path('potensi')}" fill="none" stroke="#b5bdc4" stroke-width="2"/>
    <path d="${path('target')}" fill="none" stroke="#1d5c46" stroke-width="2" stroke-dasharray="6 4"/>
    <path d="${path('aktual')}" fill="none" stroke="#1a1f24" stroke-width="2"/>${dots}${xl}
    <text x="${pad.l}" y="10" font-size="11" fill="#6b7580">ton TBS</text></svg>`;
}

export function sparkline(values, { w = 110, h = 26 } = {}) {
  const max = Math.max(...values), min = Math.min(...values);
  const X = i => 2 + (i * (w - 4)) / (values.length - 1), Y = v => h - 3 - ((v - min) / (max - min || 1)) * (h - 6);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d}" fill="none" stroke="#4a545e" stroke-width="1.5"/><circle cx="${X(values.length - 1)}" cy="${Y(values.at(-1))}" r="2.5" fill="#1a1f24"/></svg>`;
}

// Penyimpanan lokal (prototipe tanpa server)
const KEY = 'spk-sawit-v1';
export const store = {
  get() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } },
  set(obj) { try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch { /* abaikan */ } },
  update(fn) { const s = this.get(); fn(s); this.set(s); return s; },
};

export function downloadCSV(name, rows) {
  const csv = rows.map(r => r.map(v => {
    const s = String(v ?? '');
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(';')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
