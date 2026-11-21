# Uji Midtrans di sandbox (QRIS + VA)

Status **Lunas hanya diambil dari webhook Midtrans** yang tanda tangannya sudah diverifikasi, bukan dari redirect browser. Karena Midtrans tidak bisa mengirim webhook ke `localhost`, uji lokal butuh **tunnel**.

## 1. Kunci sandbox

1. Masuk ke [dashboard sandbox Midtrans](https://dashboard.sandbox.midtrans.com/) dan buka **Settings → Access Keys**.
2. Salin **Server Key** (berawalan `SB-Mid-server-`) ke `.env`:

```
MIDTRANS_SERVER_KEY="SB-Mid-server-..."
MIDTRANS_IS_PRODUCTION="false"
```

3. Pastikan metode **QRIS** dan **Virtual Account** aktif di pengaturan pembayaran sandbox. Toko hanya meminta `other_qris` dan VA bank.

## 2. Tunnel agar webhook sampai ke laptop

1. Buat akun gratis di [ngrok](https://ngrok.com/), lalu pasang ngrok dan sambungkan authtoken-mu:
   ```
   ngrok config add-authtoken <token-mu>
   ```
2. Jalankan tunnel ke server dev:
   ```
   ngrok http 3001
   ```
3. Salin alamat `https://….ngrok-free.app`, lalu isi `.env`:
   ```
   MIDTRANS_NOTIFICATION_URL="https://xxxx.ngrok-free.app/api/midtrans/notification"
   ```
4. Restart server dev. Admin → Pengaturan → Midtrans akan menampilkan URL ini di baris **Notifikasi**.

Toko mengirim URL ini per transaksi lewat header `X-Override-Notification`, jadi kamu tidak perlu mengubah dashboard setiap kali alamat ngrok berganti. Di produksi, **kosongkan** variabel ini dan isi *Payment Notification URL* di dashboard Midtrans dengan `https://domainmu/api/midtrans/notification`.

## 3. Skenario uji

Siapkan satu produk dengan stok yang mudah diingat, misalnya 5.

| # | Langkah | Hasil yang benar |
|---|---|---|
| 1 | Checkout dengan **QRIS / Virtual Account**, lalu klik **Bayar Rp …** | Diarahkan ke halaman Snap sandbox. Stok produk berkurang (ditahan) |
| 2 | Pilih **BCA Virtual Account** dan salin nomor VA. Buka [simulator Midtrans](https://simulator.sandbox.midtrans.com/), pilih BCA VA, tempel nomornya, lalu bayar | Dalam beberapa detik terminal ngrok menampilkan `POST /api/midtrans/notification 200`, dan halaman pesanan berstatus **Dibayar** |
| 3 | Pesanan baru → pilih **QRIS** di Snap → salin URL gambar QR → simulator QRIS → bayar | Status **Dibayar** lewat webhook |
| 4 | Buka halaman pesanan sebelum membayar, lalu tutup Snap tanpa membayar | Status tetap **Menunggu Bayar**. Redirect browser tidak pernah menandai lunas |
| 5 | Pesanan baru, lalu batalkan transaksinya di sandbox (perintah di bawah) | Status **Kedaluwarsa** dan stok kembali |
| 6 | Admin → detail pesanan yang dibayar | Riwayat notifikasi Midtrans tercatat |

Perintah untuk skenario 5 menjalankan endpoint resmi Midtrans *expire transaction*. Ganti `<ORDER_CODE>` dengan kode pesanan (mis. `TRH-261122-AB12`), lalu jalankan di PowerShell (kunci dibaca dari `.env`, tidak diketik ulang):

```powershell
$key = (Select-String -Path .env -Pattern '^MIDTRANS_SERVER_KEY="?([^"]+)"?').Matches.Groups[1].Value; $auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($key):")); Invoke-RestMethod -Method Post -Uri "https://api.sandbox.midtrans.com/v2/<ORDER_CODE>/expire" -Headers @{ Authorization = "Basic $auth"; Accept = "application/json" }
```

## Jika gagal

- **Tombol bayar mengarah ke halaman pesanan dengan pesan gagal.** Server key salah atau kosong. Periksa log server (`[midtrans] gagal membuat transaksi`).
- **Snap terbuka tetapi status tidak pernah Dibayar.** Webhook tidak sampai. Pastikan ngrok masih berjalan, `MIDTRANS_NOTIFICATION_URL` sesuai alamat ngrok yang **sekarang**, dan server sudah di-restart.
- **Webhook ditolak (401).** Tanda tangan tidak cocok, biasanya karena server key di `.env` berbeda dengan akun sandbox yang dipakai.
