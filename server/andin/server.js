import http from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { AndinRoom, GameError, newRoom } from './room.js';

const send = (socket, message) => {
  if (socket.readyState === WebSocket.OPEN && socket.bufferedAmount < 256 * 1024) socket.send(JSON.stringify(message));
};

export async function createGameServer({ store, verifyToken, origins, heartbeatMs = 10000 }) {
  await store.init();
  const rooms = new Map();
  const loading = new Map();
  const identities = new Map();
  const addresses = new Map();
  const server = http.createServer((request, response) => {
    if (request.url === '/api/andin/health' && request.method === 'GET') {
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ ok: true, game: 'andin-multiplayer', protocol: 1 }));
    } else { response.writeHead(404); response.end(); }
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 8192, perMessageDeflate: false });
  server.on('upgrade', (request, socket, head) => {
    const origin = request.headers.origin;
    const address = request.socket.remoteAddress;
    if (request.url !== '/api/andin/ws' || !origins.includes(origin) || (addresses.get(address) || 0) >= 20 || wss.clients.size >= 500) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (client) => {
      addresses.set(address, (addresses.get(address) || 0) + 1);
      client.once('close', () => addresses.set(address, Math.max(0, (addresses.get(address) || 1) - 1)));
      wss.emit('connection', client);
    });
  });

  const enqueue = (entry, operation) => {
    const next = entry.queue.then(async () => {
      if (entry.failed) throw new GameError('Room dihentikan karena penyimpanan bermasalah. Sambungkan ulang.');
      entry.busy = true;
      try { return await operation(); }
      finally { entry.busy = false; }
    });
    entry.queue = next.catch(() => {});
    return next;
  };
  const broadcast = (entry, frame = false) => {
    for (const client of entry.clients) send(client, { type: frame ? 'frame' : 'state', state: entry.room.snapshot(client.identity.uid, frame) });
  };
  const persist = async (entry) => {
    try {
      await store.save(entry.room.data);
      entry.lastSaved = Date.now();
    } catch {
      entry.failed = true;
      for (const client of entry.clients) {
        send(client, { type: 'error', message: 'Penyimpanan gagal. Permainan dihentikan untuk melindungi progres. Sambungkan kembali.' });
        client.close(1011, 'Storage unavailable');
      }
      rooms.delete(entry.room.data.id);
      await store.release(entry.room.data.id).catch(() => {});
      throw new GameError('Penyimpanan tidak tersedia. Silakan coba lagi.');
    }
  };
  const entryFor = (data) => {
    if (!rooms.has(data.id)) rooms.set(data.id, { room: new AndinRoom(data), clients: new Set(), queue: Promise.resolve(), lastSaved: Date.now(), lastTick: Date.now(), createdAt: Date.now(), busy: false, failed: false });
    return rooms.get(data.id);
  };
  const load = async (key, byCode = false) => {
    const current = byCode ? [...rooms.values()].find((entry) => entry.room.data.code === key) : rooms.get(key);
    if (current) return current;
    const loadKey = `${byCode ? 'code:' : 'id:'}${key}`;
    if (!loading.has(loadKey)) loading.set(loadKey, (async () => {
      const data = await (byCode ? store.byCode(key) : store.get(key));
      if (!data) throw new GameError('Room tidak ditemukan. Periksa kode undangan.');
      return entryFor(data);
    })().finally(() => loading.delete(loadKey)));
    return loading.get(loadKey);
  };
  const accessible = async (client, message) => {
    const byCode = typeof message.code === 'string' && /^[A-Z0-9]{12}$/.test(message.code);
    if (!byCode && (typeof message.roomId !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(message.roomId))) throw new GameError('Masukkan kode undangan 12 karakter.');
    const entry = await load(byCode ? message.code : message.roomId, byCode);
    if (!byCode && !entry.room.data.memberUids.includes(client.identity.uid)) throw new GameError('Undangan diperlukan untuk mengakses room ini.');
    return entry;
  };
  const detach = async (client, release) => {
    const entry = client.entry;
    if (!entry) return;
    client.entry = null;
    entry.clients.delete(client);
    if (entry.failed) return;
    await enqueue(entry, async () => {
      entry.room.disconnect(client.identity.uid, client.sessionId, Date.now(), release);
      await persist(entry);
      broadcast(entry);
    });
  };

  wss.on('connection', (client) => {
    client.sessionId = randomUUID();
    client.alive = true;
    client.identity = null;
    client.entry = null;
    client.pending = Promise.resolve();
    client.budget = 100;
    client.controlBudget = 15;
    client.budgetAt = Date.now();
    client.queued = 0;
    const authTimeout = setTimeout(() => client.close(4001, 'Authentication required'), 10000);
    client.on('pong', () => { client.alive = true; });
    client.on('error', () => {});
    client.on('message', (buffer, binary) => {
      if (binary) { client.close(1003, 'JSON only'); return; }
      const now = Date.now();
      const elapsed = (now - client.budgetAt) / 1000;
      client.budget = Math.min(100, client.budget + elapsed * 40) - 1;
      client.controlBudget = Math.min(15, client.controlBudget + elapsed * 2);
      client.budgetAt = now;
      if (client.budget < 0 || client.queued > 80) { client.close(1008, 'Rate limit'); return; }
      let message;
      try { message = JSON.parse(buffer.toString()); }
      catch { client.close(1007, 'Invalid JSON'); return; }
      if (!message || typeof message !== 'object' || typeof message.type !== 'string') { client.close(1007, 'Invalid message'); return; }
      if (message.type !== 'input' && --client.controlBudget < 0) {
        send(client, { type: 'error', requestId: message.requestId, message: 'Terlalu banyak permintaan. Tunggu sebentar.' });
        return;
      }
      client.queued++;
      client.pending = client.pending.then(async () => {
        if (client.readyState !== WebSocket.OPEN) return;
        if (message.type === 'auth') {
          if (client.identity) throw new GameError('Sesi sudah terautentikasi.');
          if (typeof message.token !== 'string' || message.token.length > 6000) throw new GameError('Token login tidak valid.');
          const identity = await verifyToken(message.token);
          if (!identity?.uid || typeof identity.uid !== 'string') throw new GameError('Login tidak valid.');
          if (identities.has(identity.uid)) throw new GameError('Akun sudah terhubung di tab lain. Tutup tab tersebut terlebih dahulu.');
          if (client.readyState !== WebSocket.OPEN) return;
          client.identity = { uid: identity.uid, name: String(identity.name || 'Petani').slice(0, 24) };
          identities.set(identity.uid, client);
          clearTimeout(authTimeout);
          client.authExpires = identity.expiresAt || Date.now() + 55 * 60 * 1000;
          send(client, { type: 'ready', uid: identity.uid });
          return;
        }
        if (!client.identity) throw new GameError('Silakan login terlebih dahulu.');
        if (client.authExpires <= Date.now()) { client.close(4001, 'Refresh authentication'); return; }
        if (message.type === 'list') {
          send(client, { type: 'rooms', requestId: message.requestId, rooms: await store.list(client.identity.uid) });
        } else if (message.type === 'create') {
          if (client.entry) throw new GameError('Keluar dari room sebelum membuat kebun baru.');
          const existing = await store.list(client.identity.uid);
          if (existing.length >= 20) throw new GameError('Batas 20 kebun tersimpan tercapai.');
          const name = typeof message.name === 'string' ? message.name.trim().slice(0, 40) : '';
          if (!name) throw new GameError('Beri nama kebun terlebih dahulu.');
          const data = newRoom(randomUUID(), randomBytes(6).toString('hex').toUpperCase(), name, client.identity.uid);
          const entry = entryFor(data);
          await enqueue(entry, () => persist(entry));
          send(client, { type: 'lobby', requestId: message.requestId, room: { id: data.id, code: data.code, name: data.name, slots: [] } });
        } else if (message.type === 'inspect') {
          const entry = await accessible(client, message);
          const data = entry.room.data;
          send(client, { type: 'lobby', requestId: message.requestId, room: { id: data.id, code: data.code, name: data.name, slots: entry.room.snapshot(client.identity.uid).players } });
        } else if (message.type === 'join') {
          if (client.entry) throw new GameError('Anda sudah berada di dalam room.');
          const entry = await accessible(client, message);
          await enqueue(entry, async () => {
            if (client.readyState !== WebSocket.OPEN) return;
            entry.room.join(client.identity, message.role, client.sessionId);
            entry.clients.add(client);
            client.entry = entry;
            await persist(entry);
            send(client, { type: 'joined', requestId: message.requestId, state: entry.room.snapshot(client.identity.uid) });
            broadcast(entry);
          });
        } else if (message.type === 'input') {
          if (client.entry && !client.entry.failed) client.entry.room.input(client.identity.uid, message.input);
        } else if (message.type === 'action') {
          const entry = client.entry;
          if (!entry) throw new GameError('Masuk ke room terlebih dahulu.');
          if (!message.action || typeof message.action !== 'object') throw new GameError('Aksi tidak valid.');
          await enqueue(entry, async () => {
            const result = entry.room.act(client.identity.uid, message.action);
            await persist(entry);
            send(client, { type: 'ack', requestId: message.requestId, ...result, state: entry.room.snapshot(client.identity.uid) });
            broadcast(entry);
          });
        } else if (message.type === 'leave') {
          await detach(client, true);
          send(client, { type: 'left', requestId: message.requestId });
        } else throw new GameError('Permintaan tidak dikenal.');
      }).catch((error) => {
        send(client, { type: 'error', requestId: message.requestId, message: error instanceof GameError ? error.message : 'Layanan belum tersedia. Coba lagi sebentar.' });
        if (client.entry && !client.entry.failed) send(client, { type: 'state', state: client.entry.room.snapshot(client.identity.uid) });
      }).finally(() => { client.queued--; });
    });
    client.on('close', () => {
      clearTimeout(authTimeout);
      if (client.identity && identities.get(client.identity.uid) === client) identities.delete(client.identity.uid);
      client.pending.then(() => detach(client, false)).catch(() => {});
    });
  });

  const ticker = setInterval(() => {
    const now = Date.now();
    for (const entry of rooms.values()) {
      if (entry.busy || entry.failed) continue;
      const seconds = Math.min(0.25, (now - entry.lastTick) / 1000);
      entry.lastTick = now;
      enqueue(entry, async () => {
        const changedDay = entry.room.tick(seconds, now);
        if (changedDay || now - entry.lastSaved > 15000) await persist(entry);
        broadcast(entry, !changedDay);
        if (!entry.room.sessions.size && now - entry.lastSaved < 1000 && now - entry.createdAt > 60000) {
          await store.release(entry.room.data.id);
          rooms.delete(entry.room.data.id);
        }
      }).catch(() => {});
    }
  }, 100);
  const heartbeat = setInterval(() => {
    for (const client of wss.clients) {
      if (!client.alive) { client.terminate(); continue; }
      if (client.authExpires && client.authExpires < Date.now()) { client.close(4001, 'Refresh authentication'); continue; }
      client.alive = false;
      client.ping();
    }
  }, heartbeatMs);
  return {
    server,
    rooms,
    async close() {
      clearInterval(ticker);
      clearInterval(heartbeat);
      for (const client of wss.clients) { await detach(client, true).catch(() => {}); client.terminate(); }
      await Promise.all([...rooms.values()].map((entry) => entry.queue));
      await store.close();
      await new Promise((resolve) => wss.close(resolve));
      if (server.listening) await new Promise((resolve) => server.close(resolve));
    },
  };
}
