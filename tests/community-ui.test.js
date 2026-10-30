import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const postFormSource = await readFile(
  new URL('../js/community/communityPostForm.js', import.meta.url),
  'utf8',
);
const communityListSource = await readFile(
  new URL('../js/community/communityList.js', import.meta.url),
  'utf8',
);
const communityRoutesSource = await readFile(
  new URL('../js/community/communityRoutes.js', import.meta.url),
  'utf8',
);
const pagesCss = await readFile(new URL('../css/pages.css', import.meta.url), 'utf8');

test('community post composer exposes a clear destination context and dedicated layout classes', () => {
  assert.match(postFormSource, /community-post-form/);
  assert.match(postFormSource, /Posting in \$\{community\.name\}/);
  assert.match(postFormSource, /community-post-context/);
  assert.match(postFormSource, /community-post-form-actions/);
});

test('community directory explains that spaces are preconfigured for the prototype', () => {
  assert.match(communityListSource, /community-governance-note/);
  assert.match(communityListSource, /preconfigured for this prototype/);
  assert.match(communityListSource, /creating or removing community spaces is not available/);
});

test('MVP routes support creating posts inside communities but do not expose community creation', () => {
  assert.match(communityRoutesSource, /\/community\/:communityId\/new/);
  assert.doesNotMatch(communityRoutesSource, /register\('\/community\/new'/);
});

test('post composer CSS constrains width, adds padding and adapts to mobile', () => {
  assert.match(pagesCss, /\.community-post-form\s*\{[^}]*width:\s*min\(100%,\s*900px\)/s);
  assert.match(pagesCss, /\.community-post-form\s*\{[^}]*padding:/s);
  assert.match(pagesCss, /\.community-post-form textarea\s*\{[^}]*min-height:\s*175px/s);
  assert.match(pagesCss, /@media\s*\(max-width:\s*640px\)[\s\S]*?\.community-post-form/);
});
