(() => {
  'use strict';

  const frame = document.getElementById('celeste-frame');
  let installed = false;

  function install() {
    if (installed) return;
    const w = frame.contentWindow;
    const d = frame.contentDocument;
    if (!w || !d || !d.body) return;
    const card = d.getElementById('rep-feedback-card');
    const counter = d.getElementById('count-session');
    if (!card || !counter) return;
    installed = true;

    // Preserve the user's previous choices once, then silence the legacy feedback path.
    const prevSound = w.localStorage.getItem('celeste_v2_sound') ?? w.localStorage.getItem('celeste_rep_sound') ?? '1';
    const prevHaptic = w.localStorage.getItem('celeste_v2_haptic') ?? w.localStorage.getItem('celeste_rep_haptic') ?? '1';
    const prevEvery = w.localStorage.getItem('celeste_v2_every') ?? w.localStorage.getItem('celeste_rep_every') ?? '1';
    const prevTone = w.localStorage.getItem('celeste_v2_tone') ?? w.localStorage.getItem('celeste_rep_tone') ?? 'soft';
    const prevVolume = w.localStorage.getItem('celeste_v2_volume') ?? w.localStorage.getItem('celeste_rep_volume') ?? '.55';
    const prevIntensity = w.localStorage.getItem('celeste_v2_intensity') ?? w.localStorage.getItem('celeste_rep_intensity') ?? 'normal';

    w.localStorage.setItem('celeste_v2_sound', prevSound);
    w.localStorage.setItem('celeste_v2_haptic', prevHaptic);
    w.localStorage.setItem('celeste_v2_every', prevEvery);
    w.localStorage.setItem('celeste_v2_tone', prevTone);
    w.localStorage.setItem('celeste_v2_volume', prevVolume);
    w.localStorage.setItem('celeste_v2_intensity', prevIntensity);
    w.localStorage.setItem('celeste_rep_sound', '0');
    w.localStorage.setItem('celeste_rep_haptic', '0');

    const originalSpeed = d.getElementById('speed-slider');
    const speedValue = originalSpeed ? originalSpeed.value : '1.5';

    // Replace the old card completely so no old click handlers remain attached.
    const fresh = card.cloneNode(false);
    fresh.id = 'rep-feedback-card';
    fresh.className = card.className;
    fresh.innerHTML = `
      <div class="celeste-addon-title">🎧 Feedback sin mirar</div>
      <div class="feedback-grid">
        <div class="feedback-row"><div class="feedback-label">Sonido</div><select id="v2-tone"><option value="soft">Suave</option><option value="crystal">Cristal</option><option value="pop">Pop</option></select><div class="feedback-switch" id="v2-sound" role="switch"></div></div>
        <div class="feedback-row"><div class="feedback-label">Vibración</div><select id="v2-every"><option value="1">Cada 1</option><option value="5">Cada 5</option><option value="10">Cada 10</option><option value="25">Cada 25</option></select><div class="feedback-switch" id="v2-haptic" role="switch"></div></div>
      </div>
      <div class="feedback-row" style="margin-top:10px"><div class="feedback-label">Intensidad</div><select id="v2-intensity"><option value="normal">Normal</option><option value="strong">Fuerte</option><option value="very-strong">Muy fuerte</option></select></div>
      <div class="feedback-slider"><span>Velocidad robot</span><input id="v2-speed" type="range" min="0.5" max="5" step="0.1" value="${speedValue}"><span id="v2-speed-label">${speedValue}s</span></div>
      <div class="feedback-slider"><span>Volumen</span><input id="v2-volume" type="range" min="0.05" max="1" step="0.05"><span id="v2-volume-label"></span></div>
      <div class="feedback-test"><button id="v2-test-sound" type="button">🔉 Probar sonido</button><button id="v2-test-vibrate" type="button">📳 Probar vibración</button></div>
      <div class="feedback-hint">Este feedback corre dentro de la app, incluido el Modo Robótico.</div>
      <div class="feedback-status" id="v2-status"></div>
    `;
    card.replaceWith(fresh);

    // Inject the runtime inside the iframe itself. This is intentional: user activation,
    // AudioContext and navigator.vibrate now live in the same browsing context as the buttons.
    const script = d.createElement('script');
    script.textContent = `(() => {
      if (window.__celesteFeedbackV2) return;
      window.__celesteFeedbackV2 = true;
      let ctx = null;
      let lastCount = parseInt(document.getElementById('count-session')?.textContent || '0', 10) || 0;
      let observer = null;
      const ls = localStorage;
      const $ = id => document.getElementById(id);
      const read = () => ({
        sound: ls.getItem('celeste_v2_sound') !== '0',
        haptic: ls.getItem('celeste_v2_haptic') !== '0',
        every: Math.max(1, parseInt(ls.getItem('celeste_v2_every') || '1', 10) || 1),
        tone: ls.getItem('celeste_v2_tone') || 'soft',
        volume: Math.min(1, Math.max(.05, parseFloat(ls.getItem('celeste_v2_volume') || '.55') || .55)),
        intensity: ls.getItem('celeste_v2_intensity') || 'normal'
      });
      const status = text => { const el=$('v2-status'); if(!el)return; el.textContent=text; clearTimeout(el.__t); el.__t=setTimeout(()=>el.textContent='',2600); };
      const syncSwitches = () => { const s=read(); $('v2-sound')?.classList.toggle('on',s.sound); $('v2-haptic')?.classList.toggle('on',s.haptic); };
      async function audio() {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        if (!ctx) ctx = new AC();
        if (ctx.state === 'suspended') { try { await ctx.resume(); } catch(e) {} }
        return ctx;
      }
      async function sound(levelOverride) {
        const s=read(); const c=await audio(); if(!c || c.state!=='running') return false;
        const level=levelOverride || s.intensity; const now=c.currentTime;
        const base={soft:610,crystal:980,pop:370}[s.tone]||610;
        const cfg=level==='very-strong'?{freqs:[base,base*1.45,base*1.9],type:'square',dur:.17,gain:.55,repeats:2,gap:.10}:level==='strong'?{freqs:[base,base*1.5],type:'triangle',dur:.12,gain:.38,repeats:1,gap:0}:{freqs:[base],type:s.tone==='pop'?'triangle':'sine',dur:.075,gain:.22,repeats:1,gap:0};
        for(let r=0;r<cfg.repeats;r++) for(let i=0;i<cfg.freqs.length;i++){
          const o=c.createOscillator(),g=c.createGain(),start=now+r*(cfg.dur+cfg.gap)+i*.012;
          o.type=cfg.type; o.frequency.setValueAtTime(cfg.freqs[i],start); g.gain.setValueAtTime(.0001,start);
          g.gain.exponentialRampToValueAtTime(Math.max(.0001,s.volume*cfg.gain),start+.008); g.gain.exponentialRampToValueAtTime(.0001,start+cfg.dur);
          o.connect(g); g.connect(c.destination); o.start(start); o.stop(start+cfg.dur+.03);
        }
        return true;
      }
      function vibrate(levelOverride) {
        if (typeof navigator.vibrate !== 'function') return false;
        const level=levelOverride || read().intensity;
        const p=level==='very-strong'?[180,65,180,65,180]:level==='strong'?[100,45,100]:[35];
        try { return navigator.vibrate(p); } catch(e) { return false; }
      }
      async function emit(n) { const s=read(); if(!n || n%s.every!==0)return; if(s.haptic)vibrate(); if(s.sound)await sound(); }

      $('v2-tone').value=read().tone; $('v2-every').value=String(read().every); $('v2-intensity').value=read().intensity; $('v2-volume').value=String(read().volume); $('v2-volume-label').textContent=Math.round(read().volume*100)+'%'; syncSwitches();
      $('v2-sound').onclick=async()=>{const on=!read().sound;ls.setItem('celeste_v2_sound',on?'1':'0');syncSwitches();if(on){const ok=await sound();status(ok?'Sonido activado ✨':'Audio bloqueado: tocá Probar sonido');}};
      $('v2-haptic').onclick=()=>{const on=!read().haptic;ls.setItem('celeste_v2_haptic',on?'1':'0');syncSwitches();if(on)status(vibrate()?'Vibración activada ✨':'Vibración no disponible');};
      $('v2-tone').onchange=async e=>{ls.setItem('celeste_v2_tone',e.target.value);await sound();};
      $('v2-every').onchange=e=>ls.setItem('celeste_v2_every',e.target.value);
      $('v2-intensity').onchange=async e=>{ls.setItem('celeste_v2_intensity',e.target.value);if(read().sound)await sound();if(read().haptic)vibrate();status('Intensidad '+(e.target.value==='very-strong'?'muy fuerte':e.target.value==='strong'?'fuerte':'normal'));};
      $('v2-volume').oninput=e=>{ls.setItem('celeste_v2_volume',e.target.value);$('v2-volume-label').textContent=Math.round(Number(e.target.value)*100)+'%';};
      $('v2-test-sound').onclick=async()=>{const c=await audio();const ok=await sound();status('AudioContext: '+(c?.state||'no disponible')+' · '+(ok?'sonó':'no sonó'));};
      $('v2-test-vibrate').onclick=()=>status('Vibración API: '+(typeof navigator.vibrate==='function'?(vibrate()?'enviada':'rechazada'):'no disponible'));
      $('v2-speed').oninput=e=>{const original=$('speed-slider');const v=e.target.value;$('v2-speed-label').textContent=Number(v).toFixed(1).replace('.0','')+'s';if(original){original.value=v;original.dispatchEvent(new Event('input',{bubbles:true}));}};
      $('speed-slider')?.addEventListener('input',e=>{if($('v2-speed')){$('v2-speed').value=e.target.value;$('v2-speed-label').textContent=Number(e.target.value).toFixed(1).replace('.0','')+'s';}});

      const el=$('count-session');
      if(el){observer=new MutationObserver(()=>{const n=parseInt(el.textContent||'0',10)||0;if(n>lastCount){for(let x=lastCount+1;x<=n;x++)emit(x);}lastCount=n;});observer.observe(el,{childList:true,characterData:true,subtree:true});}
      document.addEventListener('pointerdown',()=>{audio();},{once:true,capture:true});
    })();`;
    d.body.appendChild(script);
  }

  frame.addEventListener('load', () => {
    installed = false;
    let tries = 0;
    const timer = setInterval(() => {
      install();
      if (installed || ++tries > 100) clearInterval(timer);
    }, 100);
  });

  let tries = 0;
  const timer = setInterval(() => {
    install();
    if (installed || ++tries > 100) clearInterval(timer);
  }, 100);
})();
