# LoveNotes 💕

Aplikasi romantis modern untuk pasangan yang sedang kasmaran. Dibangun dengan React, Vite, Firebase, dan TailwindCSS.

## ✨ Fitur

- **💬 Private Chat** - Chat eksklusif dengan love reactions, voice messages, dan photo sharing
- **📅 Love Timeline** - Timeline momen spesial dengan anniversary counter
- **💌 Daily Love Notes** - Pesan romantis harian dengan love quotes otomatis
- **📝 Wishlist Together** - Bucket list bersama yang bisa dicapai bersama
- **🎮 Love Games** - Mini games romantis + Love World 3D + andin-multiplayer (simulator kebun)
- **📊 Intimacy Meter** - Indikator koneksi dengan love score

## 🚀 Tech Stack

- **Frontend**: React 19 + Vite
- **Styling**: TailwindCSS + Custom theme
- **3D**: Three.js + React Three Fiber
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Animasi**: Framer Motion
- **Icons**: Lucide React
- **PWA**: Vite PWA Plugin

## 📱 Dukungan PWA

Aplikasi ini dapat diinstall sebagai PWA di mobile dan desktop untuk pengalaman seperti aplikasi native.

## 🔥 Setup Firebase

1. Buat project baru di [Firebase Console](https://console.firebase.google.com/)
2. Aktifkan **Authentication** (Email/Password dan Google)
3. Aktifkan **Firestore Database**
4. Buat Web App di Firebase Console
5. Salin konfigurasi ke `.env`

## 📦 Instalasi

```bash
# Install dependencies
npm install

# Salin environment variables
cp .env.example .env

# Edit .env dengan Firebase config kamu
# VITE_FIREBASE_API_KEY=your_api_key
# VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
# VITE_FIREBASE_PROJECT_ID=your_project_id
# VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
# VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
# VITE_FIREBASE_APP_ID=your_app_id
```

## 🏃 Menjalankan Aplikasi

```bash
# Jalankan development server
npm run dev
```

## 🎮 Menjalankan Game andin-multiplayer

Game ini menggunakan **server WebSocket terpisah**, jadi harus dijalankan bersamaan dengan `npm run dev`.

### Langkah 1 — Siapkan kredensial Firebase Admin (sekali saja)

1. Buka **Firebase Console** → project kamu → ⚙️ **Project Settings** → tab **Service accounts**
2. Klik **"Generate new private key"** → download file JSON
3. Rename file menjadi `andin-service-account.json` dan taruh di root project
4. File `.env.andin.local` sudah berisi `GOOGLE_APPLICATION_CREDENTIALS=./andin-service-account.json`

> ⚠️ File service account bersifat rahasia — sudah masuk `.gitignore`, jangan pernah di-commit atau dibagikan.

### Langkah 2 — Jalankan kedua server

```bash
# Terminal 1 — server game (port 8787)
npm run game:server

# Terminal 2 — aplikasi (port 5173)
npm run dev
```

### Langkah 3 — Bermain

1. Buka aplikasi → login → **Fitur** → **Love Games** → **andin-multiplayer**
2. Pilih **"Buat kebun baru"** atau gabung ke kebun teman pakai **kode undangan 12 karakter**
3. Pilih peran: **Ibuk / Bapak / Anak / Teman 1 / Teman 2** (maksimal 5 pemain, tiap peran hanya 1 orang)
4. Bagikan kode undangan ke teman supaya bisa main bareng

### Cara main

- **Jalan**: WASD / tombol panah / joystick di layar
- **Lari**: tahan Shift (atau tombol Lari di HP)
- **Interaksi**: tekan **E** atau tombol aksi — cangkul, tanam, siram, panen, duduk, tidur, jual hasil
- **Hari berganti** saat semua pemain online tidur di kasur
- **Jual panen** di kotak penjualan → Gold dibayar ke saldo bersama tiap pagi

### Catatan penting

- Satu akun hanya boleh terhubung di **satu tab** — kalau muncul "Akun sudah terhubung di tab lain", tutup tab/app lain yang membuka game
- Mode pengujian tanpa akun asli: `npm run game:dev` lalu buka `/andin-preview`
- Produksi: deploy `server/andin/index.js`, set `VITE_ANDIN_WS_URL` ke endpoint `wss://` yang diakhiri `/api/andin/ws`

## 🏗️ Build

```bash
# Build untuk produksi
npm run build

# Preview hasil build
npm run preview
```

## 🌐 Deployment ke Vercel

1. Push kode ke GitHub
2. Import project di [Vercel](https://vercel.com)
3. Tambahkan environment variables di dashboard Vercel
4. Deploy!

Environment variables yang diperlukan:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

> Catatan: untuk game andin-multiplayer di produksi, server WebSocket harus dideploy terpisah (Vercel tidak mendukung WebSocket server persistent) dan set `VITE_ANDIN_WS_URL`.

### Deploy server game ke Railway

1. Push kode ke GitHub, lalu di [Railway](https://railway.app) pilih **New Project → Deploy from GitHub repo**
2. `railway.toml` sudah otomatis mengatur start command (`node server/andin/index.js`)
3. Di dashboard Railway → **Variables**, isi:

   | Variable | Isi |
   |---|---|
   | `NODE_ENV` | `production` |
   | `ANDIN_ORIGINS` | `https://love-notes-lime.vercel.app` (domain Vercel kamu) |
   | `ANDIN_FIREBASE_PROJECT_ID` | `lovenotes-9f9c1` |
   | `ANDIN_SERVICE_ACCOUNT_JSON` | Seluruh isi file `andin-service-account.json` (copy-paste) |
   | `ANDIN_DATA_DIR` | `/data` (opsional, butuh Volume agar data kebun tidak hilang) |

4. Setelah deploy, salin domain Railway (misal `andin-server.up.railway.app`)
5. Di **Vercel** → Project Settings → Environment Variables, tambahkan:
   `VITE_ANDIN_WS_URL` = `wss://andin-server.up.railway.app/api/andin/ws`
6. Redeploy frontend Vercel → game bisa dimainkan dari mana saja, laptop tidak perlu menyala

> 💡 Tanpa Volume, data kebun reset saat server restart/redeploy. Kalau mau persisten gratis, alternatifnya `ANDIN_STORAGE=firestore` dengan database Firestore terpisah.

## 📱 Install sebagai PWA

Di mobile:
1. Buka aplikasi di browser (Chrome/Safari)
2. Tap "Add to Home Screen"
3. Aplikasi terinstall seperti native app

Di desktop:
1. Buka di Chrome/Edge
2. Klik icon install di address bar
3. Install sebagai desktop app

## 📄 Lisensi

MIT License - Bebas digunakan untuk project personal!
