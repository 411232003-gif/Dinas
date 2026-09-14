import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Billboard, Text, Html, useTexture, useGLTF, Clone } from '@react-three/drei';
import * as THREE from 'three';
import { auth, db } from '../firebase/config';
import { collection, doc, setDoc, deleteDoc, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { ArrowLeft, Users, Send, Armchair } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const WORLD_RADIUS = 20;
const SPEED = 4.5;
const SPOT_POS = [0, 0, -6];
const SPOT_RADIUS = 2.4;
const CHAT_RANGE = 6;
const HOUSE_POS = [-9, 0, -11];
const BED_POS = [-9, 0, -12.4];
const POND_POS = [9, 0, 8];

const PLAYER_COLORS = ['#f06595', '#9775fa', '#4dabf7', '#ffd43b'];
const SPRITES = {
  bapak: encodeURI(
    '/Gemini_Generated_Image_20oa6s20oa6s20oa-removebg-preview (3).png'
  ),
  ibuk: encodeURI(
    '/Gemini_Generated_Image_20oa6s20oa6s20oa-removebg-preview (2).png'
  ),
};
const CHILD_DOC_ID = '_child';
const CHILD_GLB = '/Meshy_AI_Chibi_Figure_0914125106_texture.glb';

let heartGeo = null;
function getHeartGeometry() {
  if (!heartGeo) {
    const s = new THREE.Shape();
    s.moveTo(0.5, 0.5);
    s.bezierCurveTo(0.5, 0.5, 0.4, 0, 0, 0);
    s.bezierCurveTo(-0.6, 0, -0.6, 0.7, -0.6, 0.7);
    s.bezierCurveTo(-0.6, 1.1, -0.3, 1.54, 0.5, 1.9);
    s.bezierCurveTo(1.2, 1.54, 1.6, 1.1, 1.6, 0.7);
    s.bezierCurveTo(1.6, 0.7, 1.6, 0, 1.0, 0);
    s.bezierCurveTo(0.7, 0, 0.5, 0.5, 0.5, 0.5);
    heartGeo = new THREE.ExtrudeGeometry(s, {
      depth: 0.35,
      bevelEnabled: true,
      bevelSize: 0.12,
      bevelThickness: 0.12,
      bevelSegments: 2,
    });
    heartGeo.center();
    heartGeo.rotateZ(Math.PI);
  }
  return heartGeo;
}

function ChatBubble({ text }) {
  return (
    <Html position={[0, 2.65, 0]} center distanceFactor={9} zIndexRange={[20, 0]}>
      <div className="px-3 py-1.5 rounded-2xl bg-white/90 text-pink-700 text-xs font-medium shadow-lg whitespace-nowrap max-w-[180px] truncate pointer-events-none">
        {text}
      </div>
    </Html>
  );
}

function PrimitiveFigure({ color }) {
  return (
    <group>
      <mesh position={[0, 0.55, 0]} castShadow>
        <capsuleGeometry args={[0.32, 0.55, 8, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 1.18, 0]} castShadow>
        <sphereGeometry args={[0.27, 24, 24]} />
        <meshStandardMaterial color="#fff0f5" />
      </mesh>
      <mesh position={[0, 1.55, 0]} scale={0.16}>
        <primitive object={getHeartGeometry()} attach="geometry" />
        <meshStandardMaterial color="#e0457b" />
      </mesh>
    </group>
  );
}

function SpriteFigure({ sprite }) {
  const tex = useTexture(sprite);
  const aspect = tex.image ? tex.image.width / tex.image.height : 0.7;
  return (
    <Billboard>
      <mesh position={[0, 0.95, 0]}>
        <planeGeometry args={[1.9 * aspect, 1.9]} />
        <meshBasicMaterial
          map={tex}
          transparent
          alphaTest={0.05}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </Billboard>
  );
}

function KidFigure() {
  return (
    <group>
      <mesh position={[0, 0.3, 0]} castShadow>
        <capsuleGeometry args={[0.19, 0.28, 8, 16]} />
        <meshStandardMaterial color="#ffd43b" />
      </mesh>
      <mesh position={[0, 0.68, 0]} castShadow>
        <sphereGeometry args={[0.21, 20, 20]} />
        <meshStandardMaterial color="#ffe9d6" />
      </mesh>
      <mesh position={[0, 0.78, 0]} scale={[1.02, 0.6, 1.02]}>
        <sphereGeometry args={[0.21, 20, 20]} />
        <meshStandardMaterial color="#5c3a21" />
      </mesh>
      <mesh position={[0, 1.0, 0]} scale={0.09}>
        <primitive object={getHeartGeometry()} attach="geometry" />
        <meshStandardMaterial color="#e0457b" />
      </mesh>
    </group>
  );
}

function Avatar({ color, name, bubble, figure, visualRef }) {
  return (
    <group>
      <group ref={visualRef}>
        {figure?.type === 'sprite' ? (
          <Suspense fallback={<PrimitiveFigure color={color} />}>
            <SpriteFigure sprite={figure.url} />
          </Suspense>
        ) : figure?.type === 'kid' ? (
          <Suspense fallback={<KidFigure />}>
            <ModelBoundary fallback={<KidFigure />}>
              <KidModel />
            </ModelBoundary>
          </Suspense>
        ) : (
          <PrimitiveFigure color={color} />
        )}
      </group>
      <Billboard position={[0, 2.15, 0]}>
        <Text
          fontSize={0.26}
          color="#8a3b5e"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.025}
          outlineColor="#ffffff"
        >
          {name}
        </Text>
      </Billboard>
      {bubble && <ChatBubble text={bubble} />}
    </group>
  );
}

