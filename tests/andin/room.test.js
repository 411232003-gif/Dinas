import test from 'node:test';
import assert from 'node:assert/strict';
import { AndinRoom, newRoom } from '../../server/andin/room.js';
import { CROPS, DAY_END, MAPS, ROLES, calendar, isWalkable } from '../../shared/andin/world.js';

function setup(count = 1) {
  const room = new AndinRoom(newRoom('room', 'INVITATION', 'Kebun Uji', 'u0'));
  for (let i = 0; i < count; i++) room.join({ uid: `u${i}`, name: `Pemain ${i}` }, ROLES[i].id, `s${i}`, 1000);
  return room;
}
function act(room, uid, action) {
  return room.act(uid, { seq: room.data.players[uid].lastSeq + 1, ...action }, 2000);
}
function near(room, uid, object) {
  Object.assign(room.data.players[uid], { mapId: object.mapId || 'home', x: object.x, z: object.z + 1.7 });
}

test('strict five-player capacity and exclusive roles', () => {
  const room = setup(5);
  assert.throws(() => room.join({ uid: 'six', name: 'Six' }, 'ibuk', 's6', 1000), /penuh/i);
  assert.equal(room.snapshot('u0').players.length, 5);
  const other = setup();
  assert.throws(() => other.join({ uid: 'u1', name: 'Other' }, 'ibuk', 's1', 1000), /dipakai/i);
});

test('duplicate sessions, reconnect reservations and expiry', () => {
  const room = setup();
  assert.throws(() => room.join({ uid: 'u0', name: 'Same' }, 'ibuk', 'different', 1000), /sesi/i);
  room.disconnect('u0', 's0', 1000);
  assert.throws(() => room.join({ uid: 'other', name: 'Other' }, 'ibuk', 's1', 2000), /dipakai/i);
  room.join({ uid: 'u0', name: 'Same' }, 'ibuk', 'new', 2000);
  room.disconnect('u0', 'new', 3000);
  room.expire(34000);
  room.join({ uid: 'other', name: 'Other' }, 'ibuk', 's1', 34000);
  assert.equal(room.snapshot('other').onlineCount, 1);
});

test('farm lifecycle, one watering per day and one harvest only', () => {
  const room = setup(2);
  const plot = MAPS.home.plots[0];
  near(room, 'u0', plot);
  near(room, 'u1', plot);
  act(room, 'u0', { type: 'hoe', target: plot.id });
  act(room, 'u0', { type: 'plant', target: plot.id, crop: 'turnip' });
  for (let i = 0; i < CROPS.turnip.days; i++) {
    act(room, 'u0', { type: 'water', target: plot.id });
    assert.throws(() => act(room, 'u0', { type: 'water', target: plot.id }), /disiram/i);
    room.advanceDay(false);
  }
  act(room, 'u0', { type: 'harvest', target: plot.id });
  assert.equal(room.data.players.u0.inventory.turnip, 1);
  assert.throws(() => act(room, 'u1', { type: 'harvest', target: plot.id }), /panen/i);
  assert.equal(room.data.players.u1.inventory.turnip || 0, 0);
});

test('shipping and day settlement cannot be duplicated', () => {
  const room = setup();
  const player = room.data.players.u0;
  player.inventory.turnip = 3;
  near(room, 'u0', MAPS.home.props[0]);
  const command = { type: 'ship', target: 'home-bin', crop: 'turnip', quantity: 2, seq: 1 };
  room.act('u0', command, 2000);
  room.act('u0', command, 2100);
  assert.equal(player.inventory.turnip, 1);
  assert.equal(room.data.shippingGold, 50);
  const before = room.data.gold;
  room.advanceDay(false);
  assert.equal(room.data.gold, before + 50);
  room.advanceDay(false);
  assert.equal(room.data.gold, before + 50);
});

test('shared money never becomes negative', () => {
  const room = setup(2);
  room.data.gold = 10;
  for (const uid of ['u0', 'u1']) near(room, uid, MAPS.home.props[1]);
  act(room, 'u0', { type: 'buy', target: 'home-shop', crop: 'turnip', quantity: 1 });
  assert.throws(() => act(room, 'u1', { type: 'buy', target: 'home-shop', crop: 'turnip', quantity: 1 }), /Gold/i);
  assert.equal(room.data.gold, 0);
});

