# Panduan Deploy: Dua Situs dari Satu Kode

Toraho di-deploy **dua kali** dari repo yang sama. Keduanya hanya berbeda di environment variable (env), dan tidak ada "mode demo" di dalam kode.

| | Toko asli | Demo portofolio |
|---|---|---|
| Proyek Vercel | `toraho` | `toraho-demo` |
| Database Neon | database sendiri | database sendiri |
| Vercel Blob | store sendiri | store sendiri |
| Midtrans | **Production** key | **Sandbox** key |
| Produk contoh | tidak (`SEED_DEMO_PRODUCTS=false`) | ya (`true`) |
| Akun admin di README | **tidak** | ya |

## 1. Siapkan layanan (lakukan untuk masing-masing situs)

1. **Neon**: buat project lalu salin *connection string* (pooled) sebagai `DATABASE_URL`.
2. **Vercel**: *Add New Project*, impor repo ini, dengan framework Next.js.
3. **Vercel Blob**: buka tab Storage, pilih *Create Blob*, lalu hubungkan ke proyek. `BLOB_READ_WRITE_TOKEN` akan terisi otomatis.

## 2. Environment variables di Vercel

| Variabel | Isi |
|---|---|
| `DATABASE_URL` | connection string Neon |
| `AUTH_SECRET` | hasil `npx auth secret` (beda untuk tiap situs) |
| `SEED_ADMIN_PASSWORD` | kata sandi admin awal (toko asli: buat yang kuat) |
| `SEED_DEMO_PRODUCTS` | `false` (asli) / `true` (demo) |
| `MIDTRANS_SERVER_KEY` | Server Key dari dashboard Midtrans → Settings → Access Keys |
| `MIDTRANS_IS_PRODUCTION` | `true` (asli) / `false` (demo) |
| `BLOB_READ_WRITE_TOKEN` | otomatis dari Vercel Blob |
| `CRON_SECRET` | string acak. Vercel mengirimkannya ke `/api/cron/expire` |
| `NEXT_PUBLIC_SITE_URL` | URL situs, mis. `https://toraho.id` |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | OAuth client Google untuk login pembeli (opsional). Tambahkan `https://<domain>/api/auth/callback/google` ke *Authorized redirect URIs*. Lihat [google-login.md](google-login.md) |
| `RAJAONGKIR_API_KEY` | API key Shipping Cost Komerce (opsional). Setelah deploy, atur asal pengiriman di admin. Lihat [rajaongkir.md](rajaongkir.md) |
| `RAJAONGKIR_COURIERS` | kurir yang ditawarkan, default `jne:jnt:sicepat` |
| `MIDTRANS_NOTIFICATION_URL` | **kosongkan** di Vercel. Hanya untuk uji lokal lewat tunnel. Di produksi, isi *Payment Notification URL* di dashboard Midtrans dengan `https://<domain>/api/midtrans/notification` |

## 3. Build command

Atur **Build Command** di Vercel ke:

```
prisma migrate deploy && next build
```

Dengan begitu, migrasi database berjalan otomatis setiap kali deploy.

## 4. Isi data awal (sekali saja)

Dari komputer lokal, arahkan `DATABASE_URL` sementara ke database Neon tujuan:

```powershell
$env:DATABASE_URL="<connection string Neon>"; $env:SEED_ADMIN_PASSWORD="<kata sandi>"; $env:SEED_DEMO_PRODUCTS="false"; npm run db:seed
```

Untuk **toko asli**, isi juga 27 produk Koleksi 01 (harga & stok awal bisa diubah di admin):

```powershell
$env:DATABASE_URL="<connection string Neon>"; npm run db:seed:koleksi01
```

Seed bersifat idempoten: aman dijalankan ulang, dan tidak menimpa produk atau pengaturan yang sudah diubah admin.

## 5. Midtrans

1. Buka dashboard Midtrans → **Settings → Configuration** → *Payment Notification URL*, lalu isi dengan `https://<domain>/api/midtrans/notification`.
2. Di **Settings → Snap Preferences**, cukup aktifkan **QRIS** dan **Virtual Account**. Kode juga membatasi metode lewat `enabled_payments`.
3. Untuk uji sandbox, bayar memakai [simulator Midtrans](https://simulator.sandbox.midtrans.com/), lalu cek bahwa status pesanan berubah menjadi *Dibayar*.

## 6. Cron kedaluwarsa

`vercel.json` menjadwalkan `/api/cron/expire` **sekali sehari** (00:00 WIB), karena paket Hobby Vercel hanya mengizinkan cron harian. Selain itu, pesanan yang lewat batas waktu langsung dikedaluwarsakan saat halaman status pembeli atau daftar pesanan admin dibuka, jadi status yang terlihat selalu benar.

Kalau memakai paket Pro, jadwal bisa diubah menjadi per jam (`0 * * * *`).

## 7. Setelah deploy: cek cepat

- [ ] `/` tampil dan logo putih terlihat.
- [ ] `/admin/masuk` → login → `/admin/ringkasan`.
- [ ] Pengaturan: isi rekening, WhatsApp, dan tarif ongkir.
- [ ] Checkout transfer manual → unggah bukti → konfirmasi di admin.
- [ ] (Demo) Checkout Midtrans sandbox → bayar di simulator → status *Dibayar*.