function animateFigure(visual, { moving, act, t, delta }) {
  if (!visual) return;
  const lerp = (v, target, speed = 8) =>
    v + (target - v) * Math.min(1, delta * speed);

  if (act === 'sleep') {
    visual.position.y = lerp(visual.position.y, -0.5);
    visual.scale.y = lerp(visual.scale.y, 0.85);
    visual.rotation.z = lerp(visual.rotation.z, 1.35, 6);
    return;
  }
  if (act === 'sit' || act === 'fish') {
    visual.position.y = lerp(visual.position.y, -0.55);
    visual.scale.y = lerp(visual.scale.y, 0.7);
    visual.rotation.z = lerp(visual.rotation.z, act === 'fish' ? 0.2 : 0);
    return;
  }
  visual.scale.y = lerp(visual.scale.y, 1);
  if (moving) {
    visual.position.y = Math.abs(Math.sin(t * 10)) * 0.12;
    visual.rotation.z = Math.sin(t * 10) * 0.05;
  } else {
    visual.position.y *= 0.9;
    visual.rotation.z *= 0.9;
  }
}

function LocalPlayer({ color, name, figure, keyRef, joyRef, posRef, camRef, bubble }) {
  const ref = useRef();
  const visualRef = useRef();

  useFrame(({ camera, clock }, delta) => {
    const dx = keyRef.current.x + joyRef.current.x;
    const dz = keyRef.current.y + joyRef.current.y;
    const len = Math.hypot(dx, dz);
    const p = posRef.current;

    if (!p.act && len > 0.01) {
      const nx = len > 1 ? dx / len : dx;
      const nz = len > 1 ? dz / len : dz;
      p.x += nx * SPEED * delta;
      p.z += nz * SPEED * delta;

      const target = Math.atan2(nx, nz);
      let diff = target - p.ry;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      p.ry += diff * Math.min(1, delta * 10);
    }

    const r = Math.hypot(p.x, p.z);
    if (r > WORLD_RADIUS) {
      p.x *= WORLD_RADIUS / r;
      p.z *= WORLD_RADIUS / r;
    }

    ref.current.position.set(p.x, 0, p.z);
    ref.current.rotation.y = p.ry;
    animateFigure(visualRef.current, {
      moving: !p.act && len > 0.01,
      act: p.act,
      t: clock.getElapsedTime(),
      delta,
    });

    const yaw = camRef.current.yaw;
    const camH = 7.5 + camRef.current.pitch * 4;
    camera.position.lerp(
      new THREE.Vector3(
        p.x + Math.sin(yaw) * 9.5,
        camH,
        p.z + Math.cos(yaw) * 9.5
      ),
      Math.min(1, delta * 3)
    );
    camera.lookAt(p.x, 0.8, p.z);
  });

  return (
    <group ref={ref}>
      <Avatar
        color={color}
        name={name}
        figure={figure}
        bubble={bubble}
        visualRef={visualRef}
      />
    </group>
  );
}

