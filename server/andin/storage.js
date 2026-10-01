import { mkdir, readFile, rename, readdir, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { GameError } from './room.js';

export class MemoryStore {
  constructor() { this.rooms = new Map(); }
  async init() {}
  async get(id) { return structuredClone(this.rooms.get(id) || null); }
  async byCode(code) { return structuredClone([...this.rooms.values()].find((room) => room.code === code) || null); }
  async list(uid) { return [...this.rooms.values()].filter((room) => room.memberUids.includes(uid)).map(({ id, name, day }) => ({ id, name, day })); }
  async save(data) { this.rooms.set(data.id, structuredClone(data)); }
  async release() {}
  async close() {}
}

export class FileStore {
  constructor(directory) {
    this.directory = path.resolve(directory);
    this.lock = null;
  }
  async init() {
    await mkdir(this.directory, { recursive: true });
    this.lock = await open(path.join(this.directory, '.lock'), 'wx');
    await this.lock.writeFile(String(process.pid));
  }
  filename(id) {
    if (!/^[a-zA-Z0-9-]{1,80}$/.test(id)) throw new GameError('Room tidak valid.');
    return path.join(this.directory, `${id}.json`);
  }
  async get(id) {
    try { return JSON.parse(await readFile(this.filename(id), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }
  async all() {
    const files = (await readdir(this.directory)).filter((file) => file.endsWith('.json'));
    return Promise.all(files.map((file) => this.get(file.slice(0, -5))));
  }
  async byCode(code) { return (await this.all()).find((room) => room.code === code) || null; }
  async list(uid) { return (await this.all()).filter((room) => room.memberUids.includes(uid)).map(({ id, name, day }) => ({ id, name, day })); }
  async save(data) {
    const target = this.filename(data.id);
    const temporary = `${target}.${randomUUID()}.tmp`;
    const file = await open(temporary, 'wx', 0o600);
    try { await file.writeFile(JSON.stringify(data)); await file.sync(); }
    finally { await file.close(); }
    await rename(temporary, target);
  }
  async release() {}
  async close() {
    if (this.lock) {
      await this.lock.close();
      await unlink(path.join(this.directory, '.lock'));
      this.lock = null;
    }
  }
}

export class FirestoreStore {
  constructor(db) {
    this.db = db;
    this.owner = randomUUID();
    this.leases = new Set();
  }
  async init() {}
  reference(id) {
    if (!/^[a-zA-Z0-9-]{1,80}$/.test(id)) throw new GameError('Room tidak valid.');
    return this.db.collection('andinServerRooms').doc(id);
  }
  async get(id) {
    const ref = this.reference(id);
    return this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return null;
      const value = snapshot.data();
      if (value.leaseUntil > Date.now() && value.leaseOwner !== this.owner) throw new GameError('Room sedang dilayani server lain. Coba sambungkan kembali sebentar lagi.');
      transaction.update(ref, { leaseOwner: this.owner, leaseUntil: Date.now() + 60000 });
      this.leases.add(id);
      return value.game;
    });
  }
  async byCode(code) {
    const result = await this.db.collection('andinServerRooms').where('code', '==', code).limit(1).get();
    return result.empty ? null : this.get(result.docs[0].id);
  }
  async list(uid) {
    const result = await this.db.collection('andinServerRooms').where('memberUids', 'array-contains', uid).limit(30).get();
    return result.docs.map((doc) => {
      const { id, name, day } = doc.data().game;
      return { id, name, day };
    });
  }
  async save(data) {
    const ref = this.reference(data.id);
    await this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (snapshot.exists) {
        const current = snapshot.data();
        if (current.leaseOwner !== this.owner || current.leaseUntil <= Date.now()) throw new GameError('Sesi penyimpanan kedaluwarsa. Silakan sambungkan ulang.');
      }
      transaction.set(ref, {
        game: data, code: data.code, memberUids: data.memberUids,
        leaseOwner: this.owner, leaseUntil: Date.now() + 60000,
      });
    });
    this.leases.add(data.id);
  }
  async release(id) {
    const ref = this.reference(id);
    await this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (snapshot.exists && snapshot.data().leaseOwner === this.owner) transaction.update(ref, { leaseUntil: 0 });
    });
    this.leases.delete(id);
  }
  async close() { await Promise.all([...this.leases].map((id) => this.release(id))); }
}
