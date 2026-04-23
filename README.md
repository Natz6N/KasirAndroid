# Perancangan Aplikasi Toko Offline-First
**Stack:** React Native + SQLite • **Mode:** 1 user, 1 PIN, 1 toko • **Tujuan:** kasir + pembukuan terpadu

---

## A. Ringkasan keputusan produk

Aplikasi ini dirancang sebagai **kasir harian + pembukuan otomatis untuk satu pemilik toko**, bukan ERP, bukan SaaS, bukan POS multi-cabang. Semua keputusan tunduk pada urutan prioritas: **sederhana > stabil > cepat dipakai > kaya fitur**.

Keputusan inti yang diambil:

1. **Satu layer autentikasi: PIN 6 digit.** Tidak ada username, email, role, atau session multi-device. PIN disimpan sebagai hash (argon2 / bcrypt) di SQLite + salt di secure storage. **Login PIN berhasil = akses penuh ke semua fitur. Tidak ada "mode kasir" vs "mode admin", tidak ada akses terbatas, tidak ada pemisahan role.**
2. **SQLite sebagai single source of truth.** Tidak ada ORM berat. Query ditulis eksplisit via satu repository layer.
3. **Pembukuan bukan ledger double-entry.** Cukup dua aliran: `sales` (pemasukan) dan `expenses` (pengeluaran). Laporan dihitung on-the-fly, tidak disimpan.
4. **Stok dihitung dari `stock_movements`**, bukan dari kolom `stock` yang di-update langsung. Ini satu-satunya cara menjamin stok tidak pernah desync. Kolom `stock` di tabel `products` hanyalah **cache** yang dapat di-rebuild kapan saja.
5. **Transaksi kasir = satu operasi atomic** (SQLite `BEGIN IMMEDIATE ... COMMIT`). Gagal satu baris = rollback semua.
6. **Tidak ada cloud, tidak ada sync, tidak ada akun.** Backup = export file `.db` ke penyimpanan HP atau share sheet.
7. **Layar kasir adalah layar paling cepat**: maksimal 2 tap untuk menambahkan barang, 1 tap untuk selesaikan transaksi.

---

## B. Prinsip desain

1. **Offline-first absolut** — aplikasi tidak pernah menampilkan spinner karena menunggu jaringan. Jika online pun, itu cuma bonus.
2. **Minim klik** — operasi paling sering (tambah item ke kasir, selesaikan transaksi, catat pengeluaran) harus ≤ 3 tap.
3. **Input cepat** — keyboard numerik untuk angka, autofocus search di kasir, barcode opsional, quantity default = 1.
4. **Satu sumber kebenaran** — stok hanya berubah lewat `stock_movements`. Pembukuan hanya berubah lewat `sales` dan `expenses`. Tidak ada jalur lain.
5. **Atomicity wajib** — setiap operasi yang menyentuh 2+ tabel dibungkus transaksi SQL. Gagal parsial dilarang.
6. **Idempotency pada aksi berbahaya** — tombol "Selesaikan transaksi" harus mustahil menghasilkan 2 sale walau ditekan dobel.
7. **Tidak ada fitur yang tidak dipakai minimal 3x seminggu** oleh pemilik toko. Jika tidak lolos tes ini, buang.
8. **Dapat diajarkan dalam 10 menit** kepada orang awam. Jargon akuntansi dilarang di UI.
9. **Data bisa di-recover** — backup manual mudah, dan stok bisa direkonsiliasi ulang dari history.
10. **Performa konstan** — aplikasi harus tetap cepat pada 50.000 baris transaksi. Query wajib berindex, list wajib virtualized.

---

## C. Fitur wajib (versi awal)

### Kasir
- Cari produk (nama / SKU / barcode) dengan debounce.
- Tambah item ke keranjang dengan 1 tap; quantity diatur via +/- atau ketik angka.
- Diskon per-transaksi (rupiah atau persen). Tidak per-item di MVP.
- Metode bayar: tunai, transfer, QRIS. Hanya label — tidak ada integrasi.
- Input uang diterima → otomatis hitung kembalian.
- Tombol "Selesaikan" → simpan sale + decrement stok + print/show struk.
- Batalkan transaksi sebelum disimpan: hapus keranjang.
- Void transaksi setelah disimpan: membalik stok, menandai sale `voided`.

### Produk & Stok
- CRUD produk (nama, SKU opsional, barcode opsional, kategori, harga jual, harga pokok, satuan, stok awal).
- Kategori sederhana (flat, tidak ada sub-kategori).
- Stok masuk (pembelian / restock) dengan catatan supplier dan nominal.
- Stok keluar manual (rusak, hilang, konsumsi pribadi) dengan alasan.
- Penyesuaian stok (stok opname) dengan pencatatan selisih.
- Indikator stok rendah berdasarkan ambang minimum per produk (opsional per produk).

### Pembukuan
- Auto-catat pemasukan dari setiap sale non-void.
- Catat pengeluaran manual dengan kategori (listrik, sewa, gaji, restock, lain-lain).
- Hitung laba = (harga jual − harga pokok) per sale_item, diakumulasi per periode.

