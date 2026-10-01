import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { createGameServer } from '../../server/andin/server.js';
import { MemoryStore } from '../../server/andin/storage.js';
import { ROLES } from '../../shared/andin/world.js';

async function fixture(t) {
  const store = new MemoryStore();
  const game = await createGameServer({ store, origins: ['http://localhost:5173'], verifyToken: async (token) => {
    if (!token.startsWith('test:')) throw new Error('Invalid token');
    return { uid: token.slice(5), name: token.slice(5) };
  } });
  game.server.listen(0, '127.0.0.1');
  await once(game.server, 'listening');
  const url = `ws://127.0.0.1:${game.server.address().port}/api/andin/ws`;
  const clients = [];
  t.after(async () => { for (const client of clients) client.socket.terminate(); await game.close(); });
  async function connect(uid) {
    const socket = new WebSocket(url, { origin: 'http://localhost:5173' });
    const messages = [];
    socket.on('message', (data) => messages.push(JSON.parse(data.toString())));
    await once(socket, 'open');
    const client = {
      socket,
      async wait(predicate) {
        const start = Date.now();
        while (Date.now() - start < 4000) {
          const index = messages.findIndex(predicate);
          if (index >= 0) return messages.splice(index, 1)[0];
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        throw new Error('Timed out waiting for server response');
      },
      async request(type, fields = {}) {
        const requestId = crypto.randomUUID();
        socket.send(JSON.stringify({ type, requestId, ...fields }));
        return client.wait((message) => message.requestId === requestId);
      },
    };
    clients.push(client);
    socket.send(JSON.stringify({ type: 'auth', token: `test:${uid}` }));
    await client.wait((message) => message.type === 'ready' || message.type === 'error');
    return client;
  }
  return { game, store, connect, url };
}

test('real sockets: concurrent joins admit exactly five and reject the sixth', async (t) => {
  const { connect } = await fixture(t);
  const clients = await Promise.all(Array.from({ length: 6 }, (_, i) => connect(`u${i}`)));
  const created = await clients[0].request('create', { name: 'Kebun Bersama' });
  const results = await Promise.all(clients.map((client, i) => client.request('join', { code: created.room.code, role: ROLES[i % 5].id })));
  assert.equal(results.filter((result) => result.type === 'joined').length, 5);
  assert.equal(results.filter((result) => result.type === 'error').length, 1);
  const state = results.filter((result) => result.type === 'joined').at(-1).state;
  assert.ok(state.onlineCount <= 5);
});

test('private rooms require invitation; movement cannot teleport; leaving releases role', async (t) => {
  const { connect, game } = await fixture(t);
  const owner = await connect('owner');
  const guest = await connect('guest');
  const { room } = await owner.request('create', { name: 'Privat' });
  const denied = await guest.request('inspect', { roomId: room.id });
  assert.equal(denied.type, 'error');
  const joined = await owner.request('join', { roomId: room.id, role: 'ibuk' });
  assert.equal(joined.type, 'joined');
  owner.socket.send(JSON.stringify({ type: 'input', input: { x: 900, z: 900 } }));
  await owner.wait((message) => message.type === 'error');
  assert.equal(game.rooms.get(room.id).room.data.players.owner.x, 0);
  await owner.request('leave');
  const next = await guest.request('join', { code: room.code, role: 'ibuk' });
  assert.equal(next.type, 'joined');
  assert.equal(next.state.onlineCount, 1);
});

test('state is persisted before a successful action acknowledgement', async (t) => {
  const { connect, store } = await fixture(t);
  const client = await connect('farmer');
  const { room } = await client.request('create', { name: 'Persisten' });
  await client.request('join', { roomId: room.id, role: 'bapak' });
  const ack = await client.request('action', { action: { type: 'lie', seq: 1 } });
  assert.equal(ack.type, 'ack');
  assert.equal((await store.get(room.id)).players.farmer.lastSeq, 1);
  const duplicate = await client.request('action', { action: { type: 'lie', seq: 1 } });
  assert.equal(duplicate.duplicate, true);
});

test('storage failure never acknowledges an uncommitted action', async (t) => {
  const { connect, store, game } = await fixture(t);
  const client = await connect('farmer');
  const { room } = await client.request('create', { name: 'Durable' });
  await client.request('join', { roomId: room.id, role: 'bapak' });
  store.save = async () => { throw new Error('Disk unavailable'); };
  client.socket.send(JSON.stringify({ type: 'action', requestId: 'failed-action', action: { type: 'lie', seq: 1 } }));
  const error = await client.wait((message) => message.type === 'error');
  assert.match(error.message, /Penyimpanan/);
  assert.equal((await store.get(room.id)).players.farmer.lastSeq, 0);
  assert.equal(game.rooms.has(room.id), false);
});

test('untrusted origins cannot establish a socket', async (t) => {
  const { url } = await fixture(t);
  const socket = new WebSocket(url, { origin: 'https://untrusted.invalid' });
  const [error] = await once(socket, 'error');
  assert.match(error.message, /403/);
});