test('all connected players sleeping advances once across maps', () => {
  const room = setup(2);
  near(room, 'u0', MAPS.home.house.beds[0]);
  near(room, 'u1', { ...MAPS.willow.house.beds[0], mapId: 'willow' });
  act(room, 'u0', { type: 'sleep', target: 'home-bed-0' });
  assert.equal(room.data.day, 0);
  act(room, 'u1', { type: 'sleep', target: 'willow-bed-0' });
  assert.equal(room.data.day, 1);
  assert.equal(room.data.players.u0.stamina, 100);
  room.checkSleep();
  assert.equal(room.data.day, 1);
});

test('lying down is not sleep; empty rooms do not advance', () => {
  const room = setup();
  act(room, 'u0', { type: 'lie' });
  assert.equal(room.data.day, 0);
  room.disconnect('u0', 's0', 1000);
  room.tick(10, 2000);
  assert.equal(room.data.day, 0);
  assert.equal(room.data.minute, 360);
});

test('disconnect does not block sleeping players or affect a new session', () => {
  const room = setup(2);
  near(room, 'u0', MAPS.home.house.beds[0]);
  act(room, 'u0', { type: 'sleep', target: 'home-bed-0' });
  room.disconnect('u1', 's1', 2000);
  assert.equal(room.data.day, 1);
  room.join({ uid: 'u1', name: 'Again' }, 'bapak', 'new', 2100);
  room.disconnect('u1', 's1', 2200);
  assert.equal(room.snapshot('u0').onlineCount, 2);
});

test('season rollover withers incompatible crops; forced day restores less stamina', () => {
  const room = setup();
  room.data.day = 27;
  room.data.plots['home-0'] = { tilled: true, crop: 'turnip', growth: 1, wateredDay: 27, withered: false };
  room.data.minute = DAY_END - 0.01;
  room.tick(0.1, 2000);
  assert.equal(calendar(room.data.day).season, 1);
  assert.equal(room.data.plots['home-0'].withered, true);
  assert.equal(room.data.players.u0.stamina, 60);
});

test('portal travel is proximity-checked and preserves shared inventory', () => {
  const room = setup();
  assert.throws(() => act(room, 'u0', { type: 'travel', target: 'to-highland' }), /dekat/i);
  near(room, 'u0', MAPS.home.portals[2]);
  act(room, 'u0', { type: 'travel', target: 'to-highland' });
  assert.equal(room.data.players.u0.mapId, 'highland');
  assert.equal(room.data.players.u0.seeds.turnip, 8);
});

test('invalid inputs, remote actions and stale action sequences are rejected', () => {
  const room = setup();
  assert.throws(() => room.input('u0', { x: Infinity, z: 0 }, 1000), /input/i);
  assert.throws(() => room.act('u0', { type: 'hoe', target: 'home-0', seq: 99 }, 2000), /sinkron/i);
  assert.throws(() => act(room, 'u0', { type: 'hoe', target: 'highland-0' }), /dekat/i);
  assert.equal(room.data.players.u0.lastSeq, 0);
});

test('movement is bounded, collisions work and stamina cannot become negative', () => {
  const room = setup();
  room.data.players.u0.stamina = 0.01;
  room.input('u0', { x: 1, z: 0, run: true }, 2000);
  room.tick(0.1, 2000);
  assert.ok(room.data.players.u0.stamina >= 0);
  assert.ok(room.data.players.u0.x <= 0.7);
  assert.equal(isWalkable('home', -12, 13), false);
  assert.equal(isWalkable('home', 100, 100), false);
});

test('saved state survives reconstruction without ghost online players', () => {
  const room = setup();
  room.data.gold = 888;
  const restored = new AndinRoom(JSON.parse(JSON.stringify(room.data)));
  assert.equal(restored.snapshot('u0').onlineCount, 0);
  restored.join({ uid: 'u0', name: 'Pemain' }, 'ibuk', 'again', 3000);
  assert.equal(restored.data.gold, 888);
  assert.equal(restored.data.players.u0.seeds.turnip, 8);
});
