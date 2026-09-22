'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeElements } from '@react-three/fiber';
import { RoundedBox, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { SystemId, ViewMode } from '@/lib/vehicle';

type Props = { color: string; mode: ViewMode; selected: SystemId | null; running: boolean; rpm: number; track: boolean; reducedMotion: boolean };
const orange = '#f16b43';
const metal = '#777f84';
const dark = '#151b20';

function surface(fn: (u: number, v: number) => [number, number, number], nu = 80, nv = 24) {
  const positions: number[] = [], indices: number[] = [];
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) positions.push(...fn(i / nu, j / nv));
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = i * (nv + 1) + j, b = a + nv + 1;
    indices.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices); g.computeVertexNormals(); return g;
}
function width(x: number) {
  return 0.88 + 0.17 * Math.exp(-(((x - 1.55) / 0.7) ** 2)) + 0.1 * Math.exp(-(((x + 1.6) / 0.7) ** 2)) - 0.21 * Math.exp(-(((x + 2.65) / 0.3) ** 2)) - 0.04 * Math.exp(-(((x - 2.55) / 0.2) ** 2));
}
function arch(x: number) {
  const d = Math.min(Math.abs(x + 1.63), Math.abs(x - 1.58));
  return d < 0.57 ? 0.51 + Math.sqrt(0.57 ** 2 - d ** 2) : 0.32;
}
function shoulder(x: number) { return Math.max(arch(x) + 0.06, 0.99 + 0.045 * Math.exp(-(((x - 1.7) / 1) ** 2)) - 0.1 * Math.exp(-(((x + 2.6) / 0.3) ** 2))); }
function top(x: number) { return 1.02 + 0.05 * Math.exp(-(((x - 1.6) / 1) ** 2)) - 0.2 * Math.exp(-(((x + 2.65) / 0.45) ** 2)); }

