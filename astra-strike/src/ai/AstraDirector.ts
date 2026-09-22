import type { Analysis, RoundStats, Strategy } from '@/game/types';
import type { Vec3 } from '@/config/map';
export function analyze(history: RoundStats[]): Analysis {
  const rounds = history.slice(-4), n = Math.max(1, rounds.length);
  const sum = (key: keyof RoundStats) => rounds.reduce((s, r) => s + (typeof r[key] === 'number' ? r[key] as number : 0), 0);
  const duration = Math.max(1, sum('combatTime'));
  const aggression = Math.min(100, Math.round(sum('runTime') / duration * 100));
  const midUsage = Math.round(sum('midTime') / duration * 100);
  const a = rounds.filter(r => r.plant === 'A' || r.route === 'A MAIN').length / n * 100;
  const b = rounds.filter(r => r.plant === 'B' || r.route === 'B MAIN').length / n * 100;
  const flanks = Math.min(100, Math.round(sum('flanks') / n * 50));
  const accuracy = Math.round(sum('hits') / Math.max(1, sum('shots')) * 100);
  let strategy: Strategy = 'BALANCED', pattern = 'BUILDING YOUR PROFILE';
  let adaptations = ['Split site coverage', 'Hold crossfire at Mid', 'Rotate only on confirmed information'];
  if (rounds.length) {
    if (flanks >= 50) { strategy = 'FLANK WATCH'; pattern = 'FLANK ROUTE DETECTED'; adaptations = ['A sentinel watches Vent', 'Connector patrol active', 'Defenders protect their rear angles']; }
    else if (a >= 60) { strategy = 'STACK A'; pattern = 'SITE A BIAS'; adaptations = ['Two defenders reinforce A', 'Support shifts into A Main', 'One sentinel retains B coverage']; }
    else if (b >= 60) { strategy = 'STACK B'; pattern = 'SITE B BIAS'; adaptations = ['Two defenders reinforce B', 'Support shifts into Connector', 'One sentinel retains A coverage']; }
    else if (midUsage >= 35 || rounds.filter(r => r.rush).length / n >= .5) { strategy = 'MID CONTROL'; pattern = 'MID RUSH PATTERN'; adaptations = ['A defender holds Mid Hall', 'Earlier rotation through Connector', 'A second angle covers the Mid push']; }
    else if (aggression > 55) { strategy = 'PASSIVE HOLD'; pattern = 'FAST ENTRY DETECTED'; adaptations = ['Defenders fall back to site cover', 'Longer engagement distances', 'Crossfire held until visual contact']; }
    else if (rounds.some(r => r.plant)) { strategy = 'AGGRESSIVE RETAKE'; pattern = 'METHODICAL SITE ENTRY'; adaptations = ['Faster coordinated retake', 'Nearest sentinel assigned to defuse', 'Support screens the planted Core']; }
    else { pattern = 'DISTRIBUTED ENTRY'; }
  }
  const routes = rounds.reduce<Record<string, number>>((acc, r) => { acc[r.route] = (acc[r.route] ?? 0) + 1; return acc; }, {});
  return { strategy, pattern, confidence: Math.min(96, 38 + rounds.length * 13), aggression, midUsage, siteA: Math.round(a), flanks, accuracy, route: Object.entries(routes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'UNDETERMINED', adaptations };
}
const placements: Record<Strategy, Vec3[]> = {
  'BALANCED': [[-18,0,-20],[18,0,-20],[-2.8,0,-11],[16,0,-5]],
  'PASSIVE HOLD': [[-20,0,-22],[20,0,-22],[-2,0,-23],[3,0,-14]],
  'MID CONTROL': [[-17,0,-20],[18,0,-20],[-3,0,-9],[3,0,-5]],
  'STACK A': [[-19,0,-20],[-16,0,-10],[-20,0,-5],[18,0,-20]],
  'STACK B': [[18,0,-20],[16,0,-9],[20,0,-5],[-18,0,-20]],
  'FLANK WATCH': [[-18,0,-18],[18,0,-18],[-15,0,0],[15,0,0]],
  'AGGRESSIVE RETAKE': [[-18,0,-12],[18,0,-12],[-3,0,-14],[3,0,-18]],
};
export function ordersFor(strategy: Strategy): Vec3[] { return placements[strategy].map(p => [...p]); }
export function coach(history: RoundStats[], analysis: Analysis): string {
  if (!history.length) return 'Vary your entry route, clear corners, and use a Flash Pulse before committing to a site.';
  const count = history.filter(r => r.route === analysis.route).length;
  return `You used ${analysis.route} in ${Math.round(count / history.length * 100)}% of rounds. The director responded with ${analysis.strategy.toLowerCase()}. ${analysis.accuracy < 25 ? 'Stop moving before firing to tighten your spread.' : 'Keep your first burst short and aim at head height.'} ${analysis.flanks < 25 ? 'Try Vent or Connector to change your next entry angle.' : 'Vary the timing of your flank to avoid the rear guard.'}`;
}
