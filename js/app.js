/* ═══════════════════════════════════════════════════════════════
   AniPet — Entry Point
   Wires router, views, and PWA service worker together.
   ═══════════════════════════════════════════════════════════════ */

import { register, navigate } from './router.js';
import { mount as mountGrid,   unmount as unmountGrid   } from './gridView.js';
import { mount as mountDetail, unmount as unmountDetail } from './detailView.js';
import { CHARACTER_MAP } from './characters.js';
import { initAudio, setMuted, isMuted } from './audioEngine.js';
import { initChildLock } from './childLock.js';

const APP_VERSION = 'v1.1.6';

const viewRoot = document.getElementById('view-root');
const backBtn  = document.getElementById('back-btn');
const logo     = document.getElementById('logo');
const muteBtn  = document.getElementById('mute-btn');

let currentView  = null;   // 'grid' | 'detail'
let audioStarted = false;

function startAudioOnce() {
  if (audioStarted) return;
  audioStarted = true;
  initAudio();
  updateMuteBtn();
}

function updateMuteBtn() {
  muteBtn.textContent = isMuted() ? '🔇' : '🔊';
  muteBtn.setAttribute('aria-label', isMuted() ? 'Unmute sound' : 'Mute sound');
}

muteBtn.addEventListener('click', () => {
  // Always init AudioContext on first click (requires user gesture)
  startAudioOnce();
  setMuted(!isMuted());
  updateMuteBtn();
});

// If user had sound ON from a previous session, auto-start on first tap anywhere.
// Use both touchend and click — pointerdown is not reliably accepted as a user
// gesture for AudioContext on Android Chrome.
function maybeAutoStart() {
  if (!isMuted()) startAudioOnce();
  document.removeEventListener('touchend', maybeAutoStart, true);
  document.removeEventListener('click',    maybeAutoStart, true);
}
document.addEventListener('touchend', maybeAutoStart, true);
document.addEventListener('click',    maybeAutoStart, true);

// Reflect saved mute state on load
updateMuteBtn();

// Version badge
document.getElementById('app-version').textContent = APP_VERSION;

// Child lock — long-press logo (2s) to open parent settings
initChildLock(logo);

/* ── Teardown current view ─────────────────────────────────── */
function teardown() {
  if (currentView === 'grid')   unmountGrid();
  if (currentView === 'detail') unmountDetail();
  currentView = null;
}

/* ── Routes ────────────────────────────────────────────────── */

// Grid: hash is empty / '/'
register('/', () => {
  teardown();
  backBtn.hidden = true;
  mountGrid(viewRoot);
  currentView = 'grid';
  document.title = 'AniPet 🐾';
});

// Detail: hash is '/:id'
register('/:id', ({ id }) => {
  if (!CHARACTER_MAP[id]) {
    navigate('/');
    return;
  }
  teardown();
  backBtn.hidden = false;
  mountDetail(viewRoot, id);
  currentView = 'detail';
  const char = CHARACTER_MAP[id];
  document.title = `${char.emoji} ${char.name} — AniPet`;
});

/* ── Header buttons ─────────────────────────────────────────── */

backBtn.addEventListener('click', () => navigate('/'));
logo.addEventListener('click',   () => navigate('/'));

/* ── Register Service Worker ────────────────────────────────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

/* ── PWA Install Banner ──────────────────────────────────────── */
let deferredInstallPrompt = null;
const DISMISS_KEY = 'anipet-install-dismissed';

// Chrome/Edge: capture the native prompt
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  maybeShowBanner();
});

window.addEventListener('appinstalled', () => {
  hideInstallBanner();
  deferredInstallPrompt = null;
  localStorage.setItem(DISMISS_KEY, '1');
});

// Fallback: show banner after 2s even without the native prompt event
// (covers iOS Safari and cases where Chrome doesn't fire the event)
window.addEventListener('load', () => {
  if (localStorage.getItem(DISMISS_KEY)) return;
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  setTimeout(maybeShowBanner, 2000);
});

function maybeShowBanner() {
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  if (localStorage.getItem(DISMISS_KEY)) return;
  if (document.getElementById('install-banner')) return;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const canNativeInstall = !!deferredInstallPrompt;

  const banner = document.createElement('div');
  banner.id = 'install-banner';

  if (canNativeInstall) {
    banner.innerHTML = `
      <span class="install-banner-text">📲 Install AniPet on your device!</span>
      <div class="install-banner-actions">
        <button id="install-btn">Install</button>
        <button id="install-dismiss">✕</button>
      </div>
    `;
  } else if (isIOS) {
    banner.innerHTML = `
      <span class="install-banner-text">📲 Tap Share → Add to Home Screen</span>
      <div class="install-banner-actions">
        <button id="install-dismiss">✕</button>
      </div>
    `;
  } else {
    banner.innerHTML = `
      <span class="install-banner-text">💾 Install AniPet — tap ⊕ in the address bar</span>
      <div class="install-banner-actions">
        <button id="install-dismiss">✕</button>
      </div>
    `;
  }

  document.body.appendChild(banner);

  const installBtn = banner.querySelector('#install-btn');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        hideInstallBanner();
        localStorage.setItem(DISMISS_KEY, '1');
      }
      deferredInstallPrompt = null;
    });
  }

  banner.querySelector('#install-dismiss').addEventListener('click', () => {
    hideInstallBanner();
    localStorage.setItem(DISMISS_KEY, '1');
  });
}

function hideInstallBanner() {
  const banner = document.getElementById('install-banner');
  if (banner) banner.remove();
}
