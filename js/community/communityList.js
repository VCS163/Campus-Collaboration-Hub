import { router } from '../router.js';
import { ui } from '../shared/ui.js';
import { communityService } from './communityService.js';
import { formatCount } from './communityFormatters.js';

function createCommunityCard(community) {
  const card = ui.createElement('article', { className: 'card community-card' });
  const top = ui.createElement('div', { className: 'community-card-top' });
  const mark = ui.createElement('span', {
    className: 'community-avatar',
    text: community.name.slice(0, 2).toUpperCase(),
    attrs: { 'aria-hidden': 'true' },
  });
  const type = ui.createBadge(community.category, 'primary');
  top.append(mark, type);
  card.append(top);

  card.append(ui.createElement('h2', { className: 'card-title', text: community.name }));
  card.append(
    ui.createElement('p', { className: 'community-description', text: community.description }),
  );

  const stats = ui.createElement('div', { className: 'community-card-stats' });
  stats.append(ui.createElement('span', { text: formatCount(community.postCount, 'post') }));
  stats.append(
    ui.createElement('span', { text: formatCount(community.contributorCount, 'contributor') }),
  );
  card.append(stats);
  card.append(
    ui.createButton({
      text: 'Open community',
      variant: 'secondary',
      className: 'community-card-action',
      onClick: () => router.navigate(`/community/${community.id}`),
    }),
  );
  return card;
}

function createLatestPost(post) {
  const card = ui.createElement('article', { className: 'card community-latest-card' });
  const meta = ui.createElement('div', { className: 'community-post-meta' });
  meta.append(
    ui.createBadge(
      post.type,
      post.type === 'question' ? 'warning' : post.type === 'resource' ? 'success' : 'primary',
    ),
  );
  meta.append(
    ui.createElement('span', { text: `${post.community?.name || 'Campus'} · ${post.authorName}` }),
  );
  card.append(meta);
  card.append(ui.createElement('h3', { className: 'card-title', text: post.title }));
  card.append(ui.createElement('p', { className: 'post-excerpt', text: post.body }));
  card.append(
    ui.createButton({
      text: `View discussion · ${formatCount(post.commentCount, 'comment')}`,
      variant: 'quiet',
      onClick: () => router.navigate(`/community/posts/${post.id}`),
    }),
  );
  return card;
}

export function renderCommunityList() {
  const communities = communityService.getCommunities();
  const latestPosts = communityService.getLatestPosts(4);
  const page = ui.createElement('div', { className: 'page-stack community-page' });

  const heading = ui.createElement('section', { className: 'page-heading' });
  const copy = ui.createElement('div', { className: 'page-heading-copy' });
  copy.append(
    ui.createElement('div', {
      className: 'eyebrow',
      children: [
        ui.createElement('span', { className: 'eyebrow-dot' }),
        'PILLAR 04 · CAMPUS COMMUNITY',
      ],
    }),
  );
  copy.append(ui.createElement('h1', { text: 'Campus Community & Information Sharing' }));
  copy.append(
    ui.createElement('p', {
      text: 'Find your campus spaces, exchange useful knowledge and keep conversations moving.',
    }),
  );
  heading.append(copy);
  page.append(heading);

  const intro = ui.createElement('section', { className: 'community-hero' });
  const introCopy = ui.createElement('div');
  introCopy.append(
    ui.createElement('span', {
      className: 'community-hero-kicker',
      text: 'YOUR CAMPUS, IN ONE PLACE',
    }),
  );
  introCopy.append(ui.createElement('h2', { text: 'Good conversations build better campuses.' }));
  introCopy.append(
    ui.createElement('p', {
      text: 'Choose a community to ask questions, share what you know or start a discussion. These are ongoing spaces, distinct from temporary clubs.',
    }),
  );
  intro.append(introCopy);
  const introStats = ui.createElement('div', { className: 'community-hero-stats' });
  introStats.append(ui.createElement('strong', { text: String(communities.length) }));
  introStats.append(ui.createElement('span', { text: 'campus communities' }));
  intro.append(introStats);
  page.append(intro);

  const directorySection = ui.createElement('section', { className: 'page-stack' });
  const directoryHeading = ui.createElement('div', { className: 'section-heading' });
  const directoryCopy = ui.createElement('div');
  directoryCopy.append(ui.createElement('h2', { text: 'Explore communities' }));
  directoryCopy.append(
    ui.createElement('p', {
      text: 'Predefined spaces for campus-wide and topic-based conversations.',
    }),
  );
  directoryHeading.append(directoryCopy);
  const search = ui.createElement('input', {
    attrs: {
      type: 'search',
      placeholder: 'Search communities…',
      'aria-label': 'Search communities',
    },
    className: 'community-search',
  });
  directoryHeading.append(search);
  directorySection.append(directoryHeading);

  const governanceNote = ui.createElement('p', {
    className: 'community-governance-note',
    text: 'These community spaces are preconfigured for this prototype. Students can publish posts inside them; creating or removing community spaces is not available in the student interface.',
  });
  directorySection.append(governanceNote);

  const categoryBar = ui.createElement('div', {
    className: 'community-category-bar',
    attrs: { 'aria-label': 'Community categories' },
  });
  const categoryNames = ['All', ...new Set(communities.map((item) => item.category))];
  let selectedCategory = 'All';
  const grid = ui.createElement('div', { className: 'community-grid' });

  function renderDirectory() {
    const query = search.value.trim().toLocaleLowerCase();
    const filtered = communities.filter((community) => {
      const matchesCategory = selectedCategory === 'All' || community.category === selectedCategory;
      const matchesQuery = `${community.name} ${community.description} ${community.category}`
        .toLocaleLowerCase()
        .includes(query);
      return matchesCategory && matchesQuery;
    });
    grid.replaceChildren();
    if (!filtered.length) {
      ui.showEmpty(grid, 'No communities match your search. Try another keyword or category.');
      return;
    }
    filtered.forEach((community) => grid.append(createCommunityCard(community)));
  }

  categoryNames.forEach((category) => {
    const button = ui.createButton({
      text: category,
      variant: category === 'All' ? 'primary' : 'quiet',
      className: 'community-category-button',
      onClick: () => {
        selectedCategory = category;
        categoryBar.querySelectorAll('button').forEach((item) => {
          const active = item.textContent === category;
          item.classList.toggle('btn-primary', active);
          item.classList.toggle('btn-quiet', !active);
          item.setAttribute('aria-pressed', String(active));
        });
        renderDirectory();
      },
    });
    button.setAttribute('aria-pressed', String(category === 'All'));
    categoryBar.append(button);
  });
  search.addEventListener('input', renderDirectory);
  directorySection.append(categoryBar, grid);
  page.append(directorySection);

  const latestSection = ui.createElement('section', { className: 'page-stack' });
  const latestHeading = ui.createElement('div', { className: 'section-heading' });
  const latestCopy = ui.createElement('div');
  latestCopy.append(ui.createElement('h2', { text: 'Latest conversations' }));
  latestCopy.append(
    ui.createElement('p', {
      text: 'Recent questions, discussions and shared resources from across campus.',
    }),
  );
  latestHeading.append(latestCopy);
  latestSection.append(latestHeading);
  const latestGrid = ui.createElement('div', { className: 'community-latest-grid' });
  if (latestPosts.length) latestPosts.forEach((post) => latestGrid.append(createLatestPost(post)));
  else ui.showEmpty(latestGrid, 'No conversations yet. Open a community and start the first one.');
  latestSection.append(latestGrid);
  page.append(latestSection);

  renderDirectory();
  document.querySelector('#app-content').replaceChildren(page);
}
