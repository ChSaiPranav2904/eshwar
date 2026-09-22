type Sound = 'rifle'|'pistol'|'knife'|'reload'|'step'|'hit'|'headshot'|'ability'|'plant'|'tick'|'explosion'|'win'|'lose'|'click';
class SoundSystem {
  private context: AudioContext | null=null;
  volume=.45;
  async unlock() {
    try { if(!this.context) this.context=new AudioContext(); if(this.context.state==='suspended') await this.context.resume(); } catch { /* Silent play is supported. */ }
  }
  play(sound: Sound, pan=0) {
    const ctx=this.context; if(!ctx||ctx.state!=='running'||this.volume<=0) return;
    const t=ctx.currentTime, gain=ctx.createGain(), panner=ctx.createStereoPanner();
    panner.pan.value=Math.max(-1,Math.min(1,pan)); gain.connect(panner);panner.connect(ctx.destination);
    const noisy=['rifle','pistol','step','explosion','knife'].includes(sound);
    const duration=sound==='explosion'?.85:sound==='step'?.06:noisy?.14:sound==='reload'?.18:.12;
    gain.gain.setValueAtTime(this.volume*(sound==='step'?.06:noisy?.32:.12),t);
    gain.gain.exponentialRampToValueAtTime(.001,t+duration);
    if(noisy) {
      const buffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);
      for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*(1-i/data.length);
      const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=sound==='step'?250:sound==='explosion'?500:2200;
      source.connect(filter);filter.connect(gain);source.start(t);source.stop(t+duration);
    } else {
      const source=ctx.createOscillator();source.type=sound==='reload'?'triangle':'sine';
      const frequency={reload:180,hit:600,headshot:1100,ability:370,plant:720,tick:1300,win:660,lose:180,click:480}[sound as Exclude<Sound,'rifle'|'pistol'|'step'|'explosion'|'knife'>]??400;
      source.frequency.setValueAtTime(frequency,t);source.frequency.exponentialRampToValueAtTime(frequency*(sound==='win'?1.5:.6),t+duration);
      source.connect(gain);source.start(t);source.stop(t+duration);
    }
  }
}
export const sound=new SoundSystem();
