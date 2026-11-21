# Login pembeli dengan Google

Login pembeli **opsional**: checkout tanpa akun tetap berjalan. Selama `AUTH_GOOGLE_ID` dan `AUTH_GOOGLE_SECRET` kosong, tombol "Masuk" tidak muncul dan `/masuk` menampilkan "belum diaktifkan".

## 1. Buat OAuth Client (± 10 menit, gratis)

1. Buka [Google Cloud Console](https://console.cloud.google.com/), lalu buat project baru (mis. "Toraho").
2. **APIs & Services → OAuth consent screen**, lalu isi:
   - User type: **External**
   - App name: **Toraho**; support email dan developer contact: emailmu.
   - Scopes: biarkan default (`openid`, `email`, `profile`). Scope dasar ini **tidak perlu verifikasi Google**.
   - Selama status **Testing**, hanya akun yang terdaftar di *Test users* yang bisa login. Tambahkan Gmail-mu untuk uji coba, lalu tekan **Publish app** saat toko siap dipakai umum.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized JavaScript origins:** `http://localhost:3001`
   - **Authorized redirect URIs:** `http://localhost:3001/api/auth/callback/google`
   - Nanti tambahkan juga domain produksi dan demo, mis. `https://toraho.id/api/auth/callback/google`.
4. Salin **Client ID** dan **Client secret**.

## 2. Isi `.env`

```
AUTH_GOOGLE_ID="....apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-..."
```

Restart server dev (`npm run dev -- -p 3001`). Di Vercel, isi dua variabel yang sama di **Settings → Environment Variables**, lalu redeploy.

## 3. Cek

| Langkah | Hasil yang benar |
|---|---|
| Buka toko | Header menampilkan **Masuk** |
| Masuk → pilih akun Google | Kembali ke `/akun`, header menampilkan inisial namamu |
| Buka `/admin` dengan sesi pembeli | Diarahkan ke halaman masuk admin (akun Google tidak bisa jadi admin) |
| Checkout saat login | Nama dan email terisi otomatis. Setelah memesan, pesanan muncul di **Akun saya** |
| Pesanan lama (tanpa login, email sama) | Muncul dengan tanda "Buka dengan nomor HP". Setelah nomor HP dimasukkan sekali, pesanan tersimpan di akun |
| Keluar | Tombol **Keluar** di `/akun` |

## Catatan keamanan

- Hanya email yang **sudah diverifikasi Google** yang diterima. Satu email hanya bisa terhubung ke satu akun Google.
- Email di checkout tanpa akun tidak diverifikasi. Karena itu detail pesanan lama (nama, HP, alamat) baru terbuka setelah nomor HP-nya cocok.
- Login admin (email + kata sandi) dan login pembeli dipisah dengan **peran**. Peran dicek di middleware dan di setiap server action admin.
