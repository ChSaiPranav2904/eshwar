import { create } from 'zustand';
import { arena } from '@/game/Arena';
import type { GameSnapshot } from '@/game/types';
export interface Settings { sensitivity:number; volume:number; graphics:'LOW'|'MEDIUM'|'HIGH'; crosshair:'DYNAMIC'|'STATIC'; fov:number }
export const defaultSettings:Settings={sensitivity:1,volume:.45,graphics:'MEDIUM',crosshair:'DYNAMIC',fov:80};
interface UIState {
  game:GameSnapshot; locked:boolean; paused:boolean; buyOpen:boolean; scoreboard:boolean; aiView:boolean; debug:boolean;
  panel:'none'|'settings'|'loadout'|'agent'|'guide'; ready:boolean; settings:Settings;
  sync:()=>void; set:(v:Partial<UIState>)=>void; updateSettings:(v:Partial<Settings>)=>void;
}
export const useGame=create<UIState>((set,get)=>({
  game:arena.snapshot(),locked:false,paused:false,buyOpen:false,scoreboard:false,aiView:false,debug:false,panel:'none',ready:false,settings:defaultSettings,
  sync:()=>set({game:arena.snapshot()}),set:(v)=>set(v),
  updateSettings:(v)=>{const settings={...get().settings,...v};set({settings});try{localStorage.setItem('astra-settings',JSON.stringify(settings));}catch{}},
}));
