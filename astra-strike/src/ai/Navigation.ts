import { BLOCKS, type Vec3 } from '@/config/map';
const SIZE = 49, OFFSET = 24;
export function walkable(x: number, z: number, radius = .48) {
  if (Math.abs(x) > 24.8 || Math.abs(z) > 24.8) return false;
  return !BLOCKS.some(b => Math.abs(x - b.position[0]) < b.size[0] / 2 + radius && Math.abs(z - b.position[2]) < b.size[2] / 2 + radius);
}
const encode = (x: number, z: number) => (z + OFFSET) * SIZE + x + OFFSET;
const decode = (v: number): [number, number] => [v % SIZE - OFFSET, Math.floor(v / SIZE) - OFFSET];
function nearest(p: Vec3): [number, number] {
  const x = Math.max(-24, Math.min(24, Math.round(p[0]))), z = Math.max(-24, Math.min(24, Math.round(p[2])));
  if (walkable(x, z)) return [x,z];
  for (let r=1;r<8;r++) for(let a=-r;a<=r;a++) for(let b=-r;b<=r;b++) if(walkable(x+a,z+b)) return [x+a,z+b];
  return [0,21];
}
export function findPath(from: Vec3, to: Vec3): Vec3[] {
  const [sx,sz]=nearest(from), [tx,tz]=nearest(to), start=encode(sx,sz), end=encode(tx,tz);
  const queue=[start], parents=new Map<number,number>([[start,-1]]);
  for(let i=0;i<queue.length;i++) {
    const current=queue[i];
    if(current===end) { const path: Vec3[]=[]; let c=current; while(c!==start) { const [x,z]=decode(c); path.push([x,0,z]); c=parents.get(c)!; } return path.reverse(); }
    const [x,z]=decode(current);
    for(const [dx,dz] of [[0,-1],[1,0],[0,1],[-1,0]]) {
      const nx=x+dx,nz=z+dz,key=encode(nx,nz);
      if(Math.abs(nx)>24||Math.abs(nz)>24||parents.has(key)||!walkable(nx,nz)) continue;
      parents.set(key,current);queue.push(key);
    }
  }
  return [];
}
