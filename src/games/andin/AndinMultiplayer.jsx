import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Armchair, ArrowRight, Backpack, BedDouble, Check, CircleHelp, Coins, Copy, Droplets, Footprints, Hand, Home, Leaf, LogOut, Map as MapIcon, Maximize, Moon, Settings, Shovel, Sprout, Sun, Users, Wheat, WifiOff, X, ZoomIn, ZoomOut } from 'lucide-react';
import { CROPS, MAPS, ROLES, SEASONS, TOOLS, INTERACT_DISTANCE, calendar, clockLabel, nearestTarget } from '../../../shared/andin/world';
import { useGameConnection } from './useGameConnection';
import { useControls } from './useControls';
import Lobby from './Lobby';
import './andin.css';

const FarmScene = lazy(() => import('./FarmScene'));
const TOOL_ICONS = { hand: Hand, hoe: Shovel, water: Droplets, seed: Sprout };

function Dialog({ title, children, onClose }) {
  const dialog = useRef();
  useEffect(() => {
    const previous = document.activeElement;
    const node = dialog.current;
    node.showModal();
    return () => { node.close(); previous?.focus?.(); };
  }, []);
  return <dialog className="andin-dialog" ref={dialog} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === dialog.current) onClose(); }}>
    <div className="andin-dialog-content"><header><h2>{title}</h2><button className="andin-icon-button" onClick={onClose} aria-label="Tutup dialog"><X size={21} /></button></header>{children}</div>
  </dialog>;
}
function MiniMap({ player, players, onClick }) {
  const map = MAPS[player.mapId];
  const size = map.size * 2;
  return <button className="andin-minimap" onClick={onClick} aria-label="Buka peta perjalanan">
    <svg viewBox={`${-map.size} ${-map.size} ${size} ${size}`} aria-hidden="true">
      <rect x={-map.size} y={-map.size} width={size} height={size} fill="#c0c7a0" />
      {map.portals.map((portal) => <path key={portal.id} d={`M0 1 L${portal.x} ${portal.z}`} stroke="#e8d6ac" strokeWidth="2.5" />)}
      <ellipse cx={map.pond.x} cy={map.pond.z} rx={map.pond.rx} ry={map.pond.rz} fill="#81aeb2" />
      <rect x={map.house.x - map.house.width / 2} y={map.house.z - 5} width={map.house.width} height="10" fill="#a47a5b" />
      {map.plots.map((plot) => <rect key={plot.id} x={plot.x - 0.65} y={plot.z - 0.65} width="1.3" height="1.3" fill="#8e8a55" />)}
      {map.portals.map((portal) => <circle key={portal.id} cx={portal.x} cy={portal.z} r="1.6" fill="#faf1d7" stroke="#8a7351" strokeWidth="0.4" />)}
      {players.filter((item) => item.online && item.mapId === player.mapId).map((item) => <circle key={item.uid} cx={item.x} cy={item.z} r={item.uid === player.uid ? 1.8 : 1.4} fill={item.uid === player.uid ? '#f9f5df' : '#bb755b'} stroke="#385b50" strokeWidth="0.7" />)}
    </svg><span><MapIcon size={12} /> Peta</span>
  </button>;
}