### Laporan
- Laporan harian: total penjualan, total transaksi, rata-rata nilai transaksi, total pengeluaran, laba kotor, laba bersih.
- Laporan bulanan dengan grafik sederhana (bar per hari).
- Top produk per periode (kuantitas & revenue).
- Riwayat transaksi dengan filter tanggal, dapat dibuka detailnya.
- Export CSV untuk laporan & riwayat.

### Keamanan
- PIN 6 digit untuk login. **Login berhasil = akses penuh ke semua fitur (POS, produk, stok, laporan, pengaturan). Tidak ada role, tidak ada akses terbatas.**
- Auto-lock setelah X menit tidak aktif (default 5 menit, dapat diatur).
- Rate limit PIN salah: 5x salah → lock 60 detik, naik eksponensial.
- PIN recovery via security question + kode cadangan yang ditampilkan sekali saat setup.

### Pengaturan dasar
- Nama toko, alamat, nomor telepon (untuk struk).
- Mata uang & format angka (default IDR).
- Ambang auto-lock.
- Ubah PIN.
- Backup & restore file database.

---

## D. Fitur yang dibuang dari scope

| Fitur | Alasan dibuang |
|---|---|
| Multi-user & role | Brief eksplisit: 1 user, 1 PIN. Menambahkannya = bloat DB, UI, dan auth. |
| Mode admin / mode kasir terpisah | Satu PIN = akses penuh ke semua fitur. Pemisahan role tidak ada dasar use case-nya di toko 1 pemilik. |
| Approval flow | Tidak ada hierarki, tidak ada yang perlu meng-approve. |
| Cloud sync / multi-device | Bukan kebutuhan. Menambah seluruh kelas bug baru (konflik, race, auth server). |
| Loyalti / member / poin | Toko kecil jarang butuh. Bisa masuk Tahap 3 jika terbukti perlu. |
| Pajak berlapis, PPN, faktur pajak | Toko kecil umumnya bukan PKP. Tambahkan hanya bila pemilik minta. |
| Hutang-piutang (A/R, A/P) | Beda domain dari kasir. Risiko over-scope. Dibahas di Tahap 2 versi minimal. |
| Integrasi mesin kasir, printer thermal otomatis | Opsional Tahap 2. MVP cukup "share struk sebagai gambar/PDF". |
| Payroll / HRD | Tidak ada karyawan di brief. |
| Ledger double-entry, chart of accounts | Overkill total untuk toko kecil. |
| Multi-satuan konversi (dus/pcs/lusin) | Menambah kompleksitas harga & stok. Tahap 3. |
| Promo kompleks (bundle, buy-1-get-1, tier) | Satu diskon transaksi sudah cukup untuk 95% kasus. |
| Notifikasi push, fitur sosial, chat | Tidak relevan dengan operasional toko. |
| Dashboard analytics canggih (AI insight, forecasting) | Bukan prioritas. Angka mentah yang jujur > grafik cantik yang menyesatkan. |
| Varian produk (warna/ukuran) | Tahap 2 bila benar-benar dibutuhkan. MVP: 1 produk = 1 SKU. |

---

## E. Roadmap fitur: MVP / Tahap 2 / Tahap 3

### MVP (wajib rilis)
- PIN login + auto-lock + rate limit.
- CRUD produk + kategori flat.
- Stok masuk, stok keluar manual, stok opname.
- Kasir: search → add → diskon → bayar → simpan → struk share.
- Void transaksi (reverse stok).
- Pengeluaran manual.
- Laporan harian & bulanan, top produk, riwayat transaksi.
- Export CSV.
- Backup & restore `.db`.
- Pengaturan toko & ubah PIN.

### Tahap 2 (setelah MVP stabil ≥ 4 minggu dipakai)
- Barcode scan via kamera.
- Print thermal via Bluetooth (1 printer saja dulu).
- Hutang pelanggan sederhana (mark sale sebagai "belum lunas" → daftar piutang).
- Varian produk (1 level, misal ukuran).
- Minimum stock alert di dashboard.
- Import produk via CSV.

### Tahap 3 (hanya jika bisnis berkembang)
- Member / loyalti sederhana.
- Multi-satuan (konversi).
- Promo bundle.
- Reminder backup otomatis harian ke Google Drive (opsional, dengan user menyalakan manual).
- Mode dark.

---

## F. Flow pengguna

### F.1 Flow login PIN
```
Buka app → PIN screen → input 6 digit
  ├── benar → dashboard
  ├── salah < 5 kali → getar + pesan "PIN salah"
  └── salah ≥ 5 kali → lock 60s (eksponensial tiap tahap)

PIN belum di-setup (install pertama):
Buka app → onboarding → nama toko → set PIN → konfirmasi PIN
        → tampilkan kode cadangan (sekali saja) → dashboard
```

