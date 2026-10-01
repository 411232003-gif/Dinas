import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createGameServer } from './server.js';
import { FileStore, FirestoreStore } from './storage.js';
import { GameError } from './room.js';

const production = process.env.NODE_ENV === 'production';
const devAuth = process.argv.includes('--dev-auth');
if (production && devAuth) throw new Error('Development authentication is forbidden in production.');
const origins = (process.env.ANDIN_ORIGINS || (production ? '' : 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173')).split(',').map((origin) => origin.trim()).filter(Boolean);
if (!origins.length || origins.includes('*')) throw new Error('Set ANDIN_ORIGINS to the exact allowed frontend origins.');
if (devAuth && origins.some((origin) => !['localhost', '127.0.0.1'].includes(new URL(origin).hostname))) throw new Error('Development authentication only permits localhost origins.');
const projectId = process.env.ANDIN_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
const firebase = () => getApps()[0] || initializeApp({ credential: applicationDefault(), projectId });
const storage = process.env.ANDIN_STORAGE || 'file';
let store;
if (storage === 'firestore') {
  const database = process.env.ANDIN_FIRESTORE_DATABASE;
  if (!database || database === '(default)') throw new Error('Use an isolated named database for ANDIN_FIRESTORE_DATABASE with all client access denied.');
  store = new FirestoreStore(getFirestore(firebase(), database));
} else if (storage === 'file') {
  if (production && !process.env.ANDIN_DATA_DIR) throw new Error('Set ANDIN_DATA_DIR to a persistent volume in production.');
  store = new FileStore(process.env.ANDIN_DATA_DIR || '.andin-data');
} else throw new Error('ANDIN_STORAGE must be file or firestore.');

const game = await createGameServer({
  store,
  origins,
  verifyToken: async (token) => {
    if (devAuth && token.startsWith('dev:')) {
      const [, uid, name] = token.split(':');
      if (!/^[a-zA-Z0-9-]{1,64}$/.test(uid || '')) throw new GameError('Identitas pengujian tidak valid.');
      return { uid, name: name || 'Petani Uji' };
    }
    try {
      const decoded = await getAuth(firebase()).verifyIdToken(token, true);
      return { uid: decoded.uid, name: decoded.name || 'Petani', expiresAt: decoded.exp * 1000 };
    } catch { throw new GameError('Login game gagal diverifikasi. Login ulang atau periksa konfigurasi Firebase Admin pada server.'); }
  },
});
const port = Number(process.env.PORT || process.env.ANDIN_PORT || 8787);
const host = devAuth || !production ? '127.0.0.1' : '0.0.0.0';
game.server.listen(port, host, () => {
  console.log(`andin-multiplayer listening on ${host}:${port}; storage=${storage}; auth=${devAuth ? 'local development + Firebase' : 'Firebase'}`);
});
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await game.close();
}
game.server.on('error', (error) => {
  console.error(`Game server failed to listen: ${error.code || 'unknown error'}`);
  process.exitCode = 1;
  stop().catch(() => {});
});
process.on('SIGINT', () => stop().catch(() => { process.exitCode = 1; }));
process.on('SIGTERM', () => stop().catch(() => { process.exitCode = 1; }));
