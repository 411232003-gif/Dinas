import { Component, Suspense, memo, useLayoutEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrthographicCamera } from '@react-three/drei';
import { Color, Object3D, Vector3 } from 'three';
import { CROPS, MAPS, calendar, mapObjects, INTERACT_DISTANCE } from '../../../shared/andin/world';
import PlayerAvatar from './PlayerAvatar';

function Box({ position, size, color, ...props }) {
  return <mesh position={position} castShadow receiveShadow {...props}><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.93} /></mesh>;
}
function Ball({ position, scale, color, radius = 1, ...props }) {
  return <mesh position={position} scale={scale} castShadow {...props}><sphereGeometry args={[radius, 9, 7]} /><meshStandardMaterial color={color} roughness={1} /></mesh>;
}
function Road({ from, to, width = 2.7 }) {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  return <Box position={[(from[0] + to[0]) / 2, 0.016, (from[1] + to[1]) / 2]} size={[width, 0.025, length]} rotation={[0, Math.atan2(to[0] - from[0], to[1] - from[1]), 0]} color="#c3b28b" />;
}
function Forest({ map, season }) {
  const trunks = useRef();
  const leaves = useRef();
  useLayoutEffect(() => {
    const colors = season === 2 ? ['#ae7948', '#bb934b', '#ac6440'] : season === 3 ? ['#a5b1a0', '#879984', '#c5cec2'] : ['#587951', '#638b57', '#74965d'];
    const matrix = new Object3D();
    for (let i = 0; i < 34; i++) {
      const angle = i / 34 * Math.PI * 2;
      const radius = map.size + 1.5 + (i % 3) * 1.6;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const h = 2.8 + (i % 4) * 0.38;
      matrix.position.set(x, h / 2, z);
      matrix.scale.set(1, h, 1);
      matrix.updateMatrix();
      trunks.current.setMatrixAt(i, matrix.matrix);
      for (let j = 0; j < 3; j++) {
        matrix.position.set(x + (j === 1 ? 0.65 : j === 2 ? -0.6 : 0), h + (j === 0 ? 0.15 : -0.15), z + (j === 1 ? 0.2 : j === 2 ? -0.3 : 0));
        matrix.scale.set(j === 0 ? 1.5 : 0.9, j === 0 ? 1.65 : 1.15, j === 0 ? 1.4 : 1);
        matrix.updateMatrix();
        leaves.current.setMatrixAt(i * 3 + j, matrix.matrix);
        leaves.current.setColorAt(i * 3 + j, new Color(colors[(i + j) % 3]));
      }
    }
    trunks.current.instanceMatrix.needsUpdate = true;
    leaves.current.instanceMatrix.needsUpdate = true;
    leaves.current.instanceColor.needsUpdate = true;
    trunks.current.computeBoundingSphere();
    leaves.current.computeBoundingSphere();
  }, [map, season]);
  return <>
    <instancedMesh ref={trunks} args={[null, null, 34]} castShadow><cylinderGeometry args={[0.17, 0.3, 1, 7]} /><meshStandardMaterial color="#715742" roughness={1} /></instancedMesh>
    <instancedMesh ref={leaves} args={[null, null, 102]} castShadow><sphereGeometry args={[1, 9, 7]} /><meshStandardMaterial roughness={1} /></instancedMesh>
  </>;
}
function Fence({ x, z, length, rotation = 0 }) {
  const sections = Math.ceil(length / 2);
  return <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
    {Array.from({ length: sections + 1 }, (_, i) => <Box key={i} position={[i * length / sections, 0.48, 0]} size={[0.14, 0.96, 0.14]} color="#bba079" />)}
    <Box position={[length / 2, 0.34, 0]} size={[length, 0.13, 0.1]} color="#c9b28a" />
    <Box position={[length / 2, 0.7, 0]} size={[length, 0.13, 0.1]} color="#c9b28a" />
  </group>;
}
function Bed({ bed, index }) {
  return <group position={[bed.x, 0, bed.z]}>
    <Box position={[0, 0.28, 0]} size={[1.25, 0.25, 2.25]} color="#8b6343" />
    <Box position={[0, 0.48, 0]} size={[1.18, 0.21, 2.14]} color="#eee3ce" />
    <Box position={[0, 0.6, 0.27]} size={[1.2, 0.09, 1.5]} color={['#a87778', '#6d8d9b', '#c4a562', '#819b80', '#9e8eaa'][index % 5]} />
    <Box position={[0, 0.62, -0.76]} size={[0.86, 0.17, 0.43]} color="#faf2df" />
    <Box position={[0, 0.65, -1.16]} size={[1.36, 1.1, 0.12]} color="#987350" />
    <Box position={[0, 0.32, 1.15]} size={[1.35, 0.63, 0.12]} color="#8b6343" />
    {[-0.48, 0.48].flatMap((x) => [-0.9, 0.9].map((z) => <Box key={`${x}-${z}`} position={[x, 0.13, z]} size={[0.12, 0.26, 0.12]} color="#694d35" />))}
  </group>;
}
function Chair({ item }) {
  return <group position={[item.x, 0, item.z]}>
    <Box position={[0, 0.58, 0]} size={[0.74, 0.12, 0.68]} color="#b59165" />
    {[-0.27, 0.27].flatMap((x) => [-0.23, 0.23].map((z) => <Box key={`${x}-${z}`} position={[x, 0.27, z]} size={[0.09, 0.54, 0.09]} color="#896640" />))}
    {[-0.28, 0.28].map((x) => <Box key={x} position={[x, 0.98, -0.28]} size={[0.09, 0.8, 0.09]} color="#896640" />)}
    <Box position={[0, 1.26, -0.28]} size={[0.65, 0.22, 0.09]} color="#b59165" />
    <Box position={[0, 0.98, -0.28]} size={[0.62, 0.11, 0.08]} color="#a98056" />
  </group>;
}
function House({ map }) {
  const house = map.house;
  const wall = map.id === 'willow' ? '#b5c0a4' : map.id === 'meadow' ? '#dfc0a0' : '#d4c7aa';
  return <>
    <group position={[house.x, 0, house.z]}>
      <Box position={[0, 0.045, 0]} size={[house.width, 0.09, house.depth]} color="#ba9b71" />
      {Array.from({ length: Math.ceil(house.width / 0.75) }, (_, i) => <Box key={i} position={[-house.width / 2 + i * 0.75, 0.097, 0]} size={[0.022, 0.008, house.depth]} color="#a98a64" />)}
      <Box position={[0, 1.45, -house.depth / 2]} size={[house.width, 2.9, 0.2]} color={wall} />
      <Box position={[-house.width / 2, 1.45, 0]} size={[0.2, 2.9, house.depth]} color={wall} />
      <Box position={[house.width / 2, 0.47, 0]} size={[0.2, 0.94, house.depth]} color={wall} />
      <Box position={[0, 0.22, -house.depth / 2 + 0.12]} size={[house.width, 0.18, 0.08]} color="#815f44" />
      <Box position={[0, 2.72, -house.depth / 2 + 0.03]} size={[house.width, 0.18, 0.26]} color="#795b42" />
      <Box position={[0, 3.0, -house.depth / 2 + 0.48]} size={[house.width + 0.6, 0.18, 1.7]} rotation={[0.23, 0, 0]} color="#8d6658" />
      {[-house.width / 3, house.width / 3].map((x) => <group key={x} position={[x, 1.94, -house.depth / 2 + 0.13]}>
        <Box size={[1.2, 1.0, 0.12]} color="#795f44" />
        <Box position={[0, 0, 0.075]} size={[1.02, 0.8, 0.04]} color="#abcdd0" />
        <Box position={[0, 0, 0.12]} size={[0.055, 0.8, 0.06]} color="#f1e6cf" />
        <Box position={[0, 0, 0.12]} size={[1.02, 0.055, 0.06]} color="#f1e6cf" />
      </group>)}
      <Box position={[0, 0.115, 2]} size={[2.5, 0.025, 2.2]} color="#9b9d7e" />
      <Box position={[0, 0.9, 1.9]} size={[1.35, 0.12, 0.9]} color="#966e4b" />
      {[-0.48, 0.48].flatMap((x) => [1.6, 2.2].map((z) => <Box key={`${x}-${z}`} position={[x, 0.48, z]} size={[0.1, 0.85, 0.1]} color="#795438" />))}
      <mesh position={[0, 1.06, 1.9]}><cylinderGeometry args={[0.13, 0.1, 0.2, 8]} /><meshStandardMaterial color="#e2d3b8" /></mesh>
      <Ball position={[0, 1.3, 1.9]} scale={[0.18, 0.24, 0.18]} color="#779868" />
      <Box position={[-house.width / 2 + 0.5, 0.8, 2.2]} size={[0.7, 1.6, 2]} color="#8b7253" />
      {[0.45, 0.9, 1.35].map((y) => <Box key={y} position={[-house.width / 2 + 0.07, y, 2.2]} size={[0.025, 0.055, 1.8]} color="#e5d5b8" />)}
    </group>
    {house.beds.map((bed, i) => <Bed key={bed.id} bed={bed} index={i} />)}
    {house.chairs.map((item) => <Chair key={item.id} item={item} />)}
  </>;
}
function ShippingBin({ item }) {
  return <group position={[item.x, 0, item.z]}>
    <Box position={[0, 0.55, 0]} size={[1.4, 1.1, 1.1]} color="#9f7951" />
    <Box position={[0, 1.13, 0]} size={[1.56, 0.13, 1.24]} color="#be9b65" />
    <Box position={[0, 1.205, 0]} size={[0.9, 0.02, 0.3]} color="#483e30" />
    {[-0.48, 0.48].map((x) => <Box key={x} position={[x, 0.56, 0.56]} size={[0.09, 1.05, 0.03]} color="#696f59" />)}
    <Box position={[0, 0.66, 0.574]} size={[0.52, 0.38, 0.045]} color="#e4d4ad" />
  </group>;
}
function Shop({ item }) {
  return <group position={[item.x, 0, item.z]}>
    <Box position={[0, 0.48, 0]} size={[2.9, 0.95, 1.35]} color="#a77d50" />
    <Box position={[0, 1.0, 0]} size={[3.1, 0.12, 1.55]} color="#d0ae7a" />
    {[-1.3, 1.3].map((x) => <Box key={x} position={[x, 1.4, -0.5]} size={[0.13, 2.8, 0.13]} color="#876746" />)}
    {[-1, 0, 1].map((i) => <Box key={i} position={[i, 2.65, 0]} size={[1.02, 0.13, 2.15]} rotation={[0.16, 0, 0]} color={i === 0 ? '#dfd7b5' : '#73936c'} />)}
    {[-0.9, 0, 0.9].map((x, i) => <group key={x}><Box position={[x, 1.2, 0]} size={[0.64, 0.34, 0.7]} color="#9b6a3e" /><Ball position={[x, 1.42, 0]} scale={[0.25, 0.18, 0.25]} color={['#decbb0', '#d07847', '#789447'][i]} /></group>)}
  </group>;
}
function Pond({ pond, season }) {
  const water = useRef();
  useFrame(({ clock }) => { if (water.current) water.current.opacity = 0.84 + Math.sin(clock.elapsedTime * 0.8) * 0.035; });
  return <group position={[pond.x, 0.035, pond.z]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[pond.rx + 0.4, pond.rz + 0.4, 1]} receiveShadow><circleGeometry args={[1, 40]} /><meshStandardMaterial color="#b5b29b" /></mesh>
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[pond.rx, pond.rz, 1]}><circleGeometry args={[1, 40]} /><meshStandardMaterial ref={water} color={season === 3 ? '#b8d1d3' : '#6aabb0'} roughness={0.25} metalness={0.25} transparent opacity={0.88} /></mesh>
    {[0, 1, 2].map((i) => <mesh key={i} position={[-pond.rx * 0.4 + i * 0.8, 0.045, -0.3 + i * 0.6]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.25, 9]} /><meshStandardMaterial color="#6b905b" /></mesh>)}
    {Array.from({ length: 10 }, (_, i) => <Ball key={i} position={[Math.cos(i * 1.7) * (pond.rx + 0.4), 0.16, Math.sin(i * 1.7) * (pond.rz + 0.4)]} scale={[0.4, 0.25, 0.35]} color="#a2a398" />)}
  </group>;
}
function Crop({ data }) {
  const crop = CROPS[data.crop];
  if (!crop) return null;
  const grown = data.growth / crop.days;
  const mature = grown >= 1;
  const leaf = data.withered ? '#9b8054' : '#648b49';
  const height = 0.15 + grown * 0.55;
  return <group>
    <Box position={[0, height / 2, 0]} size={[0.045, height, 0.045]} color={leaf} />
    {[-1, 1].map((side) => <Ball key={side} position={[side * (0.12 + grown * 0.11), height * 0.7, 0]} scale={[0.22 + grown * 0.12, 0.055, 0.12 + grown * 0.05]} rotation={[0, side * 0.35, side * 0.4]} color={leaf} />)}
    {mature && !data.withered && <Ball position={[0, crop.name === 'Tomat' ? height * 0.7 : 0.17, 0.05]} scale={data.crop === 'daikon' ? [0.13, 0.3, 0.13] : [0.25, 0.23, 0.25]} color={crop.color} />}
    {data.crop === 'tomato' && grown > 0.3 && <Box position={[0.12, 0.5, -0.08]} size={[0.045, 1, 0.045]} color="#ac8c58" />}
  </group>;
}
function FarmPlot({ plot, data, selected, day, onTarget }) {
  const watered = data?.wateredDay === day;
  return <group position={[plot.x, 0.035, plot.z]} onPointerDown={(event) => { event.stopPropagation(); onTarget({ ...plot, type: 'plot' }); }}>
    <Box position={[0, 0, 0]} size={[1.46, 0.055, 1.46]} color={data?.tilled ? watered ? '#684d38' : '#92704a' : '#a59465'} />
    {data?.tilled && [-0.44, 0, 0.44].map((z) => <Box key={z} position={[0, 0.055, z]} size={[1.35, 0.065, 0.13]} color={watered ? '#795c42' : '#aa8256'} />)}
    {data?.crop && <group position={[0, 0.1, 0]}><Crop data={data} /></group>}
    {selected && <mesh position={[0, 0.105, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.63, 0.71, 4, 1, Math.PI / 4]} /><meshBasicMaterial color="#f8e4a7" transparent opacity={0.95} depthWrite={false} /></mesh>}
  </group>;
}
function Portal({ portal }) {
  return <group position={[portal.x, 0, portal.z]}>
    <mesh position={[0, 0.065, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.9, 1.05, 36]} /><meshBasicMaterial color="#e5d4a2" /></mesh>
    <Box position={[1.15, 0.8, 0]} size={[0.13, 1.6, 0.13]} color="#896e46" />
    <Box position={[1.15, 1.45, 0]} size={[1.1, 0.5, 0.12]} color="#c0a273" />
  </group>;
}
function CameraRig({ player, zoom }) {
  const size = useThree((state) => state.size);
  const camera = useRef();
  const look = useRef(new Vector3(player.x, 0.4, player.z));
  useFrame((_, delta) => {
    if (!camera.current) return;
    const blend = 1 - Math.exp(-5 * delta);
    look.current.lerp(new Vector3(player.x, 0.4, player.z), blend);
    camera.current.position.set(look.current.x + 12, 20, look.current.z + 16);
    camera.current.lookAt(look.current);
  });
  return <OrthographicCamera ref={camera} makeDefault position={[player.x + 12, 20, player.z + 16]} zoom={Math.max(20, Math.min(size.width, size.height) / 17) * zoom} near={0.1} far={150} />;
}
const Environment = memo(function Environment({ map, season }) {
  const colors = [map.ground, '#91a064', '#b0a071', '#d0d6c7'];
  return <>
    <Box position={[0, -0.38, 0]} size={[map.size * 2 + 8, 0.72, map.size * 2 + 8]} color={colors[season]} />
    <Road from={[0, 1]} to={[map.house.x, map.house.z + 5.8]} />
    {map.portals.map((portal) => <Road key={portal.id} from={[0, 1]} to={[portal.x, portal.z]} />)}
    <House map={map} />
    <Pond pond={map.pond} season={season} />
    <Forest map={map} season={season} />
    {Array.from({ length: 14 }, (_, i) => <group key={i} position={[Math.sin(i * 6.3) * (map.size - 3), 0, map.size - 4 - i % 3]}>
      <Ball position={[0, 0.16, 0]} scale={[0.6, 0.24, 0.4]} color={season === 3 ? '#e0e2d5' : '#79965d'} />
      {[0, 1, 2].map((j) => <Ball key={j} position={[j * 0.18 - 0.2, 0.4, (j % 2) * 0.2]} radius={0.075} color={map.id === 'meadow' ? '#dd9a8d' : '#e1cea0'} />)}
    </group>)}
    <Fence x={map.plots[0].x - 1} z={map.plots[0].z - 1.2} length={map.id === 'highland' ? 16.5 : map.id === 'home' ? 10 : 6} />
    {map.props.map((item) => item.type === 'bin' ? <ShippingBin key={item.id} item={item} /> : item.type === 'shop' ? <Shop key={item.id} item={item} /> : <Chair key={item.id} item={item} />)}
    {map.portals.map((portal) => <Portal key={portal.id} portal={portal} />)}
    {map.id === 'highland' && [-1, 1].map((side) => <mesh key={side} position={[side * 37, 3, -29]} castShadow><coneGeometry args={[15, 21, 5]} /><meshStandardMaterial color="#9ba798" roughness={1} /></mesh>)}
  </>;
});

