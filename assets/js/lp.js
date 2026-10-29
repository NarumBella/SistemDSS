// Simplex dua fase (tableau) untuk masalah maksimasi:
//   maks c·x  dengan  A x (<=, =, >=) b,  x >= 0
// Dipakai oleh model DEA. Aturan Bland dipakai untuk mencegah siklus pada masalah degeneratif.

const EPS = 1e-9;

export function simplexMax(c, A, b, types) {
  const m = A.length, n = c.length;
  A = A.map(r => r.slice()); b = b.slice(); types = types.slice();
  for (let i = 0; i < m; i++) {
    if (b[i] < 0) {
      A[i] = A[i].map(v => -v); b[i] = -b[i];
      types[i] = types[i] === '<=' ? '>=' : types[i] === '>=' ? '<=' : '=';
    }
  }
  let nSlack = 0, nArt = 0;
  for (const t of types) { if (t === '<=') nSlack++; else if (t === '>=') { nSlack++; nArt++; } else nArt++; }
  const N = n + nSlack + nArt;               // jumlah kolom variabel
  const T = [], basis = [], isArt = new Uint8Array(N);
  let s = n, a = n + nSlack;
  for (let i = 0; i < m; i++) {
    const row = new Float64Array(N + 1);
    for (let j = 0; j < n; j++) row[j] = A[i][j];
    row[N] = b[i];
    if (types[i] === '<=') { row[s] = 1; basis.push(s); s++; }
    else if (types[i] === '>=') { row[s] = -1; s++; row[a] = 1; isArt[a] = 1; basis.push(a); a++; }
    else { row[a] = 1; isArt[a] = 1; basis.push(a); a++; }
    T.push(row);
  }

  const pivot = (r, k, obj) => {
    const pr = T[r], pv = pr[k];
    for (let j = 0; j <= N; j++) pr[j] /= pv;
    for (let i = 0; i < m; i++) {
      if (i === r) continue;
      const f = T[i][k];
      if (Math.abs(f) > EPS) for (let j = 0; j <= N; j++) T[i][j] -= f * pr[j];
    }
    const f = obj[k];
    if (Math.abs(f) > EPS) for (let j = 0; j <= N; j++) obj[j] -= f * pr[j];
    basis[r] = k;
  };

  const run = (obj, allowed) => {
    for (let it = 0; it < 5000; it++) {
      let k = -1;
      for (let j = 0; j < N; j++) if (allowed(j) && obj[j] < -EPS) { k = j; break; }   // Bland
      if (k < 0) return 'optimal';
      let r = -1, best = Infinity;
      for (let i = 0; i < m; i++) {
        if (T[i][k] > EPS) {
          const ratio = T[i][N] / T[i][k];
          if (ratio < best - EPS || (Math.abs(ratio - best) <= EPS && basis[i] < basis[r])) { best = ratio; r = i; }
        }
      }
      if (r < 0) return 'unbounded';
      pivot(r, k, obj);
    }
    return 'iterlimit';
  };

  // Fase 1: minimalkan jumlah variabel artifisial
  if (nArt > 0) {
    const obj1 = new Float64Array(N + 1);
    for (let j = 0; j < N; j++) if (isArt[j]) obj1[j] = 1;
    for (let i = 0; i < m; i++) if (isArt[basis[i]]) for (let j = 0; j <= N; j++) obj1[j] -= T[i][j];
    run(obj1, () => true);
    if (obj1[N] < -1e-7) return { status: 'infeasible' };
    // keluarkan artifisial bernilai nol dari basis
    for (let i = 0; i < m; i++) {
      if (!isArt[basis[i]]) continue;
      let k = -1;
      for (let j = 0; j < N; j++) if (!isArt[j] && Math.abs(T[i][j]) > EPS) { k = j; break; }
      if (k >= 0) pivot(i, k, obj1);
    }
  }
  // Fase 2
  const obj = new Float64Array(N + 1);
  for (let j = 0; j < n; j++) obj[j] = -c[j];
  for (let i = 0; i < m; i++) {
    const f = obj[basis[i]];
    if (Math.abs(f) > EPS) for (let j = 0; j <= N; j++) obj[j] -= f * T[i][j];
  }
  const status = run(obj, j => !isArt[j]);
  if (status !== 'optimal') return { status };
  const x = new Array(n).fill(0);
  for (let i = 0; i < m; i++) if (basis[i] < n) x[basis[i]] = T[i][N];
  return { status, x, z: obj[N] };
}
