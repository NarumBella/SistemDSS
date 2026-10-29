# SPK Pembinaan Lembaga Pekebun Sawit

Prototipe Sistem Pendukung Keputusan (SPK) pelaporan dan pembinaan lembaga pekebun sawit berbasis benchmarking Data Envelopment Analysis (DEA) dan aturan BMP acuan dengan pohon keputusan.

Dibuat untuk Lomba Riset Mahasiswa BPDP 2026-2027, Politeknik Caltex Riau.

> Seluruh data di prototipe ini adalah **data simulasi** untuk 30 kelompok tani selama 24 bulan (Oktober 2024 sampai September 2026). Nama lembaga dan angka produksi bukan data lapangan.

## Fitur

| Peran | Halaman | Fungsi |
|---|---|---|
| Pengurus kelompok tani | Laporan bulanan | Input produksi TBS per lahan dan kegiatan BMP, validasi otomatis (isian wajib, kisaran produktivitas wajar), tanda terima |
| | Riwayat laporan | Status dan isi laporan 24 bulan |
| | Posisi lembaga | Skor efisiensi, peringkat, lembaga acuan, target produksi, kesenjangan BMP, aturan BMP yang berlaku |
| Staf Dinas | Ringkasan | Laporan masuk, terlambat, belum melapor, kelengkapan, lembaga prioritas pembinaan |
| | Rekap laporan bulanan | Rekap otomatis per bulan, ekspor ke Excel (CSV) |
| | Benchmarking DEA | Peringkat skor DEA per triwulan, kategori, rekomendasi, lembaga acuan beserta bobot λ |
| | Profil lembaga | Grafik produksi, target, dan potensi standar, kesenjangan BMP terhadap acuan, catatan tindak lanjut |
| | Aturan BMP acuan | Aturan JIKA-MAKA per kelas umur, balanced accuracy, status persetujuan penyuluh |
| | Catatan tindak lanjut | Keputusan pembinaan dan proporsi yang merujuk rekomendasi SPK |
| Penyuluh | Validasi aturan BMP | Menyetujui atau menolak aturan beserta catatan |
| | Penilaian lembaga | Penilaian tertutup 1-5 untuk uji korelasi Spearman dengan peringkat DEA |

## Metode

**DEA-BCC berorientasi keluaran, frontier gabungan antartriwulan.** Setiap kelompok tani pada setiap triwulan adalah satu DMU (240 DMU).

```
maks  φo
      Σj λj xij ≤ xio      masukan: luas tanaman menghasilkan, pokok produktif, potensi produksi standar
      Σj λj y′j ≥ φo y′o   keluaran: produksi TBS terkoreksi indeks musim (y′ = y / Iq)
      Σj λj = 1, λj ≥ 0
```

- Skor efisiensi TE = 1/φ*, lembaga acuan = DMU dengan λ* > 0, target = φ* × y′ × Iq.
- Kesenjangan BMP: Δk = Σj λj* bkj − bko (rata-rata tertimbang lembaga acuan dikurangi lembaga yang dinilai).
- Program linear diselesaikan dengan metode simpleks dua fase (`assets/js/lp.js`) langsung di peramban.

**Aturan BMP acuan.** Pohon keputusan CART per kelas umur (≤ 10 dan > 10 tahun). Label acuan = 30% skor tertinggi, kedalaman maksimal 3, minimal 5 observasi per daun, bobot kelas seimbang. Kinerja diuji dengan validasi silang per lembaga (balanced accuracy). Kode di `assets/js/cart.js`.

**Kategori dan rekomendasi.** Efisien (1,00), hampir efisien (0,90-0,99), sedang (0,80-0,89), rendah (< 0,80). Rekomendasi: acuan, pantau, atau prioritas pembinaan (skor < 0,80 atau produksi turun dua triwulan berturut-turut).

> Catatan desain: dengan frontier gabungan, setiap lembaga juga dibandingkan dengan dirinya sendiri pada triwulan lain. Karena luas dan pokok hampir tetap, praktis hanya satu triwulan per lembaga yang bisa bernilai 1,00. Karena itu syarat acuan memakai skor minimal 0,95 selama dua triwulan berturut-turut.

## Menjalankan secara lokal

Tidak perlu instalasi paket. Cukup jalankan server statis dari folder repo:

```bash
python -m http.server 8765
```

Lalu buka `http://localhost:8765`. Peran pengguna dipilih dari menu **Masuk sebagai** di kanan atas. Data isian (laporan, validasi, tindak lanjut) disimpan di `localStorage` peramban.

## Struktur

```
index.html            kerangka halaman
assets/css/app.css    sistem tampilan
assets/js/data.js     pembangkit data simulasi (seed tetap)
assets/js/lp.js       simpleks dua fase
assets/js/dea.js      model DEA, kesenjangan BMP, rekomendasi
assets/js/cart.js     pohon keputusan CART dan aturan JIKA-MAKA
assets/js/ui.js       format angka, bar skor, grafik SVG, penyimpanan lokal
assets/js/app.js      halaman dan navigasi
```

## Acuan desain

Tampilan mengikuti pola sistem administrasi data pemerintah (pendekatan GOV.UK Design System) dan prinsip ISA-101: dasar abu-abu netral, warna hanya untuk kondisi yang perlu perhatian (terlambat, prioritas pembinaan), garis tipis, sudut tegas, dan angka tabular.

## Tim

Raihan Ahmada Siahaan (ketua), M. Narum Bella, Puti Salwa, Syafiqah Zahra. Dosen pembimbing: Ibu Asmarini. Politeknik Caltex Riau.