function Game({ connection }) {
  const { world, uid, status, inputRef, act, pendingAction, runRequest } = connection;
  const player = world.players.find((item) => item.uid === uid);
  const [tool, setTool] = useState('hand');
  const [seed, setSeed] = useState('turnip');
  const [selected, setSelected] = useState(null);
  const [panel, setPanel] = useState(null);
  const [hint, setHint] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [lowQuality, setLowQuality] = useState(() => window.matchMedia('(max-width: 700px)').matches || navigator.hardwareConcurrency <= 4);
  const [copied, setCopied] = useState(false);
  const date = calendar(world.day);
  const activeSeed = CROPS[seed].season === date.season ? seed : Object.keys(CROPS).find((id) => CROPS[id].season === date.season);
  const target = player && selected?.mapId === player.mapId && Math.hypot(player.x - selected.x, player.z - selected.z) <= INTERACT_DISTANCE ? selected : nearestTarget(player);
  const resting = player && ['sleep', 'sit', 'lie'].includes(player.pose);
  const connected = status === 'connected';
  const interact = (override) => {
    if (!player || !connected || pendingAction) return;
    if (resting) { act({ type: 'stand' }); return; }
    const item = override || target;
    if (!item) { setHint('Dekati petak kebun, kursi, kasur, kios, atau papan perjalanan.'); return; }
    if (Math.hypot(player.x - item.x, player.z - item.z) > INTERACT_DISTANCE) { setHint('Berjalan lebih dekat. Gunakan WASD atau joystick di kiri bawah.'); return; }
    if (item.type === 'plot') {
      const plot = world.plots?.[item.id];
      if (tool === 'hand') {
        if (plot?.crop && !plot.withered && plot.growth >= CROPS[plot.crop].days) act({ type: 'harvest', target: item.id });
        else setHint(plot?.withered ? 'Tanaman layu. Gunakan cangkul untuk membersihkannya.' : plot?.crop ? `${CROPS[plot.crop].name}: ${plot.growth}/${CROPS[plot.crop].days} hari tumbuh. ${plot.wateredDay === world.day ? 'Sudah disiram hari ini.' : 'Perlu disiram hari ini.'}` : 'Pilih cangkul, lalu benih dan penyiram untuk mulai menanam.');
      } else act({ type: tool === 'seed' ? 'plant' : tool, target: item.id, ...(tool === 'seed' ? { crop: activeSeed } : {}) });
    } else if (item.type === 'chair') act({ type: 'sit', target: item.id });
    else if (item.type === 'bed') setPanel({ type: 'sleep', target: item.id });
    else if (item.type === 'portal') setPanel({ type: 'travel', target: item.id, destination: item.to, distance: item.distance });
    else setPanel({ type: item.type, target: item.id });
  };
  const chooseTool = (index) => setTool(TOOLS[index].id);
  const controls = useControls(inputRef, Boolean(player) && connected && !panel, interact, chooseTool);
  useEffect(() => {
    if (!hint) return;
    const timer = setTimeout(() => setHint(null), 5500);
    return () => clearTimeout(timer);
  }, [hint]);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);
  if (!player) return <div className="andin-loading"><Sprout size={36} /><p>Menyinkronkan karakter…</p></div>;
  const map = MAPS[player.mapId];
  const plot = target?.type === 'plot' ? world.plots?.[target.id] : null;
  const actionLabel = resting ? 'Berdiri / bangun' : !target ? 'Interaksi' : target.type === 'plot' ? tool === 'hand' ? plot?.crop && !plot.withered && plot.growth >= CROPS[plot.crop].days ? 'Panen' : 'Periksa' : tool === 'hoe' ? 'Cangkul' : tool === 'water' ? 'Siram' : 'Tanam' : { bed: 'Tidur', chair: 'Duduk', bin: 'Jual panen', shop: 'Beli benih', portal: 'Pergi' }[target.type];
  const closePanel = () => setPanel(null);
  const copyCode = async () => {
    try { await navigator.clipboard.writeText(world.code); setCopied(true); }
    catch { setHint(`Kode undangan: ${world.code}`); }
  };
  const titles = { inventory: 'Tas & benih', map: 'Jelajahi desa', players: 'Keluarga & teman', help: 'Panduan kehidupan kebun', settings: 'Tampilan permainan', shop: 'Kios benih', bin: 'Kotak penjualan', sleep: 'Istirahat sampai besok?', travel: 'Perjalanan baru', leave: 'Kembali ke lobby?' };
  return <div className="andin-game">
    <div className="andin-canvas"><Suspense fallback={<div className="andin-loading"><Sprout size={36} /><p>Menyiapkan pemandangan…</p></div>}><FarmScene world={world} player={player} inputRef={inputRef} selected={target} onTarget={(item) => { setSelected(item); interact(item); }} zoom={zoom} lowQuality={lowQuality} paused={Boolean(panel) || !connected} onBack={() => runRequest('leave')} /></Suspense></div>
    <header className="andin-hud-top">
      <div className="andin-time-card"><div className="andin-season-symbol">{world.minute >= 1140 ? <Moon size={25} /> : <Sun size={25} />}</div><div><span className="andin-eyebrow">MUSIM {SEASONS[date.season].toUpperCase()} · TAHUN {date.year}</span><strong>Hari {date.day} <span>{clockLabel(world.minute)}</span></strong></div></div>
      <div className="andin-hud-right"><div className="andin-gold"><Coins size={20} /><strong>{world.gold.toLocaleString('id-ID')}</strong><span>G</span></div><button className="andin-player-pill" onClick={() => setPanel({ type: 'players' })}><Users size={17} /><span>Pemain Online: {world.onlineCount}/5</span></button><button className="andin-icon-button" onClick={() => setPanel({ type: 'leave' })} aria-label="Kembali ke lobby"><LogOut size={19} /></button></div>
    </header>
    <div className="andin-location"><span className="andin-location-marker" /><div><strong>{map.name}</strong><span>{map.subtitle}</span></div></div>
    <div className="andin-left-hud"><div className="andin-energy"><span><Leaf size={13} /> Stamina <strong>{Math.ceil(player.stamina)}/100</strong></span><div role="progressbar" aria-label="Stamina" aria-valuenow={Math.ceil(player.stamina)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${player.stamina}%`, background: player.stamina < 20 ? '#c48661' : undefined }} /></div></div><MiniMap player={player} players={world.players} onClick={() => setPanel({ type: 'map' })} /></div>
    <nav className="andin-side-actions" aria-label="Menu game"><button onClick={() => setPanel({ type: 'inventory' })} aria-label="Buka tas" title="Tas & benih"><Backpack size={21} /></button><button onClick={() => setPanel({ type: 'map' })} aria-label="Peta perjalanan" title="Peta perjalanan"><MapIcon size={21} /></button><button onClick={() => setPanel({ type: 'help' })} aria-label="Panduan" title="Panduan"><CircleHelp size={21} /></button><button onClick={() => setPanel({ type: 'settings' })} aria-label="Pengaturan" title="Pengaturan"><Settings size={21} /></button></nav>
    {world.sleepingCount > 0 && <div className="andin-sleep-status"><BedDouble size={18} /><span>Sudah tidur <strong>{world.sleepingCount}/{world.onlineCount}</strong> · Menunggu {world.players.filter((item) => item.online && item.pose !== 'sleep').map((item) => item.name).join(', ') || 'pagi baru'}</span></div>}
    {date.day >= 26 && <div className="andin-season-warning">Musim berganti dalam {29 - date.day} hari. Panen tanaman sebelum layu.</div>}
    {!connected && <div className="andin-disconnected"><WifiOff size={23} /><strong>Menghubungkan ulang…</strong><span>Aksi dinonaktifkan sampai state terbaru diterima.</span><button className="andin-secondary" onClick={connection.abandonRoom}>Kembali ke lobby</button></div>}
    {hint && <div className="andin-hint" role="status"><Leaf size={17} /><span>{hint}</span><button onClick={() => setHint(null)} aria-label="Tutup petunjuk"><X size={15} /></button></div>}
    <div className="andin-bottom-hud">
      <div className="andin-movement"><div className="andin-joystick" role="group" aria-label="Joystick gerakan" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); controls.moveStick(event); }} onPointerMove={controls.moveStick} onPointerUp={controls.releaseStick} onPointerCancel={controls.releaseStick} onLostPointerCapture={controls.releaseStick}><i /><span style={{ transform: `translate(${controls.stick.x * 29}px, ${controls.stick.z * 29}px)` }} /></div><small>WASD / arah</small></div>
      <div className="andin-hotbar-wrap"><div className="andin-tool-caption">{tool === 'seed' ? `Benih ${CROPS[activeSeed].name} · ${player.seeds[activeSeed] || 0} tersisa` : target?.type === 'plot' && plot?.crop ? `${CROPS[plot.crop].name} · ${plot.withered ? 'Layu' : `${plot.growth}/${CROPS[plot.crop].days} hari`}` : 'Pilih alat, dekati objek, lalu tekan E'} </div><div className="andin-hotbar">{TOOLS.map((item) => { const Icon = TOOL_ICONS[item.id]; return <button key={item.id} className={tool === item.id ? 'is-active' : ''} onClick={() => setTool(item.id)} aria-pressed={tool === item.id} title={`${item.name} (${item.key})`}><kbd>{item.key}</kbd><Icon size={25} /><span>{item.name}</span>{item.id === 'seed' && <small>{player.seeds[activeSeed] || 0}</small>}</button>; })}<button onClick={() => setPanel({ type: 'inventory' })} title="Buka tas"><Backpack size={25} /><span>Tas</span></button></div></div>
      <div className="andin-interactions"><button className={`andin-run ${controls.runHeld ? 'is-active' : ''}`} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); controls.setRun(true); }} onPointerUp={() => controls.setRun(false)} onPointerCancel={() => controls.setRun(false)} onLostPointerCapture={() => controls.setRun(false)} disabled={!connected || resting}><Footprints size={19} /><span>Lari</span><kbd>Shift</kbd></button><button className="andin-interact" onClick={() => interact()} disabled={!connected || pendingAction}><Hand size={21} /><span>{pendingAction ? 'Memproses…' : actionLabel}</span><kbd>E</kbd></button><button className="andin-rest" onClick={() => act({ type: resting ? 'stand' : 'lie' })} disabled={!connected || pendingAction}><Armchair size={17} />{resting ? 'Bangun' : 'Tiduran'}</button></div>
    </div>
    {panel && <Dialog title={titles[panel.type]} onClose={closePanel}>
      {panel.type === 'inventory' && <><p className="andin-muted">Benih dan panen milikmu. Gold digunakan bersama seluruh pemain.</p><div className="andin-inventory">{Object.entries(CROPS).map(([id, crop]) => <div key={id}><span className="andin-crop-swatch" style={{ background: crop.color }}><Sprout size={22} /></span><div><strong>{crop.name}</strong><small>Musim {SEASONS[crop.season]} · {crop.days} hari</small><span>{player.seeds[id] || 0} benih · {player.inventory[id] || 0} panen</span></div><button className="andin-secondary" disabled={crop.season !== date.season || !player.seeds[id]} onClick={() => { setSeed(id); setTool('seed'); closePanel(); }}>Pakai</button></div>)}</div><div className="andin-note"><Wheat size={20} /><p>Jual hasil panen di kotak penjualan. Pembayarannya masuk pada pagi berikutnya.</p></div></>}
      {panel.type === 'players' && <><div className="andin-share-code"><div><small>KODE UNDANGAN</small><strong>{world.code}</strong></div><button className="andin-secondary" onClick={copyCode}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? 'Disalin' : 'Salin'}</button></div><p className="andin-muted">Bagikan kode kepada teman yang sudah login. Undangan hanya membuka akses ke kebun, bukan data pasangan.</p><div className="andin-player-list">{ROLES.map((role) => { const item = world.players.find((entry) => entry.role === role.id); return <div key={role.id}><span style={{ background: role.color }}>{role.name.slice(0, 1)}</span><div><strong>{item?.name || 'Slot tersedia'}</strong><small>{role.name}{item ? ` · ${MAPS[item.mapId].name}` : ''}</small></div><i className={item?.online ? 'online' : ''}>{item ? item.online ? item.pose === 'sleep' ? 'Tidur' : 'Online' : 'Reconnect' : 'Kosong'}</i></div>; })}</div></>}
      {panel.type === 'map' && <><p className="andin-muted">Semua tempat berada di room yang sama. Dekati papan perjalanan di tepi peta untuk berpindah; waktu, Gold, dan kebun tetap tersinkron.</p><div className="andin-world-map">{Object.values(MAPS).map((place, index) => <div key={place.id} className={place.id === player.mapId ? 'is-current' : ''}><span className="andin-map-index">0{index + 1}</span><div><strong>{place.name}</strong><p>{place.subtitle}</p><small>{place.id === player.mapId ? 'Kamu di sini' : `${world.players.filter((item) => item.online && item.mapId === place.id).length} pemain di sini`}</small></div><Home size={22} /></div>)}</div><h3>Jalur dari {map.name}</h3>{map.portals.map((portal) => <div className="andin-route" key={portal.id}><ArrowRight size={17} /><div><strong>{portal.name}</strong><span>{portal.distance} · {portal.x < -10 ? 'Tepi barat' : portal.x > 10 ? 'Tepi timur' : portal.z < 0 ? 'Tepi utara' : 'Tepi selatan'}</span></div></div>)}</>}
      {panel.type === 'help' && <div className="andin-help"><p><strong>1. Mulai dari tanah.</strong> Pilih cangkul (2), dekati petak, tekan E. Pilih benih (4) untuk menanam, lalu penyiram (3).</p><p><strong>2. Rawat setiap hari.</strong> Tanaman tumbuh saat hari berganti jika sudah disiram. Gunakan tangan (1) untuk memanen tanaman matang.</p><p><strong>3. Hasil untuk bersama.</strong> Masukkan panen ke kotak penjualan. Gold dibayar besok pagi dan dapat dipakai di kios benih.</p><p><strong>4. Beristirahat sungguhan.</strong> Dekati kursi untuk duduk. Tiduran hanya pose santai; tidur di kasur akan memulihkan stamina. Hari dilewati ketika semua pemain online tidur, termasuk yang berada di peta lain.</p><p><strong>5. Jelajahi desa.</strong> Ikuti jalan menuju papan di pinggir peta. Ada dua rumah teman dan perkebunan bukit dengan 100 petak tambahan.</p><p><strong>6. Ikuti musim.</strong> Setiap musim berlangsung 28 hari. Tanaman yang tidak cocok akan layu saat pergantian musim. Pada 02.00 semua pemain beristirahat paksa dengan stamina lebih rendah.</p><div className="andin-note"><Footprints size={20} /><p>WASD/panah untuk berjalan, Shift untuk lari, E untuk interaksi. Di ponsel gunakan joystick, hotbar, dan tombol aksi.</p></div></div>}
      {panel.type === 'settings' && <><div className="andin-setting-row"><span>Jarak kamera</span><div><button className="andin-icon-button" onClick={() => setZoom((value) => Math.max(0.7, value - 0.1))} aria-label="Perkecil"><ZoomOut size={20} /></button><span>{Math.round(zoom * 100)}%</span><button className="andin-icon-button" onClick={() => setZoom((value) => Math.min(1.6, value + 0.1))} aria-label="Perbesar"><ZoomIn size={20} /></button></div></div><label className="andin-setting-row"><span>Mode ringan tanpa bayangan<small>Disarankan untuk ponsel dengan grafis terbatas</small></span><input type="checkbox" checked={lowQuality} onChange={(event) => setLowQuality(event.target.checked)} /></label><button className="andin-secondary" onClick={async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { setHint('Browser ini tidak mendukung layar penuh.'); } }}><Maximize size={18} /> Layar penuh</button></>}
      {panel.type === 'shop' && <><p className="andin-muted">Benih musim {SEASONS[date.season]}. Pembelian menggunakan saldo Gold bersama.</p><div className="andin-shop-item"><span className="andin-crop-swatch" style={{ background: CROPS[activeSeed].color }}><Sprout size={28} /></span><div><h3>Benih {CROPS[activeSeed].name}</h3><p>Panen setelah {CROPS[activeSeed].days} hari disiram.</p><strong>{CROPS[activeSeed].seedPrice} G / benih</strong></div></div><div className="andin-button-row">{[1, 5, 10].map((quantity) => <button className="andin-secondary" key={quantity} disabled={pendingAction || !connected || world.gold < CROPS[activeSeed].seedPrice * quantity} onClick={() => act({ type: 'buy', target: panel.target, crop: activeSeed, quantity })}>Beli {quantity} · {CROPS[activeSeed].seedPrice * quantity} G</button>)}</div></>}
      {panel.type === 'bin' && <><p className="andin-muted">Masukkan hasil panenmu. Pembayaran bersama diterima otomatis besok pagi.</p><div className="andin-shipping-total"><Coins size={26} /><span>Pendapatan menunggu<strong>{world.shippingGold.toLocaleString('id-ID')} G</strong></span></div><div className="andin-inventory">{Object.entries(CROPS).map(([id, crop]) => <div key={id}><span className="andin-crop-swatch" style={{ background: crop.color }}><Wheat size={21} /></span><div><strong>{crop.name}</strong><small>{player.inventory[id] || 0} tersedia · {crop.sellPrice} G / buah</small></div><button className="andin-secondary" disabled={!player.inventory[id] || pendingAction || !connected} onClick={() => act({ type: 'ship', target: panel.target, crop: id, quantity: Math.min(99, player.inventory[id]) })}>Kirim {Math.min(99, player.inventory[id] || 0)}</button></div>)}</div></>}
      {panel.type === 'sleep' && <><div className="andin-dialog-illustration"><BedDouble size={54} /></div><p className="andin-muted">Karaktermu akan berbaring di kasur. Ketika seluruh pemain online sudah tidur, hari berganti dan stamina kembali penuh.</p><p className="andin-muted">Saat ini {world.sleepingCount}/{world.onlineCount} pemain sudah tidur. Kamu bisa bangun lagi jika ingin melanjutkan aktivitas.</p><button className="andin-primary" disabled={pendingAction || !connected} onClick={async () => { await act({ type: 'sleep', target: panel.target }); closePanel(); }}><Moon size={19} /> Tidur sampai besok</button></>}
      {panel.type === 'travel' && <><div className="andin-dialog-illustration"><MapIcon size={54} /></div><h3>{MAPS[panel.destination].name}</h3><p className="andin-muted">{MAPS[panel.destination].subtitle}. {panel.distance}. Kamu tetap terhubung dengan semua pemain di kebun ini.</p><button className="andin-primary" disabled={pendingAction || !connected} onClick={async () => { await act({ type: 'travel', target: panel.target }); setSelected(null); closePanel(); }}>Mulai perjalanan <ArrowRight size={19} /></button></>}
      {panel.type === 'leave' && <><p className="andin-muted">Progres kebun tersimpan di server. Slot karaktermu akan tersedia untuk teman lain. Waktu berhenti ketika tidak ada pemain online.</p><div className="andin-button-row"><button className="andin-secondary" onClick={closePanel}>Tetap bermain</button><button className="andin-primary" disabled={!connected || pendingAction} onClick={() => runRequest('leave')}><LogOut size={18} /> Kembali ke lobby</button></div></>}
      {connection.notice && <p className="andin-note" role="status">{connection.notice.text}</p>}
      {world.lastDaySummary && panel.type === 'inventory' && <p className="andin-fine-print">Pagi terakhir: +{world.lastDaySummary.earnings} G dari penjualan panen.</p>}
    </Dialog>}
  </div>;
}

export default function AndinMultiplayer({ onBack, devIdentity }) {
  const connection = useGameConnection(devIdentity);
  const { notice, dismissNotice } = connection;
  useEffect(() => {
    document.body.classList.add('andin-is-open');
    return () => document.body.classList.remove('andin-is-open');
  }, []);
  useEffect(() => {
    if (!notice || notice.kind === 'error') return;
    const timer = setTimeout(dismissNotice, 4500);
    return () => clearTimeout(timer);
  }, [notice, dismissNotice]);
  return <div className="andin-app">
    {connection.world ? <Game connection={connection} /> : <Lobby connection={connection} onBack={onBack} />}
    {notice && <div className={`andin-toast ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.kind === 'error' ? <CircleHelp size={19} /> : <Check size={19} />}<span>{notice.text}</span><button onClick={dismissNotice} aria-label="Tutup notifikasi"><X size={16} /></button></div>}
    {import.meta.env.DEV && devIdentity && <div className="andin-dev-badge">PENGUJIAN LOKAL · {devIdentity.name}</div>}
  </div>;
}