function RemotePlayer({ data, posRef }) {
  const ref = useRef();
  const visualRef = useRef();
  const target = useRef(new THREE.Vector3(data.x, 0, data.z));

  useEffect(() => {
    target.current.set(data.x, 0, data.z);
  }, [data.x, data.z]);

  useFrame(({ clock }, delta) => {
    const moving = target.current.distanceTo(ref.current.position) > 0.15;
    ref.current.position.lerp(target.current, Math.min(1, delta * 8));
    if (typeof data.ry === 'number') ref.current.rotation.y = data.ry;
    animateFigure(visualRef.current, {
      moving: moving && !data.act,
      act: data.act,
      t: clock.getElapsedTime(),
      delta,
    });
  });

  const fresh = data.msg && Date.now() - (data.msgT || 0) < 6000;
  const near =
    Math.hypot(data.x - posRef.current.x, data.z - posRef.current.z) < CHAT_RANGE;

  const figure =
    data.avatar === 'anak'
      ? { type: 'kid' }
      : SPRITES[data.avatar]
        ? { type: 'sprite', url: SPRITES[data.avatar] }
        : null;

  return (
    <group ref={ref} position={[data.x, 0, data.z]}>
      <Avatar
        color={data.color || '#f06595'}
        name={data.name || '???'}
        figure={figure}
        bubble={fresh && near ? data.msg : null}
        visualRef={visualRef}
      />
    </group>
  );
}

class ModelBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function KidModel() {
  const { scene, animations } = useGLTF(CHILD_GLB);
  const ref = useRef();
  const mixerRef = useRef(null);
  const { scale, offset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const s = size.y > 0 ? 0.6 / size.y : 1;
    return {
      scale: s,
      offset: [-center.x * s, -box.min.y * s, -center.z * s],
    };
  }, [scene]);

  useEffect(() => {
    if (animations?.length && ref.current) {
      mixerRef.current = new THREE.AnimationMixer(ref.current);
      mixerRef.current.clipAction(animations[0]).play();
      return () => mixerRef.current?.stopAllAction();
    }
  }, [animations]);

  useFrame((_, delta) => mixerRef.current?.update(delta));

  return (
    <group scale={scale} position={offset}>
      <Clone ref={ref} object={scene} castShadow receiveShadow />
    </group>
  );
}

function ChildNPC({ uid, posRef, playersRef, childRef, childData, writeRef }) {
  const ref = useRef();
  const inner = useRef();
  const target = useRef(new THREE.Vector3());
  const lastWrite = useRef(0);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const ids = [uid, ...Object.keys(playersRef.current)].sort();
    const isHost = uid === ids[0];
    const c = childRef.current;

    if (isHost) {
      // Simulasikan: anak mengikuti pemain terdekat
      let best = null;
      let bd = Infinity;
      const consider = (x, z) => {
        const d = Math.hypot(x - c.x, z - c.z);
        if (d < bd) {
          bd = d;
          best = [x, z];
        }
      };
      consider(posRef.current.x, posRef.current.z);
      Object.values(playersRef.current).forEach((p) => consider(p.x, p.z));

      if (best && bd > 1.1) {
        const speed = bd > 6 ? 7 : 3.2;
        const nx = (best[0] - c.x) / bd;
        const nz = (best[1] - c.z) / bd;
        c.x += nx * speed * delta;
        c.z += nz * speed * delta;
        c.ry = Math.atan2(nx, nz);
      }
      if (t - lastWrite.current > 0.25) {
        lastWrite.current = t;
        writeRef.current(c.x, c.z, c.ry);
      }
    }

    const src = isHost ? c : childData;
    if (src) {
      target.current.set(src.x, 0, src.z);
      const moving = target.current.distanceTo(ref.current.position) > 0.15;
      ref.current.position.lerp(target.current, Math.min(1, delta * 8));
      if (typeof src.ry === 'number') ref.current.rotation.y = src.ry;
      if (inner.current) {
        inner.current.position.y = moving
          ? Math.abs(Math.sin(t * 12)) * 0.08
          : inner.current.position.y * 0.9;
      }
    }
  });

  return (
    <group ref={ref} position={[childRef.current.x, 0, childRef.current.z]}>
      <group ref={inner}>
        <Suspense fallback={<KidFigure />}>
          <ModelBoundary fallback={<KidFigure />}>
            <KidModel />
          </ModelBoundary>
        </Suspense>
      </group>
      <Billboard position={[0, 0.85, 0]}>
        <Text
          fontSize={0.2}
          color="#b0771f"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.025}
          outlineColor="#ffffff"
        >
          Anak
        </Text>
      </Billboard>
    </group>
  );
}

