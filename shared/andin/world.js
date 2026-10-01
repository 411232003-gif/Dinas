export const MAX_PLAYERS = 5;
export const DAY_START = 360;
export const DAY_END = 1560;
export const SECONDS_PER_MINUTE = 1;
export const RECONNECT_MS = 30000;
export const INTERACT_DISTANCE = 2.3;
export const ROLES = [
  { id: 'ibuk', name: 'Ibuk', color: '#cb667b', hair: '#392923', skin: '#e4ae88' },
  { id: 'bapak', name: 'Bapak', color: '#557d96', hair: '#342823', skin: '#ce956f' },
  { id: 'anak', name: 'Anak', color: '#dfaa43', hair: '#463027', skin: '#e9b28b' },
  { id: 'teman_1', name: 'Teman 1', color: '#759378', hair: '#71462d', skin: '#b77f60' },
  { id: 'teman_2', name: 'Teman 2', color: '#9180af', hair: '#292725', skin: '#edbb99' },
];
export const SEASONS = ['Semi', 'Panas', 'Gugur', 'Dingin'];
export const CROPS = {
  turnip: { name: 'Lobak', season: 0, days: 3, seedPrice: 10, sellPrice: 25, color: '#eee0d0' },
  tomato: { name: 'Tomat', season: 1, days: 4, seedPrice: 20, sellPrice: 50, color: '#d85a48' },
  pumpkin: { name: 'Labu', season: 2, days: 5, seedPrice: 30, sellPrice: 80, color: '#df8a36' },
  daikon: { name: 'Daikon', season: 3, days: 4, seedPrice: 15, sellPrice: 40, color: '#f1eddc' },
};
export const TOOLS = [
  { id: 'hand', name: 'Tangan', key: '1' },
  { id: 'hoe', name: 'Cangkul', key: '2' },
  { id: 'water', name: 'Penyiram', key: '3' },
  { id: 'seed', name: 'Benih', key: '4' },
];

function garden(mapId, x, z, columns, rows) {
  return Array.from({ length: columns * rows }, (_, i) => ({
    id: `${mapId}-${i}`, mapId, x: x + (i % columns) * 1.6, z: z + Math.floor(i / columns) * 1.6,
  }));
}

function cottage(id, x, z, beds = 1) {
  return {
    x, z, width: beds === 5 ? 15 : 9, depth: 10,
    beds: Array.from({ length: beds }, (_, i) => ({ id: `${id}-bed-${i}`, type: 'bed', x: x - (beds - 1) * 1.25 + i * 2.5, z: z - 2.5 })),
    chairs: [{ id: `${id}-chair-0`, type: 'chair', x: x - 2, z: z + 2 }, { id: `${id}-chair-1`, type: 'chair', x: x + 2, z: z + 2 }],
  };
}

export const MAPS = {
  home: {
    id: 'home', name: 'Rumah Keluarga', subtitle: 'Tempat setiap cerita dimulai', ground: '#8caa6d', sky: '#d9e8db', size: 25,
    spawn: { x: 0, z: 1 }, house: cottage('home', -10, -10, 5), plots: garden('home', 3, 2, 6, 6),
    props: [{ id: 'home-bin', type: 'bin', x: 3, z: -4 }, { id: 'home-shop', type: 'shop', x: 12, z: -10 }],
    portals: [
      { id: 'to-willow', name: 'Rumah Teman 1', to: 'willow', x: -22, z: 6, arrival: { x: 19, z: 6 }, distance: 'Jalan setapak · 400 m' },
      { id: 'to-meadow', name: 'Rumah Teman 2', to: 'meadow', x: 22, z: -1, arrival: { x: -19, z: -1 }, distance: 'Jalan desa · 650 m' },
      { id: 'to-highland', name: 'Perkebunan Bukit', to: 'highland', x: 1, z: -22, arrival: { x: 0, z: 20 }, distance: 'Jalur pegunungan · 2,4 km' },
    ],
    pond: { x: -12, z: 13, rx: 5, rz: 3.5 },
  },
  willow: {
    id: 'willow', name: 'Rumah Teman 1', subtitle: 'Pondok teduh di tepi telaga', ground: '#7c9f78', sky: '#cbdedb', size: 25,
    spawn: { x: 19, z: 6 }, house: cottage('willow', -7, -9), plots: garden('willow', 5, -8, 3, 4),
    props: [{ id: 'willow-bin', type: 'bin', x: 2, z: -4 }, { id: 'willow-chair', type: 'chair', x: -6, z: 5 }],
    portals: [{ id: 'willow-home', name: 'Rumah Keluarga', to: 'home', x: 22, z: 6, arrival: { x: -19, z: 6 }, distance: 'Kembali melalui telaga' }],
    pond: { x: -9, z: 12, rx: 7, rz: 4 },
  },
  meadow: {
    id: 'meadow', name: 'Rumah Teman 2', subtitle: 'Kebun bunga di jalan desa', ground: '#a5ad72', sky: '#efe5cb', size: 25,
    spawn: { x: -19, z: -1 }, house: cottage('meadow', 6, -9), plots: garden('meadow', -12, 6, 4, 3),
    props: [{ id: 'meadow-bin', type: 'bin', x: 0, z: 4 }, { id: 'meadow-chair', type: 'chair', x: 10, z: 6 }],
    portals: [{ id: 'meadow-home', name: 'Rumah Keluarga', to: 'home', x: -22, z: -1, arrival: { x: 19, z: -1 }, distance: 'Kembali melalui jalan desa' }],
    pond: { x: 13, z: 14, rx: 4, rz: 3 },
  },
  highland: {
    id: 'highland', name: 'Perkebunan Bukit', subtitle: 'Ladang jauh, hasil yang berlimpah', ground: '#82926a', sky: '#cddce1', size: 30,
    spawn: { x: 0, z: 20 }, house: cottage('highland', -19, -15), plots: garden('highland', -8, -12, 10, 10),
    props: [{ id: 'highland-bin', type: 'bin', x: 12, z: 7 }, { id: 'highland-shop', type: 'shop', x: 17, z: -13 }],
    portals: [{ id: 'highland-home', name: 'Rumah Keluarga', to: 'home', x: 0, z: 24, arrival: { x: 1, z: -19 }, distance: 'Turun bukit · 2,4 km' }],
    pond: { x: -19, z: 12, rx: 5, rz: 6 },
  },
};

