const routes = [];
let started = false;

function normalisePath(path) {
  const withoutHash = String(path || '').replace(/^#/, '');
  const withSlash = withoutHash.startsWith('/') ? withoutHash : `/${withoutHash}`;
  return withSlash === '/' ? '/' : withSlash.replace(/\/+$/, '');
}

function compilePattern(pattern) {
  const path = normalisePath(pattern);
  const keys = [];
  const segments = path.split('/').filter(Boolean);
  const expression = segments.map((segment) => {
    if (segment.startsWith(':')) {
      keys.push(segment.slice(1));
      return '([^/]+)';
    }
    return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('/');
  return { path, keys, regex: new RegExp(`^/${expression}/?$`) };
}

function register(pattern, handler) {
  if (typeof handler !== 'function') throw new TypeError('Route handler must be a function.');
  const compiled = compilePattern(pattern);
  routes.push({ ...compiled, handler, specificity: compiled.keys.length });
  routes.sort((a, b) => a.specificity - b.specificity || b.path.length - a.path.length);
}

function currentPath() {
  return normalisePath(window.location.hash.slice(1) || '/clubs');
}

function dispatch() {
  const path = currentPath();
  for (const route of routes) {
    const match = path.match(route.regex);
    if (!match) continue;
    const params = Object.fromEntries(route.keys.map((key, index) => [key, decodeURIComponent(match[index + 1])]));
    route.handler(params, path);
    window.dispatchEvent(new CustomEvent('cch:navigated', { detail: { path, params } }));
    return true;
  }

  if (path !== '/clubs') {
    navigate('/clubs');
    return false;
  }
  return false;
}

function navigate(path) {
  const nextHash = `#${normalisePath(path)}`;
  if (window.location.hash === nextHash) {
    dispatch();
    return;
  }
  window.location.hash = nextHash;
}

function start() {
  if (!started) {
    window.addEventListener('hashchange', dispatch);
    started = true;
  }
  if (!window.location.hash) navigate('/clubs');
  else dispatch();
}

export const router = Object.freeze({ register, navigate, start, dispatch, currentPath });