function PhotoSpot() {
  const ring = useRef();

  useFrame(({ clock }) => {
    const s = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.08;
    ring.current.scale.set(s, s, s);
  });

  return (
    <group position={SPOT_POS}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[SPOT_RADIUS - 0.35, SPOT_RADIUS, 48]} />
        <meshStandardMaterial
          color="#e0457b"
          emissive="#e0457b"
          emissiveIntensity={0.6}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[SPOT_RADIUS - 0.35, 48]} />
        <meshStandardMaterial color="#ffb3d1" transparent opacity={0.5} />
      </mesh>
      <Billboard position={[0, 2.2, 0]}>
        <Text
          fontSize={0.32}
          color="#e0457b"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#ffffff"
        >
          Photo Spot
        </Text>
      </Billboard>
      <mesh position={[0, 1.4, 0]} scale={0.18}>
        <primitive object={getHeartGeometry()} attach="geometry" />
        <meshStandardMaterial
          color="#e0457b"
          emissive="#e0457b"
          emissiveIntensity={0.4}
        />
      </mesh>
    </group>
  );
}

function SpotTrigger({ posRef, playersRef, onMoment }) {
  const cooldown = useRef(0);

  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    if (now < cooldown.current) return;
    const p = posRef.current;
    const meIn =
      Math.hypot(p.x - SPOT_POS[0], p.z - SPOT_POS[2]) < SPOT_RADIUS;
    if (!meIn) return;
    const partner = Object.entries(playersRef.current).find(
      ([, d]) =>
        Math.hypot(d.x - SPOT_POS[0], d.z - SPOT_POS[2]) < SPOT_RADIUS
    );
    if (partner) {
      cooldown.current = now + 30;
      onMoment(partner[0], partner[1]);
    }
  });

  return null;
}

function Tree({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 1.2, 8]} />
        <meshStandardMaterial color="#b08968" />
      </mesh>
      <mesh position={[0, 1.6, 0]} castShadow>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshStandardMaterial color="#ff9ec6" />
      </mesh>
      <mesh position={[0, 2.4, 0]} scale={0.12}>
        <primitive object={getHeartGeometry()} attach="geometry" />
        <meshStandardMaterial color="#e0457b" />
      </mesh>
    </group>
  );
}

function FloatingHearts() {
  const group = useRef();
  const hearts = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        pos: [
          (Math.random() - 0.5) * 22,
          2.5 + Math.random() * 4,
          (Math.random() - 0.5) * 22,
        ],
        scale: 0.1 + Math.random() * 0.12,
        speed: 0.5 + Math.random() * 0.8,
        phase: i * 1.3,
      })),
    []
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    group.current.children.forEach((child, i) => {
      const h = hearts[i];
      child.position.y = h.pos[1] + Math.sin(t * h.speed + h.phase) * 0.4;
      child.rotation.y = t * h.speed + h.phase;
    });
  });

  return (
    <group ref={group}>
      {hearts.map((h, i) => (
        <mesh key={i} position={h.pos} scale={h.scale}>
          <primitive object={getHeartGeometry()} attach="geometry" />
          <meshStandardMaterial
            color={i % 2 ? '#f783ac' : '#e0457b'}
            emissive="#e0457b"
            emissiveIntensity={0.15}
          />
        </mesh>
      ))}
    </group>
  );
}

function House({ position }) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <planeGeometry args={[6.4, 5.4]} />
        <meshStandardMaterial color="#f3e5d8" />
      </mesh>
      <mesh position={[0, 1.5, -2.6]} castShadow>
        <boxGeometry args={[6.4, 3, 0.2]} />
        <meshStandardMaterial color="#fff5f8" />
      </mesh>
      <mesh position={[-3.1, 1.5, 0]} castShadow>
        <boxGeometry args={[0.2, 3, 5.4]} />
        <meshStandardMaterial color="#fff5f8" />
      </mesh>
      <mesh position={[3.1, 1.5, 0]} castShadow>
        <boxGeometry args={[0.2, 3, 5.4]} />
        <meshStandardMaterial color="#fff5f8" />
      </mesh>
      <mesh position={[0, 4, -0.2]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[5, 2.2, 4]} />
        <meshStandardMaterial color="#e0457b" />
      </mesh>
      <Billboard position={[0, 4.8, 0]}>
        <Text
          fontSize={0.4}
          color="#e0457b"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#ffffff"
        >
          Rumah Kita
        </Text>
      </Billboard>
    </group>
  );
}

function Bed({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[1.5, 0.3, 2.3]} />
        <meshStandardMaterial color="#b08968" />
      </mesh>
      <mesh position={[0, 0.38, 0]}>
        <boxGeometry args={[1.35, 0.18, 2.1]} />
        <meshStandardMaterial color="#fff0f5" />
      </mesh>
      <mesh position={[0, 0.5, -0.7]}>
        <boxGeometry args={[0.7, 0.14, 0.5]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0.48, 0.5]}>
        <boxGeometry args={[1.35, 0.08, 1.1]} />
        <meshStandardMaterial color="#f783ac" />
      </mesh>
    </group>
  );
}