export const ALL_PLOTS = Object.values(MAPS).flatMap((map) => map.plots);
export const PLOT_BY_ID = Object.fromEntries(ALL_PLOTS.map((plot) => [plot.id, plot]));
export function calendar(day) {
  return { season: Math.floor(day / 28) % 4, day: day % 28 + 1, year: Math.floor(day / 112) + 1 };
}
export function clockLabel(minute) {
  const value = Math.floor(minute) % 1440;
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}
export function mapObjects(mapId) {
  const map = MAPS[mapId];
  return [...map.house.beds, ...map.house.chairs, ...map.props, ...map.portals.map((portal) => ({ ...portal, type: 'portal' }))];
}
export function nearestTarget(player, includePlots = true) {
  if (!player || !MAPS[player.mapId]) return null;
  const objects = mapObjects(player.mapId);
  if (includePlots) objects.push(...MAPS[player.mapId].plots.map((plot) => ({ ...plot, type: 'plot' })));
  return objects.map((object) => ({ ...object, distance: Math.hypot(player.x - object.x, player.z - object.z) }))
    .filter((object) => object.distance <= INTERACT_DISTANCE)
    .sort((a, b) => a.distance - b.distance)[0] || null;
}
export function isWalkable(mapId, x, z) {
  const map = MAPS[mapId];
  if (!map || !Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x) > map.size - 1 || Math.abs(z) > map.size - 1) return false;
  const pond = map.pond;
  if (((x - pond.x) / (pond.rx + 0.3)) ** 2 + ((z - pond.z) / (pond.rz + 0.3)) ** 2 < 1) return false;
  const house = map.house;
  const hx = Math.abs(x - house.x);
  const hz = z - house.z;
  if (hx < house.width / 2 + 0.3 && Math.abs(hz + house.depth / 2) < 0.45) return false;
  if (Math.abs(hx - house.width / 2) < 0.4 && hz > -house.depth / 2 && hz < house.depth / 2) return false;
  for (const bed of house.beds) {
    if (Math.abs(x - bed.x) < 0.8 && Math.abs(z - bed.z) < 1.4) return false;
  }
  if (Math.abs(x - house.x) < 0.9 && Math.abs(z - (house.z + 1.9)) < 0.65) return false;
  for (const object of [...map.props, ...house.chairs]) {
    if ((object.type === 'bin' || object.type === 'shop') && Math.abs(x - object.x) < (object.type === 'shop' ? 1.7 : 0.85) && Math.abs(z - object.z) < 0.9) return false;
    if (object.type === 'chair' && Math.abs(x - object.x) < 0.5 && Math.abs(z - object.z) < 0.45) return false;
  }
  const fenceStart = map.plots[0];
  const fenceLength = map.id === 'highland' ? 16.5 : map.id === 'home' ? 10 : 6;
  if (x > fenceStart.x - 1.2 && x < fenceStart.x - 1 + fenceLength + 0.2 && Math.abs(z - (fenceStart.z - 1.2)) < 0.23) return false;
  return true;
}
