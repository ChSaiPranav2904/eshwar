export type WeaponId = 'rifle' | 'pistol' | 'knife' | 'core';
export const WEAPONS = {
  rifle: { name: 'VX-7 RIFLE', magazine: 25, reserve: 75, head: 150, body: 38, leg: 30, interval: .112, reload: 2.1, price: 2900, range: 90 },
  pistol: { name: 'K-9 PISTOL', magazine: 12, reserve: 48, head: 110, body: 35, leg: 28, interval: .26, reload: 1.65, price: 500, range: 60 },
  knife: { name: 'COMBAT BLADE', magazine: 0, reserve: 0, head: 100, body: 65, leg: 65, interval: .55, reload: 0, price: 0, range: 2.6 },
  core: { name: 'CORE DEVICE', magazine: 0, reserve: 0, head: 0, body: 0, leg: 0, interval: 1, reload: 0, price: 0, range: 0 },
};
export type AbilityId = 'wall' | 'flash' | 'dash' | 'overdrive';
export const ABILITIES = {
  wall: { key: 'C', name: 'ENERGY WALL', description: 'An 8-second barrier that blocks sight and bullets.', cooldown: 24 },
  flash: { key: 'Q', name: 'FLASH PULSE', description: 'A thrown pulse blinds defenders facing its detonation.', cooldown: 16 },
  dash: { key: 'E', name: 'PHASE DASH', description: 'A short burst of speed in your facing direction.', cooldown: 12 },
  overdrive: { key: 'X', name: 'OVERDRIVE', description: '10 seconds of faster movement, reloads, and steadier recoil.', cooldown: 55 },
};