### F.2 Flow transaksi kasir
```
Dashboard → tombol Kasir → halaman Kasir
  → search produk / pindai / tap kategori
  → tap produk → masuk keranjang qty=1
  → (opsional) atur qty, diskon transaksi
  → tombol Bayar → pilih metode + input uang diterima
  → tombol "Selesaikan" (disable saat proses)
      → BEGIN TRX
         → INSERT sales
         → INSERT sale_items (loop)
         → INSERT stock_movements OUT (loop)
         → UPDATE products.stock cache (loop)
      → COMMIT (atau ROLLBACK jika gagal)
  → tampilkan struk + opsi Share / Cetak / Transaksi baru
```

### F.3 Flow tambah barang
```
Produk → tombol + → form (nama, kategori, harga jual, harga pokok, stok awal, satuan)
  → simpan
      → BEGIN TRX
         → INSERT products (stock=0)
         → jika stok awal > 0 → INSERT stock_movements IN + UPDATE stock cache
      → COMMIT
```

### F.4 Flow stok berkurang otomatis
Stok **tidak pernah** dikurangi langsung. Selalu lewat insert ke `stock_movements` dengan `type='OUT'` dalam transaksi yang sama dengan `sales`. Kolom `products.stock` di-update sebagai cache di akhir transaksi. Jika `products.stock` rusak, bisa di-rebuild:
```sql
UPDATE products SET stock = (
  SELECT COALESCE(SUM(CASE WHEN type IN ('IN','ADJUST_IN') THEN qty
                           WHEN type IN ('OUT','ADJUST_OUT') THEN -qty END), 0)
  FROM stock_movements WHERE product_id = products.id
);
```

### F.5 Flow pencatatan pengeluaran
```
Dashboard → Pengeluaran → + → form (tanggal=hari ini, kategori, nominal, catatan)
  → simpan → INSERT expenses → kembali ke daftar
```

### F.6 Flow laporan harian
```
Dashboard ringkasan hari ini (auto) → tap "Lihat detail"
  → layar Laporan dengan date range picker
  → query agregat sales + expenses + sale_items JOIN products
  → tampilkan ringkasan + grafik + top produk + export CSV
```

### F.7 Flow backup lokal
```
Pengaturan → Backup → pilih lokasi / share sheet
  → copy file toko.db → toko-YYYYMMDD-HHmm.db
  → tampilkan toast "Backup berhasil"

Restore:
Pengaturan → Restore → pilih file .db
  → konfirmasi (WARNING: data saat ini akan ditimpa)
  → tutup koneksi SQLite → overwrite file → buka ulang koneksi
  → kembali ke PIN screen (paksa login ulang)
```

---

## G. Desain database SQLite

Konvensi: semua `id` = `INTEGER PRIMARY KEY AUTOINCREMENT`. Timestamp = `INTEGER` (unix ms) untuk kemudahan sort + performa. Semua tabel punya `created_at`; tabel yang bisa diedit punya `updated_at`. Tidak pakai `DELETE` hard — gunakan `is_active` / `voided_at` agar laporan historis tetap akurat.

### settings (wajib)
Key-value untuk semua konfigurasi termasuk PIN.
| Kolom | Tipe | Keterangan |
|---|---|---|
| key | TEXT PK | `pin_hash`, `pin_salt_ref`, `store_name`, `autolock_minutes`, `failed_attempts`, `locked_until`, `recovery_question`, `recovery_hash`, `currency`, `schema_version` |
| value | TEXT | string |
| updated_at | INTEGER | |

**Alasan:** satu tabel untuk semua config menghindari ledakan skema. PIN salt **tidak** disimpan di sini — disimpan di OS secure storage (Keychain / Keystore) untuk meningkatkan keamanan.

### categories (wajib)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER PK | |
| name | TEXT UNIQUE NOT NULL | |
| created_at | INTEGER | |

### products (wajib)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER PK | |
| sku | TEXT UNIQUE | nullable, untuk kode internal |
| barcode | TEXT UNIQUE | nullable |
| name | TEXT NOT NULL | |
| category_id | INTEGER FK categories(id) | nullable |
| price | INTEGER NOT NULL | rupiah, simpan sebagai integer (hindari float) |
| cost | INTEGER NOT NULL DEFAULT 0 | harga pokok untuk hitung laba |
| unit | TEXT DEFAULT 'pcs' | satuan tampilan |
| stock | INTEGER NOT NULL DEFAULT 0 | **cache** — rebuild-able |
| min_stock | INTEGER DEFAULT 0 | ambang alert, 0 = nonaktif |
| is_active | INTEGER DEFAULT 1 | soft-delete |
| created_at | INTEGER | |
| updated_at | INTEGER | |

**Index:** `name`, `barcode`, `category_id`, `is_active`.

**Alasan harga disimpan integer:** float = bug. Semua kalkulasi pakai integer rupiah.

### stock_movements (wajib)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER PK | |
| product_id | INTEGER FK NOT NULL | |
| type | TEXT NOT NULL | `IN`, `OUT`, `ADJUST_IN`, `ADJUST_OUT` |
| qty | INTEGER NOT NULL | selalu positif; arah ditentukan `type` |
| unit_cost | INTEGER | harga pokok saat IN (untuk tracking HPP) |
| ref_type | TEXT | `sale`, `purchase`, `adjustment`, `void`, `manual` |
| ref_id | INTEGER | id di tabel referensi (nullable) |
| note | TEXT | alasan (khusus manual/adjustment) |
| created_at | INTEGER NOT NULL | |