function Block({ position, scale, color = dark, ...props }: { color?: string } & ThreeElements['mesh']) {
  return <mesh position={position} scale={scale} {...props}><boxGeometry /><meshStandardMaterial color={color} metalness={0.75} roughness={0.32} /></mesh>;
}
function Tube({ points, color = metal, radius = 0.035 }: { points: [number, number, number][]; color?: string; radius?: number }) {
  const geometry = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 32, radius, 8, false), [points, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry}><meshStandardMaterial color={color} metalness={0.85} roughness={0.26} /></mesh>;
}
function Wheel({ position, side, selected, mode, running, reducedMotion }: { position: [number, number, number]; side: number; selected: SystemId | null; mode: ViewMode; running: boolean; reducedMotion: boolean }) {
  const spin = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (spin.current && running && !reducedMotion) spin.current.rotation.z -= dt * 1.3; });
  const brakeColor = selected === 'brakes' ? '#ff966a' : orange;
  return <group position={position}>
    <group ref={spin}>
      <mesh castShadow><torusGeometry args={[0.375, 0.115, 16, 64]} /><meshStandardMaterial color="#101214" roughness={0.91} /></mesh>
      <mesh position={[0, 0, side * 0.082]}><torusGeometry args={[0.356, 0.014, 8, 64]} /><meshStandardMaterial color="#777e82" metalness={1} roughness={0.18} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.35, 0.35, 0.13, 48]} /><meshStandardMaterial color="#1b2025" metalness={0.9} roughness={0.25} /></mesh>
      <mesh position={[0, 0, side * 0.103]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.275, 0.275, 0.014, 48]} /><meshStandardMaterial color={selected === 'brakes' ? '#c5c6c1' : '#61686d'} metalness={0.85} roughness={0.37} /></mesh>
      {Array.from({ length: 10 }, (_, i) => <group key={i} rotation={[0, 0, i * Math.PI / 5]}>
        <mesh position={[0.172, 0, side * 0.123]} rotation={[0, 0, -0.16]}><boxGeometry args={[0.28, 0.024, 0.032]} /><meshStandardMaterial color="#b6babe" metalness={1} roughness={0.24} /></mesh>
        <mesh position={[0.232, 0.04, side * 0.114]}><circleGeometry args={[0.009, 6]} /><meshBasicMaterial color="#1a1b1c" side={THREE.DoubleSide} /></mesh>
      </group>)}
      <mesh position={[0, 0, side * 0.13]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.073, 0.073, 0.045, 24]} /><meshStandardMaterial color="#343b40" metalness={0.9} roughness={0.2} /></mesh>
      <mesh position={[0, 0, side * 0.155]}><circleGeometry args={[0.024, 3]} /><meshBasicMaterial color="#d5d7d7" side={THREE.DoubleSide} /></mesh>
    </group>
    <RoundedBox args={[0.11, 0.25, 0.09]} radius={0.035} position={[0.22, 0.015, side * 0.097]}><meshStandardMaterial color={brakeColor} metalness={0.5} roughness={0.3} emissive={selected === 'brakes' ? orange : '#000'} emissiveIntensity={0.22} /></RoundedBox>
    {mode !== 'exterior' && <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, -side * 0.3]}><cylinderGeometry args={[0.035, 0.035, 0.45, 12]} /><meshStandardMaterial color={metal} metalness={0.9} roughness={0.3} /></mesh>}
  </group>;
}
function Piston({ side, index, running, rpm, reducedMotion }: { side: number; index: number; running: boolean; rpm: number; reducedMotion: boolean }) {
  const piston = useRef<THREE.Mesh>(null);
  const phase = useRef(index * Math.PI * 2 / 3);
  useFrame((_, dt) => {
    if (!piston.current || !running || reducedMotion) return;
    phase.current += dt * rpm / 250;
    piston.current.position.z = side * (0.07 + Math.sin(phase.current) * 0.06);
  });
  return <mesh ref={piston} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.09, 0.09, 0.09, 16]} /><meshStandardMaterial color="#f1d1ad" emissive="#e98542" emissiveIntensity={0.35} metalness={0.7} roughness={0.3} /></mesh>;
}
function Engine({ selected, running, rpm, reducedMotion }: { selected: boolean; running: boolean; rpm: number; reducedMotion: boolean }) {
  const rotor = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (rotor.current && running && !reducedMotion) rotor.current.rotation.x += dt * rpm / 250; });
  return <group position={[1.25, 0.68, 0]}>
    <RoundedBox args={[0.92, 0.32, 0.65]} radius={0.06}><meshStandardMaterial color={selected ? '#abaca7' : '#626a6e'} metalness={0.9} roughness={0.35} /></RoundedBox>
    <Block position={[0, 0.21, 0]} scale={[0.85, 0.12, 0.42]} color="#22292d" />
    {[-1, 1].map(side => <group key={side}>
      {[0, 1, 2].map(i => <group key={i} position={[-0.3 + i * 0.29, 0.015, side * 0.35]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.14, 0.14, 0.24, 16]} /><meshStandardMaterial color={selected ? orange : '#868c8e'} metalness={0.7} roughness={0.3} transparent={selected} opacity={selected ? 0.3 : 1} depthWrite={!selected} /></mesh>
        {selected && <Piston side={side} index={i} running={running} rpm={rpm} reducedMotion={reducedMotion} />}{[0, 1, 2, 3].map(j => <Block key={j} position={[0, 0.07 + j * 0.025, 0]} scale={[0.23, 0.012, 0.3]} color="#41494f" />)}
      </group>)}
      <Tube points={[[-0.5, 0.02, side * 0.4], [-0.55, -0.06, side * 0.66], [0.2, -0.08, side * 0.64], [0.4, 0.14, side * 0.55]]} color={selected ? '#cf875d' : '#8c7867'} radius={0.065} />
      <mesh position={[0.38, 0.12, side * 0.58]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.14, 0.055, 10, 24]} /><meshStandardMaterial color="#919a9f" metalness={1} roughness={0.26} /></mesh>
    </group>)}
    <group ref={rotor}>{[0, 1, 2].map(i => <mesh key={i} position={[-0.29 + i * 0.29, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.09, 0.09, 0.06, 12]} /><meshStandardMaterial color={orange} metalness={0.6} roughness={0.3} /></mesh>)}</group>
    {Array.from({ length: 6 }, (_, i) => <Block key={i} position={[-0.35 + i * 0.14, 0.29, 0]} scale={[0.055, 0.025, 0.35]} color="#aab0b0" />)}
  </group>;
}

