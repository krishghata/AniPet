/* ═══════════════════════════════════════════════════════════════
   AniPet — Detail View
   Shows a large animation canvas + animation selector for one character.
   ═══════════════════════════════════════════════════════════════ */

import { CHARACTER_MAP } from './characters.js';
import { AnimPlayer, preloadCharacter } from './animEngine.js';
import { playCharacterSfx } from './audioEngine.js';

let player       = null;
let activeAnimId = null;

/* ── Mount ─────────────────────────────────────────────────── */
export function mount(container, characterId) {
  const char = CHARACTER_MAP[characterId];
  if (!char) return;

  // Kick off background preloading for all this character's sprites
  preloadCharacter(char);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isLandscape = vw > vh;
  const isLargeScreen = vw >= 1024;
  const isTablet = vw >= 768;
  let canvasSize;
  if (isLargeScreen)      canvasSize = Math.min(Math.round(vw * 0.4), 480);
  else if (isTablet)      canvasSize = Math.min(Math.round(vw * 0.7), 420);
  else if (isLandscape)   canvasSize = Math.min(Math.round(vw * 0.45), 260);
  else                    canvasSize = Math.min(Math.round(vw * 0.8), 320);

  container.innerHTML = `
    <div class="detail-view">
      <h2 class="detail-name">${char.emoji} ${char.name}</h2>

      <div class="detail-canvas-wrap" id="canvas-wrap">
        <canvas
          id="anim-canvas"
          width="${canvasSize}"
          height="${canvasSize}"
          aria-label="${char.name} animation"
        ></canvas>
        <div class="canvas-loading" id="canvas-loading" aria-live="polite" aria-label="Loading animation">
          <div class="spinner"></div>
        </div>
      </div>

      <div class="detail-controls">
        <div class="detail-anim-label" id="anim-label" aria-live="polite"></div>

        <p class="anim-selector-title">Choose an animation! 🎬</p>

        <div class="anim-selector" id="anim-selector" role="group" aria-label="Animation selector">
          ${char.animations.map(anim => `
            <button
              class="anim-btn"
              data-anim-id="${anim.id}"
              aria-label="Play ${anim.label}"
              aria-pressed="false"
            >
              <span class="btn-emoji">${anim.emoji}</span>
              <span>${anim.label}</span>
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  const canvas  = container.querySelector('#anim-canvas');
  const loading = container.querySelector('#canvas-loading');
  const label   = container.querySelector('#anim-label');
  const buttons = container.querySelectorAll('.anim-btn');

  player = new AnimPlayer(canvas, char.cardColor);

  function setActiveBtn(animId) {
    buttons.forEach(btn => {
      const isActive = btn.dataset.animId === animId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });
  }

  function playAnim(animId, sfx = true) {
    const anim = char.animations.find(a => a.id === animId);
    if (!anim) return;
    activeAnimId = animId;

    setActiveBtn(animId);
    label.textContent = `${anim.emoji} ${anim.label}`;

    // Play character sound (skip sfx for auto-idle switch after walkin)
    if (sfx && animId !== 'idle') playCharacterSfx(char.id, animId);

    loading.style.display = 'flex';

    player.loadAnim(anim, () => {
      // Image loaded
      loading.style.display = 'none';
    });

    player.onComplete = () => {
      // One-shot animation finished → switch to idle (no sfx for auto-switch)
      if (!anim.loop) {
        playAnim('idle', false);
      }
    };
  }

  // Wire up selector buttons
  buttons.forEach(btn => {
    btn.addEventListener('click', () => playAnim(btn.dataset.animId, true));
  });

  // Determine starting animation:
  // If character has "walkin", play that first (it will auto-switch to idle).
  // Otherwise go straight to idle.
  const walkin = char.animations.find(a => a.id === 'walkin');
  if (walkin) {
    playAnim('walkin');
  } else {
    playAnim('idle');
  }
}

/* ── Unmount ────────────────────────────────────────────────── */
export function unmount() {
  if (player) {
    player.destroy();
    player = null;
  }
  activeAnimId = null;
}
