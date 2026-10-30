import test, { before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

class MemoryStorage {
  #values = new Map();
  get length() {
    return this.#values.size;
  }
  key(index) {
    return [...this.#values.keys()][index] ?? null;
  }
  getItem(key) {
    return this.#values.has(String(key)) ? this.#values.get(String(key)) : null;
  }
  setItem(key, value) {
    this.#values.set(String(key), String(value));
  }
  removeItem(key) {
    this.#values.delete(String(key));
  }
  clear() {
    this.#values.clear();
  }
}

globalThis.localStorage = new MemoryStorage();

let storage;
let seed;
let communityService;
let formatCount;

before(async () => {
  ({ storage } = await import('../js/shared/storage.js'));
  ({ seed } = await import('../js/shared/seed.js'));
  ({ communityService } = await import('../js/community/communityService.js'));
  ({ formatCount } = await import('../js/community/communityFormatters.js'));
  seed.initialise();
});

beforeEach(() => {
  storage.resetDemoData();
});

test('seed data includes five predefined communities, posts, comments and reactions', () => {
  assert.equal(storage.get('communities').length, 5);
  assert.equal(storage.get('posts').length, 4);
  assert.equal(storage.get('comments').length, 3);
  assert.equal(storage.get('reactions').length, 2);
});

test('community directory returns active communities alphabetically with derived statistics', () => {
  const communities = communityService.getCommunities();
  assert.equal(communities.length, 5);
  assert.deepEqual(
    communities.map((community) => community.name),
    ['AI / ML', 'Campus Life', 'CSE', 'ECE', 'General'],
  );
  const ece = communities.find((community) => community.id === 'community_ece');
  assert.equal(ece.postCount, 1);
  assert.equal(ece.commentCount, 1);
  assert.equal(ece.reactionCount, 1);
});

test('unknown or inactive community is not exposed', () => {
  assert.equal(communityService.getCommunity('missing-community'), null);
  storage.update('communities', 'community_ece', { status: 'archived' });
  assert.equal(communityService.getCommunity('community_ece'), null);
  assert.equal(communityService.getCommunityPosts('community_ece').length, 0);
});

test('community feed returns only its own posts ordered newest first', () => {
  const posts = communityService.getCommunityPosts('community_ece');
  assert.equal(posts.length, 1);
  assert.equal(posts[0].id, 'post_ece_embedded');
  assert.equal(posts[0].authorName, 'Arjun Sharma');
  assert.equal(posts[0].commentCount, 1);
  assert.equal(communityService.getCommunityPosts('community_general')[0].id, 'post_general_study');
});

test('latest campus posts include their community and are ordered newest first', () => {
  const latest = communityService.getLatestPosts(3);
  assert.equal(latest.length, 3);
  assert.equal(latest[0].id, 'post_ece_embedded');
  assert.equal(latest[0].community.name, 'ECE');
});

test('student can create a discussion, question or resource post with trimmed fields', () => {
  for (const type of ['discussion', 'question', 'resource']) {
    const created = communityService.createPost('student_ravi_kumar', {
      communityId: 'community_cse',
      type,
      title: `  ${type} from Ravi  `,
      body: '  I would like to share a useful thought with this community.  ',
    });
    assert.equal(created.ok, true);
    assert.equal(created.post.type, type);
    assert.equal(created.post.title, ` ${type} from Ravi`.trim());
    assert.equal(created.post.body, 'I would like to share a useful thought with this community.');
    assert.equal(created.post.authorId, 'student_ravi_kumar');
  }
});

test('post creation rejects invalid author, community, type, title and body', () => {
  const valid = {
    communityId: 'community_cse',
    type: 'discussion',
    title: 'Valid post title',
    body: 'This is a valid post body.',
  };
  assert.equal(communityService.createPost('missing-student', valid).reason, 'invalid-author');
  assert.equal(
    communityService.createPost('student_ravi_kumar', {
      ...valid,
      communityId: 'missing-community',
    }).reason,
    'community-not-found',
  );
  assert.equal(
    communityService.createPost('student_ravi_kumar', { ...valid, type: 'announcement' }).reason,
    'invalid-type',
  );
  assert.equal(
    communityService.createPost('student_ravi_kumar', { ...valid, title: 'Hey' }).reason,
    'invalid-title',
  );
  assert.equal(
    communityService.createPost('student_ravi_kumar', {
      ...valid,
      title: 'Valid title',
      body: 'short',
    }).reason,
    'invalid-body',
  );
  assert.equal(
    communityService.createPost('student_ravi_kumar', { ...valid, title: 'x'.repeat(101) }).reason,
    'invalid-title',
  );
  assert.equal(
    communityService.createPost('student_ravi_kumar', { ...valid, body: 'x'.repeat(2001) }).reason,
    'invalid-body',
  );
});

test('comment creation trims content and references an existing post and student', () => {
  const created = communityService.addComment({
    postId: 'post_ece_embedded',
    authorId: 'student_meera_patel',
    body: '  I have an idea for this build.  ',
  });
  assert.equal(created.ok, true);
  assert.equal(created.comment.body, 'I have an idea for this build.');
  assert.equal(created.comment.postId, 'post_ece_embedded');
});

test('comment creation rejects invalid author, missing post, blank text and overlong text', () => {
  assert.equal(
    communityService.addComment({
      postId: 'post_ece_embedded',
      authorId: 'missing',
      body: 'A valid comment',
    }).reason,
    'invalid-author',
  );
  assert.equal(
    communityService.addComment({
      postId: 'missing-post',
      authorId: 'student_ravi_kumar',
      body: 'A valid comment',
    }).reason,
    'post-not-found',
  );
  assert.equal(
    communityService.addComment({
      postId: 'post_ece_embedded',
      authorId: 'student_ravi_kumar',
      body: '   ',
    }).reason,
    'invalid-body',
  );
  assert.equal(
    communityService.addComment({
      postId: 'post_ece_embedded',
      authorId: 'student_ravi_kumar',
      body: 'x'.repeat(601),
    }).reason,
    'invalid-body',
  );
});

test('student can like another student post and toggle the like off', () => {
  const first = communityService.toggleLike({
    postId: 'post_ece_embedded',
    studentId: 'student_ravi_kumar',
  });
  assert.equal(first.ok, true);
  assert.equal(first.reason, 'liked');
  assert.equal(first.liked, true);
  assert.equal(communityService.hasLiked('post_ece_embedded', 'student_ravi_kumar'), true);
  assert.equal(first.reactionCount, 2);

  const second = communityService.toggleLike({
    postId: 'post_ece_embedded',
    studentId: 'student_ravi_kumar',
  });
  assert.equal(second.ok, true);
  assert.equal(second.reason, 'unliked');
  assert.equal(second.liked, false);
  assert.equal(communityService.hasLiked('post_ece_embedded', 'student_ravi_kumar'), false);
  assert.equal(second.reactionCount, 1);
});

test('one student cannot create duplicate likes for the same post', () => {
  communityService.toggleLike({ postId: 'post_ece_embedded', studentId: 'student_ravi_kumar' });
  const countAfterLike = storage.query(
    'reactions',
    (reaction) =>
      reaction.postId === 'post_ece_embedded' && reaction.studentId === 'student_ravi_kumar',
  ).length;
  assert.equal(countAfterLike, 1);
  communityService.toggleLike({ postId: 'post_ece_embedded', studentId: 'student_ravi_kumar' });
  assert.equal(
    storage.query(
      'reactions',
      (reaction) =>
        reaction.postId === 'post_ece_embedded' && reaction.studentId === 'student_ravi_kumar',
    ).length,
    0,
  );
});

test('post author cannot like their own post (provisional Q9 recommendation)', () => {
  const outcome = communityService.toggleLike({
    postId: 'post_ece_embedded',
    studentId: 'student_arjun_sharma',
  });
  assert.equal(outcome.ok, false);
  assert.equal(outcome.reason, 'self-reaction');
  assert.equal(
    storage.query(
      'reactions',
      (reaction) =>
        reaction.postId === 'post_ece_embedded' && reaction.studentId === 'student_arjun_sharma',
    ).length,
    0,
  );
});

test('post details include author, community, oldest-first comments and reactions', () => {
  const details = communityService.getPostDetails('post_ece_embedded');
  assert.equal(details.post.authorName, 'Arjun Sharma');
  assert.equal(details.community.name, 'ECE');
  assert.equal(details.comments.length, 1);
  assert.equal(details.comments[0].authorName, 'Priya Nair');
  assert.equal(details.reactions.length, 1);
  assert.equal(communityService.getPostDetails('missing-post'), null);
});

test('comment and reaction actions reject a post whose parent community is unavailable', () => {
  storage.update('communities', 'community_ece', { status: 'archived' });
  assert.equal(
    communityService.addComment({
      postId: 'post_ece_embedded',
      authorId: 'student_ravi_kumar',
      body: 'A valid comment',
    }).reason,
    'post-not-found',
  );
  assert.equal(
    communityService.toggleLike({ postId: 'post_ece_embedded', studentId: 'student_ravi_kumar' })
      .reason,
    'post-not-found',
  );
  assert.equal(communityService.getPostDetails('post_ece_embedded'), null);
});

test('community counts use correct singular and plural labels', () => {
  assert.equal(formatCount(0, 'comment'), '0 comments');
  assert.equal(formatCount(1, 'comment'), '1 comment');
  assert.equal(formatCount(2, 'comment'), '2 comments');
  assert.equal(formatCount(1, 'contributor'), '1 contributor');
  assert.equal(formatCount(3, 'contributor'), '3 contributors');
  assert.equal(formatCount(-4, 'like'), '0 likes');
});
