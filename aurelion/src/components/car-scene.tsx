'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Html, Lightformer, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import CarModel from './car-model';
import { systems, type SystemId, type ViewMode } from '@/lib/vehicle';

export type SceneProps = {
  color: string; mode: ViewMode; selected: SystemId | null; running: boolean; rpm: number; track: boolean;
  autoRotate: boolean; reducedMotion: boolean; hotspots: boolean; cameraAction: { type: 'reset' | 'in' | 'out'; id: number };
  onSelect: (id: SystemId) => void; onReady: () => void; onInteraction: () => void;
};

function CameraRig({ mode, cameraAction, autoRotate, reducedMotion, onInteraction }: SceneProps) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, size, invalidate } = useThree();
  const target = useRef(new THREE.Vector3(0, 0.65, 0));
  const desiredPosition = useRef<THREE.Vector3 | null>(null);
  useEffect(() => {
    if (cameraAction.type === 'reset') desiredPosition.current = new THREE.Vector3(-5.8, 2.6, 7).multiplyScalar(size.width < 640 ? 1.19 : 1);
    else if (controls.current) {
      const v = camera.position.clone().sub(controls.current.target);
      const distance = THREE.MathUtils.clamp(v.length() * (cameraAction.type === 'in' ? 0.82 : 1.2), 5.3, 15);
      desiredPosition.current = v.setLength(distance).add(controls.current.target);
    }
  }, [cameraAction, camera, size.width]);
  useEffect(() => { target.current.set(0, mode === 'exploded' ? 1.16 : 0.64, 0); }, [mode]);
  useFrame((_, dt) => {
    if (!controls.current) return;
    const step = reducedMotion ? 1 : 1 - Math.exp(-dt * 4);
    if (controls.current.target.distanceTo(target.current) > 0.001) invalidate();
    controls.current.target.lerp(target.current, step);
    if (desiredPosition.current) {
      invalidate();
      camera.position.lerp(desiredPosition.current, step);
      if (camera.position.distanceTo(desiredPosition.current) < 0.02) desiredPosition.current = null;
    }
    controls.current.update();
  });
  return <OrbitControls ref={controls} makeDefault enablePan={false} enableZoom={false} minPolarAngle={0.35} maxPolarAngle={Math.PI / 2 - 0.035} minDistance={5.3} maxDistance={15} rotateSpeed={0.6} enableDamping dampingFactor={0.07} autoRotate={autoRotate && !reducedMotion} autoRotateSpeed={0.42} onStart={() => { desiredPosition.current = null; onInteraction(); }} />;
}
function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => { onReady(); }, [onReady]); return null;
}
function SceneContent(props: SceneProps) {
  return <>
    <ambientLight intensity={0.5} />
    <directionalLight position={[-3, 6, 5]} intensity={2.4} color="#e8f0ff" />
    <spotLight position={[5, 6, -5]} intensity={65} angle={0.7} penumbra={1} color="#c8d7df" />
    <spotLight position={[-5, 3, -4]} intensity={25} angle={0.6} penumbra={1} color="#f2e2d1" />
    <Environment resolution={256}>
      <Lightformer form="rect" intensity={4} color="#ffffff" scale={[8, 2, 1]} position={[0, 5, -2]} rotation={[Math.PI / 2, 0, 0]} />
      <Lightformer form="rect" intensity={3} color="#d6e1e9" scale={[10, 1, 1]} position={[-1, 4, 4]} rotation={[Math.PI / 3, 0, 0]} />
      <Lightformer form="rect" intensity={2} color="#f0e9e2" scale={[8, 2, 1]} position={[1, 2, -4]} rotation={[0, 0, 0]} />
      <Lightformer form="rect" intensity={2} scale={[2, 4, 1]} position={[-5, 2, 1]} rotation={[0, Math.PI / 2, 0]} />
    </Environment>
    <CarModel {...props} />
    <ContactShadows position={[0, 0.005, 0]} opacity={0.65} scale={15} blur={2.7} far={5} resolution={512} key={`${props.mode}-${props.track}`} frames={props.reducedMotion ? 1 : 45} color="#000000" />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]}><planeGeometry args={[200, 200]} /><meshBasicMaterial color="#141819" /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><ringGeometry args={[3.5, 3.51, 128]} /><meshBasicMaterial color="#3c4244" transparent opacity={0.26} /></mesh>
    {(props.hotspots ? systems : systems.filter(s => s.id === 'engine')).map(s => <Html key={s.id} position={[s.position[0], s.position[1] + (props.mode === 'exploded' ? 0.28 : 0.06), s.position[2]]} center zIndexRange={[12, 1]}>
      <button className={`hotspot ${props.selected === s.id ? 'selected' : ''}`} onClick={e => { e.stopPropagation(); props.onSelect(s.id); }} aria-label={`Explore ${s.name}`}><span>+</span>{!props.hotspots && <span className="hotspot-label">Explore the powertrain</span>}</button>
    </Html>)}
    <CameraRig {...props} />
    <Ready onReady={props.onReady} />
  </>;
}
function Fallback({ onReady }: { onReady: () => void }) {
  useEffect(() => { onReady(); }, [onReady]);
  return <div className="scene-fallback">Your browser does not support 3D. You can still explore every system below.</div>;
}export default function CarScene(props: SceneProps) {
  const [lost, setLost] = useState(false);
  return <div className="canvas-container" role="group" aria-label={`Interactive AURELION R1 in ${props.mode} view. Drag to rotate. Use the labeled buttons to explore mechanical systems.`}>
    <Canvas frameloop="demand" camera={{ position: [-5.8, 2.6, 7], fov: 24, near: 0.1, far: 150 }} dpr={[1, 1.6]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} onCreated={({ gl }) => {
      gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05;
      gl.domElement.addEventListener('webglcontextlost', () => setLost(true), { once: true });
    }} fallback={<Fallback onReady={props.onReady} />}>
      <fog attach="fog" args={['#141819', 13, 35]} />
      <Suspense fallback={null}><SceneContent {...props} /></Suspense>
    </Canvas>
    {lost && <div className="scene-fallback">The 3D session was interrupted.<button onClick={() => window.location.reload()}>Reload experience</button></div>}
  </div>;
}





