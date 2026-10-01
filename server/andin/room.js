import {
  MAX_PLAYERS, ROLES, CROPS, MAPS, PLOT_BY_ID, DAY_START, DAY_END,
  RECONNECT_MS, SECONDS_PER_MINUTE, INTERACT_DISTANCE, calendar, mapObjects, isWalkable,
} from '../../shared/andin/world.js';

export class GameError extends Error {}
const ensure = (condition, message) => { if (!condition) throw new GameError(message); };
const finite = (value) => typeof value === 'number' && Number.isFinite(value);

export function newRoom(id, code, name, ownerUid) {
  return {
    id, code, name, ownerUid, memberUids: [ownerUid], schemaVersion: 1,
    day: 0, minute: DAY_START, gold: 300, shippingGold: 0, version: 0,
    players: {}, plots: {}, lastDaySummary: null,
  };
}

export class AndinRoom {
  constructor(data) {
    this.data = data;
    this.sessions = new Map();
    for (const player of Object.values(data.players)) {
      player.pose = 'idle';
      player.objectId = null;
      if (!isWalkable(player.mapId, player.x, player.z)) Object.assign(player, MAPS[player.mapId].spawn);
    }
  }

  join(identity, role, sessionId, now = Date.now()) {
    this.expire(now);
    ensure(ROLES.some((item) => item.id === role), 'Pilih salah satu peran yang tersedia.');
    const existing = this.sessions.get(identity.uid);
    ensure(!existing?.online, 'Akun ini sudah bermain di sesi lain. Tutup sesi tersebut terlebih dahulu.');
    ensure(existing || this.sessions.size < MAX_PLAYERS, 'Room penuh. Maksimal 5 pemain.');
    ensure(![...this.sessions.values()].some((session) => session.uid !== identity.uid && session.role === role), 'Peran ini sudah dipakai atau ditahan untuk reconnect.');
    ensure(this.data.memberUids.includes(identity.uid) || this.data.memberUids.length < 100, 'Batas anggota tersimpan room tercapai.');
    if (!this.data.memberUids.includes(identity.uid)) this.data.memberUids.push(identity.uid);
    let player = this.data.players[identity.uid];
    if (!player) {
      player = {
        uid: identity.uid, name: identity.name.slice(0, 24), role,
        mapId: 'home', ...MAPS.home.spawn, rotation: 0, pose: 'idle', objectId: null,
        stamina: 100, seeds: { turnip: 8, tomato: 0, pumpkin: 0, daikon: 0 },
        inventory: {}, lastSeq: 0, lastRestDay: this.data.day,
      };
      this.data.players[identity.uid] = player;
    }
    Object.assign(player, { name: identity.name.slice(0, 24), role, pose: 'idle', objectId: null });
    this.sessions.set(identity.uid, { uid: identity.uid, role, sessionId, online: true, reservedUntil: 0, input: { x: 0, z: 0, run: false }, lastInput: now });
    this.data.version++;
    return player;
  }

  disconnect(uid, sessionId, now = Date.now(), release = false) {
    const session = this.sessions.get(uid);
    if (!session || session.sessionId !== sessionId) return;
    if (release) this.sessions.delete(uid);
    else Object.assign(session, { online: false, reservedUntil: now + RECONNECT_MS, input: { x: 0, z: 0 } });
    const player = this.data.players[uid];
    if (player) this.stand(player);
    this.checkSleep();
  }

  expire(now) {
    for (const [uid, session] of this.sessions) {
      if (!session.online && session.reservedUntil <= now) this.sessions.delete(uid);
    }
  }

  input(uid, input, now = Date.now()) {
    const session = this.sessions.get(uid);
    ensure(session?.online, 'Sesi pemain tidak aktif.');
    ensure(input && finite(input.x) && finite(input.z) && Math.abs(input.x) <= 1 && Math.abs(input.z) <= 1, 'Input gerakan tidak valid.');
    session.input = { x: input.x, z: input.z, run: input.run === true };
    session.lastInput = now;
  }

  stand(player) {
    if (player.returnPosition) {
      Object.assign(player, player.returnPosition);
      delete player.returnPosition;
    }
    player.pose = 'idle';
    player.objectId = null;
  }