**Index:** `product_id`, `ref_type, ref_id`, `created_at`.

**Alasan:** satu tabel = audit trail lengkap + sumber tunggal untuk stok. Voided sale membuat record baru (`type='IN'`, `ref_type='void'`) — tidak menghapus record lama.

### sales (wajib)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER PK | |
| code | TEXT UNIQUE NOT NULL | misal `INV-20260423-0001` |
| subtotal | INTEGER NOT NULL | jumlah sebelum diskon |
| discount | INTEGER NOT NULL DEFAULT 0 | rupiah |
| total | INTEGER NOT NULL | = subtotal − discount |
| paid | INTEGER NOT NULL | uang diterima |
| change | INTEGER NOT NULL DEFAULT 0 | kembalian |
| payment_method | TEXT NOT NULL | `cash`, `transfer`, `qris` |
| status | TEXT NOT NULL DEFAULT 'completed' | `completed`, `voided` |
| voided_at | INTEGER | nullable |
| void_reason | TEXT | |
| created_at | INTEGER NOT NULL | |

**Index:** `created_at`, `status`.

### sale_items (wajib)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER PK | |
| sale_id | INTEGER FK NOT NULL | |
| product_id | INTEGER FK NOT NULL | |
| name_snapshot | TEXT NOT NULL | nama produk saat dijual (agar laporan lama tidak berubah bila produk di-rename) |
| qty | INTEGER NOT NULL | |
| price | INTEGER NOT NULL | harga jual saat transaksi |
| cost | INTEGER NOT NULL | harga pokok saat transaksi (untuk hitung laba historis) |
| subtotal | INTEGER NOT NULL | `qty * price` |

**Index:** `sale_id`, `product_id`.

**Alasan snapshot nama dan cost:** laporan historis harus stabil. Jika harga/nama produk berubah besok, laporan kemarin tetap benar.

### expenses (wajib)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER PK | |
| date | INTEGER NOT NULL | tanggal expense (boleh beda dari created_at) |
| category | TEXT NOT NULL | `listrik`, `sewa`, `gaji`, `restock`, `lain` |
| amount | INTEGER NOT NULL | |
| note | TEXT | |
| created_at | INTEGER NOT NULL | |

**Index:** `date`, `category`.

### audit_log (opsional — direkomendasikan)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER PK | |
| action | TEXT NOT NULL | `sale_created`, `sale_voided`, `product_created`, `pin_changed`, `restore`, `login_failed` |
| entity_type | TEXT | |
| entity_id | INTEGER | |
| payload | TEXT | JSON ringkas |
| created_at | INTEGER NOT NULL | |

**Alasan opsional tapi direkomendasikan:** kecil, murah, menyelamatkan Anda saat debugging bug di produksi ("kok stok ini aneh?"). Rotasi otomatis: hapus log > 90 hari.

### Tabel yang **tidak** dibuat
- `users` — tidak perlu, 1 user. Info auth masuk ke `settings`.
- `payments` terpisah — cukup kolom di `sales`. MVP tidak mendukung split payment.
- `ledger` / `journal_entries` — tidak perlu, laporan dihitung dari `sales` + `expenses`.
- `suppliers`, `customers` — belum perlu. Pembelian stok cukup catat `note` di `stock_movements`.

### PRAGMA wajib saat buka DB
```sql
PRAGMA journal_mode = WAL;      -- lebih tahan crash & cepat
PRAGMA foreign_keys = ON;        -- FK enforcement
PRAGMA synchronous = NORMAL;     -- balance safety vs speed
PRAGMA busy_timeout = 5000;
```

---

## H. Aturan bisnis otomatis

