/**
 * Render the top-level navigation from the application's route registry.
 * DOM element creation is injected so the behaviour can be unit-tested without
 * requiring a browser or a UI framework.
 */
export function renderNavigation(container, items, createElement) {
  if (!container) {
    throw new Error('Primary navigation container (#main-nav) was not found.');
  }
  if (!Array.isArray(items) || typeof createElement !== 'function') {
    throw new TypeError('Navigation requires an item list and an element factory.');
  }

  const links = items.map((item) => {
    const link = createElement('a', {
      className: 'nav-link',
      attrs: {
        href: `#${item.path}`,
        title: item.description,
        'aria-label': item.description,
      },
    });

    link.append(
      createElement('span', {
        className: 'nav-glyph',
        text: item.glyph,
        attrs: { 'aria-hidden': 'true' },
      }),
    );
    link.append(createElement('span', { className: 'nav-label', text: item.label }));
    return link;
  });

  container.replaceChildren(...links);
  return links;
}

/**
 * Mark the current top-level navigation link, including when a nested route
 * such as /projects/:id or /profile/edit is active.
 */
export function updateActiveNavigation(container, currentPath) {
  if (!container) return;

  const normalisedCurrentPath = normalisePath(currentPath);
  container.querySelectorAll('a.nav-link').forEach((link) => {
    const targetPath = normalisePath((link.getAttribute('href') || '').replace(/^#/, ''));
    const isActive =
      normalisedCurrentPath === targetPath || normalisedCurrentPath.startsWith(`${targetPath}/`);

    if (isActive) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function normalisePath(path) {
  const value = String(path || '/').replace(/^#/, '');
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  if (withLeadingSlash === '/') return '/';
  return withLeadingSlash.replace(/\/+$/, '');
}
