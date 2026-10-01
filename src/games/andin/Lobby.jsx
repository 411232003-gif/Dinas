import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Home, Leaf, Mountain, RefreshCw, Sprout, Users, Wifi, WifiOff } from 'lucide-react';
import { MAPS, ROLES, calendar } from '../../../shared/andin/world';

function Landscape() {
  return <svg className="andin-landscape" viewBox="0 0 650 490" role="img" aria-label="Rumah pertanian di antara perbukitan, pepohonan dan ladang">
    <defs><linearGradient id="andin-sky" x2="0" y2="1"><stop stopColor="#d9e6dd" /><stop offset="1" stopColor="#f0e7cf" /></linearGradient><linearGradient id="andin-hill" x2="0" y2="1"><stop stopColor="#96ae87" /><stop offset="1" stopColor="#6d8969" /></linearGradient></defs>
    <rect width="650" height="490" rx="24" fill="url(#andin-sky)" />
    <circle cx="485" cy="104" r="42" fill="#f6e8bc" />
    <path d="M0 237 Q150 84 320 232 Q500 106 650 211 V490 H0Z" fill="#bac7a6" />
    <path d="M0 315 Q170 159 342 275 Q496 196 650 269 V490 H0Z" fill="url(#andin-hill)" />
    <path d="M0 401 Q250 234 650 347 V490 H0Z" fill="#b8bd8c" />
    <path d="M292 327 Q299 377 439 490 H350 Q240 387 252 331Z" fill="#d6c5a0" />
    <g transform="translate(187 188)"><path d="M0 86 L91 22 L216 75 L133 149Z" fill="#aa7158" /><path d="M0 86 L0 178 L133 237 L133 149Z" fill="#e8d5b1" /><path d="M133 149 L216 75 L216 171 L133 237Z" fill="#c1af8b" /><path d="M-15 86 L90 8 L233 71 L215 86 L93 32 L0 101Z" fill="#7b6454" /><path d="M24 125 L59 139 L59 183 L24 169Z" fill="#70969a" /><path d="M81 157 L112 171 L112 229 L81 215Z" fill="#8c7152" /><path d="M155 148 L182 126 L182 162 L155 184Z" fill="#759599" /><path d="M153 45 L153 0 L174 8 L174 54Z" fill="#9a8775" /></g>
    <g stroke="#76935b" strokeWidth="5"><path d="M423 371 L564 328 M438 397 L580 352 M454 422 L598 379" /></g>
    {[0, 1, 2, 3, 4, 5].map((i) => <g key={i} transform={`translate(${432 + i * 24},${365 - i * 7})`}><path d="M0 0 Q-17 -27 -2 -19 Q12 -34 5 -5" fill="#598447" /><circle cx="2" cy="2" r="7" fill="#d4bb8d" /></g>)}
    {[[86, 254, 1], [557, 242, 0.8], [110, 395, 0.65], [592, 441, 0.7]].map(([x, y, s], i) => <g key={i} transform={`translate(${x} ${y}) scale(${s})`}><path d="M-6 0 L-4 -84 H7 L9 0Z" fill="#806c4c" /><ellipse cy="-92" rx="42" ry="57" fill={i % 2 ? '#638469' : '#799361'} /><ellipse cx="-20" cy="-69" rx="29" ry="36" fill="#6c895c" /></g>)}
    <path d="M41 452 L184 408 M41 427 L184 383 M47 465 V410 M89 452 V397 M136 438 V384 M180 425 V371" stroke="#eee2bf" strokeWidth="7" fill="none" />
  </svg>;
}
function Portrait({ role }) {
  return <svg viewBox="0 0 70 76" aria-hidden="true"><path d="M12 76 Q12 43 35 43 Q58 43 58 76" fill={role.color} /><path d="M24 52 L24 76 H46 V52 L41 57 H29Z" fill="#59777b" /><ellipse cx="35" cy="30" rx="16" ry="19" fill={role.skin} /><path d="M18 28 Q15 6 35 8 Q55 8 52 29 L45 18 Q35 25 21 22Z" fill={role.hair} /><circle cx="29" cy="31" r="1.5" fill="#3d352b" /><circle cx="41" cy="31" r="1.5" fill="#3d352b" /><path d="M31 40 Q35 43 39 40" fill="none" stroke="#9f6d56" strokeWidth="1.5" /><ellipse cx="35" cy="14" rx="27" ry="5" fill="#cbb07a" /><path d="M19 13 Q19 -5 35 0 Q51 -5 51 13Z" fill="#dfc796" /></svg>;
}