1. **Penjualan sukses:** `sales.status='completed'` → insert N `stock_movements (OUT, ref_type='sale', ref_id=sale.id)` → `products.stock -= qty` per produk. Semua dalam satu transaksi. Gagal salah satu → rollback semua.
2. **Penjualan di-void:** tidak menghapus `sales` atau `sale_items`. Sebaliknya: `UPDATE sales SET status='voided', voided_at=..., void_reason=...` + insert balasan `stock_movements (IN, ref_type='void', ref_id=sale.id)` + update `products.stock += qty`. Laporan otomatis meng-exclude sale voided dari total pemasukan.
3. **Stok masuk (pembelian):** insert `stock_movements (IN, ref_type='purchase')` + update `products.stock`. Opsional: `unit_cost` update `products.cost` (metode: average cost ATAU terakhir). **Pilihan MVP: latest cost** (lebih sederhana, akurat cukup untuk toko kecil).
4. **Stok keluar manual / opname:** `ADJUST_OUT` atau `ADJUST_IN` dengan `note` wajib diisi. Update cache `products.stock`.
5. **Pengeluaran:** insert ke `expenses`. Tidak menyentuh stok.
6. **Diskon:** satu diskon per transaksi, rupiah atau persen. Jika persen: `discount = round(subtotal * pct / 100)`. `total = max(0, subtotal - discount)`. Laba dihitung per item **setelah** diskon dibagi proporsional (atau, untuk MVP yang lebih jujur: catat diskon sebagai pengurang laba total sale, jangan alokasikan ke item). **Keputusan MVP: diskon tidak dibagi per item; laporan top produk pakai `price` asli, laba bersih dihitung di level sale**.
7. **Stok habis (stok ≤ 0):** produk tetap boleh diedit tapi **tidak boleh dijual**. UI menonaktifkan tombol tambah di kasir. Validasi final tetap dilakukan saat COMMIT — jika race, rollback.
8. **Stok di bawah min_stock:** tampilkan badge kuning di daftar produk. Tidak ada notifikasi push.
9. **PIN salah:**
   - 1-4x: pesan error + getar.
   - 5x: lock 60 detik (`settings.locked_until`).
   - 6-9x berikutnya (setelah unlock): lock eksponensial (2m, 5m, 10m, 30m, 60m).
   - Tidak ada auto-wipe data.
10. **Session timeout:** tidak aktif > `autolock_minutes` → layar PIN kembali tampil. Data in-memory tetap tersimpan di SQLite (aman).
11. **Tanggal & zona waktu:** gunakan waktu perangkat. Simpan sebagai unix ms UTC. Tampilkan pakai locale perangkat. Laporan "hari ini" = dari 00:00 hingga 23:59:59 lokal.
12. **Nomor invoice:** format `INV-YYYYMMDD-XXXX` di-generate saat COMMIT sale. Counter harian di-reset tiap pergantian tanggal lokal.
13. **Import CSV (Tahap 2):** dry-run dulu, tampilkan preview, baru COMMIT.

---

## I. Desain layar

Struktur navigasi: **Stack root** (PIN → Main Tabs). **Main Tabs:** POS/Kasir (default), Produk, Laporan, Pengaturan. Dashboard dijadikan header/section di layar POS agar tidak menambah tab. **Semua tab dapat diakses oleh satu-satunya pengguna setelah login PIN — tidak ada tab yang terkunci berdasarkan role.**

### I.1 PIN Lock Screen
- **Tujuan:** satu-satunya gerbang akses.
- **Komponen:** logo/nama toko, dot 6 digit, keypad numerik besar, link "Lupa PIN".
- **Aksi:** input PIN, submit otomatis saat digit ke-6, lupa PIN → security question.
- **Data dibutuhkan:** `pin_hash`, `locked_until`, `failed_attempts`.
- **Data disimpan:** increment `failed_attempts`, set `locked_until`.

### I.2 POS / Kasir (layar utama)
> "Kasir" = nama layar POS/transaksi — bukan nama role pengguna. Semua layar bisa diakses setelah login PIN.
- **Tujuan:** lakukan transaksi secepat mungkin.
- **Komponen:**
  - Header: ringkasan hari ini (total sale, jumlah trx) — bisa di-collapse.
  - Search bar (autofocus) + tombol scan barcode (Tahap 2).
  - Grid produk atau hasil search.
  - Panel keranjang (bottom sheet atau side pane) dengan daftar item, +/-, subtotal, diskon, total.
  - Tombol "Bayar" besar.
- **Aksi:** cari, tap produk, ubah qty, diskon, bayar.
- **Data dibutuhkan:** `products` (WHERE is_active=1), `categories`.
- **Data disimpan:** saat "Selesaikan" → `sales`, `sale_items`, `stock_movements`.

### I.3 Pembayaran (modal / full screen)
- **Komponen:** total, quick amount (uang pas, 50rb, 100rb, 150rb, 200rb), input custom, pilihan metode, kembalian.
- **Aksi:** pilih metode, input paid, selesaikan.
- **Tombol Selesaikan disable saat transaksi in-flight** (cegah double tap).

### I.4 Struk / Detail Transaksi
- **Komponen:** header toko, kode, tanggal, item, subtotal, diskon, total, paid, change, metode, tombol Share (as PDF/image), tombol Void (dengan konfirmasi + alasan).
- **Data:** 1 sale + sale_items join products.

### I.5 Daftar Produk
- **Komponen:** search, filter kategori, list virtualized (nama, stok, harga, badge stok rendah), FAB tambah produk.
- **Aksi:** tap → edit, tahan → menu (nonaktifkan).

### I.6 Tambah / Edit Produk
- **Komponen:** form (nama*, kategori, SKU, barcode, harga jual*, harga pokok, satuan, min_stock, stok awal [hanya saat tambah]).
- **Validasi:** nama wajib, harga jual > 0, angka integer, SKU/barcode unique.

### I.7 Stok Masuk / Opname
- **Komponen:** pilih produk → form (qty, unit_cost opsional untuk IN, note untuk ADJUST).
- **Data disimpan:** `stock_movements`, update `products.stock` dan optional `products.cost`.

