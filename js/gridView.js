/* ═══════════════════════════════════════════════════════════════
   AniPet — Grid View
   Shows all character cards with animated thumbnails.
   ═══════════════════════════════════════════════════════════════ */

import { CHARACTERS } from './characters.js';
import { AnimPlayer, drawThumbnail } from './animEngine.js';
import { navigate } from './router.js';

/* Active AnimPlayers keyed by character id */
const players = new Map();

/* ── Mount ─────────────────────────────────────────────────── */
export function mount(container) {
  container.innerHTML = `
    <div class="grid-view">
      <p class="grid-title">Choose your pet! 🌟</p>
      <div class="character-grid" id="character-grid"></div>
    </div>
  `;

  const grid = container.querySelector('#character-grid');

  CHARACTERS.forEach(char => {
    const card = _buildCard(char);
    grid.appendChild(card);
    _setupCard(card, char);
  });
}

/* ── Unmount ────────────────────────────────────────────────── */
export function unmount() {
  players.forEach(p => p.destroy());
  players.clear();
}

/* ── Private ─────────────────────────────────────────────────── */

function _buildCard(char) {
  const idleAnim = char.animations.find(a => a.id === 'idle') || char.animations[0];

  const card = document.createElement('div');
  card.className  = 'char-card';
  card.style.background = char.cardColor;
  card.dataset.charId   = char.id;
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `${char.name} — tap to view animations`);

  card.innerHTML = `
    <div class="char-card-canvas-wrap">
      <canvas
        id="thumb-${char.id}"
        width="120"
        height="120"
        aria-hidden="true"
      ></canvas>
    </div>
    <div class="char-card-name">${char.emoji} ${char.name}</div>
    <div class="char-card-label">${char.nickname}</div>
    <div class="char-card-tap">Tap to play! 👆</div>
  `;

  return card;
}

function _setupCard(card, char) {
  const canvas   = card.querySelector('canvas');
  const idleAnim = char.animations.find(a => a.id === 'idle') || char.animations[0];

  // Try animated player first
  const player = new AnimPlayer(canvas, char.cardColor);
  players.set(char.id, player);

  player.loadAnim(idleAnim).catch(() => {});

  // If sprite fails to load, canvas shows placeholder color — that's fine.

  // Click / keyboard navigation
  function go() { navigate(`/${char.id}`); }
  card.addEventListener('click', go);
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
  });
}
