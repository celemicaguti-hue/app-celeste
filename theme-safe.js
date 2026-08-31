(() => {
  'use strict';

  const frame = document.getElementById('celeste-frame');
  const STORAGE_KEY = 'celeste_theme_mode';
  let installedDoc = null;

  function getMode() {
    try { return localStorage.getItem(STORAGE_KEY) || 'light'; } catch (_) { return 'light'; }
  }

  function setMode(mode) {
    try { localStorage.setItem(STORAGE_KEY, mode); } catch (_) {}
    applyOuter(mode);
    if (frame.contentDocument) applyInner(frame.contentDocument, mode);
  }

  function applyOuter(mode) {
    document.documentElement.dataset.celesteTheme = mode;
    const oled = mode === 'oled';
    const dark = mode === 'dark';
    document.body.style.background = oled ? '#000000' : dark ? '#101014' : '#f7eef7';
    frame.style.background = oled ? '#000000' : dark ? '#101014' : '#ffffff';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', oled ? '#000000' : dark ? '#101014' : '#ff85a1');
    const veil = document.getElementById('privacy-veil');
    if (veil) {
      veil.style.background = oled ? '#000000' : dark ? 'linear-gradient(135deg,#18131b,#111923,#101c19)' : 'linear-gradient(135deg,#f7dce8 0%,#dceeff 52%,#e0f3ec 100%)';
    }
    const card = document.querySelector('.privacy-card');
    if (card) {
      card.style.background = oled ? '#050505' : dark ? 'rgba(28,28,34,.95)' : 'rgba(255,255,255,.82)';
      card.style.borderColor = oled ? '#161616' : dark ? '#39343f' : 'rgba(255,255,255,.95)';
    }
    document.querySelectorAll('.privacy-title').forEach(el => el.style.color = (dark || oled) ? '#f7eef7' : '#443a54');
    document.querySelectorAll('.privacy-sub').forEach(el => el.style.color = (dark || oled) ? '#aaa4b2' : '#8d8799');
  }

  function ensureStyle(doc) {
    let style = doc.getElementById('celeste-theme-safe-style');
    if (style) return style;
    style = doc.createElement('style');
    style.id = 'celeste-theme-safe-style';
    style.textContent = `
      #celeste-theme-control{display:flex;justify-content:center;gap:6px;flex-wrap:wrap;margin:0 auto 14px;width:min(100%,var(--panel-max-width));}
      #celeste-theme-control button{border:1px solid rgba(255,133,161,.18);border-radius:13px;padding:8px 11px;background:rgba(255,255,255,.68);font-family:'Nunito',sans-serif;font-weight:800;font-size:11px;color:var(--text-soft);cursor:pointer;}
      #celeste-theme-control button.active{background:linear-gradient(135deg,var(--pink),#c97fff);color:#fff;border-color:transparent;}

      body.celeste-dark{background:#101014 !important;color:#eeeaf2 !important;}
      body.celeste-dark:before,body.celeste-dark:after{display:none !important;}
      body.celeste-dark{--glass:rgba(30,30,36,.88);--glass-strong:rgba(39,39,46,.96);--text:#f2edf5;--text-soft:#aaa4b2;--shadow:0 8px 28px rgba(0,0,0,.30);}
      body.celeste-dark .card,body.celeste-dark .tab-bar,body.celeste-dark .celeste-addon-section{background:rgba(28,28,34,.94) !important;border-color:#3a3640 !important;box-shadow:var(--shadow) !important;}
      body.celeste-dark .affirmation-display,body.celeste-dark .feedback-row,body.celeste-dark .feedback-slider,body.celeste-dark .record-box,body.celeste-dark input,body.celeste-dark select,body.celeste-dark textarea,body.celeste-dark .pill{background:#25252c !important;border-color:#3d3943 !important;color:#f2edf5 !important;}
      body.celeste-dark .tab-btn:not(.active),body.celeste-dark .btn-sec,body.celeste-dark .feedback-test button{background:#25252c !important;color:#d8d2df !important;border-color:#3d3943 !important;}
      body.celeste-dark #celeste-theme-control button{background:#25252c;color:#d8d2df;border-color:#3d3943;}
      body.celeste-dark #celeste-theme-control button.active{background:linear-gradient(135deg,var(--pink),#c97fff);color:#fff;}

      body.celeste-oled{background:#000000 !important;color:#f5f5f7 !important;}
      body.celeste-oled:before,body.celeste-oled:after{display:none !important;}
      body.celeste-oled{--glass:#000000;--glass-strong:#070707;--text:#f5f5f7;--text-soft:#aaa6ad;--shadow:none;}
      body.celeste-oled .card,body.celeste-oled .tab-bar,body.celeste-oled .celeste-addon-section{background:#000000 !important;border-color:#1b1b1b !important;box-shadow:none !important;backdrop-filter:none !important;}
      body.celeste-oled .affirmation-display,body.celeste-oled .feedback-row,body.celeste-oled .feedback-slider,body.celeste-oled .record-box,body.celeste-oled input,body.celeste-oled select,body.celeste-oled textarea,body.celeste-oled .pill{background:#050505 !important;border-color:#202020 !important;color:#f5f5f7 !important;box-shadow:none !important;}
      body.celeste-oled .tab-btn:not(.active),body.celeste-oled .btn-sec,body.celeste-oled .feedback-test button{background:#050505 !important;color:#d8d8dc !important;border-color:#202020 !important;box-shadow:none !important;}
      body.celeste-oled #celeste-theme-control button{background:#050505;color:#d8d8dc;border-color:#202020;}
      body.celeste-oled #celeste-theme-control button.active{background:linear-gradient(135deg,#ff5f8a,#a85cff);color:#fff;}
      body.celeste-oled .heat-cell{border-color:#161616 !important;}
    `;
    doc.head.appendChild(style);
    return style;
  }

  function ensureControl(doc) {
    if (doc.getElementById('celeste-theme-control')) return;
    const header = doc.querySelector('.app-header');
    if (!header) return;
    const box = doc.createElement('div');
    box.id = 'celeste-theme-control';
    box.innerHTML = `
      <button type="button" data-theme="light">☀️ Claro</button>
      <button type="button" data-theme="dark">🌙 Oscuro</button>
      <button type="button" data-theme="oled">⚫ Ahorro OLED</button>
    `;
    header.insertAdjacentElement('afterend', box);
    box.addEventListener('click', e => {
      const btn = e.target.closest('button[data-theme]');
      if (!btn) return;
      setMode(btn.dataset.theme);
    });
  }

  function applyInner(doc, mode) {
    ensureStyle(doc);
    ensureControl(doc);
    installedDoc = doc;
    doc.body.classList.toggle('celeste-dark', mode === 'dark');
    doc.body.classList.toggle('celeste-oled', mode === 'oled');
    doc.querySelectorAll('#celeste-theme-control button').forEach(btn => btn.classList.toggle('active', btn.dataset.theme === mode));
  }

  function install() {
    const doc = frame.contentDocument;
    if (!doc || !doc.body) return;
    applyInner(doc, getMode());
  }

  applyOuter(getMode());
  frame.addEventListener('load', () => setTimeout(install, 150));
  let tries = 0;
  const t = setInterval(() => {
    install();
    if ((installedDoc && frame.contentDocument === installedDoc) || ++tries > 80) clearInterval(t);
  }, 100);
})();
