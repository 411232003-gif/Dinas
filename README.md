# LoveNotes 💕

Aplikasi romantis modern untuk pasangan yang sedang kasmaran. Dibangun dengan React, Vite, Firebase, dan TailwindCSS.

## ✨ Fitur

- **💬 Private Chat** - Chat eksklusif dengan love reactions, voice messages, dan photo sharing
- **📅 Love Timeline** - Timeline momen spesial dengan anniversary counter
- **💌 Daily Love Notes** - Pesan romantis harian dengan love quotes otomatis
- **📝 Wishlist Together** - Bucket list bersama yang bisa dicapai bersama
- **🎮 Love Games** - Mini games romantis untuk lebih mengenal pasangan
- **📊 Intimacy Meter** - Indikator koneksi dengan love score

## 🚀 Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: TailwindCSS + Custom theme
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **PWA**: Vite PWA Plugin

## 📱 PWA Support

Aplikasi ini dapat diinstall sebagai PWA di mobile dan desktop untuk pengalaman native-like.

## 🔥 Setup Firebase

1. Buat project baru di [Firebase Console](https://console.firebase.google.com/)
2. Enable **Authentication** (Email/Password dan Google)
3. Enable **Firestore Database**
4. Buat Web App di Firebase Console
5. Copy konfigurasi ke `.env`

## 📦 Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env dengan Firebase config Anda
# VITE_FIREBASE_API_KEY=your_api_key
# VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
# VITE_FIREBASE_PROJECT_ID=your_project_id
# VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
# VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
# VITE_FIREBASE_APP_ID=your_app_id
```

## 🏃 Development

```bash
# Start development server
npm run dev
```

## 🏗️ Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🌐 Deployment ke Vercel

1. Push code ke GitHub
2. Import project di [Vercel](https://vercel.com)
3. Add environment variables di Vercel dashboard
4. Deploy!

Environment variables yang diperlukan:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## 📱 Install sebagai PWA

Di mobile:
1. Buka aplikasi di browser (Chrome/Safari)
2. Tap "Add to Home Screen"
3. Aplikasi akan terinstall seperti native app

Di desktop:
1. Buka di Chrome/Edge
2. Click install icon di address bar
3. Install sebagai desktop app

## 🎨 Customization

Warna dan tema dapat diubah di `tailwind.config.js`:
```js
theme: {
  extend: {
    colors: {
      'love-pink': '#FFB6C1',
      'love-pink-dark': '#FF69B4',
      // ... tambahkan warna custom
    }
  }
}
```

## 📄 License

MIT License - Feel free to use for personal projects!