function TV({ position }) {
  const screen = useRef();
  const hue = useRef(0);

  useFrame((_, delta) => {
    hue.current = (hue.current + delta * 0.15) % 1;
    screen.current.material.color.setHSL(hue.current, 0.6, 0.65);
    screen.current.material.emissive.setHSL(hue.current, 0.6, 0.45);
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.3, 0.8, 1.1]} />
        <meshStandardMaterial color="#8a6d52" />
      </mesh>
      <mesh position={[0.05, 1.35, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[1.8, 1.05, 0.1]} />
        <meshStandardMaterial color="#2b2b2b" />
      </mesh>
      <mesh ref={screen} position={[0.11, 1.35, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.6, 0.85]} />
        <meshStandardMaterial color="#a3d8ff" emissive="#a3d8ff" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

function Bench({ position, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[1.6, 0.1, 0.5]} />
        <meshStandardMaterial color="#b08968" />
      </mesh>
      <mesh position={[0, 0.75, -0.22]} castShadow>
        <boxGeometry args={[1.6, 0.5, 0.08]} />
        <meshStandardMaterial color="#b08968" />
      </mesh>
      {[-0.65, 0.65].map((x) => (
        <mesh key={x} position={[x, 0.2, 0]}>
          <boxGeometry args={[0.1, 0.45, 0.45]} />
          <meshStandardMaterial color="#8a6d52" />
        </mesh>
      ))}
    </group>
  );
}

function Pond({ position }) {
  const water = useRef();

  useFrame(({ clock }) => {
    const s = 1 + Math.sin(clock.getElapsedTime() * 1.5) * 0.02;
    water.current.scale.set(s, s, 1);
  });

  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[3.4, 40]} />
        <meshStandardMaterial color="#f3d9a4" />
      </mesh>
      <mesh ref={water} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[2.8, 40]} />
        <meshStandardMaterial
          color="#7ec8f7"
          transparent
          opacity={0.85}
          emissive="#4dabf7"
          emissiveIntensity={0.15}
        />
      </mesh>
      <mesh position={[0, 0.1, -3]} castShadow>
        <boxGeometry args={[1.2, 0.15, 2]} />
        <meshStandardMaterial color="#b08968" />
      </mesh>
      <Billboard position={[0, 1.6, 0]}>
        <Text
          fontSize={0.32}
          color="#1971c2"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#ffffff"
        >
          Kolam Pancing
        </Text>
      </Billboard>
    </group>
  );
}

function Scenery() {
  const trees = useMemo(
    () => [
      [-15, 0, 5],
      [15, 0, -5],
      [-16, 0, -4],
      [14, 0, 13],
      [2, 0, 16],
      [-5, 0, -16],
      [16, 0, 2],
      [-17, 0, -12],
      [6, 0, -14],
      [-13, 0, 12],
    ],
    []
  );
  const flowers = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        pos: [
          (Math.sin(i * 3.7) * 0.5 + 0.5) * 34 - 17,
          0,
          (Math.cos(i * 5.3) * 0.5 + 0.5) * 34 - 17,
        ],
        color: ['#f06595', '#ffd43b', '#9775fa', '#ff8787'][i % 4],
      })),
    []
  );

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[WORLD_RADIUS + 2, 64]} />
        <meshStandardMaterial color="#ffd1e3" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[WORLD_RADIUS, WORLD_RADIUS + 2, 64]} />
        <meshStandardMaterial color="#f783ac" />
      </mesh>
      {trees.map((t, i) => (
        <Tree key={i} position={t} />
      ))}
      {flowers.map((f, i) => (
        <mesh key={i} position={[f.pos[0], 0.12, f.pos[2]]}>
          <sphereGeometry args={[0.12, 10, 10]} />
          <meshStandardMaterial color={f.color} />
        </mesh>
      ))}
      <House position={HOUSE_POS} />
      <Bed position={BED_POS} />
      <TV position={[-11.5, 0, -13.2]} />
      <Bench position={[3, 0, -7.5]} rotation={0.5} />
      <Bench position={[-4, 0, 3]} rotation={-0.8} />
      <Pond position={POND_POS} />
      <FloatingHearts />
    </>
  );
}

