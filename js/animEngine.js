/* ═══════════════════════════════════════════════════════════════
   AniPet — Animation Engine
   Loads PNG sprite sheets and drives frame-accurate rAF loops.
   ═══════════════════════════════════════════════════════════════ */

/* In-memory cache: key src → Promise<HTMLImageElement> */
const imageCache = new Map();
/* In-memory cache: key jsonSrc → Promise<frames map> */
const atlasCache = new Map();

/**
 * Load (or return cached) an Image for the given src.
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src);

  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load sprite: ${src}`));
    img.src = src;
  });

  imageCache.set(src, promise);
  return promise;
}

/**
 * Load (or return cached) a Texture Packer JSON atlas.
 * Returns a Map keyed by animation prefix → sorted array of {x,y,w,h}.
 * @param {string} src
 * @returns {Promise<Map<string, Array<{x,y,w,h}>>>}
 */
function loadAtlasJson(src) {
  if (atlasCache.has(src)) return atlasCache.get(src);

  const promise = fetch(src)
    .then(r => r.json())
    .then(data => {
      const map = new Map();
      for (const [key, val] of Object.entries(data.frames)) {
        // key format: "idle_sitting_f01" — strip trailing _fNN to get prefix
        const match = key.match(/^(.+)_f(\d+)$/);
        if (!match) continue;
        const prefix = match[1];
        if (!map.has(prefix)) map.set(prefix, []);
        map.get(prefix).push({ index: parseInt(match[2], 10), ...val.frame });
      }
      // Sort each group by frame index
      for (const frames of map.values()) {
        frames.sort((a, b) => a.index - b.index);
      }
      return map;
    });

  atlasCache.set(src, promise);
  return promise;
}

/* ═══════════════════════════════════
   AnimPlayer class
═══════════════════════════════════ */
export class AnimPlayer {
  /**
   * @param {HTMLCanvasElement} canvas   — target canvas element
   * @param {string}            bgColor  — fallback background color
   */
  constructor(canvas, bgColor = '#FFF9F0') {
    this.canvas   = canvas;
    this.ctx      = canvas.getContext('2d');
    this.bgColor  = bgColor;

    this._img          = null;
    this._config       = null;
    this._atlasFrames  = null;
    this._frameW       = 0;
    this._frameH       = 0;
    this._currentFrame = 0;
    this._lastTime     = 0;
    this._rafId        = null;
    this._running      = false;

    /** Called when a loop:false animation finishes */
    this.onComplete = null;
  }

  /* ── Public API ─────────────────────────────────────────── */

  /**
   * Load an animation config and start playing.
   * @param {object} animConfig  — from characters.js (src, cols, rows, frameCount, fps, loop)
   * @param {function} [onLoad]  — called once the image is ready
   */
  async loadAnim(animConfig, onLoad) {
    // Stop any current playback
    this.stop();
    this._config       = animConfig;
    this._currentFrame = 0;
    this._atlasFrames  = null;

    // Show placeholder while loading
    this._drawPlaceholder();

    try {
      if (animConfig.atlasSrc) {
        // Atlas format: one master PNG + JSON
        const [img, atlasMap] = await Promise.all([
          loadImage(animConfig.atlasSrc),
          loadAtlasJson(animConfig.atlasJsonSrc),
        ]);
        this._img         = img;
        this._atlasFrames = atlasMap.get(animConfig.atlasKey) || [];
        // Override frameCount with actual atlas frame count
        this._config = { ...animConfig, frameCount: this._atlasFrames.length };
      } else {
        // Legacy grid format
        const img = await loadImage(animConfig.src);
        this._img    = img;
        this._frameW = img.naturalWidth  / animConfig.cols;
        this._frameH = img.naturalHeight / animConfig.rows;
      }
      onLoad?.();
      this.play();
    } catch {
      // Image failed — draw placeholder permanently
      this._img = null;
      this._drawPlaceholder();
    }
  }

