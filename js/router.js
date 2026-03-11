/* ═══════════════════════════════════════════════════════════════
   AniPet — Hash-Based SPA Router
   Routes: /  →  grid view
           /:id  →  detail view for character with given id
   ═══════════════════════════════════════════════════════════════ */

const routes = [];   // [{ pattern: '/', handler: fn }, ...]

/**
 * Register a route.
 * @param {string}   pattern  — '/' or '/:id' (only :id param supported)
 * @param {function} handler  — called with { id? } params object
 */
export function register(pattern, handler) {
  routes.push({ pattern, handler });
}

/**
 * Navigate to a hash path.
 * @param {string} path  — e.g. '/' or '/dog'
 */
export function navigate(path) {
  window.location.hash = path;
}

/** Dispatch the current hash to the matching handler */
function dispatch() {
  const raw      = decodeURIComponent(window.location.hash.replace(/^#/, ''));
  const path     = raw.startsWith('/') ? raw : '/' + raw;  // normalise to leading /
  const segments = path.split('/').filter(Boolean);         // e.g. ['dog'] or []

  for (const { pattern, handler } of routes) {
    const patSegs = pattern.split('/').filter(Boolean);

    // Root route: both empty
    if (patSegs.length === 0 && segments.length === 0) {
      handler({});
      return;
    }

    // Must have same segment count
    if (patSegs.length !== segments.length) continue;

    // Match each segment
    const params = {};
    let matched = true;
    for (let i = 0; i < patSegs.length; i++) {
      if (patSegs[i].startsWith(':')) {
        params[patSegs[i].slice(1)] = segments[i];
      } else if (patSegs[i] !== segments[i]) {
        matched = false;
        break;
      }
    }
    if (matched) {
      handler(params);
      return;
    }
  }

  // No match — go home
  navigate('/');
}

/* Listen for hash changes and page load */
window.addEventListener('hashchange', dispatch);
window.addEventListener('load', dispatch);
