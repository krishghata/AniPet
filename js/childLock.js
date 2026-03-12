/* ═══════════════════════════════════════════════════════════════
   AniPet — Child Lock
   • History loop  — back button stays inside the app
   • Fullscreen    — hides system UI; reclaims if dismissed
   • PIN unlock    — 4-digit PIN set by parent
   • Access        — long-press AniPet logo (2 s) → parent panel
   ═══════════════════════════════════════════════════════════════ */

const LOCK_KEY = 'anipet-child-lock';
const PIN_KEY  = 'anipet-child-pin';

let locked = false;

/* ── Public ──────────────────────────────────────────────────── */
export function isLocked() { return locked; }

export function initChildLock(logoEl) {
  // Long-press logo (2 s) → parent panel
  // passive:true so normal tap-to-navigate still works.
  // Only cancel on touchmove if finger actually moved >10px (Android micro-drift).
  // contextmenu listener stops the system long-press popup.
  let pressTimer = null;
  let startX = 0, startY = 0;

  logoEl.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    pressTimer = setTimeout(openParentPanel, 2000);
  }, { passive: true });

  logoEl.addEventListener('touchmove', e => {
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (Math.sqrt(dx * dx + dy * dy) > 10) clearTimeout(pressTimer);
  }, { passive: true });

  logoEl.addEventListener('touchend',   () => clearTimeout(pressTimer));
  logoEl.addEventListener('touchcancel',() => clearTimeout(pressTimer));

  // Block the system context-menu popup that appears on long-press
  logoEl.addEventListener('contextmenu', e => e.preventDefault());

  // Reclaim fullscreen if child dismisses it
  document.addEventListener('fullscreenchange', () => {
    if (locked && !document.fullscreenElement) requestFullscreenSafe();
  });
  document.addEventListener('webkitfullscreenchange', () => {
    if (locked && !document.webkitFullscreenElement) requestFullscreenSafe();
  });

  // Block context menu while locked (prevents long-press menus on Android)
  document.addEventListener('contextmenu', e => { if (locked) e.preventDefault(); });

  // Restore saved state on relaunch
  if (localStorage.getItem(LOCK_KEY) === '1' && localStorage.getItem(PIN_KEY)) {
    locked = true;
    startHistoryLoop();
    showLockBadge();
    requestFullscreenSafe();
  }
}

/* ── Parent panel (hidden behind long-press) ─────────────────── */
function openParentPanel() {
  if (locked) return; // can't access parent panel while locked
  if (document.getElementById('parent-panel')) return;

  const hasPin = !!localStorage.getItem(PIN_KEY);
  const panel  = document.createElement('div');
  panel.id = 'parent-panel';
  panel.innerHTML = `
    <div class="pp-box">
      <div class="pp-title">👨‍👩‍👧 Parent Settings</div>
      <p class="pp-desc">Enable child lock to keep your child focused in AniPet. A PIN is required to unlock.</p>
      <button class="pp-btn pp-primary" id="pp-lock-btn">🔒 Enable Child Lock</button>
      ${hasPin ? '<button class="pp-btn pp-secondary" id="pp-pin-btn">🔑 Change PIN</button>' : ''}
      <button class="pp-btn pp-close" id="pp-close-btn">✕ Close</button>
    </div>
  `;

  panel.querySelector('#pp-lock-btn').addEventListener('click', () => {
    panel.remove();
    if (!hasPin) {
      showSetPinDialog(() => enableLock());
    } else {
      enableLock();
    }
  });

  if (hasPin) {
    panel.querySelector('#pp-pin-btn').addEventListener('click', () => {
      panel.remove();
      showSetPinDialog();
    });
  }

  panel.querySelector('#pp-close-btn').addEventListener('click', () => panel.remove());

  // Tap backdrop to close
  panel.addEventListener('click', e => { if (e.target === panel) panel.remove(); });

  document.body.appendChild(panel);
}

/* ── Enable / disable lock ───────────────────────────────────── */
function enableLock() {
  locked = true;
  localStorage.setItem(LOCK_KEY, '1');
  requestFullscreenSafe();
  startHistoryLoop();
  showLockBadge();
}

