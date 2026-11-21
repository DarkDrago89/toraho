# Ongkir kurir (RajaOngkir / Komerce)

Saat aktif, pembeli mencari kelurahan/kecamatan/kode pos tujuan, lalu memilih layanan kurir (JNE, J&T, SiCepat) yang lengkap dengan harga dan estimasinya. Ongkir **selalu dihitung ulang di server** saat pesanan dibuat.

Selama `RAJAONGKIR_API_KEY` atau asal pengiriman belum diatur, checkout memakai **tarif per provinsi** (admin → Pengaturan). Tabel tarif itu juga menjadi **cadangan** saat RajaOngkir gagal atau kuotanya habis, jadi toko tidak pernah macet.

## 1. API key

1. Daftar atau masuk di dashboard Komerce (RajaOngkir), lalu buka **Developer → Settings → API Key**.
2. Ambil key untuk layanan **Shipping Cost**, bukan key layanan lain.
3. Cek paketmu:
   - **Kuota harian:** di paket kecil sekitar 100 hit/hari. Satu pembeli biasanya memakai 2–3 hit (pencarian dan hitung tarif), dan hasilnya disimpan di cache database.
   - **Kurir yang tersedia:** kalau paketmu hanya mendukung sebagian kurir, atur `RAJAONGKIR_COURIERS`.

```
RAJAONGKIR_API_KEY="..."
RAJAONGKIR_COURIERS="jne:jnt:sicepat"
```

Restart server.

## 2. Cek respons asli

```
npm run check:rajaongkir -- cibubur
```

Skrip ini mencari "cibubur", lalu menampilkan hasil yang sudah dipetakan: id, label, provinsi, dan kode pos. Key tidak dicetak. Kalau asal pengiriman sudah diatur, skrip juga menampilkan contoh tarif 1 kg. Kalau ada hasil yang provinsinya tidak dikenali, terlihat peringatan `provinsi tidak dikenali`; laporkan nama provinsinya supaya bisa ditambahkan ke peta provinsi.

## 3. Asal pengiriman

Buka admin → **Pengaturan → Ongkir Kurir**, cari kecamatan atau kode pos gudang, pilih, lalu tekan **Simpan Asal**. Status berubah menjadi **● Aktif**, dan checkout kini memakai pencarian tujuan dan tarif kurir.

## 4. Uji checkout

| Langkah | Hasil yang benar |
|---|---|
| Checkout → ketik "coblong" → **Cari** (atau Enter) | Daftar alamat muncul, dan Enter tidak mengirim form |
| Pilih alamat | Muncul kotak "Dikirim ke …" dengan tombol **Ganti**, dan daftar layanan kurir urut dari termurah |
| Pilih layanan → Buat Pesanan | Detail pesanan menampilkan "JNE REG · estimasi …" dan kelurahan di alamat |
| Admin → detail pesanan | Baris **Kirim dengan** menampilkan kurir dan layanan yang harus dipakai |
| Kosongkan key sementara lalu restart | Checkout kembali ke pilihan provinsi + tarif standar |

## Cara kerja (ringkas)

- Browser memanggil `/api/ongkir/tujuan`, bukan RajaOngkir langsung, jadi key tetap di server. Rute ini dibatasi 30 pencarian per 10 menit per IP.
- **Cache di tabel `ApiCache`:** pencarian disimpan 7 hari dan tarif 30 menit, sehingga bisa dipakai bersama oleh semua instance Vercel.
- Saat pesanan dibuat, server mengambil data wilayah berdasarkan **id tujuan** dari cache hasil pencarian. Alamat wilayah dan ongkir selalu cocok, dan tidak bisa diubah dari browser.
- Kalau harga atau layanan berubah di antara layar dan tombol pesan, pembeli diminta memilih ulang (tidak ada salah tagih).
