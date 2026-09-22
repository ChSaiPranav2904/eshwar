import type { Vec3 } from '@/config/map';
import type { WeaponId, AbilityId } from '@/config/weapons';
export type Phase = 'menu' | 'buy' | 'combat' | 'planted' | 'roundEnd' | 'analysis' | 'matchEnd' | 'training';
export type Strategy = 'BALANCED' | 'PASSIVE HOLD' | 'MID CONTROL' | 'STACK A' | 'STACK B' | 'FLANK WATCH' | 'AGGRESSIVE RETAKE';
export type BotState = 'IDLE' | 'PATROL' | 'HOLD' | 'INVESTIGATE' | 'ENGAGE' | 'RETREAT' | 'ROTATE' | 'DEFUSE' | 'FLANK';
export interface Bot {
  id: number; name: string; position: Vec3; health: number; state: BotState; yaw: number;
  target: Vec3; anchor: Vec3; path: Vec3[]; repathAt: number; nextShot: number;
  seenAt: number; lastSeen: Vec3 | null; knownUntil: number; reaction: number;
  blindUntil: number; hitAt: number; defuse: number; abilityUsed: boolean; respawnAt: number;
}
export interface RoundStats {
  shots: number; hits: number; headshots: number; kills: number; damage: number;
  movingTime: number; runTime: number; midTime: number; combatTime: number;
  distanceSum: number; abilities: number; flanks: number; rush: boolean;
  route: string; plant: 'A' | 'B' | null; weapons: Record<WeaponId, number>;
}
export interface Analysis {
  strategy: Strategy; pattern: string; confidence: number; aggression: number; midUsage: number;
  siteA: number; flanks: number; accuracy: number; route: string; adaptations: string[];
}
export interface Effect { id: number; type: 'tracer' | 'impact' | 'flash' | 'pulse' | 'smoke'; from: Vec3; to: Vec3; life: number; total: number; enemy?: boolean }
export interface Wall { position: Vec3; size: Vec3; until: number; enemy?: boolean }
export interface GameSnapshot {
  phase: Phase; training: boolean; round: number; time: number; score: [number, number];
  health: number; armor: number; credits: number; weapon: WeaponId; ammo: number; reserve: number;
  reloading: number; reloadDuration: number; kills: number; deaths: number; total: RoundStats;
  enemies: { id: number; health: number; state: BotState; position: Vec3; known: boolean; defuse: number; blind: boolean }[];
  core: { status: 'carried' | 'planted' | 'detonated' | 'defused'; position: Vec3; site: 'A' | 'B' | null; timer: number; progress: number };
  player: Vec3; yaw: number; zone: string; plantZone: 'A' | 'B' | null; speed: number;
  grounded: boolean; recoil: number; hitMarker: string; hitUntil: number; damageFlash: number;
  feed: { id: number; source: string; target: string; weapon: string; headshot: boolean; until: number }[];
  abilities: Record<AbilityId, number>; charges: { flash: number; wall: number }; overdrive: number;
  analysis: Analysis; roundWon: boolean; reason: string; killer: string; notification: string;
  ownedRifle: boolean; epoch: number; clock: number; stats: RoundStats;
}
export const freshStats = (): RoundStats => ({ shots: 0, hits: 0, headshots: 0, kills: 0, damage: 0, movingTime: 0, runTime: 0, midTime: 0, combatTime: 0, distanceSum: 0, abilities: 0, flanks: 0, rush: false, route: 'MID', plant: null, weapons: { rifle: 0, pistol: 0, knife: 0, core: 0 } });
