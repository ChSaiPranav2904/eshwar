import { Box3, Vector3 } from 'three';
export type Vec3 = [number, number, number];
export type Block = { id: string; position: Vec3; size: Vec3; kind: 'building' | 'wall' | 'crate' | 'step' };
export const SPAWN: Vec3 = [0, 0.95, 21];
export const SITES = { A: [-18, 0, -17] as Vec3, B: [18, 0, -17] as Vec3 };
export const BLOCKS: Block[] = [
  { id: 'west-boundary', position: [-26, 3, 0], size: [1, 6, 53], kind: 'wall' },
  { id: 'east-boundary', position: [26, 3, 0], size: [1, 6, 53], kind: 'wall' },
  { id: 'north-boundary', position: [0, 3, -26], size: [53, 6, 1], kind: 'wall' },
  { id: 'south-boundary', position: [0, 3, 26], size: [53, 6, 1], kind: 'wall' },
  ...[-8.8, 8.8].flatMap((x, i) => [-7.2, 7.2].map((z, j) => ({ id: `lab-${i}-${j}`, position: [x, 3.5, z] as Vec3, size: [8.4, 7, 10] as Vec3, kind: 'building' as const }))),
  { id: 'mid-cover', position: [0, 0.7, 1], size: [2.4, 1.4, 2.4], kind: 'crate' },
  { id: 'a-entry', position: [-20.7, 1.05, 7], size: [4, 2.1, 2.5], kind: 'crate' },
  { id: 'b-entry', position: [20.7, 1.05, 5], size: [4, 2.1, 2.5], kind: 'crate' },
  { id: 'a-cover', position: [-15.8, 1.05, -15], size: [2.3, 2.1, 3], kind: 'crate' },
  { id: 'b-cover', position: [15.8, 1.05, -15], size: [2.3, 2.1, 3], kind: 'crate' },
  { id: 'defender-cover', position: [2, 1.1, -21], size: [4, 2.2, 2], kind: 'crate' },
  { id: 'a-platform', position: [-23, .6, -22], size: [4, 1.2, 5], kind: 'crate' },
  { id: 'a-step-1', position: [-23, .15, -17.6], size: [3.5, .3, 1], kind: 'step' },
  { id: 'a-step-2', position: [-23, .3, -18.4], size: [3.5, .6, 1], kind: 'step' },
  { id: 'a-step-3', position: [-23, .45, -19.2], size: [3.5, .9, 1], kind: 'step' },
  { id: 'b-platform', position: [23, .6, -22], size: [4, 1.2, 5], kind: 'crate' },
  { id: 'b-step-1', position: [23, .15, -17.6], size: [3.5, .3, 1], kind: 'step' },
  { id: 'b-step-2', position: [23, .3, -18.4], size: [3.5, .6, 1], kind: 'step' },
  { id: 'b-step-3', position: [23, .45, -19.2], size: [3.5, .9, 1], kind: 'step' },
];
export function boxFor(position: Vec3, size: Vec3) {
  const p = new Vector3(...position), half = new Vector3(...size).multiplyScalar(.5);
  return new Box3(p.clone().sub(half), p.clone().add(half));
}
export const WORLD_BOXES = BLOCKS.map(b => boxFor(b.position, b.size));
export function zoneAt(x: number, z: number): string {
  if (z > 15) return 'ATTACKER SPAWN';
  if (z < -21) return 'DEFENDER SPAWN';
  if (z < -12 && x < -12) return 'SITE A';
  if (z < -12 && x > 12) return 'SITE B';
  if (Math.abs(z) < 2.5 && x < -4) return 'VENT';
  if (Math.abs(z) < 2.5 && x > 4) return 'CONNECTOR';
  if (x < -12) return 'A MAIN';
  if (x > 12) return 'B MAIN';
  if (z < -8) return 'MID HALL';
  return 'MID';
}
export function plantSite(x: number, z: number): 'A' | 'B' | null {
  return Math.hypot(x + 18, z + 17) < 4.8 ? 'A' : Math.hypot(x - 18, z + 17) < 4.8 ? 'B' : null;
}
