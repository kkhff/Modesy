# TODO.md — Kloning Modesy (Next.js + Supabase)

> Checklist pengembangan marketplace berbasis **Next.js + Supabase**.  
> Centang (`[x]`) setiap fitur yang telah selesai diimplementasikan.

---

# 📦 Fitur Utama Platform & E-commerce

- [ ] Marketplace dan Iklan Baris  
  Sistem dapat diubah menjadi Marketplace Multi-Vendor atau situs Iklan Baris melalui Panel Admin.

- [ ] Sistem Multi-Vendor  
  Mengaktifkan atau menonaktifkan fitur toko untuk pengguna.

- [ ] Jenis Produk Beragam  
  Mendukung Produk Fisik, Produk Digital (Unduhan), dan Lisensi Perangkat Lunak.

- [ ] Sistem Variasi Produk Dinamis  
  Variasi produk tanpa batas (ukuran, warna, stok, dan lainnya).

- [ ] Pembuatan Konten dengan AI  
  Integrasi AI untuk membuat deskripsi produk, artikel blog, dan konten halaman secara otomatis.

- [ ] Banyak Pilihan Gerbang Pembayaran  
  Integrasi PayPal, Stripe, PayStack, Razorpay, Flutterwave, Iyzico, Midtrans, dLocal Go, YooMoney, Mercado Pago, dan PayTabs.

- [ ] Sistem Komisi Berlapis  
  Komisi berdasarkan produk, penjual, kategori, atau nilai global.

- [ ] Sistem Promosi Produk  
  Penjual dapat mempromosikan produk dengan biaya harian atau bulanan.

- [ ] Sistem Kupon / Diskon  
  Pembuatan kode promo dan potongan harga.

- [ ] Sistem Tawar-Menawar Harga  
  Pembeli dapat mengirim penawaran harga kepada penjual.

- [ ] Sistem Paket Keanggotaan  
  Paket langganan penjual dengan batas jumlah produk.

- [ ] Sistem Dompet Digital  
  Saldo pengguna untuk pembayaran yang lebih cepat.

- [ ] Program Afiliasi  
  Sistem referral dengan komisi dari hasil penjualan.

- [ ] Pembayaran Manual & Offline  
  Transfer Bank dan Bayar di Tempat (COD).

- [ ] Sistem Keranjang Berbasis Database  
  Keranjang tersimpan di akun pengguna dan tersinkron di semua perangkat.

- [ ] Kategori Tanpa Batas  
  CRUD kategori serta impor massal.

- [ ] Kolom Data Kustom  
  Penjual dapat menambahkan spesifikasi produk sendiri.

---

# 🏪 Fitur Penjual (Vendor)

- [ ] Dashboard Penjual
- [ ] Manajemen Saldo
- [ ] Penarikan Dana
- [ ] Manajemen Merek
- [ ] Verifikasi Toko
- [ ] Status Produk
- [ ] Duplikasi Produk
- [ ] Detail Produk Interaktif
  - [ ] Gambar
  - [ ] Video
  - [ ] Audio
  - [ ] Lokasi Peta
  - [ ] Tag Produk

---

# ⚡ Performa, Skalabilitas & Teknologi

- [ ] Optimasi Performa
- [ ] Sistem Caching
- [ ] Penyimpanan Lokal
- [ ] AWS S3
- [ ] Cloudflare R2
- [ ] Backblaze B2
- [ ] Progressive Web App (PWA)
- [ ] Pengiriman Email
  - [ ] Amazon SES
  - [ ] Brevo
  - [ ] Mailgun
- [ ] Kompresi Gambar Otomatis
- [ ] Thumbnail Otomatis
- [ ] Dukungan Format WebP

---

# 📈 SEO & Pemasaran

- [ ] SEO Lengkap
- [ ] URL Ramah Mesin Pencari
- [ ] JSON-LD
- [ ] Sitemap Otomatis
- [ ] RSS Produk
- [ ] RSS Blog

---

# 👥 Komunitas & Pengguna

- [ ] Login Google
- [ ] Login Facebook
- [ ] Login VKontakte
- [ ] Profil Pengguna
- [ ] Ikuti Toko
- [ ] Wishlist
- [ ] Chat Pembeli & Penjual
- [ ] Notifikasi Chat
- [ ] Rating Produk
- [ ] Komentar Produk
- [ ] Moderasi Komentar

---

# 📰 Konten & Bantuan

- [ ] Blog
- [ ] Kategori Blog
- [ ] Tag Blog
- [ ] Halaman Dinamis
- [ ] Slider Beranda
- [ ] Banner Beranda
- [ ] Slot Iklan
- [ ] Knowledge Base
- [ ] Sistem Tiket Bantuan
- [ ] Sistem Refund
- [ ] Newsletter

---

# 🎨 Desain & Kustomisasi

- [ ] Pengaturan Logo
- [ ] Favicon
- [ ] Nama Website
- [ ] Deskripsi Website
- [ ] Tema Warna
- [ ] Pengaturan Tata Letak Beranda
- [ ] CSS Kustom
- [ ] JavaScript Kustom
- [ ] Watermark Otomatis

---

# 🔒 Keamanan

- [ ] Keamanan Akun
- [ ] CSRF Protection
- [ ] XSS Protection
- [ ] Password Hashing
- [ ] SQL Injection Protection
- [ ] Pembatasan Login
- [ ] Clickjacking Protection
- [ ] Cloudflare Turnstile

---

# ⚙️ Administrasi

- [ ] Hak Akses & Peran
  - [ ] Super Admin
  - [ ] Moderator
  - [ ] Staff

- [ ] Verifikasi Email
- [ ] Multi Bahasa
- [ ] Dukungan RTL
- [ ] Maintenance Mode

---

# 🚀 Pengembangan Selanjutnya

- [ ] Analitik Penjualan
- [ ] Dashboard Statistik
- [ ] Riwayat Aktivitas
- [ ] Notifikasi Real-Time
- [ ] Audit Log
- [ ] Backup Otomatis
- [ ] API Publik
- [ ] Dokumentasi API
- [ ] Integrasi Mobile App
- [ ] Pengujian Otomatis (Testing)
- [ ] CI/CD