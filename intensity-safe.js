(() => {
  'use strict';
  const frame = document.getElementById('celeste-frame');
  let installed = false;
  let observer = null;
  let last = 0;

  function install() {
    if (installed) return;
    const w = frame.contentWindow;
    const d = frame.contentDocument;
    if (!w || !d) return;
    const card = d.getElementById('rep-feedback-card');
    const counter = d.getElementById('count-session');
    if (!card || !counter) return;
    installed = true;

    const saved = w.localStorage.getItem('celeste_rep_intensity') || 'normal';
    const row = d.createElement('div');
    row.className = 'feedback-row';
    row.id = 'safe-intensity-row';
    row.style.marginTop = '10px';
    row.innerHTML = '<div class="feedback-label">Intensidad</div><select id="safe-intensity"><option value="normal">Normal</option><option value="strong">Fuerte</option><option value="very-strong">Muy fuerte</option></select>';

    const speed = d.querySelector('.feedback-slider');
    if (speed) card.insertBefore(row, speed); else card.appendChild(row);
    const sel = d.getElementById('safe-intensity');
    sel.value = saved;

    function apply(level, preview) {
      w.localStorage.setItem('celeste_rep_intensity', level);
      const vol = level === 'very-strong' ? 1 : level === 'strong' ? 0.7 : 0.35;
      w.localStorage.setItem('celeste_rep_volume', String(vol));
      const slider = d.getElementById('rep-volume');
      const label = d.getElementById('rep-volume-label');
      if (slider) slider.value = String(vol);
      if (label) label.textContent = Math.round(vol * 100) + '%';
      if (preview) {
        d.getElementById('rep-test-sound')?.click();
        const h = w.localStorage.getItem('celeste_rep_haptic') === '1';
        if (h && typeof navigator.vibrate === 'function') {
          const p = level === 'very-strong' ? [120,45,120,45,120] : level === 'strong' ? [70,35,70] : [35];
          try { navigator.vibrate(p); } catch (_) {}
        }
      }
    }

    sel.addEventListener('change', e => apply(e.target.value, true));
    apply(saved, false);

    // Keep the known-good sound engine untouched. For stronger haptics only,
    // add extra pulses on the same real counter events.
    last = parseInt(counter.textContent || '0', 10) || 0;
    observer = new MutationObserver(() => {
      const n = parseInt(counter.textContent || '0', 10) || 0;
      if (n <= last) { last = n; return; }
      const level = w.localStorage.getItem('celeste_rep_intensity') || 'normal';
      const haptic = w.localStorage.getItem('celeste_rep_haptic') === '1';
      const every = Math.max(1, parseInt(w.localStorage.getItem('celeste_rep_every') || '1', 10) || 1);
      if (level !== 'normal' && haptic && typeof navigator.vibrate === 'function') {
        for (let x = last + 1; x <= n; x++) {
          if (x % every === 0) {
            const p = level === 'very-strong' ? [120,45,120,45,120] : [70,35,70];
            try { navigator.vibrate(p); } catch (_) {}
          }
        }
      }
      last = n;
    });
    observer.observe(counter, { childList:true, characterData:true, subtree:true });
  }

  frame.addEventListener('load', () => {
    installed = false;
    if (observer) observer.disconnect();
    let tries = 0;
    const t = setInterval(() => { install(); if (installed || ++tries > 100) clearInterval(t); }, 100);
  });

  let tries = 0;
  const t = setInterval(() => { install(); if (installed || ++tries > 100) clearInterval(t); }, 100);
})();
