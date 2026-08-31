(() => {
  'use strict';

  const frame = document.getElementById('celeste-frame');
  const veil = document.getElementById('privacy-veil');
  const showBtn = document.getElementById('privacy-show');
  const quickHide = document.getElementById('quick-hide');

  let app = null;
  let enhanced = false;
  let audioCtx = null;
  let lastSeenCount = 0;
  let countObserver = null;

  function ensureAudioContext() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  }

  function primeFeedback() {
    ensureAudioContext();
    try { if (navigator.vibrate) navigator.vibrate(1); } catch (_) {}
  }

  function showPrivacy() {
    veil.classList.remove('hidden');
    quickHide.style.display = 'none';
  }

  function reveal() {
    veil.classList.add('hidden');
    quickHide.style.display = 'block';
    primeFeedback();
    try { app?.unlockAppAudio?.('privacy-reveal'); } catch (_) {}
  }

  showBtn.addEventListener('click', reveal);
  quickHide.addEventListener('click', showPrivacy);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') showPrivacy();
  });
  window.addEventListener('pagehide', showPrivacy);

  function css(doc) {
    const s = doc.createElement('style');
    s.textContent = `
      .celeste-addon-section{background:rgba(255,255,255,.55);border:1px solid rgba(255,255,255,.72);border-radius:18px;padding:14px 16px;margin-bottom:14px}
      .celeste-addon-title{font-family:'Playfair Display',serif;font-size:15px;font-weight:700;color:var(--text);margin-bottom:12px;display:flex;align-items:center;gap:8px}
      .feedback-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .feedback-row{display:flex;align-items:center;gap:10px;min-height:42px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.72);border:1px solid rgba(255,255,255,.82)}
      .feedback-label{flex:1;font-size:12px;font-weight:800;color:var(--text)}
      .feedback-row select{min-width:105px;padding:7px 9px;border-radius:11px;border:1.5px solid rgba(255,133,161,.20);background:rgba(255,255,255,.86);font-family:'Nunito',sans-serif;font-size:11px;font-weight:800;color:var(--text);outline:none}
      .feedback-switch{width:38px;height:22px;border-radius:11px;background:rgba(200,200,220,.42);position:relative;cursor:pointer;flex-shrink:0;transition:background .22s}
      .feedback-switch.on{background:linear-gradient(135deg,var(--pink),#c97fff)}
      .feedback-switch::after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:white;box-shadow:0 1px 4px rgba(0,0,0,.15);transition:left .22s}
      .feedback-switch.on::after{left:19px}
      .feedback-slider{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.5);padding:10px 14px;border-radius:14px;margin-top:10px;font-size:12px;font-weight:800;color:var(--text)}
      .feedback-slider input{flex:1;accent-color:var(--pink)}
      .feedback-test{display:flex;gap:8px;margin-top:10px}
      .feedback-test button{flex:1;padding:9px 10px;border-radius:12px;border:1px solid rgba(0,0,0,.05);background:rgba(255,255,255,.82);color:var(--text);font-family:'Nunito',sans-serif;font-size:11px;font-weight:800;cursor:pointer}
      .feedback-hint{font-size:10px;color:var(--text-soft);font-weight:700;margin-top:9px;line-height:1.45;text-align:center}
      .feedback-status{margin-top:8px;min-height:16px;font-size:10px;font-weight:800;color:var(--text-soft);text-align:center}
      .heatmap-wrap{overflow-x:auto;padding:4px 2px 6px}
      .heatmap{display:grid;grid-template-rows:repeat(7,14px);grid-auto-flow:column;grid-auto-columns:14px;gap:4px;width:max-content;margin:0 auto}
      .heat-cell{width:14px;height:14px;border-radius:4px;background:rgba(160,150,175,.11);border:1px solid rgba(255,255,255,.72)}
      .heat-cell.l1{background:rgba(255,133,161,.24)}.heat-cell.l2{background:rgba(255,133,161,.44)}.heat-cell.l3{background:rgba(201,127,255,.60)}.heat-cell.l4{background:rgba(144,201,249,.84)}
      .heat-legend{display:flex;align-items:center;gap:5px;justify-content:flex-end;margin-top:8px;font-size:9px;color:var(--text-soft);font-weight:800}.heat-legend span{width:11px;height:11px;border-radius:3px;display:inline-block}
      .records-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.record-box{background:rgba(255,255,255,.80);border:1px solid rgba(255,255,255,.80);border-radius:16px;padding:12px 8px;text-align:center}.record-val{font-family:'Playfair Display',serif;font-size:20px;font-weight:900;background:linear-gradient(135deg,var(--pink),#b36fff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}.record-lbl{font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:var(--text-soft);font-weight:900;margin-top:3px}
      @media(max-width:520px){.feedback-grid{grid-template-columns:1fr}.records-grid{grid-template-columns:repeat(2,1fr)}.feedback-row select{min-width:96px}}
    `;
    doc.head.appendChild(s);
  }

  function settings() {
    return {
      sound: app.localStorage.getItem('celeste_rep_sound') === '1',
      haptic: app.localStorage.getItem('celeste_rep_haptic') === '1',
      every: Math.max(1, parseInt(app.localStorage.getItem('celeste_rep_every') || '1', 10) || 1),
      tone: app.localStorage.getItem('celeste_rep_tone') || 'soft',
      volume: Math.min(1, Math.max(.05, parseFloat(app.localStorage.getItem('celeste_rep_volume') || '.35') || .35))
    };
  }

  function save(k, v) { app.localStorage.setItem(k, String(v)); }

  function playFeedbackSound(tone, volume) {
    const ctx = ensureAudioContext();
    if (!ctx) return false;
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const tones = {
      soft: { f: 610, type: 'sine', d: .06 },
      crystal: { f: 980, type: 'sine', d: .09 },
      pop: { f: 370, type: 'triangle', d: .05 }
    };
    const c = tones[tone] || tones.soft;
    o.type = c.type;
    o.frequency.setValueAtTime(c.f, now);
    g.gain.setValueAtTime(.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(.0001, volume * .25), now + .006);
    g.gain.exponentialRampToValueAtTime(.0001, now + c.d);
    o.connect(g); g.connect(ctx.destination); o.start(now); o.stop(now + c.d + .02);
    return true;
  }

  function vibrateFeedback(pattern = 28) {
    if (!navigator.vibrate) return false;
    try { return navigator.vibrate(pattern); } catch (_) { return false; }
  }

  function emitFeedback(count) {
    const s = settings();
    if (!count || count % s.every !== 0) return;
    if (s.haptic) vibrateFeedback(30);
    if (s.sound) playFeedbackSound(s.tone, s.volume);
  }

  function setStatus(doc, text) {
    const el = doc.getElementById('rep-feedback-status');
    if (!el) return;
    el.textContent = text;
    clearTimeout(el.__timer);
    el.__timer = setTimeout(() => { el.textContent = ''; }, 2200);
  }

  function syncRobotSpeedFromOriginal(doc) {
    const original = doc.getElementById('speed-slider');
    const addon = doc.getElementById('rep-robot-speed');
    const label = doc.getElementById('rep-robot-speed-label');
    if (!original || !addon || !label) return;
    addon.value = original.value;
    label.textContent = Number(original.value).toFixed(1).replace('.0','') + 's';
  }

  function addFeedback(doc) {
    const timer = doc.querySelector('.affirm-timer-bar');
    if (!timer || doc.getElementById('rep-feedback-card')) return;
    const s = settings();
    const originalSpeed = doc.getElementById('speed-slider');
    const speedValue = originalSpeed ? originalSpeed.value : '1.5';
    const card = doc.createElement('div');
    card.className = 'celeste-addon-section';
    card.id = 'rep-feedback-card';
    card.innerHTML = `
      <div class="celeste-addon-title">🎧 Feedback sin mirar</div>
      <div class="feedback-grid">
        <div class="feedback-row"><div class="feedback-label">Sonido</div><select id="rep-tone"><option value="soft">Suave</option><option value="crystal">Cristal</option><option value="pop">Pop</option></select><div class="feedback-switch ${s.sound ? 'on' : ''}" id="rep-sound-switch" role="switch" aria-checked="${s.sound}"></div></div>
        <div class="feedback-row"><div class="feedback-label">Vibración</div><select id="rep-every"><option value="1">Cada 1</option><option value="5">Cada 5</option><option value="10">Cada 10</option><option value="25">Cada 25</option></select><div class="feedback-switch ${s.haptic ? 'on' : ''}" id="rep-haptic-switch" role="switch" aria-checked="${s.haptic}"></div></div>
      </div>
      <div class="feedback-slider"><span>Velocidad robot</span><input id="rep-robot-speed" type="range" min="0.5" max="5" step="0.1" value="${speedValue}"><span id="rep-robot-speed-label">${speedValue}s</span></div>
      <div class="feedback-slider"><span>Volumen</span><input id="rep-volume" type="range" min="0.05" max="1" step="0.05" value="${s.volume}"><span id="rep-volume-label">${Math.round(s.volume * 100)}%</span></div>
      <div class="feedback-test"><button id="rep-test-sound" type="button">🔉 Probar sonido</button><button id="rep-test-vibrate" type="button">📳 Probar vibración</button></div>
      <div class="feedback-hint">El feedback se dispara por el contador real de la sesión, también cuando avanza solo en Modo Robótico.</div>
      <div class="feedback-status" id="rep-feedback-status"></div>
    `;
    timer.parentNode.insertBefore(card, timer);

    const tone = doc.getElementById('rep-tone');
    const every = doc.getElementById('rep-every');
    const soundSwitch = doc.getElementById('rep-sound-switch');
    const hapticSwitch = doc.getElementById('rep-haptic-switch');
    tone.value = s.tone;
    every.value = String(s.every);

    soundSwitch.addEventListener('click', () => {
      const on = !soundSwitch.classList.contains('on');
      soundSwitch.classList.toggle('on', on);
      soundSwitch.setAttribute('aria-checked', String(on));
      save('celeste_rep_sound', on ? '1' : '0');
      primeFeedback();
      if (on) { playFeedbackSound(settings().tone, settings().volume); setStatus(doc, 'Sonido activado ✨'); }
    });

    hapticSwitch.addEventListener('click', () => {
      const on = !hapticSwitch.classList.contains('on');
      hapticSwitch.classList.toggle('on', on);
      hapticSwitch.setAttribute('aria-checked', String(on));
      save('celeste_rep_haptic', on ? '1' : '0');
      if (on) setStatus(doc, vibrateFeedback([35,25,35]) ? 'Vibración activada ✨' : 'Vibración no disponible en este navegador');
    });

    tone.addEventListener('change', e => { save('celeste_rep_tone', e.target.value); primeFeedback(); playFeedbackSound(e.target.value, settings().volume); });
    every.addEventListener('change', e => save('celeste_rep_every', e.target.value));
    doc.getElementById('rep-volume').addEventListener('input', e => { save('celeste_rep_volume', e.target.value); doc.getElementById('rep-volume-label').textContent = Math.round(Number(e.target.value) * 100) + '%'; });

    doc.getElementById('rep-robot-speed').addEventListener('input', e => {
      const original = doc.getElementById('speed-slider');
      const value = e.target.value;
      doc.getElementById('rep-robot-speed-label').textContent = Number(value).toFixed(1).replace('.0','') + 's';
      if (original) {
        original.value = value;
        original.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    if (originalSpeed) originalSpeed.addEventListener('input', () => syncRobotSpeedFromOriginal(doc));

    doc.getElementById('rep-test-sound').addEventListener('click', () => { primeFeedback(); setStatus(doc, playFeedbackSound(settings().tone, settings().volume) ? 'Sonido de prueba reproducido' : 'Audio no disponible'); });
    doc.getElementById('rep-test-vibrate').addEventListener('click', () => { setStatus(doc, vibrateFeedback([45,30,45]) ? 'Vibración de prueba enviada' : 'Vibración no disponible en este navegador'); });
  }

  function observeCounter(doc) {
    const el = doc.getElementById('count-session');
    if (!el) return;
    lastSeenCount = parseInt(el.textContent || '0', 10) || 0;
    if (countObserver) countObserver.disconnect();
    countObserver = new MutationObserver(() => {
      const count = parseInt(el.textContent || '0', 10) || 0;
      if (count > lastSeenCount) {
        for (let n = lastSeenCount + 1; n <= count; n++) emitFeedback(n);
      }
      lastSeenCount = count;
    });
    countObserver.observe(el, { childList: true, characterData: true, subtree: true });
  }

  function counts() {
    const out = {};
    for (let i = 0; i < app.localStorage.length; i++) {
      const k = app.localStorage.key(i);
      const m = k && k.match(/^celeste_daily_.+_(\d{4}-\d{2}-\d{2})$/);
      if (m) out[m[1]] = (out[m[1]] || 0) + (parseInt(app.localStorage.getItem(k), 10) || 0);
    }
    if (!Object.keys(out).length && app.getHistory) app.getHistory().forEach(e => {
      const d = new Date(e.ts);
      if (!Number.isNaN(d.getTime())) { const k = app.dateKey(d); out[k] = (out[k] || 0) + 1; }
    });
    return out;
  }

  function bestStreak(c) {
    const days = Object.keys(c).filter(k => c[k] > 0).sort();
    if (!days.length) return 0;
    let best = 1, cur = 1;
    for (let i = 1; i < days.length; i++) {
      const p = new Date(days[i - 1] + 'T12:00:00');
      p.setDate(p.getDate() + 1);
      if (app.dateKey(p) === days[i]) { cur++; best = Math.max(best, cur); } else cur = 1;
    }
    return best;
  }

  function bestWeek(c) {
    const sums = {};
    Object.entries(c).forEach(([day, n]) => {
      const d = new Date(day + 'T12:00:00');
      const dow = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - dow);
      const w = app.dateKey(d);
      sums[w] = (sums[w] || 0) + n;
    });
    return Math.max(0, ...Object.values(sums));
  }

  function renderHistoryVisual() {
    if (!app?.document) return;
    const c = counts(), doc = app.document;
    const r = doc.getElementById('enh-records'), map = doc.getElementById('enh-heatmap');
    if (r) {
      const vals = Object.values(c), best = vals.length ? Math.max(...vals) : 0, total = vals.reduce((a,b) => a+b, 0);
      r.innerHTML = `<div class="record-box"><div class="record-val">${best.toLocaleString()}</div><div class="record-lbl">Mejor día</div></div><div class="record-box"><div class="record-val">${bestStreak(c)}</div><div class="record-lbl">Racha récord</div></div><div class="record-box"><div class="record-val">${bestWeek(c).toLocaleString()}</div><div class="record-lbl">Mejor semana</div></div><div class="record-box"><div class="record-val">${total.toLocaleString()}</div><div class="record-lbl">Total registrado</div></div>`;
    }
    if (map) {
      map.innerHTML = '';
      const end = new Date(); end.setHours(12,0,0,0);
      const start = new Date(end); start.setDate(start.getDate() - 90); start.setDate(start.getDate() - start.getDay());
      const vals = Object.values(c).filter(n => n > 0).sort((a,b) => a-b), max = vals.length ? vals[vals.length - 1] : 1;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const k = app.dateKey(d), n = c[k] || 0, l = n ? Math.min(4, Math.max(1, Math.ceil(n / max * 4))) : 0;
        const cell = doc.createElement('div'); cell.className = 'heat-cell' + (l ? ' l' + l : ''); cell.title = `${d.toLocaleDateString('es-AR')}: ${n} repeticiones`; map.appendChild(cell);
      }
    }
  }

  function addHistory(doc) {
    const card = doc.querySelector('#tab-historial .card');
    if (!card || doc.getElementById('enh-history-visual')) return;
    const box = doc.createElement('div');
    box.id = 'enh-history-visual';
    box.innerHTML = `<div class="celeste-addon-section"><div class="celeste-addon-title">🏆 Récords</div><div class="records-grid" id="enh-records"></div></div><div class="celeste-addon-section"><div class="celeste-addon-title">🗓 Últimos 90 días</div><div class="heatmap-wrap"><div class="heatmap" id="enh-heatmap"></div></div><div class="heat-legend">menos <span style="background:rgba(255,133,161,.24)"></span><span style="background:rgba(255,133,161,.44)"></span><span style="background:rgba(201,127,255,.60)"></span><span style="background:rgba(144,201,249,.84)"></span> más</div></div>`;
    const title = card.querySelector('.section-title');
    title ? title.insertAdjacentElement('afterend', box) : card.prepend(box);
    renderHistoryVisual();
  }

  function patchHistoryTab() {
    const original = app.switchTab;
    if (!original || app.__historyVisualPatched) return;
    app.switchTab = function(name, btn) {
      const res = original.call(this, name, btn);
      if (name === 'historial') setTimeout(renderHistoryVisual, 0);
      return res;
    };
    app.__historyVisualPatched = true;
  }

  function unlock() {
    const doc = app.document;
    const lock = doc.getElementById('lock-screen'), main = doc.getElementById('main-app');
    if (lock) lock.style.display = 'none';
    if (main) { main.style.display = 'flex'; main.style.flexDirection = 'column'; main.style.alignItems = 'center'; main.style.width = '100%'; }
    doc.querySelector('.lock-exit-btn')?.remove();
    if (!app.__celesteInitFromWrapper) { app.__celesteInitFromWrapper = true; try { app.initApp?.(); } catch (e) { console.error(e); } }
  }

  function enhance() {
    if (enhanced) return;
    app = frame.contentWindow;
    if (!app || !app.document) return;
    enhanced = true;
    unlock();
    css(app.document);
    addFeedback(app.document);
    addHistory(app.document);
    observeCounter(app.document);
    patchHistoryTab();
    renderHistoryVisual();
  }

  frame.addEventListener('load', enhance);
  setTimeout(() => { if (!enhanced && frame.contentDocument?.readyState === 'complete') enhance(); }, 800);
})();