function disableLock() {
  locked = false;
  localStorage.setItem(LOCK_KEY, '0');
  stopHistoryLoop();
  hideLockBadge();
  const exitFn = document.exitFullscreen || document.webkitExitFullscreen;
  if (exitFn && (document.fullscreenElement || document.webkitFullscreenElement)) {
    exitFn.call(document).catch(() => {});
  }
}

/* ── Fullscreen ──────────────────────────────────────────────── */
function requestFullscreenSafe() {
  const el = document.documentElement;
  const fn = el.requestFullscreen || el.webkitRequestFullscreen;
  if (fn) fn.call(el).catch(() => {});
}

/* ── History loop (back button stays in app) ─────────────────── */
function onPopState() {
  if (locked) history.pushState({ cl: 1 }, '');
}
function startHistoryLoop() {
  history.pushState({ cl: 1 }, '');
  window.addEventListener('popstate', onPopState);
}
function stopHistoryLoop() {
  window.removeEventListener('popstate', onPopState);
}

/* ── Lock badge ──────────────────────────────────────────────── */
function showLockBadge() {
  if (document.getElementById('lock-badge')) return;
  const badge = document.createElement('button');
  badge.id = 'lock-badge';
  badge.textContent = '🔒';
  badge.title = 'Child lock active';
  badge.setAttribute('aria-label', 'Child lock active — tap to unlock');
  badge.addEventListener('click', showUnlockDialog);
  document.body.appendChild(badge);
}
function hideLockBadge() {
  document.getElementById('lock-badge')?.remove();
}

/* ── PIN dialog builder ──────────────────────────────────────── */
function buildPinDialog(title, subtitle, onComplete) {
  const overlay = document.createElement('div');
  overlay.className = 'pin-overlay';
  let input = '';

  const render = (errorMsg = '') => {
    overlay.innerHTML = `
      <div class="pin-box">
        <div class="pin-title">${title}</div>
        ${subtitle ? `<div class="pin-sub">${subtitle}</div>` : ''}
        <div class="pin-dots">
          ${[0,1,2,3].map(i =>
            `<span class="pin-dot${i < input.length ? ' filled' : ''}"></span>`
          ).join('')}
        </div>
        <div class="pin-error-msg">${errorMsg}</div>
        <div class="pin-pad">
          ${[1,2,3,4,5,6,7,8,9].map(n =>
            `<button class="pin-key" data-n="${n}">${n}</button>`
          ).join('')}
          <button class="pin-key pin-del" data-n="del">⌫</button>
          <button class="pin-key" data-n="0">0</button>
          <button class="pin-key pin-cancel" data-n="cancel">✕</button>
        </div>
      </div>
    `;

    overlay.querySelectorAll('.pin-key').forEach(btn => {
      btn.addEventListener('click', () => {
        const n = btn.dataset.n;
        if (n === 'cancel') { overlay.remove(); return; }
        if (n === 'del')    { input = input.slice(0, -1); render(); return; }
        if (input.length >= 4) return;
        input += n;
        render();
        if (input.length === 4) {
          // Short delay so user sees 4 filled dots before callback
          setTimeout(() => {
            onComplete(input, () => {
              input = '';
              render('❌ Incorrect — try again');
            });
          }, 120);
        }
      });
    });
  };

  render();
  document.body.appendChild(overlay);
  return overlay;
}

/* ── Unlock dialog ───────────────────────────────────────────── */
function showUnlockDialog() {
  buildPinDialog('Enter PIN to unlock', '', (pin, onWrong) => {
    if (pin === localStorage.getItem(PIN_KEY)) {
      document.querySelector('.pin-overlay')?.remove();
      disableLock();
    } else {
      onWrong();
    }
  });
}

/* ── Set PIN dialog (two-step confirmation) ──────────────────── */
function showSetPinDialog(onDone) {
  let firstPin = null;

  const step2 = () => {
    buildPinDialog('Confirm your PIN', 'Enter the same PIN again', (pin, onWrong) => {
      if (pin === firstPin) {
        localStorage.setItem(PIN_KEY, pin);
        document.querySelector('.pin-overlay')?.remove();
        onDone?.();
      } else {
        onWrong();
      }
    });
  };

  buildPinDialog('Set a 4-digit PIN', 'Parents will need this to unlock', (pin) => {
    firstPin = pin;
    document.querySelector('.pin-overlay')?.remove();
    step2();
  });
}