### I.8 Pengeluaran
- **Komponen:** list pengeluaran (filter tanggal & kategori), FAB tambah, form (tanggal, kategori, amount, note).

### I.9 Laporan
- **Komponen:** date range picker (hari ini / kemarin / 7 hari / 30 hari / custom), kartu ringkasan (total sale, total trx, avg, total expense, laba kotor, laba bersih), bar chart per hari, list top produk, tombol Export CSV, tombol Riwayat Transaksi.

### I.10 Riwayat Transaksi
- **Komponen:** list sales (code, waktu, total, status), filter tanggal, tap → detail.

### I.11 Pengaturan
- **Komponen:** profil toko, ubah PIN, autolock, backup, restore, tentang aplikasi, rebuild stock cache (tombol tersembunyi di pojok, untuk recovery).

### I.12 Backup & Restore
- **Komponen:** daftar backup terakhir di device, tombol Backup Sekarang, tombol Pilih File untuk Restore, peringatan jelas sebelum restore.

---

## J. Arsitektur React Native

### J.1 Pustaka inti
- **Runtime:** React Native (bare, bukan Expo Go) → agar `op-sqlite` / `react-native-quick-sqlite` bisa dipakai. Expo bare / prebuild acceptable.
- **SQLite:** `op-sqlite` (performa terbaik, sync API untuk statement sederhana, async untuk transaksi).
- **State:** **Zustand** (satu store per domain: `cartStore`, `authStore`, `settingsStore`). Tidak pakai Redux — terlalu berat untuk app 1 user.
- **Query cache:** tidak pakai React Query — datanya lokal, cukup invalidate manual atau pakai pattern "versi" per tabel.
- **Forms:** `react-hook-form` + `zod`.
- **Navigasi:** `@react-navigation/native` + native-stack + bottom-tabs.
- **UI:** komponen custom tipis di atas primitive RN; atau Tamagui / NativeWind bila mau. **MVP: StyleSheet + komponen custom** agar tidak terjebak debugging UI lib.
- **Secure storage:** `react-native-keychain` untuk PIN salt.
- **File system / share:** `react-native-fs` + `react-native-share`.
- **Hash:** `react-native-quick-crypto` atau `react-native-argon2`.

### J.2 Struktur folder
> Tidak ada pembagian `(admin)/` vs `(kasir)/` — seluruh layar berada di satu level dan dapat diakses setelah login PIN.

```
src/
  app/                  # navigator root, theme, providers
  screens/
    Auth/
      PinScreen.tsx
      OnboardingScreen.tsx
    POS/
      POSScreen.tsx           # layar transaksi / kasir
      PaymentSheet.tsx
      ReceiptScreen.tsx
    Products/
      ProductListScreen.tsx
      ProductFormScreen.tsx
    Stock/
      StockMovementScreen.tsx  # stok masuk, keluar, opname
    Expenses/
      ExpenseListScreen.tsx
      ExpenseFormScreen.tsx
    Reports/
      ReportScreen.tsx
      TransactionHistoryScreen.tsx
    Settings/
      SettingsScreen.tsx
      BackupScreen.tsx
  components/           # Button, TextField, ListItem, EmptyState, dst.
  db/
    schema.ts           # DDL + migrations
    connection.ts       # open DB, PRAGMA, migration runner
    migrations/         # 001_init.sql, 002_xxx.sql
  repositories/
    productRepo.ts
    saleRepo.ts         # createSale() = transaction
    stockRepo.ts
    expenseRepo.ts
    settingsRepo.ts
    reportRepo.ts       # read-only aggregations
  services/
    auth.ts             # hashPin, verifyPin, lockout logic
    backup.ts
    invoice.ts          # generate code
    money.ts            # format, parse, integer-safe math
  stores/
    cartStore.ts        # zustand
    authStore.ts        # hanya PIN state (locked/unlocked), bukan role
    settingsStore.ts
  hooks/
    useDebounce.ts
    useProducts.ts      # read + subscribe to table version
    useAutolock.ts
  utils/
    date.ts
    csv.ts
    validators.ts
  types/
```

### J.3 Pola repository
Satu tempat untuk setiap query. Aturan keras:
- **Tidak ada query SQL di screen/component.** Semua lewat repo.
- Repo mengembalikan tipe domain yang rapi (bukan raw row).
- Mutasi yang menyentuh >1 tabel diimplementasikan dalam **satu fungsi transaction** (contoh: `saleRepo.createSale(cart)`).