function Joystick({ joyRef }) {
  const padRef = useRef(null);
  const [stick, setStick] = useState({ x: 0, y: 0, active: false });

  const update = (e) => {
    const rect = padRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = (e.clientX - cx) / (rect.width / 2);
    let dy = (e.clientY - cy) / (rect.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    joyRef.current = { x: dx, y: dy };
    setStick({ x: dx * 28, y: dy * 28, active: true });
  };

  const release = () => {
    joyRef.current = { x: 0, y: 0 };
    setStick({ x: 0, y: 0, active: false });
  };

  return (
    <div
      ref={padRef}
      className="absolute bottom-6 left-6 w-28 h-28 rounded-full bg-white/40 backdrop-blur border-2 border-pink-300 touch-none select-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => stick.active && update(e)}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div
        className="absolute left-1/2 top-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 shadow-lg"
        style={{
          transform: `translate(calc(-50% + ${stick.x}px), calc(-50% + ${stick.y}px))`,
        }}
      />
    </div>
  );
}

export default function MiniWorld({ coupleId, onBack }) {
  const keyRef = useRef({ x: 0, y: 0 });
  const joyRef = useRef({ x: 0, y: 0 });
  const camRef = useRef({ yaw: 0, pitch: 0 });
  const camDragRef = useRef(null);
  const posRef = useRef({
    x: (Math.random() - 0.5) * 6,
    z: (Math.random() - 0.5) * 6,
    ry: 0,
    act: null,
  });
  const lastSentRef = useRef({ x: 0, z: 0, ry: 0, t: 0 });
  const writePosRef = useRef(() => {});
  const childWriteRef = useRef(() => {});
  const msgRef = useRef('');
  const msgTRef = useRef(0);
  const playersRef = useRef({});
  const childRef = useRef({ x: 2, z: -4, ry: 0 });
  const [players, setPlayers] = useState({});
  const [childData, setChildData] = useState(null);
  const [ownMsg, setOwnMsg] = useState(null);
  const [chatText, setChatText] = useState('');
  const [moment, setMoment] = useState(null);
  const [act, setAct] = useState(null);
  const [near, setNear] = useState(null);
  const [fishing, setFishing] = useState(false);
  const [fishResult, setFishResult] = useState(null);
  const [myAvatar, setMyAvatar] = useState(
    () => localStorage.getItem('world_avatar') || 'bapak'
  );
  const avatarRef = useRef(myAvatar);
  const [, setTick] = useState(0);

  const uid = auth.currentUser?.uid;
  const myName = auth.currentUser?.displayName || 'Aku';
  const myColor = useMemo(
    () => PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)],
    []
  );

  // Re-render tiap detik agar bubble chat kadaluarsa tepat waktu
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // Deteksi objek interaktif terdekat (kasur / kolam)
  useEffect(() => {
    const iv = setInterval(() => {
      const p = posRef.current;
      const n =
        Math.hypot(p.x - BED_POS[0], p.z - BED_POS[2]) < 2.2
          ? 'bed'
          : Math.hypot(p.x - POND_POS[0], p.z - POND_POS[2]) < 3.6
            ? 'pond'
            : null;
      setNear((prev) => (prev === n ? prev : n));
    }, 300);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const down = (e) => {
      if (e.target.tagName === 'INPUT') return;
      const k = keyRef.current;
      if (e.key === 'w' || e.key === 'ArrowUp') k.y = -1;
      if (e.key === 's' || e.key === 'ArrowDown') k.y = 1;
      if (e.key === 'a' || e.key === 'ArrowLeft') k.x = -1;
      if (e.key === 'd' || e.key === 'ArrowRight') k.x = 1;
    };
    const up = (e) => {
      if (e.target.tagName === 'INPUT') return;
      const k = keyRef.current;
      if ((e.key === 'w' || e.key === 'ArrowUp') && k.y === -1) k.y = 0;
      if ((e.key === 's' || e.key === 'ArrowDown') && k.y === 1) k.y = 0;
      if ((e.key === 'a' || e.key === 'ArrowLeft') && k.x === -1) k.x = 0;
      if ((e.key === 'd' || e.key === 'ArrowRight') && k.x === 1) k.x = 0;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useEffect(() => {
    if (!uid) return;
    const room = coupleId || 'lobby';
    const colRef = collection(db, 'couples', room, 'world');
    const meRef = doc(colRef, uid);

    const writePos = () => {
      const p = posRef.current;
      setDoc(
        meRef,
        {
          name: myName,
          color: myColor,
          avatar: avatarRef.current,
          act: p.act || null,
          x: p.x,
          z: p.z,
          ry: p.ry,
          msg: msgRef.current,
          msgT: msgTRef.current,
          t: Date.now(),
        },
        { merge: true }
      ).catch(() => {});
    };
    writePosRef.current = writePos;
    childWriteRef.current = (x, z, ry) =>
      setDoc(doc(colRef, CHILD_DOC_ID), { x, z, ry, t: Date.now() }, { merge: true }).catch(
        () => {}
      );

    writePos();
    const iv = setInterval(() => {
      const p = posRef.current;
      const last = lastSentRef.current;
      const moved = p.x !== last.x || p.z !== last.z || p.ry !== last.ry;
      const stale = Date.now() - last.t > 3000;
      if (moved || stale) {
        lastSentRef.current = { x: p.x, z: p.z, ry: p.ry, t: Date.now() };
        writePos();
      }
    }, 200);

    const unsub = onSnapshot(colRef, (snap) => {
      const now = Date.now();
      const next = {};
      let child = null;
      snap.forEach((d) => {
        if (d.id === uid) return;
        const data = d.data();
        if (d.id === CHILD_DOC_ID) {
          child = data;
          return;
        }
        if (now - (data.t || 0) < 15000) next[d.id] = data;
      });
      setPlayers(next);
      setChildData(child);
    });

    return () => {
      clearInterval(iv);
      unsub();
      deleteDoc(meRef).catch(() => {});
      const ids = [uid, ...Object.keys(playersRef.current)].sort();
      if (uid === ids[0]) deleteDoc(doc(colRef, CHILD_DOC_ID)).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId, uid]);

  const sendMessage = (e) => {
    e.preventDefault();
    const text = chatText.trim();
    if (!text) return;
    msgRef.current = text;
    msgTRef.current = Date.now();
    writePosRef.current();
    setOwnMsg({ text, t: msgTRef.current });
    setChatText('');
    setTimeout(() => {
      setOwnMsg((m) => (m && m.text === text ? null : m));
    }, 6000);
  };

  const handleMoment = (partnerId, partnerData) => {
    setMoment({ partner: partnerData?.name || 'Pasangan' });
    setTimeout(() => setMoment(null), 3500);
    if (coupleId && uid && uid < partnerId) {
      addDoc(collection(db, 'couples', coupleId, 'memories'), {
        title: '📸 Momen di Love World',
        description: 'Photo spot bersama di dunia 3D 💞',
        date: new Date().toISOString(),
        createdAt: serverTimestamp(),
        createdBy: uid,
      }).catch(() => {});
    }
  };

  const setPlayerAct = (a) => {
    posRef.current.act = a;
    setAct(a);
    writePosRef.current();
  };

  const toggleSit = () => setPlayerAct(act === 'sit' ? null : 'sit');
  const toggleSleep = () => setPlayerAct(act === 'sleep' ? null : 'sleep');

  const startFishing = () => {
    if (fishing) return;
    setPlayerAct('fish');
    setFishing(true);
    setTimeout(() => {
      const items = [
        '🐟 Dapat ikan cupang!',
        '🐠 Dapat ikan mas!',
        '👢 Dapat sepatu butut...',
        '💖 Dapat hati pasangan!',
      ];
      setFishResult(items[Math.floor(Math.random() * items.length)]);
      setPlayerAct(null);
      setFishing(false);
      setTimeout(() => setFishResult(null), 3500);
    }, 3000 + Math.random() * 5000);
  };

  const pickAvatar = (role) => {
    avatarRef.current = role;
    setMyAvatar(role);
    localStorage.setItem('world_avatar', role);
    writePosRef.current();
  };

  const onlineCount = Object.keys(players).length + 1;
  const ownBubble = ownMsg && Date.now() - ownMsg.t < 6000 ? ownMsg.text : null;
  const myFigure =
    myAvatar === 'anak'
      ? { type: 'kid' }
      : { type: 'sprite', url: SPRITES[myAvatar] };
  const npcVisible =
    myAvatar !== 'anak' &&
    !Object.values(players).some((p) => p.avatar === 'anak');

  const onCamPointerDown = (e) => {
    if (e.target.tagName !== 'CANVAS') return;
    camDragRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onCamPointerMove = (e) => {
    const d = camDragRef.current;
    if (!d) return;
    camRef.current.yaw -= (e.clientX - d.x) * 0.005;
    camRef.current.pitch = Math.min(
      1.2,
      Math.max(-0.8, camRef.current.pitch - (e.clientY - d.y) * 0.004)
    );
    d.x = e.clientX;
    d.y = e.clientY;
  };

  const onCamPointerEnd = () => {
    camDragRef.current = null;
  };

  return (
    <div
      className="relative w-full h-[70vh] min-h-[420px] rounded-2xl overflow-hidden shadow-lg touch-none"
      onPointerDown={onCamPointerDown}
      onPointerMove={onCamPointerMove}
      onPointerUp={onCamPointerEnd}
      onPointerCancel={onCamPointerEnd}
    >
      <Canvas
        shadows
        camera={{ position: [0, 7.5, 9.5], fov: 50 }}
        style={{ background: 'linear-gradient(180deg, #ffe3ef 0%, #ffc9de 100%)' }}
      >
        <fog attach="fog" args={['#ffd9e9', 25, 60]} />
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[8, 12, 6]}
          intensity={1.1}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <Scenery />
        <PhotoSpot />
        <SpotTrigger
          posRef={posRef}
          playersRef={playersRef}
          onMoment={handleMoment}
        />
        <LocalPlayer
          color={myColor}
          name={myName}
          figure={myFigure}
          keyRef={keyRef}
          joyRef={joyRef}
          posRef={posRef}
          camRef={camRef}
          bubble={ownBubble}
        />
        {Object.entries(players).map(([id, data]) => (
          <RemotePlayer key={id} data={data} posRef={posRef} />
        ))}
        {npcVisible && (
          <ChildNPC
            uid={uid}
            posRef={posRef}
            playersRef={playersRef}
            childRef={childRef}
            childData={childData}
            writeRef={childWriteRef}
          />
        )}
      </Canvas>

      <button
        onClick={onBack}
        className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/70 backdrop-blur text-pink-700 text-sm font-medium shadow hover:bg-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali
      </button>

      <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/70 backdrop-blur text-pink-700 text-sm font-medium shadow">
        <Users className="w-4 h-4" />
        {onlineCount} online
      </div>

      <div className="absolute top-16 left-4 flex gap-2">
        {['bapak', 'ibuk', 'anak'].map((role) => (
          <button
            key={role}
            onClick={() => pickAvatar(role)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium shadow backdrop-blur transition-colors ${
              myAvatar === role
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white'
                : 'bg-white/70 text-pink-700 hover:bg-white'
            }`}
          >
            {role === 'bapak' ? '👨 Bapak' : role === 'ibuk' ? '👩 Ibuk' : '👶 Anak'}
          </button>
        ))}
      </div>

      <button
        onClick={toggleSit}
        className="absolute bottom-6 left-40 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/70 backdrop-blur text-pink-700 text-sm font-medium shadow hover:bg-white transition-colors"
      >
        <Armchair className="w-4 h-4" />
        {act === 'sit' ? 'Berdiri' : 'Duduk'}
      </button>

      {near === 'bed' && (
        <button
          onClick={toggleSleep}
          className="absolute bottom-20 left-40 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/80 backdrop-blur text-purple-700 text-sm font-medium shadow hover:bg-white transition-colors"
        >
          🛏️ {act === 'sleep' ? 'Bangun' : 'Tidur'}
        </button>
      )}

      {near === 'pond' && (
        <button
          onClick={startFishing}
          disabled={fishing}
          className="absolute bottom-20 left-40 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/80 backdrop-blur text-blue-700 text-sm font-medium shadow hover:bg-white transition-colors disabled:opacity-60"
        >
          🎣 {fishing ? 'Menunggu...' : 'Mancing'}
        </button>
      )}

      <div className="absolute bottom-6 right-6 px-3 py-2 rounded-xl bg-white/60 backdrop-blur text-pink-600 text-xs shadow hidden md:block">
        WASD / panah jalan · drag untuk putar kamera
      </div>

      <Joystick joyRef={joyRef} />

      <form
        onSubmit={sendMessage}
        className="absolute bottom-40 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 md:bottom-6 flex gap-2 w-[min(320px,72%)] md:w-72"
      >
        <input
          value={chatText}
          onChange={(e) => setChatText(e.target.value)}
          placeholder="Bisikkan sesuatu..."
          maxLength={60}
          className="flex-1 px-4 py-2.5 rounded-full bg-white/80 backdrop-blur text-sm text-pink-700 placeholder-pink-300 shadow focus:outline-none focus:ring-2 focus:ring-pink-400"
        />
        <button
          type="submit"
          className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 text-white flex items-center justify-center shadow hover:scale-105 transition-transform"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      <AnimatePresence>
        {fishResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl bg-white/85 backdrop-blur text-blue-700 font-medium text-sm shadow-xl z-10 pointer-events-none"
          >
            {fishResult}
          </motion.div>
        )}
        {moment && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          >
            <div className="bg-white/85 backdrop-blur rounded-3xl px-8 py-6 text-center shadow-2xl">
              <div className="text-4xl mb-2">📸💞</div>
              <p className="font-bold text-pink-600">Momen berdua!</p>
              <p className="text-xs text-pink-400">Tersimpan di Love Timeline</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