export default function CarModel({ color, mode, selected, running, rpm, track, reducedMotion }: Props) {
  const { invalidate } = useThree();
  const shell = useRef<THREE.Group>(null), wing = useRef<THREE.Group>(null), mechanical = useRef<THREE.Group>(null);
  const bodyMat = useRef<THREE.MeshPhysicalMaterial>(null), glassMat = useRef<THREE.MeshPhysicalMaterial>(null);
  const wheelGroups = useRef<(THREE.Group | null)[]>([]);
  const bodyGeometry = useMemo(() => surface((u, v) => {
    const x = -2.65 + 5.2 * u, t = v * 2 - 1;
    return [x, THREE.MathUtils.lerp(top(x), shoulder(x), Math.abs(t) ** 3), width(x) * t];
  }), []);
  const sideGeometries = useMemo(() => [-1, 1].map(side => surface((u, v) => {
    const x = -2.65 + 5.2 * u;
    return [x, THREE.MathUtils.lerp(shoulder(x), arch(x), v), side * (width(x) - 0.035 * v)];
  }, 100, 6)), []);
  const cabinGeometry = useMemo(() => surface((u, v) => {
    const x = -0.94 + u * 2.35, t = v * 2 - 1;
    const rise = Math.sin(Math.PI * u) ** 0.65;
    return [x, 1.025 + rise * 0.61 * Math.sqrt(Math.max(0, 1 - Math.abs(t) ** 6)), t * (0.81 - 0.035 * rise)];
  }, 64, 24), []);
  const roofGeometry = useMemo(() => surface((u, v) => {
    const x = -0.3 + u * 1.03, t = v * 2 - 1, cu = (x + 0.94) / 2.35;
    const rise = Math.sin(Math.PI * cu) ** 0.65;
    return [x, 1.037 + rise * 0.61 * Math.sqrt(Math.max(0, 1 - Math.abs(t * 0.78) ** 6)), t * (0.81 - 0.035 * rise) * 0.78];
  }, 24, 16), []);
  useEffect(() => () => { bodyGeometry.dispose(); sideGeometries.forEach(g => g.dispose()); cabinGeometry.dispose(); roofGeometry.dispose(); }, [bodyGeometry, sideGeometries, cabinGeometry, roofGeometry]);
  useFrame((_, dt) => {
    const step = reducedMotion ? 1 : 1 - Math.exp(-dt * 5);
    if (shell.current) shell.current.position.y = THREE.MathUtils.lerp(shell.current.position.y, mode === 'exploded' ? 1.25 : 0, step);
    if (mechanical.current) mechanical.current.position.y = THREE.MathUtils.lerp(mechanical.current.position.y, mode === 'exploded' ? 0.12 : 0, step);
    if (bodyMat.current) bodyMat.current.opacity = THREE.MathUtils.lerp(bodyMat.current.opacity, mode === 'xray' ? 0.10 : mode === 'exploded' ? 0.68 : 1, step);
    if (glassMat.current) glassMat.current.opacity = THREE.MathUtils.lerp(glassMat.current.opacity, mode === 'xray' ? 0.09 : 0.9, step);
    if (wing.current) { wing.current.position.y = THREE.MathUtils.lerp(wing.current.position.y, track ? 0.27 : 0, step); wing.current.rotation.z = THREE.MathUtils.lerp(wing.current.rotation.z, track ? -0.13 : 0, step); }
    if ((running && !reducedMotion) || (shell.current && Math.abs(shell.current.position.y - (mode === 'exploded' ? 1.25 : 0)) > 0.001) || (bodyMat.current && Math.abs(bodyMat.current.opacity - (mode === 'xray' ? 0.1 : mode === 'exploded' ? 0.68 : 1)) > 0.001) || (wing.current && Math.abs(wing.current.position.y - (track ? 0.27 : 0)) > 0.001)) invalidate();
    wheelGroups.current.forEach((g, i) => { if (g) g.position.z = THREE.MathUtils.lerp(g.position.z, (i % 2 ? 1 : -1) * (mode === 'exploded' ? 0.52 : 0), step); });
  });
  const componentColor = (id: SystemId) => selected === id ? orange : '#667176';
  const wheelPositions: [number, number, number][] = [[-1.63, 0.51, -0.97], [-1.63, 0.51, 0.97], [1.58, 0.51, -1.02], [1.58, 0.51, 1.02]];
  return <group>
    <group ref={mechanical}>
      <RoundedBox args={[3.65, 0.16, 1.45]} radius={0.08} position={[0.02, 0.34, 0]}><meshStandardMaterial color={selected === 'chassis' ? '#9a6751' : '#21282c'} metalness={0.7} roughness={0.45} /></RoundedBox>
      {[-1, 1].map(side => <group key={side}>
        <Tube points={[[-1.8, 0.38, side * 0.57], [-0.8, 0.6, side * 0.73], [0.6, 0.58, side * 0.73], [1.85, 0.38, side * 0.62]]} color={componentColor('chassis')} radius={0.045} />
        {[-1.63, 1.58].map(x => <group key={x} position={[x, 0.57, side * 0.69]}>
          <Tube points={[[-0.3, -0.14, -side * 0.22], [0, -0.05, side * 0.24], [0.3, -0.14, -side * 0.22]]} color={componentColor('suspension')} radius={0.03} />
          <mesh rotation={[0.22 * side, 0, 0]} position={[0, 0.11, 0]}><cylinderGeometry args={[0.045, 0.045, 0.43, 12]} /><meshStandardMaterial color="#a9afb0" metalness={1} roughness={0.2} /></mesh>
          {Array.from({length: 7}, (_, i) => <mesh key={i} position={[0, -0.035 + i * 0.039, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.078, 0.017, 6, 16]} /><meshStandardMaterial color={componentColor('suspension')} metalness={0.65} roughness={0.35} /></mesh>)}
        </group>)}
      </group>)}
      <Engine selected={selected === 'engine'} running={running} rpm={rpm} reducedMotion={reducedMotion} />
      <RoundedBox position={[0.35, 0.58, 0]} args={[0.67, 0.34, 0.43]} radius={0.08}><meshStandardMaterial color={componentColor('transmission')} metalness={0.85} roughness={0.3} /></RoundedBox>
      {Array.from({length: 6}, (_, i) => <Block key={i} position={[0.1 + i * 0.09, 0.77, 0]} scale={[0.027, 0.06, 0.44]} color="#a0a4a3" />)}
      <Block position={[1.58, 0.5, 0]} scale={[0.15, 0.12, 1.85]} color={componentColor('transmission')} />
      <RoundedBox position={[-1.8, 0.6, 0]} args={[0.18, 0.34, 1.15]} radius={0.02}><meshStandardMaterial color="#555e61" metalness={0.9} roughness={0.4} /></RoundedBox>
      {[-1, 1].map(side => <Tube key={side} points={[[1.4, 0.4, side * 0.58], [1.8, 0.27, side * 0.65], [2.4, 0.34, side * 0.67]]} color="#928a7f" radius={0.05} />)}
      {[-0.39, 0.39].map(z => <group key={z} position={[-0.14, 0.55, z]}>
        <RoundedBox args={[0.64, 0.12, 0.43]} radius={0.06}><meshStandardMaterial color="#171b1e" roughness={0.9} /></RoundedBox>
        <RoundedBox args={[0.12, 0.59, 0.43]} radius={0.06} position={[0.22, 0.27, 0]} rotation={[0, 0, -0.14]}><meshStandardMaterial color="#171b1e" roughness={0.8} /></RoundedBox>
      </group>)}
    </group>
    {wheelPositions.map((p, i) => <group key={i} ref={el => { wheelGroups.current[i] = el; }}><Wheel position={p} side={i % 2 ? 1 : -1} selected={selected} mode={mode} running={running} reducedMotion={reducedMotion} /></group>)}
    <group ref={shell}>
      <mesh geometry={bodyGeometry} castShadow receiveShadow><meshPhysicalMaterial ref={bodyMat} color={color} metalness={0.9} roughness={0.24} clearcoat={1} clearcoatRoughness={0.18} transparent side={THREE.DoubleSide} depthWrite={mode === 'exterior'} /></mesh>
      {sideGeometries.map((geometry, i) => <mesh key={i} geometry={geometry} castShadow><meshPhysicalMaterial color={color} metalness={0.85} roughness={0.25} clearcoat={1} transparent opacity={mode === 'xray' ? 0.09 : mode === 'exploded' ? 0.65 : 1} side={THREE.DoubleSide} depthWrite={mode === 'exterior'} /></mesh>)}
      <mesh geometry={cabinGeometry}><meshPhysicalMaterial ref={glassMat} color="#0c141b" metalness={0.2} roughness={0.21} clearcoat={0.35} envMapIntensity={0.45} transparent side={THREE.DoubleSide} /></mesh>
      <mesh geometry={roofGeometry} castShadow><meshPhysicalMaterial color={color} metalness={0.9} roughness={0.23} clearcoat={1} transparent opacity={mode === 'xray' ? 0.09 : mode === 'exploded' ? 0.7 : 1} side={THREE.DoubleSide} depthWrite={mode === 'exterior'} /></mesh>
      {mode !== 'xray' && <>
        {[-1, 1].map(side => <group key={side}>
          <Line points={[[-0.94, 1.03, side * 0.81], [-0.28, 1.49, side * 0.61], [0.28, 1.57, side * 0.605], [0.7, 1.51, side * 0.61], [1.4, 1.035, side * 0.81]]} color={color} lineWidth={3} />
          <Line points={[[-0.87, 0.98, side * 0.85], [-0.91, 0.64, side * 0.91], [-0.69, 0.42, side * 0.91], [0.69, 0.43, side * 0.96], [0.87, 0.84, side * 0.98], [0.75, 1.04, side * 0.88]]} color="#30373b" lineWidth={0.65} />
          <Line points={[[-2.36, 0.84, side * 0.48], [-1.75, 0.96, side * 0.5], [-0.92, 0.98, side * 0.61]]} color="#4d565d" lineWidth={0.65} />
          <RoundedBox args={[1.9, 0.09, 0.1]} radius={0.035} position={[0, 0.32, side * 0.91]}><meshStandardMaterial color="#171d21" metalness={0.65} roughness={0.35} /></RoundedBox>
          <RoundedBox args={[0.22, 0.028, 0.025]} radius={0.01} position={[0.45, 0.93, side * 0.97]}><meshStandardMaterial color="#353e45" metalness={0.9} roughness={0.2} /></RoundedBox>
          <Tube points={[[-0.67, 1.05, side * 0.77], [-0.62, 1.04, side * 0.98]]} radius={0.022} color="#2b3339" />
          <RoundedBox args={[0.26, 0.115, 0.16]} radius={0.047} position={[-0.65, 1.1, side * 1.01]}><meshPhysicalMaterial color={color} metalness={0.9} roughness={0.23} /></RoundedBox>
          <RoundedBox args={[0.2, 0.10, 0.40]} radius={0.044} position={[-2.42, 0.92, side * 0.63]} rotation={[0, side * -0.12, -0.11]}><meshStandardMaterial color="#0c1720" metalness={0.7} roughness={0.15} /></RoundedBox>
          {[0, 1].map(j => <RoundedBox key={j} args={[0.026, 0.013, 0.32]} radius={0.006} position={[-2.52 + j * 0.075, 0.967 + j * 0.008, side * 0.63]} rotation={[0, side * -0.12, 0]}><meshStandardMaterial color="#dcf3ff" emissive="#e8f7ff" emissiveIntensity={3.5} /></RoundedBox>)}
          <RoundedBox args={[0.09, 0.22, 0.36]} radius={0.04} position={[-2.56, 0.5, side * 0.62]}><meshStandardMaterial color="#10171b" roughness={0.5} /></RoundedBox>
          {[0, 1, 2].map(j => <Block key={j} position={[-2.615, 0.43 + j * 0.055, side * 0.62]} scale={[0.018, 0.012, 0.29]} color="#3c454b" />)}
          <mesh position={[2.46, 0.35, side * 0.7]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.071, 0.071, 0.2, 24, 1, true]} /><meshStandardMaterial color="#888b8d" metalness={1} roughness={0.2} side={THREE.DoubleSide} /></mesh>
        </group>)}
        <RoundedBox args={[0.2, 0.34, 1.36]} radius={0.07} position={[-2.54, 0.70, 0]}><meshPhysicalMaterial color={color} metalness={0.9} roughness={0.24} clearcoat={1} /></RoundedBox>
        <RoundedBox args={[0.1, 0.115, 0.64]} radius={0.025} position={[-2.651, 0.48, 0]}><meshStandardMaterial color="#0d1215" roughness={0.6} /></RoundedBox>
        <RoundedBox args={[0.28, 0.055, 1.75]} radius={0.025} position={[-2.48, 0.34, 0]}><meshStandardMaterial color="#20272d" metalness={0.7} roughness={0.35} /></RoundedBox>
        <mesh position={[-2.25, 0.941, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}><circleGeometry args={[0.035, 3]} /><meshStandardMaterial color="#d5d8d5" metalness={1} roughness={0.2} /></mesh>
        <RoundedBox args={[0.14, 0.30, 1.87]} radius={0.08} position={[2.47, 0.69, 0]}><meshPhysicalMaterial color={color} metalness={0.9} roughness={0.26} /></RoundedBox>
        <RoundedBox args={[0.04, 0.035, 1.75]} radius={0.015} position={[2.55, 0.89, 0]}><meshStandardMaterial color="#e53726" emissive="#f13720" emissiveIntensity={2} /></RoundedBox>
        <Block position={[2.42, 0.36, 0]} scale={[0.33, 0.13, 1.64]} color="#10171b" />
        {[-0.6, -0.3, 0, 0.3, 0.6].map(z => <Block key={z} position={[2.46, 0.3, z]} scale={[0.39, 0.14, 0.021]} color="#242d33" />)}
        {Array.from({length: 7}, (_, i) => <Block key={i} position={[1.48 + i * 0.075, 1.058, 0]} scale={[0.023, 0.016, 0.98]} color="#30393d" />)}
      </>}
      <group ref={wing}>
        {[-0.62, 0.62].map(z => <Block key={z} position={[2.09, 0.97, z]} scale={[0.07, 0.22, 0.045]} color={componentColor('aero')} />)}
        <RoundedBox args={[0.4, 0.052, 1.97]} radius={0.022} position={[2.1, 1.09, 0]}><meshPhysicalMaterial color={selected === 'aero' ? orange : color} metalness={0.8} roughness={0.28} transparent opacity={mode === 'xray' ? 0.35 : 1} /></RoundedBox>
      </group>
    </group>
  </group>;
}