  tick(seconds, now = Date.now()) {
    this.expire(now);
    const active = [...this.sessions.values()].filter((session) => session.online);
    if (!active.length) return false;
    const dt = Math.min(0.25, Math.max(0, seconds));
    this.data.minute += dt / SECONDS_PER_MINUTE;
    for (const session of active) {
      const player = this.data.players[session.uid];
      if (['sleep', 'sit', 'lie'].includes(player.pose)) continue;
      if (player.actionUntil > now) continue;
      const input = now - session.lastInput < 600 ? session.input : { x: 0, z: 0 };
      const magnitude = Math.hypot(input.x, input.z);
      player.pose = 'idle';
      if (magnitude < 0.01) continue;
      const running = input.run && player.stamina > 0;
      const speed = running ? 6 : 3.4;
      const dx = input.x / Math.max(1, magnitude) * speed * dt;
      const dz = input.z / Math.max(1, magnitude) * speed * dt;
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.15));
      for (let i = 0; i < steps; i++) {
        if (isWalkable(player.mapId, player.x + dx / steps, player.z)) player.x += dx / steps;
        if (isWalkable(player.mapId, player.x, player.z + dz / steps)) player.z += dz / steps;
      }
      player.rotation = Math.atan2(input.x, input.z);
      player.pose = running ? 'run' : 'walk';
      if (running) player.stamina = Math.max(0, player.stamina - dt);
    }
    if (this.data.minute >= DAY_END) {
      this.advanceDay(true);
      return true;
    }
    return false;
  }

  checkSleep() {
    const active = [...this.sessions.values()].filter((session) => session.online);
    if (active.length && active.every((session) => this.data.players[session.uid].pose === 'sleep')) {
      this.advanceDay(false);
      return true;
    }
    return false;
  }

  advanceDay(forced) {
    const oldDay = this.data.day;
    const nextSeason = calendar(oldDay + 1).season;
    for (const plot of Object.values(this.data.plots)) {
      if (!plot.crop || plot.withered) continue;
      if (plot.wateredDay === oldDay) plot.growth = Math.min(CROPS[plot.crop].days, plot.growth + 1);
      if (CROPS[plot.crop].season !== nextSeason) plot.withered = true;
    }
    const earnings = this.data.shippingGold;
    this.data.gold += earnings;
    this.data.shippingGold = 0;
    this.data.day++;
    this.data.minute = DAY_START;
    this.data.lastDaySummary = { day: this.data.day, earnings, forced };
    for (const session of this.sessions.values()) {
      if (!session.online) continue;
      const player = this.data.players[session.uid];
      player.stamina = player.pose === 'sleep' ? 100 : forced ? 60 : player.stamina;
      player.lastRestDay = this.data.day;
      this.stand(player);
      session.input = { x: 0, z: 0 };
    }
    this.data.version++;
  }

  act(uid, action, now = Date.now()) {
    const session = this.sessions.get(uid);
    ensure(session?.online, 'Sesi pemain tidak aktif.');
    const player = this.data.players[uid];
    ensure(Number.isSafeInteger(action.seq) && action.seq > 0, 'Nomor aksi tidak valid.');
    if (action.seq <= player.lastSeq) return { message: 'Aksi ini sudah diproses.', duplicate: true };
    ensure(action.seq === player.lastSeq + 1, 'State perlu disinkronkan. Coba kembali.');
    ensure(action.type === 'stand' || !['sleep', 'sit', 'lie'].includes(player.pose), 'Bangun atau berdiri terlebih dahulu.');
    let message;
    if (['hoe', 'plant', 'water', 'harvest'].includes(action.type)) {
      const location = PLOT_BY_ID[action.target];
      this.requireNear(player, location);
      const plot = this.data.plots[action.target] || { tilled: false, crop: null, growth: 0, wateredDay: -1, withered: false };
      const cost = { hoe: 3, plant: 1, water: 2, harvest: 2 }[action.type];
      ensure(player.stamina >= cost, 'Stamina kurang. Istirahat di kasur dahulu.');
      if (action.type === 'hoe') {
        ensure(!plot.crop || plot.withered, 'Tanaman masih hidup di petak ini.');
        ensure(!plot.tilled || plot.withered, 'Tanah sudah dicangkul. Pilih benih untuk menanam.');
        Object.assign(plot, { tilled: true, crop: null, growth: 0, wateredDay: -1, withered: false });
        message = 'Tanah siap ditanami.';
      } else if (action.type === 'plant') {
        const crop = CROPS[action.crop];
        ensure(crop && crop.season === calendar(this.data.day).season, 'Benih tidak cocok dengan musim ini.');
        ensure(plot.tilled && !plot.crop, 'Cangkul petak kosong terlebih dahulu.');
        ensure((player.seeds[action.crop] || 0) > 0, 'Benih habis. Kunjungi kios benih.');
        player.seeds[action.crop]--;
        Object.assign(plot, { crop: action.crop, growth: 0, wateredDay: -1, withered: false });
        message = `${crop.name} ditanam. Jangan lupa disiram.`;
      } else if (action.type === 'water') {
        ensure(plot.crop && !plot.withered, 'Tidak ada tanaman hidup untuk disiram.');
        ensure(plot.wateredDay !== this.data.day, 'Tanaman sudah disiram hari ini.');
        plot.wateredDay = this.data.day;
        message = 'Tanaman sudah disiram.';
      } else {
        ensure(plot.crop && !plot.withered && plot.growth >= CROPS[plot.crop].days, 'Belum ada tanaman siap panen.');
        ensure((player.inventory[plot.crop] || 0) < 9999, 'Tas untuk hasil panen ini penuh.');
        player.inventory[plot.crop] = (player.inventory[plot.crop] || 0) + 1;
        message = `${CROPS[plot.crop].name} masuk ke tas.`;
        Object.assign(plot, { crop: null, growth: 0, wateredDay: -1, withered: false });
      }
      this.data.plots[action.target] = plot;
      player.stamina -= cost;
      player.rotation = Math.atan2(location.x - player.x, location.z - player.z);
      player.pose = action.type;
      player.actionUntil = now + 550;
    } else if (['sleep', 'sit', 'travel', 'ship', 'buy'].includes(action.type)) {
      const object = mapObjects(player.mapId).find((item) => item.id === action.target);
      this.requireNear(player, object && { ...object, mapId: player.mapId });
      if (action.type === 'sleep' || action.type === 'sit') {
        ensure(object.type === (action.type === 'sleep' ? 'bed' : 'chair'), 'Objek ini tidak sesuai.');
        ensure(![...this.sessions.values()].some((other) => other.online && other.uid !== uid && this.data.players[other.uid].objectId === object.id), 'Tempat ini sedang digunakan pemain lain.');
        player.returnPosition = { x: player.x, z: player.z };
        Object.assign(player, { x: object.x, z: object.z + (action.type === 'sleep' ? 0.8 : 0), rotation: 0, pose: action.type, objectId: object.id });
        message = action.type === 'sleep' ? 'Menunggu semua pemain online tidur.' : 'Duduk sejenak menikmati suasana.';
      } else if (action.type === 'travel') {
        ensure(object.type === 'portal', 'Jalur perjalanan tidak ditemukan.');
        Object.assign(player, { mapId: object.to, ...object.arrival, pose: 'idle', rotation: 0 });
        session.input = { x: 0, z: 0 };
        message = `Tiba di ${MAPS[object.to].name}.`;
      } else {
        ensure(object.type === (action.type === 'ship' ? 'bin' : 'shop'), 'Gunakan kotak penjualan atau kios yang sesuai.');
        const crop = CROPS[action.crop];
        ensure(crop && Number.isSafeInteger(action.quantity) && action.quantity >= 1 && action.quantity <= 99, 'Jumlah barang tidak valid (1–99).');
        if (action.type === 'ship') {
          ensure((player.inventory[action.crop] || 0) >= action.quantity, 'Hasil panen di tas tidak cukup.');
          player.inventory[action.crop] -= action.quantity;
          this.data.shippingGold += crop.sellPrice * action.quantity;
          message = `${action.quantity} ${crop.name} dikirim. Gold diterima besok pagi.`;
        } else {
          ensure(crop.season === calendar(this.data.day).season, 'Kios hanya menjual benih sesuai musim.');
          const price = crop.seedPrice * action.quantity;
          ensure(this.data.gold >= price, 'Gold bersama tidak cukup.');
          ensure((player.seeds[action.crop] || 0) + action.quantity <= 9999, 'Tas benih penuh.');
          this.data.gold -= price;
          player.seeds[action.crop] = (player.seeds[action.crop] || 0) + action.quantity;
          message = `${action.quantity} benih ${crop.name} dibeli.`;
        }
      }
    } else if (action.type === 'lie') {
      player.pose = 'lie';
      message = 'Tiduran santai. Untuk melewati hari, tidur di kasur.';
    } else if (action.type === 'stand') {
      this.stand(player);
      message = 'Siap beraktivitas kembali.';
    } else {
      throw new GameError('Aksi tidak dikenal.');
    }
    player.lastSeq = action.seq;
    this.data.version++;
    this.checkSleep();
    return { message, duplicate: false };
  }

  requireNear(player, object) {
    ensure(object && object.mapId === player.mapId && Math.hypot(player.x - object.x, player.z - object.z) <= INTERACT_DISTANCE, 'Berjalan lebih dekat ke objek terlebih dahulu.');
  }

  snapshot(uid, frame = false) {
    const sessions = [...this.sessions.values()];
    const players = sessions.map((session) => {
      const player = this.data.players[session.uid];
      const result = {
        uid: player.uid, name: player.name, role: player.role, mapId: player.mapId,
        x: player.x, z: player.z, rotation: player.rotation, pose: player.pose,
        objectId: player.objectId, online: session.online, reservedUntil: session.reservedUntil,
      };
      if (player.uid === uid) Object.assign(result, { stamina: player.stamina, seeds: player.seeds, inventory: player.inventory, lastSeq: player.lastSeq });
      return result;
    });
    const result = {
      id: this.data.id, name: this.data.name, day: this.data.day, minute: this.data.minute,
      gold: this.data.gold, shippingGold: this.data.shippingGold, version: this.data.version,
      players, onlineCount: sessions.filter((session) => session.online).length,
      sleepingCount: players.filter((player) => player.online && player.pose === 'sleep').length,
    };
    if (!frame) Object.assign(result, { code: this.data.code, plots: this.data.plots, lastDaySummary: this.data.lastDaySummary });
    return result;
  }
}
