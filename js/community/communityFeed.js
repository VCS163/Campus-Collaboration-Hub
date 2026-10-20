import { router } from '../router.js';
import { ui } from '../shared/ui.js';
import { communityService } from './communityService.js';
import { formatCount } from './communityFormatters.js';

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function createPostCard(post) {
  const card = ui.createElement('article', { className: 'card community-post-card' });
  const meta = ui.createElement('div', { className: 'community-post-meta' });
  meta.append(ui.createBadge(post.type, post.type === 'question' ? 'warning' : post.type === 'resource' ? 'success' : 'primary'));
  meta.append(ui.createElement('span', { text: `${post.authorName} · ${post.authorBranch || 'Student'} · ${formatDate(post.createdAt)}` }));
  card.append(meta);
  card.append(ui.createElement('h3', { className: 'card-title', text: post.title }));
  card.append(ui.createElement('p', { className: 'post-excerpt', text: post.body }));
  const footer = ui.createElement('div', { className: 'community-post-footer' });
  footer.append(ui.createElement('span', { text: `♥ ${formatCount(post.reactionCount, 'like')}` }));
  footer.append(ui.createElement('span', { text: `◌ ${formatCount(post.commentCount, 'comment')}` }));
  footer.append(ui.createButton({ text: 'View discussion', variant: 'secondary', onClick: () => router.navigate(`/community/posts/${post.id}`) }));
  card.append(footer);
  return card;
}

export function renderCommunityFeed(communityId) {
  const community = communityService.getCommunity(communityId);
  const appContent = document.querySelector('#app-content');
  if (!community) {
    const page = ui.createElement('div', { className: 'page-stack' });
    ui.showEmpty(page, 'This community could not be found or is not available.', 'Back to communities', '#/community');
    appContent.replaceChildren(page);
    return;
  }

  const page = ui.createElement('div', { className: 'page-stack community-page' });
  const breadcrumb = ui.createElement('a', { className: 'back-link', text: '← All communities', attrs: { href: '#/community' } });
  page.append(breadcrumb);

  const hero = ui.createElement('section', { className: 'community-detail-hero' });
  const heroMain = ui.createElement('div', { className: 'community-detail-main' });
  heroMain.append(ui.createBadge(community.category, 'primary'));
  heroMain.append(ui.createElement('h1', { text: community.name }));
  heroMain.append(ui.createElement('p', { text: community.description }));
  hero.append(heroMain);
  const heroStats = ui.createElement('div', { className: 'community-detail-stats' });
  [
    [community.postCount, 'Posts'],
    [community.commentCount, 'Comments'],
    [community.contributorCount, 'Contributors'],
  ].forEach(([value, label]) => {
    const stat = ui.createElement('div', { className: 'community-detail-stat' });
    stat.append(ui.createElement('strong', { text: String(value) }));
    stat.append(ui.createElement('span', { text: label }));
    heroStats.append(stat);
  });
  hero.append(heroStats);
  page.append(hero);

  const heading = ui.createElement('div', { className: 'section-heading community-feed-heading' });
  const copy = ui.createElement('div');
  copy.append(ui.createElement('h2', { text: 'Community feed' }));
  copy.append(ui.createElement('p', { text: 'Newest conversations appear first.' }));
  heading.append(copy);
  heading.append(ui.createButton({ text: '+ Create post', variant: 'primary', onClick: () => router.navigate(`/community/${community.id}/new`) }));
  page.append(heading);

  const posts = communityService.getCommunityPosts(communityId);
  const feed = ui.createElement('div', { className: 'community-feed-list' });
  if (posts.length) posts.forEach((post) => feed.append(createPostCard(post)));
  else {
    const empty = ui.createElement('section', { className: 'empty-state community-empty' });
    empty.append(ui.createElement('span', { className: 'community-empty-mark', text: '✦', attrs: { 'aria-hidden': 'true' } }));
    empty.append(ui.createElement('h3', { text: 'Start this conversation' }));
    empty.append(ui.createElement('p', { text: `There are no posts in ${community.name} yet. Share a question, discussion or resource to get things moving.` }));
    empty.append(ui.createButton({ text: 'Create the first post', variant: 'primary', onClick: () => router.navigate(`/community/${community.id}/new`) }));
    feed.append(empty);
  }
  page.append(feed);
  appContent.replaceChildren(page);
}
