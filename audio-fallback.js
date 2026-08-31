(() => {
  'use strict';
  const frame = document.getElementById('celeste-frame');
  const BEEP = 'data:audio/wav;base64,UklGRqQHAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YYAHAAAAAKEBBAW1BsADEfwd81ruGvKS/uMO9hpyG/oNOPds4c7X1+BW+osZrS/jMIIa';

  // The short WAV above is only a bootstrap marker; create the real cue in-browser
  // with an <audio> element backed by a generated WAV Blob. This route is more
  // reliable on Android PWAs than relying only on WebAudio oscillators.
  function makeWav(freq = 880, ms = 120) {
    const sr = 8000, samples = Math.floor(sr * ms / 1000), bytes = 44 + samples * 2;
    const ab = new ArrayBuffer(bytes), v = new DataView(ab);
    const put = (o,s) => { for (let i=0;i<s.length;i++) v.setUint8(o+i,s.charCodeAt(i)); };
    put(0,'RIFF'); v.setUint32(4,bytes-8,true); put(8,'WAVE'); put(12,'fmt '); v.setUint32(16,16,true);
    v.setUint16(20,1,true); v.setUint16(22,1,true); v.setUint32(24,sr,true); v.setUint32(28,sr*2,true);
    v.setUint16(32,2,true); v.setUint16(34,16,true); put(36,'data'); v.setUint32(40,samples*2,true);
    for (let i=0;i<samples;i++) {
      const t=i/sr, env=Math.min(1,i/(sr*.006))*Math.max(0,1-i/samples);
      const x=Math.sin(2*Math.PI*freq*t) + .28*Math.sin(2*Math.PI*freq*2*t);
      v.setInt16(44+i*2, Math.max(-32767,Math.min(32767,Math.round(x*0.55*32767*env))), true);
    }
    return URL.createObjectURL(new Blob([ab],{type:'audio/wav'}));
  }

  function install() {
    const w = frame.contentWindow, d = frame.contentDocument;
    if (!w || !d || !d.body || w.__celesteHtmlAudioFallback) return false;
    const counter = d.getElementById('count-session');
    const test = d.getElementById('v2-test-sound');
    if (!counter || !test) return false;
    w.__celesteHtmlAudioFallback = true;

    const urls = { soft: makeWav(760,110), crystal: makeWav(1120,135), pop: makeWav(520,90) };
    const players = Object.fromEntries(Object.entries(urls).map(([k,u]) => {
      const a = new w.Audio(u); a.preload='auto'; a.playsInline=true; return [k,a];
    }));
    let last = parseInt(counter.textContent||'0',10)||0;

    const read = () => ({
      sound: w.localStorage.getItem('celeste_v2_sound') !== '0',
      every: Math.max(1,parseInt(w.localStorage.getItem('celeste_v2_every')||'1',10)||1),
      tone: w.localStorage.getItem('celeste_v2_tone') || 'soft',
      volume: Math.min(1,Math.max(.05,parseFloat(w.localStorage.getItem('celeste_v2_volume')||'.55')||.55)),
      intensity: w.localStorage.getItem('celeste_v2_intensity') || 'normal'
    });
    const status = txt => { const el=d.getElementById('v2-status'); if(!el)return; el.textContent=txt; clearTimeout(el.__af); el.__af=setTimeout(()=>el.textContent='',3000); };

    async function playOne(mult=1) {
      const s=read(), base=players[s.tone]||players.soft;
      const a=base.cloneNode(true); a.volume=Math.min(1,s.volume*mult); a.currentTime=0;
      try { await a.play(); return true; } catch(e) { return false; }
    }
    async function playCue() {
      const s=read();
      if (!s.sound) return false;
      if (s.intensity==='very-strong') {
        const ok=await playOne(1.65); setTimeout(()=>playOne(1.65),140); return ok;
      }
      if (s.intensity==='strong') return playOne(1.35);
      return playOne(1);
    }

    // Prime HTMLMediaElement playback from a real user gesture.
    d.addEventListener('pointerdown', () => {
      const a=players.soft; a.volume=.001;
      a.play().then(()=>{a.pause();a.currentTime=0;a.volume=1;}).catch(()=>{});
    }, {once:true,capture:true});

    test.onclick = async () => {
      const ok = await playCue();
      status(ok ? 'Sonido: reproducido por audio nativo ✓' : 'Sonido bloqueado por el navegador');
    };

    const obs = new w.MutationObserver(() => {
      const n=parseInt(counter.textContent||'0',10)||0, s=read();
      if (n>last && s.sound) {
        for(let x=last+1;x<=n;x++) if(x%s.every===0) playCue();
      }
      last=n;
    });
    obs.observe(counter,{childList:true,characterData:true,subtree:true});
    return true;
  }

  frame.addEventListener('load',()=>{let n=0;const t=setInterval(()=>{if(install()||++n>120)clearInterval(t);},100);});
  let n=0;const t=setInterval(()=>{if(install()||++n>120)clearInterval(t);},100);
})();