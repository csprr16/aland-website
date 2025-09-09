# 🛍️ AlandStore - Toko Online Modern

Website toko online modern dengan fitur lengkap, dibuat oleh **alandyudhistira** pada tahun **2025**.

## ✨ Fitur Utama

### 🏪 Frontend
- **Desain Modern & Responsive** - UI/UX yang menarik dan mobile-friendly
- **Halaman Home** - Hero section dengan animasi floating cards
- **Katalog Produk** - Grid produk dengan filter kategori
- **Keranjang Belanja** - Shopping cart dengan sidebar yang smooth
- **Authentication** - Login & registrasi dengan validasi
- **Admin Panel** - Dashboard admin untuk mengelola produk
- **Notifikasi** - Toast notifications untuk feedback user
- **Animasi Smooth** - Intersection observer dan CSS animations

### 🔧 Backend
- **RESTful API** - Endpoints lengkap untuk semua fitur
- **Authentication** - JWT-based authentication system
- **Database Lokal** - JSON file storage (mudah dipahami & portable)
- **Upload Gambar** - Multer untuk upload gambar produk
- **Admin Features** - CRUD produk, manajemen pesanan
- **CORS Support** - Cross-origin resource sharing
- **Error Handling** - Comprehensive error handling

### 🎯 Fungsionalitas
- ✅ **Registrasi & Login** pengguna
- ✅ **Menampilkan produk** dengan filter kategori (23 produk tersedia)
- ✅ **Tambah ke keranjang** dengan quantity control
- ✅ **Admin dashboard** untuk mengelola produk
- ✅ **Upload gambar** produk
- ✅ **Load More Products** - pagination untuk performa optimal
- ✅ **Gambar produk berkualitas** dari Unsplash API
- ✅ **Responsive design** untuk semua device
- ✅ **Session management** dengan JWT
- ✅ **Form validation** & error handling

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 atau lebih baru)
- npm (v9 atau lebih baru)
- Netlify CLI (untuk deployment)

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/alandstore.git
cd alandstore
npm install
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env
# Edit .env dengan values yang sesuai
```

### 3. Jalankan Server
```bash
# Netlify dev (recommended)
npm run dev