function RenderBudget({ lowQuality }) {
  const elapsed = useRef(0);
  useFrame(({ gl, scene, camera }, delta) => {
    elapsed.current += delta;
    if (elapsed.current < 1 / (lowQuality ? 30 : 60)) return;
    elapsed.current = 0;
    gl.render(scene, camera);
  }, 1);
  return null;
}

class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div className="andin-scene-error"><h2>Grafis 3D tidak dapat dimuat</h2><p>Aktifkan akselerasi grafis atau gunakan browser yang mendukung WebGL. Progres kebun tetap tersimpan.</p><button onClick={this.props.onBack}>Kembali ke lobby</button></div>;
    return this.props.children;
  }
}

export default function FarmScene({ world, player, inputRef, selected, onTarget, zoom, lowQuality, paused, onBack }) {
  const map = MAPS[player.mapId];
  const season = calendar(world.day).season;
  const night = world.minute >= 1140;
  return <SceneBoundary onBack={onBack}>
    <Canvas frameloop={paused ? 'never' : 'always'} shadows={!lowQuality} dpr={lowQuality ? 1 : [1, 1.5]} gl={{ antialias: !lowQuality, powerPreference: 'high-performance' }} fallback={<div className="andin-scene-error">Perangkat ini belum mendukung WebGL.</div>}>
      <color attach="background" args={[night ? '#293a49' : map.sky]} />
      <fog attach="fog" args={[night ? '#293a49' : map.sky, 45, 100]} />
      <hemisphereLight args={[night ? '#a8bed4' : '#fff3d8', '#647451', night ? 1.0 : 1.7]} />
      <directionalLight position={[-15, 25, 12]} intensity={night ? 0.5 : 2.3} color={night ? '#acbdde' : '#ffe8bd'} castShadow={!lowQuality} shadow-mapSize={[1024, 1024]} shadow-camera-left={-35} shadow-camera-right={35} shadow-camera-top={35} shadow-camera-bottom={-35} shadow-normalBias={0.045} />
      <Suspense fallback={null}>
        <Environment key={`${map.id}-${season}`} map={map} season={season} />
        {map.plots.map((plot) => <FarmPlot key={plot.id} plot={plot} data={world.plots?.[plot.id]} selected={selected?.id === plot.id} day={world.day} onTarget={onTarget} />)}
        {world.players.filter((item) => item.online && item.mapId === player.mapId).map((item) => <PlayerAvatar key={`${item.uid}-${item.mapId}`} player={item} local={item.uid === player.uid} inputRef={inputRef} />)}
        {mapObjects(player.mapId).filter((item) => Math.hypot(player.x - item.x, player.z - item.z) < 7).map((item) => (
          <Html key={item.id} position={[item.x, item.type === 'shop' ? 3.15 : item.type === 'portal' ? 2.5 : 1.75, item.z]} center zIndexRange={[20, 0]}>
            <button className={`andin-world-label ${Math.hypot(player.x - item.x, player.z - item.z) <= INTERACT_DISTANCE ? 'is-near' : ''}`} onClick={() => onTarget({ ...item, mapId: player.mapId })}>
              {item.type === 'portal' ? item.name : item.type === 'bed' ? 'Kasur' : item.type === 'chair' ? 'Duduk' : item.type === 'bin' ? 'Kotak penjualan' : 'Kios benih'}
            </button>
          </Html>
        ))}
        <CameraRig key={player.mapId} player={player} zoom={zoom} />
        <RenderBudget lowQuality={lowQuality} />
      </Suspense>
    </Canvas>
  </SceneBoundary>;
}
