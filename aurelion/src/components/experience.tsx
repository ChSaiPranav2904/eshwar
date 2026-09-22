'use client';

import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, ArrowUpRight, Box, Check, CircleDot, Expand, Layers3, Maximize2, Menu, Minus, MoveUpRight, Pause, Play, Plus, RotateCcw, ScanLine, Settings2, Volume2, VolumeX, X } from 'lucide-react';
import { finishes, specifications, systems, type SystemId, type ViewMode } from '@/lib/vehicle';

const CarScene = dynamic(() => import('./car-scene'), { ssr: false });
class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? <div className="scene-fallback"><ScanLine size={32} /><p>3D is unavailable on this device.</p><span>Explore the R1 through the system controls and specifications.</span><button onClick={() => window.location.reload()}>Try again</button></div> : this.props.children; }
}
function Brand({ small = false }: { small?: boolean }) { return <a className={`brand ${small ? 'brand-small' : ''}`} href="#top" aria-label="AURELION home"><span className="brand-emblem">Λ<span /></span><span>AURELION</span></a>; }
const modeOptions: { id: ViewMode; label: string; icon: typeof Box }[] = [{ id: 'exterior', label: 'Exterior', icon: Box }, { id: 'xray', label: 'X-Ray', icon: ScanLine }, { id: 'exploded', label: 'Exploded', icon: Layers3 }];

function useEngineAudio(enabled: boolean, running: boolean, rpm: number) {
  const audio = useRef<{ context: AudioContext; oscillators: OscillatorNode[]; gain: GainNode } | null>(null);
  useEffect(() => {
    if (!enabled) { if (audio.current) { void audio.current.context.close(); audio.current = null; } return; }
    const context = new AudioContext();
    const gain = context.createGain(); gain.gain.value = 0.025;
    const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 400;
    filter.connect(gain); gain.connect(context.destination);
    const oscillators = [1, 1.5, 3].map((multiple, i) => { const osc = context.createOscillator(); osc.type = i === 0 ? 'sawtooth' : 'sine'; osc.frequency.value = 45 * multiple; osc.connect(filter); osc.start(); return osc; });
    audio.current = { context, oscillators, gain }; void context.resume().catch(() => undefined);
    return () => { void context.close(); audio.current = null; };
  }, [enabled]);
  useEffect(() => {
    if (!audio.current) return;
    audio.current.oscillators.forEach((o, i) => o.frequency.setTargetAtTime(rpm / 30 * [1, 1.5, 3][i], audio.current!.context.currentTime, 0.15));
    audio.current.gain.gain.setTargetAtTime(running ? 0.024 : 0, audio.current.context.currentTime, 0.1);
  }, [rpm, running, enabled]);
  useEffect(() => { const stop = () => { if (document.hidden && audio.current) void audio.current.context.suspend(); else if (audio.current) void audio.current.context.resume(); }; document.addEventListener('visibilitychange', stop); return () => document.removeEventListener('visibilitychange', stop); }, []);
}