# Express server only
npm run dev:backend
```

### 4. Akses Website
- **Frontend**: http://localhost:8888
- **Backend API**: http://localhost:3000/api
- **Netlify Functions**: http://localhost:8888/.netlify/functions

## 👥 Akun Demo

Website sudah dilengkapi dengan akun demo yang siap pakai:

### 🔐 Admin Account
- **Email:** admin@alandstore.com  
- **Password:** admin123  
- **Fitur:** Akses admin panel, kelola produk, lihat pesanan

### 👤 User Account  
- **Email:** user@alandstore.com  
- **Password:** user123  
- **Fitur:** Belanja, keranjang, checkout

*Tip: Di halaman login, klik pada info akun demo untuk auto-fill form*

## 📱 Produk yang Tersedia

Website ini dilengkapi dengan **23 produk** dalam 5 kategori:

### 📱 **Electronics** (13 produk)
- Smartphone Samsung Galaxy S24, iPhone 15 Pro Max
- Laptop Gaming ASUS ROG, MacBook Pro M3
- Apple Watch Series 9, Samsung Galaxy Watch 6
- iPad Pro, Samsung Galaxy Tab S9
- Sony WH-1000XM5 Headphones
- Smart TV 4K Samsung
- Gaming peripherals (Keyboard & Mouse)

### 👕 **Fashion** (6 produk)
- Sepatu Nike Air, Nike Air Jordan, Adidas Ultraboost
- Kemeja Formal Premium
- Jaket Denim Vintage
- Tas Laptop Business

### 🏠 **Home & Living** (2 produk)
- Gaming Chair RGB
- Standing Desk Adjustable

### ⚽ **Sports** (3 produk)
- Sepatu Bola Nike Mercurial
- Dumbell Set 20KG
- Yoga Mat Premium

*Semua gambar produk menggunakan foto berkualitas tinggi dari Pexels dan Lorem Picsum dengan fallback otomatis*

## 🌍 Production Deployment

### 🚀 Netlify Deployment
Website ini sudah dikonfigurasi untuk deployment ke Netlify dengan serverless functions:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

**Live Demo**: [https://alandstore.netlify.app](https://alandstore.netlify.app)

### 📋 Deployment Features
- ✅ **Serverless Functions** - Auto-scaling backend
- ✅ **Global CDN** - Fast worldwide delivery  
- ✅ **Auto SSL** - HTTPS encryption
- ✅ **Environment Variables** - Secure configuration
- ✅ **Branch Previews** - Test before deploy
- ✅ **Security Headers** - Production-ready security

### 📖 Deployment Guides
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Comprehensive deployment guide
- **[ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md)** - Environment configuration

## 📁 Struktur Proyek

```
toko-online-alandyudhistira/
├── backend/
│   ├── server.js              # Server Express.js utama
│   ├── data/                  # Database JSON files
│   │   ├── users.json         # Data pengguna
│   │   ├── products.json      # Data produk
│   │   └── orders.json        # Data pesanan
│   └── create-demo-users.js   # Script buat akun demo
├── frontend/
│   ├── index.html             # Halaman utama
│   ├── css/
│   │   └── style.css          # Styling modern
│   ├── js/
│   │   └── main.js            # JavaScript utama
│   ├── pages/
│   │   ├── login.html         # Halaman login
│   │   ├── register.html      # Halaman registrasi
│   │   └── admin.html         # Admin panel
│   └── images/                # Gambar & assets
├── package.json
└── README.md
```

## 🎨 Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling dengan Flexbox & Grid
- **Vanilla JavaScript** - ES6+ features
- **Font Awesome** - Icons library
- **Google Fonts** - Inter font family
- **Pexels & Lorem Picsum** - High-quality product images
- **Lazy Loading** - Optimized image loading
- **Image Fallback** - Automatic fallback for broken images

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework (local development)
- **Netlify Functions** - Serverless backend (production)
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **multer** - File uploads (local)
- **cors** - Cross-origin requests

### Deployment & Infrastructure
- **Netlify** - Static site hosting & serverless functions
- **Netlify CDN** - Global content delivery
- **Auto SSL** - Automatic HTTPS certificates
- **Environment Variables** - Secure configuration management
- **Git-based Deployment** - Automatic deployments from Git

## 📱 Responsive Design

Website ini sepenuhnya responsif dan dioptimalkan untuk:
- 📱 **Mobile** (320px+)
- 📱 **Tablet** (768px+)  
- 💻 **Desktop** (1024px+)
- 🖥️ **Large screens** (1200px+)

## 🛡️ Keamanan

Website ini dilengkapi dengan sistem keamanan berlapis untuk melindungi dari berbagai serangan:

### 🔐 **Authentication & Authorization**
- ✅ **JWT Authentication** dengan expiration time
- ✅ **Bcrypt Password Hashing** (12 salt rounds)
- ✅ **Role-based Access Control** (Admin/User)
- ✅ **Token Validation** dengan payload verification
- ✅ **Generic Error Messages** mencegah user enumeration

### 🛡️ **Input Security**
- ✅ **Express Validator** untuk validasi input ketat
- ✅ **Input Sanitization** mencegah XSS attacks
- ✅ **SQL Injection Protection** dengan pattern detection
- ✅ **File Upload Security** dengan size limits
- ✅ **Parameter Pollution Protection** (HPP)

### ⚡ **Rate Limiting & DDoS Protection**
- ✅ **General Rate Limiting** (100 req/15min)
- ✅ **Auth Rate Limiting** (5 attempts/15min)
- ✅ **Admin Rate Limiting** (20 req/15min)
- ✅ **Configurable via Environment**

### 🔒 **Security Headers & CORS**
- ✅ **Helmet.js Security Headers**
- ✅ **Content Security Policy (CSP)**
- ✅ **CORS Whitelist Configuration**
- ✅ **Cross-Origin Resource Policy**

### 📊 **Logging & Monitoring**
- ✅ **Security Event Logging**
- ✅ **Failed Login Attempt Tracking**
- ✅ **Suspicious Request Detection**
- ✅ **Error Logging dengan Metadata**

### 💾 **Data Protection**
- ✅ **Environment Variables** untuk secrets
- ✅ **Automatic Database Backups** (hourly)
- ✅ **Secure File Operations** dengan backup
- ✅ **Sensitive Data Masking** dalam logs

> **📋 Untuk deployment:** Lihat file `SECURITY.md` untuk checklist keamanan lengkap sebelum go-live!

## 🔧 API Endpoints

### Authentication
- `POST /api/register` - Registrasi pengguna baru
- `POST /api/login` - Login pengguna

### Products
- `GET /api/products` - Ambil semua produk
- `GET /api/products/:id` - Ambil produk by ID
- `POST /api/products` - Tambah produk (Admin only)
- `PUT /api/products/:id` - Update produk (Admin only)
- `DELETE /api/products/:id` - Hapus produk (Admin only)

### Orders
- `POST /api/orders` - Buat pesanan baru
- `GET /api/orders` - Ambil pesanan user
- `GET /api/admin/orders` - Ambil semua pesanan (Admin only)

## 🎯 Fitur Mendatang

- [ ] **Payment Gateway** integration
- [ ] **Email notifications** untuk pesanan
- [ ] **User profile** management
- [ ] **Product reviews** & ratings
- [ ] **Wishlist** functionality
- [ ] **Search** functionality
- [ ] **Order tracking** system

## 🐛 Troubleshooting

### Server tidak bisa start?
1. Pastikan port 3000 tidak digunakan aplikasi lain
2. Jalankan `npm install` untuk install dependencies
3. Cek apakah Node.js sudah terinstall: `node --version`

### Gambar produk tidak muncul?
1. Pastikan folder `frontend/images/products/` ada
2. Upload gambar melalui admin panel akan otomatis tersimpan

### Login gagal?
1. Gunakan akun demo yang sudah disediakan
2. Pastikan server backend sudah running
3. Cek browser console untuk error messages

## 🤝 Kontribusi

Project ini dibuat untuk pembelajaran. Feedback dan saran sangat diterima!

## 📄 License

© 2025 AlandStore by **alandyudhistira**. All rights reserved.

---

## 📞 Kontak

Jika ada pertanyaan atau feedback, jangan ragu untuk menghubungi:

- **Email:** support@alandstore.com
- **Website:** [AlandStore](http://localhost:3000)

---

### 🎉 Selamat Berbelanja di AlandStore! 

*Website toko online modern dengan teknologi terdepan untuk pengalaman berbelanja yang tak terlupakan.*