  /** Start (or resume) playback */
  play() {
    if (!this._img || !this._config) return;
    if (this._running) return;
    this._running  = true;
    this._lastTime = performance.now();
    this._rafId    = requestAnimationFrame(this._tick.bind(this));
  }

  /** Pause playback (keeps current frame) */
  pause() {
    this._running = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  /** Pause and reset to frame 0 */
  stop() {
    this.pause();
    this._currentFrame = 0;
    if (this._img) this._draw();
  }

  /** Free all resources */
  destroy() {
    this.stop();
    this._img    = null;
    this._config = null;
    this.onComplete = null;
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /* ── Private ─────────────────────────────────────────────── */

  _tick(now) {
    if (!this._running) return;

    const cfg      = this._config;
    const elapsed  = now - this._lastTime;
    const frameDur = 1000 / cfg.fps;

    if (elapsed >= frameDur) {
      this._currentFrame++;

      if (this._currentFrame >= cfg.frameCount) {
        if (cfg.loop) {
          this._currentFrame = 0;
          this.onComplete?.();
        } else {
          // One-shot — hold last frame, fire callback
          this._currentFrame = cfg.frameCount - 1;
          this._draw();
          this.pause();
          this.onComplete?.();
          return;
        }
      }

      // Drift correction: carry over leftover time
      this._lastTime = now - (elapsed % frameDur);
      this._draw();
    }

    this._rafId = requestAnimationFrame(this._tick.bind(this));
  }

  _draw() {
    if (!this._img || !this._config) return;

    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    if (this._atlasFrames) {
      // Atlas format — use per-frame {x,y,w,h}
      const f = this._atlasFrames[this._currentFrame];
      if (!f) return;
      ctx.drawImage(this._img, f.x, f.y, f.w, f.h, 0, 0, canvas.width, canvas.height);
    } else {
      // Legacy grid format
      const { cols }  = this._config;
      const frame     = this._currentFrame;
      const col       = frame % cols;
      const row       = Math.floor(frame / cols);
      const sx        = col * this._frameW;
      const sy        = row * this._frameH;
      ctx.drawImage(this._img, sx, sy, this._frameW, this._frameH, 0, 0, canvas.width, canvas.height);
    }
  }

  _drawPlaceholder() {
    const { ctx, canvas, bgColor } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

/* ═══════════════════════════════════
   Thumbnail helper
   Draw the first frame of an animation into an existing canvas.
   Returns a Promise that resolves when done.
═══════════════════════════════════ */
export async function drawThumbnail(canvas, animConfig, bgColor = '#FFF9F0') {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  try {
    ctx.imageSmoothingEnabled = false;
    if (animConfig.atlasSrc) {
      const [img, atlasMap] = await Promise.all([
        loadImage(animConfig.atlasSrc),
        loadAtlasJson(animConfig.atlasJsonSrc),
      ]);
      const frames = atlasMap.get(animConfig.atlasKey) || [];
      if (frames.length) {
        const f = frames[0];
        ctx.drawImage(img, f.x, f.y, f.w, f.h, 0, 0, canvas.width, canvas.height);
      }
    } else {
      const img    = await loadImage(animConfig.src);
      const frameW = img.naturalWidth  / animConfig.cols;
      const frameH = img.naturalHeight / animConfig.rows;
      ctx.drawImage(img, 0, 0, frameW, frameH, 0, 0, canvas.width, canvas.height);
    }
  } catch {
    // Leave placeholder background
  }
}

/** Preload all animation images for a character in the background */
export function preloadCharacter(character) {
  const seenImg  = new Set();
  const seenJson = new Set();
  character.animations.forEach(anim => {
    if (anim.atlasSrc) {
      if (!seenImg.has(anim.atlasSrc)) {
        seenImg.add(anim.atlasSrc);
        loadImage(anim.atlasSrc).catch(() => {});
      }
      if (!seenJson.has(anim.atlasJsonSrc)) {
        seenJson.add(anim.atlasJsonSrc);
        loadAtlasJson(anim.atlasJsonSrc).catch(() => {});
      }
    } else {
      loadImage(anim.src).catch(() => {});
    }
  });
}
