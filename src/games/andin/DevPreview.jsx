import { useState } from 'react';
import AndinMultiplayer from './AndinMultiplayer';

export default function DevPreview() {
  const [name, setName] = useState('Petani Uji');
  const [identity, setIdentity] = useState(null);
  const start = (event) => {
    event.preventDefault();
    let uid = sessionStorage.getItem('andin-dev-uid');
    if (!uid) { uid = crypto.randomUUID(); sessionStorage.setItem('andin-dev-uid', uid); }
    setIdentity({ uid, name: name.trim().replaceAll(':', '') || 'Petani Uji' });
  };
  if (identity) return <AndinMultiplayer devIdentity={identity} onBack={() => setIdentity(null)} />;
  return <div className="andin-app"><main className="andin-lobby" style={{ maxWidth: 540, paddingTop: '12vh' }}><section className="andin-lobby-panel"><div className="andin-panel-heading"><span className="andin-eyebrow">HANYA UNTUK PENGEMBANGAN LOKAL</span><h2>Uji andin-multiplayer</h2><p>Jalankan npm run game:dev untuk memakai identitas pengujian. Halaman ini tidak tersedia pada build produksi.</p></div><form className="andin-form" onSubmit={start}><label htmlFor="andin-test-name">Nama pemain pengujian</label><input id="andin-test-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={24} required /><button className="andin-primary">Mulai pengujian</button></form></section></main></div>;
}