### J.4 Transaksi atomic (contoh pseudocode)
```ts
export async function createSale(cart: Cart, payment: Payment) {
  return db.transaction(async (tx) => {
    // 1. validasi stok terbaru
    for (const item of cart.items) {
      const row = await tx.get('SELECT stock, is_active FROM products WHERE id=?', [item.productId]);
      if (!row || !row.is_active) throw new Error('Produk tidak tersedia');
      if (row.stock < item.qty) throw new Error(`Stok ${item.name} tidak cukup`);
    }
    // 2. insert sales
    const code = generateInvoiceCode(Date.now());
    const saleId = await tx.insert('sales', { code, subtotal, discount, total, paid, change, payment_method, status:'completed', created_at: now });
    // 3. insert sale_items + stock_movements + update stock cache
    for (const item of cart.items) {
      await tx.insert('sale_items', { sale_id: saleId, product_id: item.productId, name_snapshot: item.name, qty: item.qty, price: item.price, cost: item.cost, subtotal: item.qty * item.price });
      await tx.insert('stock_movements', { product_id: item.productId, type: 'OUT', qty: item.qty, ref_type: 'sale', ref_id: saleId, created_at: now });
      await tx.run('UPDATE products SET stock = stock - ?, updated_at=? WHERE id=?', [item.qty, now, item.productId]);
    }
    return saleId;
  });
}
```

### J.5 Strategi sinkronisasi state ↔ SQLite
- **Pattern "table version":** simpan counter di memory per nama tabel. Setelah mutasi sukses, increment. Hook `useProducts()` re-fetch saat versi berubah.
- Alternatif sederhana: setelah mutasi, repo memanggil event emitter → hook subscribe.
- **Jangan simpan duplikasi data di Zustand untuk data yang tinggal di DB** (kecuali keranjang belanja yang memang transient).

### J.6 Cegah bug stok ganda / transaksi dobel
- Tombol "Selesaikan" **disable** sejak ditekan hingga transaksi selesai atau gagal.
- Gunakan `useRef` boolean `inFlight` untuk guard di level component.
- Transaksi SQLite memakai `BEGIN IMMEDIATE` sehingga dua operasi concurrent mustahil (app ini 1 user, tapi tetap aman).
- Validasi stok **di dalam transaksi** (baca ulang stok setelah BEGIN), bukan hanya di UI.
- `stock_movements.ref_type` + `ref_id` unique-index untuk `ref_type='sale'` — jaga-jaga bila retry logic terpicu.

### J.7 Validasi form
- Skema `zod` per form, integrasi via `zodResolver` ke `react-hook-form`.
- Input angka: custom `<AmountInput />` yang hanya menerima digit, menampilkan format rupiah, menyimpan ke state sebagai integer.

### J.8 Performa
- **List:** pakai `FlashList` dari Shopify; hindari `ScrollView` untuk data dinamis.
- **Query laporan:** selalu batasi date range; hasil diagregasi di SQL (`SUM`, `COUNT`, `GROUP BY`), bukan di JS.
- **Index:** sudah disebutkan di skema.
- **Image produk (jika kelak ditambahkan):** simpan path file, bukan blob.
- **Hindari re-render:** pecah Zustand selector; memoize list item.

---

## K. Rencana implementasi bertahap

Urutan ketat — jangan loncat.

| Tahap | Fokus | Output terukur |
|---|---|---|
| 1. Fondasi | Setup RN bare, folder, lint, TS strict, theme, navigasi dummy, op-sqlite terhubung, migration runner, PRAGMA benar. | Buka app → DB ter-inisialisasi, migration 001 jalan. |
| 2. Auth PIN | Onboarding, set PIN, hash + salt, verifikasi, autolock, rate limit, lupa PIN. | Tidak bisa akses main app tanpa PIN valid. |
| 3. CRUD Produk & Kategori | productRepo, screens produk & kategori, validasi. | Bisa tambah/edit/nonaktifkan produk. |
| 4. Stok masuk + opname | stockRepo, layar stok, rebuild-stock utility. | Stok cache selalu = sum movements. |
| 5. POS (kasir) | cartStore, search, add, diskon, payment sheet, createSale transaction, generate invoice code. | Transaksi tercatat, stok berkurang, struk tampil. |
| 6. Void transaksi | Detail transaksi + void flow + reverse movements. | Void mengembalikan stok dan meng-exclude dari laporan. |
| 7. Pengeluaran | expenseRepo + screen. | Expense masuk laporan. |
| 8. Laporan & riwayat | reportRepo agregasi, chart sederhana, export CSV. | Laporan harian/bulanan akurat, bisa di-export. |
| 9. Backup / restore | services/backup, handle close+reopen DB. | Backup file valid bisa di-restore. |
| 10. Polishing UI | Empty states, skeleton, copywriting, onboarding tips. | Pemilik toko paham UI tanpa diajari. |
| 11. Testing | Unit test util & repo (jest), smoke test flow utama, dogfooding 1 minggu di HP nyata dengan data beneran. | Tidak ada crash di 200+ transaksi uji. |

Estimasi realistis 1 developer part-time (evening): **8–12 minggu** sampai MVP stabil.

---

## L. Risiko dan pencegahan

