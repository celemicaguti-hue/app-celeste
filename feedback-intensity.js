(() => {
  'use strict';

  const frame = document.getElementById('celeste-frame');
  let app = null;
  let observer = null;
  let lastCount = 0;
  let ctx = null;

  function getIntensity() {
    return app?.localStorage?.getItem('celeste_rep_intensity') || 'normal';
  }

  function setIntensity(value) {
    app?.localStorage?.setItem('celeste_rep_intensity', value);
  }

  function ensureAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function playStrongSound(level) {
    const audio = ensureAudio();
    if (!audio) return false;
    const now = audio.currentTime;
    const cfg = level === 'very-strong'
      ? { freqs:[520,780,1040], type:'square', dur:.18, gain:.7, repeats:2, gap:.11 }
      : { freqs:[620,930], type:'triangle', dur:.12, gain:.48, repeats:1, gap:0 };

    for (let r = 0; r < cfg.repeats; r++) {
      const offset = r * (cfg.dur + cfg.gap);
      cfg.freqs.forEach((freq, i) => {
        const o = audio.createOscillator();
        const g = audio.createGain();
        const start = now + offset + i * .012;
        o.type = cfg.type;
        o.frequency.setValueAtTime(freq, start);
        g.gain.setValueAtTime(.0001, start);
        g.gain.exponentialRampToValueAtTime(cfg.gain, start + .008);
        g.gain.exponentialRampToValueAtTime(.0001, start + cfg.dur);
        o.connect(g); g.connect(audio.destination);
        o.start(start); o.stop(start + cfg.dur + .03);
      });
    }
    return true;
  }

  function vibrateStrong(level) {
    if (!navigator.vibrate) return false;
    const pattern = level === 'very-strong'
      ? [180,70,180,70,180]
      : [100,45,100];
    try { return navigator.vibrate(pattern); } catch (_) { return false; }
  }

  function settings() {
    if (!app) return { sound:false, haptic:false, every:1 };
    return {
      sound: app.localStorage.getItem('celeste_rep_sound') === '1',
      haptic: app.localStorage.getItem('celeste_rep_haptic') === '1',
      every: Math.max(1, parseInt(app.localStorage.getItem('celeste_rep_every') || '1', 10) || 1)
    };
  }

  function emitExtra(count) {
    const intensity = getIntensity();
    if (intensity === 'normal') return;
    const s = settings();
    if (!count || count % s.every !== 0) return;
    if (s.sound) playStrongSound(intensity);
    if (s.haptic) vibrateStrong(intensity);
  }

  function setStatus(doc, text) {
    const el = doc.getElementById('rep-feedback-status');
    if (!el) return;
    el.textContent = text;
    clearTimeout(el.__strongTimer);
    el.__strongTimer = setTimeout(() => { el.textContent = ''; }, 2200);
  }

  function injectUI(doc) {
    const card = doc.getElementById('rep-feedback-card');
    if (!card || doc.getElementById('rep-intensity-row')) return;

    const row = doc.createElement('div');
    row.className = 'feedback-row';
    row.id = 'rep-intensity-row';
    row.style.marginTop = '10px';
    row.innerHTML = `
      <div class="feedback-label">Intensidad</div>
      <select id="rep-intensity" aria-label="Intensidad del feedback" style="flex:0 0 auto">
        <option value="normal">Normal</option>
        <option value="strong">Fuerte</option>
        <option value="very-strong">Muy fuerte</option>
      </select>
      <button id="rep-test-intensity" type="button" style="padding:7px 10px;border-radius:11px;border:1px solid rgba(0,0,0,.05);background:rgba(255,255,255,.88);font-family:'Nunito',sans-serif;font-size:11px;font-weight:800;color:var(--text);cursor:pointer">Probar</button>
    `;

    const sliders = card.querySelector('.feedback-slider');
    if (sliders) card.insertBefore(row, sliders);
    else card.appendChild(row);

    const select = doc.getElementById('rep-intensity');
    select.value = getIntensity();
    select.addEventListener('change', e => {
      setIntensity(e.target.value);
      ensureAudio();
      if (e.target.value !== 'normal') {
        playStrongSound(e.target.value);
        vibrateStrong(e.target.value);
      }
      setStatus(doc, e.target.value === 'normal' ? 'Intensidad normal' : e.target.value === 'strong' ? 'Feedback fuerte activado' : 'Feedback muy fuerte activado');
    });

    doc.getElementById('rep-test-intensity').addEventListener('click', () => {
      const level = getIntensity();
      if (level === 'normal') {
        setStatus(doc, 'Elegí Fuerte o Muy fuerte para probarlo');
        return;
      }
      ensureAudio();
      const s = settings();
      if (s.sound) playStrongSound(level);
      if (s.haptic) vibrateStrong(level);
      setStatus(doc, 'Prueba de intensidad enviada');
    });

    const hint = card.querySelector('.feedback-hint');
    if (hint) hint.textContent = 'Si estás escuchando música o haciendo otra cosa, usá Fuerte o Muy fuerte. La señal extra se aplica también en Modo Robótico.';
  }

  function observe(doc) {
    const el = doc.getElementById('count-session');
    if (!el) return;
    lastCount = parseInt(el.textContent || '0', 10) || 0;
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => {
      const count = parseInt(el.textContent || '0', 10) || 0;
      if (count > lastCount) {
        for (let n = lastCount + 1; n <= count; n++) emitExtra(n);
      }
      lastCount = count;
    });
    observer.observe(el, { childList:true, characterData:true, subtree:true });
  }

  function init() {
    app = frame.contentWindow;
    if (!app?.document) return;
    const doc = app.document;
    const wait = setInterval(() => {
      if (doc.getElementById('rep-feedback-card')) {
        clearInterval(wait);
        injectUI(doc);
        observe(doc);
      }
    }, 120);
    setTimeout(() => clearInterval(wait), 10000);
  }

  frame.addEventListener('load', init);
  setTimeout(() => { if (frame.contentDocument?.readyState === 'complete') init(); }, 900);
})();
