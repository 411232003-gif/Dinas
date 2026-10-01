import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { FileStore, MemoryStore } from '../../server/andin/storage.js';
import { newRoom } from '../../server/andin/room.js';

test('file persistence survives restart, keeps private membership and refuses a second writer', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'andin-test-'));
  const first = new FileStore(directory);
  const second = new FileStore(directory);
  t.after(async () => { await first.close(); await second.close(); await rm(directory, { recursive: true }); });
  await first.init();
  await assert.rejects(second.init(), { code: 'EEXIST' });
  const data = newRoom('test-room', 'ABCDEF123456', 'Kebun', 'owner');
  data.gold = 456;
  data.plots['home-0'] = { tilled: true, crop: 'turnip', growth: 2, wateredDay: 5 };
  await first.save(data);
  await first.close();
  await second.init();
  assert.equal((await second.get('test-room')).gold, 456);
  assert.equal((await second.byCode('ABCDEF123456')).plots['home-0'].growth, 2);
  assert.deepEqual(await second.list('stranger'), []);
  assert.equal((await second.list('owner')).length, 1);
  await assert.rejects(second.get('../escape'), /valid/);
  assert.equal(await second.get('missing'), null);
});

test('persisted memory snapshots are detached from mutable simulation state', async () => {
  const store = new MemoryStore();
  const data = newRoom('id', 'ABCDEF123456', 'Kebun', 'owner');
  await store.save(data);
  data.gold = 0;
  assert.equal((await store.get('id')).gold, 300);
  const copy = await store.get('id');
  copy.gold = 999;
  assert.equal((await store.get('id')).gold, 300);
});