export default function Lobby({ connection, onBack }) {
  const { uid, status, rooms, lobby, runRequest, clearLobby } = connection;
  const [name, setName] = useState('Kebun Keluarga');
  const [code, setCode] = useState('');
  const [role, setRole] = useState(null);
  const [busy, setBusy] = useState(false);
  const connected = status === 'connected';
  const lobbyId = lobby?.id;
  const lobbyCode = lobby?.code;
  useEffect(() => {
    if (!lobbyId || !connected) return;
    const timer = setInterval(() => { runRequest('inspect', { code: lobbyCode }); }, 3000);
    return () => clearInterval(timer);
  }, [lobbyId, lobbyCode, connected, runRequest]);
  const perform = async (type, fields) => {
    setBusy(true);
    try { await runRequest(type, fields); }
    finally { setBusy(false); }
  };
  const chosenOccupied = lobby?.slots.some((slot) => slot.role === role && slot.uid !== uid);
  return <main className="andin-lobby">
    <header className="andin-lobby-header">
      <button className="andin-text-button" onClick={onBack}><ArrowLeft size={17} /> Kembali ke game</button>
      <div className={`andin-connection ${connected ? 'is-online' : ''}`}>{connected ? <Wifi size={15} /> : <WifiOff size={15} />}{connected ? 'Server terhubung' : status === 'connecting' ? 'Menghubungkan…' : 'Mencoba terhubung kembali…'}</div>
    </header>
    <div className="andin-lobby-layout">
      <section className="andin-intro">
        <div className="andin-brand"><Sprout size={27} /><span>andin<span className="andin-brand-light"> / multiplayer</span></span></div>
        <span className="andin-eyebrow">KEHIDUPAN KECIL, KEBERSAMAAN BESAR</span>
        <h1>Sedikit menanam.<br /><em>Banyak cerita.</em></h1>
        <p>Bangun pagi, rawat kebun, lalu mampir ke rumah teman. Satu dunia yang tumbuh bersama kalian.</p>
        <div className="andin-intro-badges"><span><Users size={16} /> 1–5 pemain</span><span><Leaf size={16} /> 4 musim</span><span><Mountain size={16} /> 4 tempat</span></div>
        <Landscape />
        <div className="andin-art-caption"><span>RUMAH KELUARGA</span><span>Awal dari cerita kalian</span></div>
      </section>
      <section className="andin-lobby-panel">
        {lobby ? <>
          <button className="andin-text-button" onClick={() => { clearLobby(); setRole(null); }}><ArrowLeft size={15} /> Pilih kebun lain</button>
          <div className="andin-panel-heading"><span className="andin-eyebrow">SEBELUM MEMULAI CERITA</span><h2>Pilih karaktermu</h2><p>{lobby.name} · {lobby.slots.length}/5 slot terisi</p></div>
          <div className="andin-role-grid">
            {ROLES.map((item) => {
              const occupant = lobby.slots.find((slot) => slot.role === item.id && slot.uid !== uid);
              return <button key={item.id} className={`andin-role ${role === item.id ? 'is-selected' : ''}`} disabled={Boolean(occupant)} onClick={() => setRole(item.id)} aria-pressed={role === item.id}>
                <Portrait role={item} /><strong>{item.name}</strong><span>{occupant ? occupant.online ? occupant.name : 'Reconnect…' : 'Tersedia'}</span>{role === item.id && <Check className="andin-role-check" size={16} />}
              </button>;
            })}
          </div>
          <div className="andin-note"><Users size={18} /><p>Setiap peran hanya untuk satu pemain. Semua memiliki kemampuan bertani yang sama.</p></div>
          <button className="andin-primary" disabled={!role || chosenOccupied || busy || !connected} onClick={() => perform('join', { code: lobby.code, role })}>{busy ? 'Menyiapkan kebun…' : 'Masuk ke kebun'}<ArrowRight size={18} /></button>
          <p className="andin-fine-print">Undang teman menggunakan kode <strong>{lobby.code}</strong>. Bagikan hanya kepada orang yang kamu percaya.</p>
        </> : <>
          <div className="andin-panel-heading"><span className="andin-eyebrow">SELAMAT DATANG, PETANI</span><h2>Mau ke kebun mana?</h2><p>Mulai cerita baru atau bergabung dengan teman.</p></div>
          <form className="andin-form" onSubmit={(event) => { event.preventDefault(); perform('create', { name }); }}>
            <label htmlFor="andin-farm-name">Buat kebun bersama</label>
            <input id="andin-farm-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={40} required placeholder="Nama kebunmu" autoComplete="off" />
            <button className="andin-primary" disabled={!connected || busy || !name.trim()}><Sprout size={18} />{busy ? 'Memproses…' : 'Buat kebun baru'}<ArrowRight size={18} /></button>
          </form>
          <div className="andin-divider"><span>atau mampir ke kebun teman</span></div>
          <form className="andin-form" onSubmit={(event) => { event.preventDefault(); perform('inspect', { code }); }}>
            <label htmlFor="andin-room-code">Kode undangan</label>
            <div className="andin-input-row"><input id="andin-room-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} maxLength={12} minLength={12} required placeholder="12 karakter kode" autoComplete="off" spellCheck={false} /><button className="andin-secondary" disabled={!connected || busy || code.length !== 12}>Gabung</button></div>
          </form>
          <div className="andin-saved-heading"><h3>Kebun tersimpan</h3><button className="andin-icon-button" disabled={!connected} onClick={() => perform('list')} aria-label="Perbarui daftar kebun"><RefreshCw size={15} /></button></div>
          <div className="andin-saved-list">{rooms.length ? rooms.map((room) => <button className="andin-saved-room" key={room.id} disabled={busy || !connected} onClick={() => perform('inspect', { roomId: room.id })}><span className="andin-saved-icon"><Home size={20} /></span><span><strong>{room.name}</strong><small>Hari {calendar(room.day).day} · Tahun {calendar(room.day).year}</small></span><ArrowRight size={17} /></button>) : <p className="andin-empty">Belum ada kebun tersimpan. Cerita pertamamu menunggu.</p>}</div>
          {!connected && <div className="andin-note"><WifiOff size={18} /><p>Multiplayer membutuhkan backend aktif. Mode pengembangan: jalankan <code>npm run game:dev</code>. Saat dipublikasikan, atur alamat server game.</p></div>}
        </>}
      </section>
    </div>
    <section className="andin-destinations" aria-label="Empat peta permainan">
      {Object.values(MAPS).map((map, i) => <div key={map.id}><span className="andin-destination-number">0{i + 1}</span><div><strong>{map.name}</strong><p>{map.subtitle}</p></div>{i === 3 ? <Mountain size={23} /> : <Home size={23} />}</div>)}
    </section>
    <footer className="andin-lobby-footer">Tidak perlu terburu-buru. Kebun yang baik tumbuh bersama.</footer>
  </main>;
}
