import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderNavigation, updateActiveNavigation } from '../js/shared/navigation.js';

class FakeElement {
  constructor(tagName, options = {}) {
    this.tagName = tagName.toUpperCase();
    this.className = options.className || '';
    this.textContent = options.text === undefined ? '' : String(options.text);
    this.attributes = new Map(
      Object.entries(options.attrs || {}).map(([key, value]) => [key, String(value)]),
    );
    this.children = [];
  }

  append(child) {
    this.children.push(child);
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
  removeAttribute(name) {
    this.attributes.delete(name);
  }
}

class FakeNavigationContainer extends FakeElement {
  replaceChildren(...children) {
    this.children = [...children];
  }
  querySelectorAll(selector) {
    assert.equal(selector, 'a.nav-link');
    return this.children.filter(
      (child) => child.tagName === 'A' && child.className.split(/\s+/).includes('nav-link'),
    );
  }
}

const items = [
  { label: 'Clubs', path: '/clubs', glyph: 'C', description: 'Temporary Clubs & Interest Groups' },
  {
    label: 'Projects',
    path: '/projects',
    glyph: 'P',
    description: 'Project & Contributor Collaboration',
  },
  {
    label: 'Learning',
    path: '/learning',
    glyph: 'L',
    description: 'Learning & Mentorship Exchange',
  },
  {
    label: 'Community',
    path: '/community',
    glyph: 'M',
    description: 'Campus Community & Information Sharing',
  },
  { label: 'Profile', path: '/profile', glyph: 'U', description: 'Shared student identity' },
];
const createElement = (tagName, options) => new FakeElement(tagName, options);

test('renderNavigation creates all five top-level links in the declared order', () => {
  const container = new FakeNavigationContainer('nav');
  const links = renderNavigation(container, items, createElement);

  assert.equal(links.length, 5);
  assert.equal(container.children.length, 5);
  assert.deepEqual(
    links.map((link) => link.getAttribute('href')),
    ['#/clubs', '#/projects', '#/learning', '#/community', '#/profile'],
  );
  assert.equal(links[0].children[0].textContent, 'C');
  assert.equal(links[0].children[1].textContent, 'Clubs');
  assert.equal(links[3].getAttribute('aria-label'), 'Campus Community & Information Sharing');
});

test('updateActiveNavigation marks the exact current top-level route', () => {
  const container = new FakeNavigationContainer('nav');
  renderNavigation(container, items, createElement);

  updateActiveNavigation(container, '/community');
  const active = container
    .querySelectorAll('a.nav-link')
    .filter((link) => link.getAttribute('aria-current') === 'page');
  assert.equal(active.length, 1);
  assert.equal(active[0].getAttribute('href'), '#/community');
});

test('nested detail and edit routes keep their parent navigation item active', () => {
  const container = new FakeNavigationContainer('nav');
  renderNavigation(container, items, createElement);

  updateActiveNavigation(container, '/projects/opportunity_123');
  let active = container
    .querySelectorAll('a.nav-link')
    .filter((link) => link.getAttribute('aria-current') === 'page');
  assert.equal(active.length, 1);
  assert.equal(active[0].getAttribute('href'), '#/projects');

  updateActiveNavigation(container, '/profile/edit');
  active = container
    .querySelectorAll('a.nav-link')
    .filter((link) => link.getAttribute('aria-current') === 'page');
  assert.equal(active.length, 1);
  assert.equal(active[0].getAttribute('href'), '#/profile');
});

test('unknown route clears any stale active navigation marker', () => {
  const container = new FakeNavigationContainer('nav');
  renderNavigation(container, items, createElement);
  updateActiveNavigation(container, '/projects');
  updateActiveNavigation(container, '/not-found');

  assert.equal(
    container
      .querySelectorAll('a.nav-link')
      .filter((link) => link.getAttribute('aria-current') === 'page').length,
    0,
  );
});

test('app startup imports and invokes the navigation functions it needs', async () => {
  const appSource = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(
    appSource,
    /import\s*\{\s*renderNavigation\s*,\s*updateActiveNavigation\s*\}\s*from\s*['"]\.\/shared\/navigation\.js['"]/,
  );
  assert.match(appSource, /function renderPrimaryNavigation\s*\(/);
  assert.match(appSource, /renderNavigation\(navContainer,\s*navItems,\s*ui\.createElement\)/);
  assert.match(appSource, /function syncActiveNavigation\s*\(/);
  assert.match(appSource, /renderPrimaryNavigation\(\);/);
});