export default function Experience() {
  const [mode, setMode] = useState<ViewMode>('exterior');
  const [finish, setFinish] = useState(0);
  const [selected, setSelected] = useState<SystemId | null>(null);
  const [hotspots, setHotspots] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [running, setRunning] = useState(false);
  const [track, setTrack] = useState(false);
  const [sound, setSound] = useState(false);
  const [rpm, setRpm] = useState(900);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [specsOpen, setSpecsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [focus, setFocus] = useState(false);
  const [cameraAction, setCameraAction] = useState<{ type: 'reset' | 'in' | 'out'; id: number }>({ type: 'reset', id: 0 });
  const [storySystem, setStorySystem] = useState<SystemId>('engine');
  const [driveMode, setDriveMode] = useState<'road' | 'track'>('road');
  const reducedMotion = !!useReducedMotion();
  const explorerRef = useRef<HTMLElement>(null);
  const specButtonRef = useRef<HTMLButtonElement>(null);
  const closeSpecRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const progressScale = useTransform(scrollYProgress, [0, 1], [0, 1]);
  useEngineAudio(sound, running, rpm);
  const onReady = useCallback(() => setReady(true), []);
  const onFailure = useCallback(() => { setFailed(true); setReady(true); }, []);
  const onInteraction = useCallback(() => setAutoRotate(false), []);
  const activeSystem = systems.find(s => s.id === selected);
  const story = systems.find(s => s.id === storySystem)!;
  const changeCamera = (type: 'reset' | 'in' | 'out') => setCameraAction(a => ({ type, id: a.id + 1 }));
  const selectSystem = useCallback((id: SystemId) => { setSelected(id); setMode('xray'); setHotspots(true); }, []);
  const explore = (id?: SystemId) => { if (id) selectSystem(id); else { setMode('xray'); setHotspots(true); } explorerRef.current?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth' }); };
  useEffect(() => {
    if (!specsOpen && !focus && !menuOpen) return;
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    if (specsOpen) closeSpecRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSpecsOpen(false); setFocus(false); setMenuOpen(false); }
      if (e.key === 'Tab' && specsOpen && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button, a[href], input, [tabindex="0"]');
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', key);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', key); if (specsOpen) specButtonRef.current?.focus(); };
  }, [specsOpen, focus, menuOpen]);
  return <>
    <a className="skip-link" href="#explorer-controls">Skip to explorer controls</a>
    <motion.div className="page-progress" style={{ scaleX: progressScale }} />
    <header className="header" inert={specsOpen}>
      <Brand />
      <nav aria-label="Main navigation" className="desktop-nav"><a className="nav-active" href="#top">The R1</a><a href="#engineering">Engineering</a><a href="#performance">Performance</a></nav>
      <button className="text-button header-cta" onClick={() => explore()}>Explore the R1 <ArrowUpRight size={15} /></button>
      <button className="icon-button mobile-menu" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen(v => !v)}>{menuOpen ? <X /> : <Menu />}</button>
    </header>
    <AnimatePresence>{menuOpen && <motion.nav initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mobile-nav" aria-label="Mobile navigation">{[['The R1', '#top'], ['Engineering', '#engineering'], ['Performance', '#performance']].map(([name, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{name}<ArrowUpRight size={22} /></a>)}</motion.nav>}</AnimatePresence>
    <main inert={menuOpen || specsOpen}>
      <section id="top" ref={explorerRef} className={`hero ${focus ? 'focus-view' : ''}`} aria-label="AURELION R1 interactive explorer">
        <div className="studio-glow" />
        <div className="hero-copy">
          <motion.div initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="eyebrow"><span className="orange-line" /> AURELION R1 <span className="muted-slash">/</span> ENGINEERED TO FEEL</motion.div>
          <motion.h1 initial={reducedMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.1 }}>INSIDE THE<br /><span>MACHINE.</span></motion.h1>
          <motion.p initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45, duration: 0.8 }}>Beyond the surface. Beneath the extraordinary.<br />Discover what moves you.</motion.p>
        </div>
        <div className="model-mark" aria-hidden="true">R1</div>
        <div className="hero-spec"><span className="spec-overline">PURE PERFORMANCE</span><strong>620<span>HP</span></strong><span className="spec-rule" /><p>4.0L twin-turbo flat-six</p><span className="edition-label">PRECISION IN EVERY DETAIL</span></div>
        <div className="scene-stage">
          <SceneBoundary onFailure={onFailure}><CarScene color={finishes[finish].color} mode={mode} selected={selected} running={running} rpm={rpm} track={track} autoRotate={autoRotate} reducedMotion={reducedMotion} hotspots={hotspots} cameraAction={cameraAction} onSelect={selectSystem} onReady={onReady} onInteraction={onInteraction} /></SceneBoundary>
          {!ready && <div className="scene-loading"><span className="loading-line" /><span>PREPARING THE R1</span></div>}
        </div>
        <div className="scene-caption"><span className="tiny-cross">+</span> AURELION R1 <span>/</span> {mode === 'exterior' ? 'EXTERIOR STUDY' : mode === 'xray' ? 'ENGINEERING STUDY' : 'COMPONENT STUDY'}</div>
        <div className="scene-actions">
          <button className={`icon-button ${autoRotate ? 'active' : ''}`} title="Auto rotate" aria-label={autoRotate ? 'Pause rotation' : 'Auto rotate'} aria-pressed={autoRotate} onClick={() => setAutoRotate(v => !v)}>{autoRotate ? <Pause size={17} /> : <RotateCcw size={17} />}</button>
          <span />
          <button className="icon-button" title="Zoom in" aria-label="Zoom in" onClick={() => changeCamera('in')}><Plus size={18} /></button>
          <button className="icon-button" title="Zoom out" aria-label="Zoom out" onClick={() => changeCamera('out')}><Minus size={18} /></button>
          <span />
          <button className="icon-button" title="Reset camera" aria-label="Reset camera" onClick={() => { changeCamera('reset'); setAutoRotate(false); }}><Expand size={17} /></button>
          <button className={`icon-button ${focus ? 'active' : ''}`} title="Focus view" aria-label={focus ? 'Exit focus view' : 'Enter focus view'} aria-pressed={focus} onClick={() => setFocus(v => !v)}>{focus ? <X size={17} /> : <Maximize2 size={16} />}</button>
        </div>
        <AnimatePresence>{activeSystem && <motion.aside key={activeSystem.id} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 18 }} transition={{ duration: reducedMotion ? 0 : 0.25 }} className="system-popover" aria-live="polite">
          <div className="popover-heading"><span className="eyebrow">SYSTEM {activeSystem.number}</span><button className="icon-button" aria-label="Close system details" onClick={() => setSelected(null)}><X size={17} /></button></div>
          <h2>{activeSystem.name}</h2><p>{activeSystem.description}</p><div className="popover-metric">{activeSystem.metric}<span>{activeSystem.unit}</span></div>
          <details><summary>How it works <Plus size={14} /></summary><p>{activeSystem.detail}</p></details>
          {activeSystem.id === 'engine' && <div className="engine-controls"><button className="small-button" onClick={() => setRunning(v => !v)}>{running ? <Pause size={14} /> : <Play size={14} />}{running ? 'Stop engine' : 'Run engine'}</button><label>Engine speed <span>{rpm.toLocaleString()} RPM</span><input aria-label="Engine speed" type="range" min="900" max="8000" step="100" value={rpm} onChange={e => setRpm(+e.target.value)} /></label><span className="micro-copy">Illustrative animation & synthesized sound</span></div>}
          {activeSystem.id === 'aero' && <button className={`small-button ${track ? 'active' : ''}`} onClick={() => setTrack(v => !v)}><MoveUpRight size={15} />{track ? 'Track wing deployed' : 'Deploy track wing'}</button>}
        </motion.aside>}</AnimatePresence>
        <div className="explorer-bottom" id="explorer-controls">
          <div className="explorer-meta"><span className="live-label"><i />{failed ? 'SYSTEM GUIDE' : 'INTERACTIVE 3D EXPERIENCE'}</span><span className="drag-hint"><CircleDot size={14} /> Drag to rotate <span>·</span> Explore every angle</span></div>
          <div className="control-bar">
            <div className="view-modes" role="group" aria-label="Visualization mode">{modeOptions.map(({ id, label, icon: Icon }) => <button key={id} aria-pressed={mode === id} onClick={() => { setMode(id); if (id === 'exterior') setSelected(null); }} className={mode === id ? 'selected' : ''}><Icon size={17} /><span>{label}</span></button>)}</div>
            <div className="control-divider" />
            <div className="finishes"><span className="finish-label">{finishes[finish].name}</span><div className="swatches" role="group" aria-label="Exterior finish">{finishes.map((f, i) => <button key={f.name} className={`swatch ${finish === i ? 'selected' : ''}`} aria-label={f.name} aria-pressed={finish === i} style={{ '--swatch': f.swatch } as React.CSSProperties} onClick={() => setFinish(i)}>{finish === i && <Check size={11} />}</button>)}</div></div>
            <div className="control-divider" />
            <button className={`hotspots-toggle ${hotspots ? 'active' : ''}`} aria-pressed={hotspots} onClick={() => setHotspots(v => !v)}><span className="toggle-track"><span /></span><span>Show hotspots</span></button>
            <button className={`icon-button sound-button ${sound ? 'active' : ''}`} aria-label={sound ? 'Mute engine sound' : 'Enable engine sound'} title={sound ? 'Mute engine sound' : 'Enable engine sound'} aria-pressed={sound} onClick={() => { setSound(v => !v); if (!sound) setRunning(true); }}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
          </div>
          <div className="hero-footer"><a href="#engineering"><span className="scroll-pill"><ArrowDown size={13} /></span> SCROLL TO DISCOVER</a><span>EVERY COMPONENT. <span>A PURPOSE.</span></span><span className="index-label">01 <span>/ 03</span></span></div>
        </div>
      </section>
      <section className="engineering section-shell" id="engineering">
        <div className="section-heading"><div><span className="eyebrow"><span className="orange-line" /> THE ART OF ENGINEERING</span><h2>Beauty is more<br />than skin deep.</h2></div><p>Six systems. Thousands of decisions.<br />One uncompromising connection<br />between driver and machine.</p><span className="section-index">02 / 03</span></div>
        <div className="engineering-layout">
          <div className="system-list" role="tablist" aria-label="Engineering systems" aria-orientation="vertical">{systems.map((s, index) => <button key={s.id} id={`tab-${s.id}`} role="tab" tabIndex={storySystem === s.id ? 0 : -1} aria-selected={storySystem === s.id} aria-controls="system-story" className={storySystem === s.id ? 'selected' : ''} onClick={() => setStorySystem(s.id)} onKeyDown={e => { if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return; e.preventDefault(); const next = e.key === 'Home' ? 0 : e.key === 'End' ? systems.length - 1 : (index + (e.key === 'ArrowDown' ? 1 : -1) + systems.length) % systems.length; setStorySystem(systems[next].id); document.getElementById(`tab-${systems[next].id}`)?.focus(); }}><span>{s.number}</span><span>{s.name}</span><ArrowUpRight size={19} /></button>)}</div>
          <div className="system-story" role="tabpanel" id="system-story" aria-labelledby={`tab-${storySystem}`}>
            <AnimatePresence mode="wait"><motion.div key={storySystem} initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <span className="eyebrow">{story.label}</span><h3>{story.title.split('\n').map((line, i) => <span key={line}>{line}{i === 0 && <br />}</span>)}</h3><p>{story.description}</p><p className="system-detail">{story.detail}</p><button className="text-button" onClick={() => explore(storySystem)}>Explore in 3D <ArrowUpRight size={17} /></button>
            </motion.div></AnimatePresence>
            <div className="system-number"><span>{story.metric}</span><span>{story.unit}</span></div><div className="system-footnote"><span className="tiny-cross">+</span>{story.fact}</div>
          </div>
        </div>
      </section>
      <section className="performance section-shell" id="performance">
        <div className="performance-top"><span className="eyebrow"><span className="orange-line" /> NUMBERS YOU CAN FEEL</span><span className="section-index">03 / 03</span></div>
        <div className="performance-title"><h2>Engineered for<br /><span>the extraordinary.</span></h2><button ref={specButtonRef} className="outline-button" onClick={() => setSpecsOpen(true)}>Full specifications <ArrowUpRight size={16} /></button></div>
        <div className="performance-stats">{[['620', 'HP', 'MAXIMUM POWER'], ['720', 'Nm', 'PEAK TORQUE'], ['2.9', 's', '0–100 KM/H'], ['326', 'km/h', 'TOP SPEED']].map(([value, unit, label]) => <div key={label}><span className="stat-label">{label}</span><p>{value}<span>{unit}</span></p></div>)}</div>
        <div className="drive-experience"><div><span className="eyebrow"><Settings2 size={14} /> TWO SIDES OF THE SAME MACHINE</span><h3>{driveMode === 'road' ? 'The long way home.' : 'Every apex. Every instinct.'}</h3><p>{driveMode === 'road' ? 'Compliant damping. A composed aero profile. The unmistakable response of the flat-six.' : 'Firmer damping. The active wing deployed. A sharper response to your next input.'}</p></div><div className="drive-mode-control"><div className="drive-mode-switch" role="group" aria-label="Driving mode"><button aria-pressed={driveMode === 'road'} className={driveMode === 'road' ? 'selected' : ''} onClick={() => { setDriveMode('road'); setTrack(false); }}>Road</button><button aria-pressed={driveMode === 'track'} className={driveMode === 'track' ? 'selected' : ''} onClick={() => { setDriveMode('track'); setTrack(true); }}>Track</button></div><button className="text-button" onClick={() => { selectSystem('aero'); setTrack(driveMode === 'track'); explorerRef.current?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth' }); }}>See the difference <ArrowUpRight size={16} /></button></div></div>
        <div className="closing-line"><span>FEEL THE ENGINEERING.</span><a href="#top">Meet the R1 again <ArrowUpRight size={19} /></a></div>
      </section>
    </main>
    <footer className="footer" inert={menuOpen || specsOpen}><Brand small /><span>© {new Date().getFullYear()} AURELION. An original concept.</span><span>DESIGNED TO MOVE YOU.</span><p>A fictional vehicle and illustrative engineering experience. Performance figures are concept specifications.</p></footer>
    <AnimatePresence>{specsOpen && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => { if (e.target === e.currentTarget) setSpecsOpen(false); }}><motion.div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="spec-title" className="spec-modal" initial={{ opacity: 0, y: reducedMotion ? 0 : 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}><div className="modal-heading"><span className="eyebrow">THE NUMBERS BEHIND THE FEELING</span><button ref={closeSpecRef} className="icon-button" aria-label="Close specifications" onClick={() => setSpecsOpen(false)}><X size={20} /></button></div><h2 id="spec-title">AURELION R1</h2><p className="modal-subtitle">Technical specifications</p><dl>{specifications.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="micro-copy">Fictional concept specifications. The 3D model demonstrates system layout and is not a manufacturing reference.</p></motion.div></motion.div>}</AnimatePresence>
  </>;
}


