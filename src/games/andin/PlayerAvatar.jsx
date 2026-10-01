import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { MathUtils } from 'three';
import { ROLES, isWalkable } from '../../../shared/andin/world';

function Block({ position, size, color, ...props }) {
  return <mesh position={position} castShadow receiveShadow {...props}><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>;
}
function Joint({ position, radius, color, scale }) {
  return <mesh position={position} scale={scale} castShadow><sphereGeometry args={[radius, 10, 8]} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>;
}
function Tool({ type }) {
  if (type === 'water') return (
    <group position={[0, -0.38, 0.06]} rotation={[0.3, 0, 0]}>
      <mesh castShadow><cylinderGeometry args={[0.16, 0.18, 0.26, 10]} /><meshStandardMaterial color="#688f9b" metalness={0.3} roughness={0.5} /></mesh>
      <Block position={[0, 0.02, 0.24]} size={[0.075, 0.07, 0.35]} color="#89a9b0" rotation={[-0.4, 0, 0]} />
      {[0, 1, 2, 3].map((i) => <Joint key={i} position={[(i % 2) * 0.07 - 0.03, -0.15 - i * 0.12, 0.4 + i * 0.025]} radius={0.025} color="#a5dfe4" />)}
    </group>
  );
  if (type === 'hoe') return (
    <group position={[0, -0.32, 0.08]} rotation={[-0.7, 0, 0]}>
      <Block position={[0, -0.15, 0]} size={[0.055, 0.9, 0.055]} color="#9a7146" />
      <Block position={[0, -0.55, 0.08]} size={[0.3, 0.07, 0.21]} color="#7b8587" />
    </group>
  );
  if (type === 'plant') return <Block position={[0, -0.35, 0.08]} size={[0.16, 0.21, 0.09]} color="#d1b37d" />;
  if (type === 'harvest') return <Joint position={[0, -0.35, 0.07]} radius={0.14} color="#e7d6c5" />;
  return null;
}

