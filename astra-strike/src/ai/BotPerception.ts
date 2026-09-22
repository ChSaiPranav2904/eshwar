import { Ray, Vector3 } from 'three';
import { WORLD_BOXES, boxFor, type Vec3 } from '@/config/map';
import type { Wall } from '@/game/types';
const ray = new Ray(), hit = new Vector3();
export function clearSight(from: Vec3, to: Vec3, walls: Wall[] = []) {
  const a=new Vector3(...from),b=new Vector3(...to),distance=a.distanceTo(b);
  ray.set(a,b.sub(a).normalize());
  for(const box of WORLD_BOXES) if(ray.intersectBox(box,hit)&&hit.distanceTo(a)<distance-.08) return false;
  for(const wall of walls) if(ray.intersectBox(boxFor(wall.position,wall.size),hit)&&hit.distanceTo(a)<distance-.08) return false;
  return true;
}