| Risiko | Dampak | Pencegahan |
|---|---|---|
| Data corrupt (crash saat tulis) | Data hilang / DB rusak | `PRAGMA journal_mode=WAL`, semua multi-row operation di dalam transaksi, backup otomatis mingguan di folder app. |
| Stok tidak sinkron dengan kenyataan | Pemilik tidak percaya aplikasi | `stock_movements` sebagai sumber, tombol tersembunyi "Rebuild stok" di Pengaturan, fitur Opname untuk rekonsiliasi fisik. |
| Transaksi dobel (double tap) | Pemasukan & stok ganda | Disable tombol saat in-flight, guard `useRef`, transaction BEGIN IMMEDIATE, idempotency via cart id opsional. |
| User lupa PIN | Terkunci dari bisnisnya sendiri | Security question + recovery code saat setup; fallback terakhir: reset app (hapus data) — peringatkan eksplisit. |
| Aplikasi lambat saat data banyak | UX turun drastis | Index proper, FlashList, pagination riwayat, query agregat di SQL, tidak load-all ke memory. |
| Data hilang karena uninstall / ganti HP | Catastrophic | Dorong backup mingguan di onboarding; tampilkan banner "backup terakhir: X hari lalu" di dashboard bila > 7 hari. |
| Error SQLite (disk full, permission) | Aplikasi crash | Wrap setiap call dengan try/catch di repo, tampilkan dialog error user-friendly, log ke audit_log. |
| Validasi input lemah → data sampah | Laporan tidak bisa dipercaya | Zod schema wajib, NOT NULL di DB, CHECK constraint untuk amount ≥ 0. |
| Migration gagal saat update app | Data tidak bisa dibaca | Migration runner berurutan, simpan `schema_version`, rollback strategi: backup otomatis sebelum migrate. |
| Float rounding di perhitungan uang | Total tidak cocok 1-2 rupiah | Semua nilai uang = integer rupiah. Format hanya di layer display. |
| Perubahan harga membuat laporan lama berubah | Laporan historis salah | `sale_items.price` + `cost` + `name_snapshot` disimpan permanen. |
| Tanggal berubah karena user geser jam HP | Laporan berantakan | Terima risiko ini (toko kecil, 1 user). Opsional: tampilkan warning jika jam mundur signifikan. |

---

## M. Evaluasi final

**Apakah scope ini realistis untuk 1 developer?**
Ya. Dengan fokus pada MVP di bagian E, seorang developer RN berpengalaman dapat menyelesaikan dalam 8–12 minggu part-time atau 4–6 minggu full-time. Kunci: **jangan menyentuh fitur Tahap 2/3 sebelum MVP dipakai minimal 4 minggu di toko nyata.**

**Bagian paling rawan bug:**
1. **Transaksi kasir `createSale`** — menyentuh 3 tabel + cache stok. Salah sedikit di transaction boundary = stok salah permanen. **Wajib unit test.**
2. **Void transaksi** — logika reverse harus sama persis dengan forward. **Wajib unit test.**
3. **Perhitungan laba saat ada diskon** — gampang salah alokasi. Putuskan satu aturan dan dokumentasikan.
4. **PIN lockout state** — edge case saat waktu lock habis vs app dibuka ulang. Hitung dari `locked_until` absolute, bukan timer in-memory.
5. **Restore backup** — harus menutup semua koneksi DB dulu. Salah = crash / DB locked.

**Bagian yang harus dibangun paling awal:**
Fondasi DB + migration + schema + `saleRepo.createSale` + test-nya. Jika bagian ini solid, sisanya hanya UI di atasnya. Jangan tergoda mulai dari layar Kasir karena "kelihatan seru".

**Rekomendasi MVP paling aman:**
Rilis pertama cukup:
- PIN login + autolock.
- Produk (tanpa barcode, tanpa varian).
- Stok manual (tanpa scan).
- Kasir: search → add → diskon transaksi → cash/transfer/QRIS (label saja) → struk share image.
- Void transaksi.
- Pengeluaran.
- Laporan harian + bulanan + riwayat + export CSV.
- Backup / restore manual.

**Yang sengaja DITUNDA walau terdengar penting:**
- Barcode scan (bisa pakai search manual dulu).
- Print thermal (share as image sudah cukup).
- Grafik canggih (angka jujur lebih penting).
- Hutang pelanggan (beda domain, tunggu request nyata dari pemilik).

**Tanda MVP sudah "cukup baik":**
Pemilik toko bisa menjalani hari kerja penuh tanpa menanyakan fitur tambahan — dan laporan akhir hari cocok dengan uang di laci. Jika dua syarat itu terpenuhi selama 2 minggu berturut-turut, baru buka Tahap 2.

---

**Catatan tambahan dari saya sebagai arsitek:**

Satu hal yang tidak Anda sebutkan tapi sangat penting di dunia nyata: **struk fisik**. Banyak pelanggan tetap meminta bukti. Solusi MVP paling murah: generate struk sebagai **gambar/PDF** lalu `Share` (WhatsApp / Bluetooth ke printer mana pun yang terkoneksi). Dengan begini Anda menunda integrasi printer thermal ke Tahap 2 tanpa kehilangan use case.

Dan satu lagi: **dogfooding ≥ 1 minggu di toko nyata sebelum rilis**. Aplikasi kasir tidak bisa diuji di simulator. Bug yang sesungguhnya baru muncul saat pelanggan sungguhan mengantri dan tangan Anda gemetar.