export default function PlayerAvatar({ player, local, inputRef }) {
  const root = useRef();
  const body = useRef();
  const hips = useRef();
  const leftThigh = useRef();
  const rightThigh = useRef();
  const leftKnee = useRef();
  const rightKnee = useRef();
  const leftArm = useRef();
  const rightArm = useRef();
  const leftElbow = useRef();
  const rightElbow = useRef();
  const role = ROLES.find((item) => item.id === player.role) || ROLES[0];
  const child = player.role === 'anak';
  const feminine = player.role === 'ibuk' || player.role === 'teman_2';
  const scale = child ? 0.79 : 1;
  const tool = ['hoe', 'water', 'plant', 'harvest'].includes(player.pose) ? player.pose : null;

  useFrame(({ clock }, delta) => {
    if (!root.current) return;
    const t = clock.elapsedTime;
    const blend = 1 - Math.exp(-14 * delta);
    let x = player.x;
    let z = player.z;
    if (local && ['walk', 'run', 'idle'].includes(player.pose)) {
      const input = inputRef.current;
      const speed = input.run && player.stamina > 0 ? 6 : 3.4;
      const dx = input.x * speed * 0.065;
      const dz = input.z * speed * 0.065;
      if (isWalkable(player.mapId, x + dx, z + dz)) { x += dx; z += dz; }
    }
    root.current.position.x = MathUtils.lerp(root.current.position.x, x, blend);
    root.current.position.z = MathUtils.lerp(root.current.position.z, z, blend);
    const angle = Math.atan2(Math.sin(player.rotation - body.current.rotation.y), Math.cos(player.rotation - body.current.rotation.y));
    body.current.rotation.y += angle * blend;
    const sitting = player.pose === 'sit';
    const sleeping = player.pose === 'sleep';
    const lying = sleeping || player.pose === 'lie';
    const walking = player.pose === 'walk' || player.pose === 'run';
    const running = player.pose === 'run';
    const swing = walking ? Math.sin(t * (running ? 14 : 9)) * (running ? 0.8 : 0.5) : 0;
    const working = Boolean(tool);
    const action = Math.sin(t * 11);
    const set = (ref, axis, value) => { ref.current.rotation[axis] = MathUtils.lerp(ref.current.rotation[axis], value, blend); };
    hips.current.position.y = MathUtils.lerp(hips.current.position.y, sitting ? 0.73 / scale : 0.99 + (walking ? Math.abs(swing) * 0.045 : Math.sin(t * 2) * 0.007), blend);
    body.current.position.y = MathUtils.lerp(body.current.position.y, sleeping ? 0.7 : lying ? 0.17 : 0, blend);
    set(body, 'x', lying ? -Math.PI / 2 : running ? 0.12 : working ? 0.2 : 0);
    set(leftThigh, 'x', sitting ? -Math.PI / 2 : swing);
    set(rightThigh, 'x', sitting ? -Math.PI / 2 : -swing);
    set(leftKnee, 'x', sitting ? Math.PI / 2 : walking ? Math.max(0, -swing) * 0.9 : 0.04);
    set(rightKnee, 'x', sitting ? Math.PI / 2 : walking ? Math.max(0, swing) * 0.9 : 0.04);
    set(leftArm, 'x', sitting ? -0.3 : lying ? -0.1 : working ? -0.6 + action * 0.2 : -swing * 0.8);
    set(rightArm, 'x', sitting ? -0.3 : lying ? -0.1 : working ? -0.9 + action * 0.7 : swing * 0.8);
    set(leftElbow, 'x', sitting ? -0.7 : running ? -0.9 : -0.15);
    set(rightElbow, 'x', working ? -0.5 : sitting ? -0.7 : running ? -0.9 : -0.15);
    set(leftArm, 'z', lying ? 0.12 : 0.06);
    set(rightArm, 'z', lying ? -0.12 : -0.06);
  });

  return (
    <group ref={root} position={[player.x, 0, player.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}><circleGeometry args={[0.42, 24]} /><meshBasicMaterial color="#28392a" transparent opacity={0.16} depthWrite={false} /></mesh>
      <group ref={body} scale={scale}>
        <group ref={hips} position={[0, 0.99, 0]}>
          <Block position={[0, 0.02, 0]} size={[0.43, 0.24, 0.29]} color="#465a62" />
          <Block position={[0, 0.31, 0]} size={[0.5, 0.43, 0.31]} color={role.color} />
          <Block position={[0, 0.28, 0.172]} size={[0.29, 0.31, 0.035]} color="#607c80" />
          {[-1, 1].map((side) => <Block key={side} position={[side * 0.13, 0.48, 0.17]} size={[0.055, 0.22, 0.035]} color="#607c80" />)}
          <Joint position={[0, 0.61, 0]} radius={0.105} color={role.skin} />
          <group position={[0, 0.84, 0]}>
            <Joint radius={0.245} scale={[0.91, 1.12, 0.9]} color={role.skin} />
            <Joint position={[0, 0.1, -0.035]} radius={0.246} scale={[0.94, 0.84, 0.93]} color={role.hair} />
            <Block position={[0, 0.035, 0.192]} size={[0.35, 0.2, 0.065]} color={role.skin} />
            {[-1, 1].map((side) => <group key={side}><Joint position={[side * 0.089, 0.037, 0.232]} radius={0.024} color="#302920" /><Block position={[side * 0.085, 0.09, 0.23]} size={[0.07, 0.014, 0.015]} color={role.hair} /><Joint position={[side * 0.225, 0, 0]} radius={0.053} color={role.skin} /></group>)}
            <Joint position={[0, -0.015, 0.238]} radius={0.038} color={role.skin} />
            <Block position={[0, -0.096, 0.209]} size={[0.075, 0.012, 0.02]} color="#995f50" />
            {feminine && <Joint position={[0, -0.11, -0.24]} radius={0.15} scale={[0.7, 1.5, 0.8]} color={role.hair} />}
            <mesh position={[0, 0.25, 0]} castShadow><cylinderGeometry args={[0.34, 0.34, 0.035, 14]} /><meshStandardMaterial color="#d6bd82" /></mesh>
            <mesh position={[0, 0.31, 0]} castShadow><cylinderGeometry args={[0.19, 0.22, 0.13, 12]} /><meshStandardMaterial color="#dec793" /></mesh>
            <mesh position={[0, 0.265, 0]}><cylinderGeometry args={[0.224, 0.224, 0.04, 12]} /><meshStandardMaterial color={role.color} /></mesh>
          </group>
          {[[-1, leftThigh, leftKnee], [1, rightThigh, rightKnee]].map(([side, thigh, knee]) => (
            <group key={side} ref={thigh} position={[side * 0.13, -0.07, 0]}>
              <Block position={[0, -0.2, 0]} size={[0.2, 0.42, 0.24]} color="#465a62" />
              <group ref={knee} position={[0, -0.4, 0]}>
                <Joint radius={0.101} color="#465a62" />
                <Block position={[0, -0.19, 0]} size={[0.18, 0.38, 0.2]} color="#4e6470" />
                <Block position={[0, -0.38, 0.065]} size={[0.21, 0.16, 0.34]} color="#634b39" />
              </group>
            </group>
          ))}
          {[[-1, leftArm, leftElbow], [1, rightArm, rightElbow]].map(([side, arm, elbow]) => (
            <group key={side} ref={arm} position={[side * 0.32, 0.47, 0]}>
              <Joint radius={0.125} color={role.color} />
              <Block position={[0, -0.15, 0]} size={[0.19, 0.3, 0.2]} color={role.color} />
              <group ref={elbow} position={[0, -0.3, 0]}>
                <Joint radius={0.086} color={role.skin} />
                <Block position={[0, -0.14, 0]} size={[0.135, 0.28, 0.15]} color={role.skin} />
                <Joint position={[0, -0.31, 0]} radius={0.09} color={role.skin} />
                {side === 1 && tool && <Tool type={tool} />}
              </group>
            </group>
          ))}
        </group>
      </group>
      <Html position={[0, player.pose === 'sleep' || player.pose === 'lie' ? 1.25 : 2.5 * scale, 0]} center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`andin-nametag ${local ? 'is-local' : ''}`}><strong>{player.name}</strong><span>{role.name}{player.pose === 'sleep' ? ' · Tidur' : ''}</span></div>
      </Html>
    </group>
  );
}
