import { storage } from '../shared/storage.js';

export const COMMUNITY_POST_TYPES = Object.freeze([
  { value: 'discussion', label: 'Discussion' },
  { value: 'question', label: 'Question' },
  { value: 'resource', label: 'Resource' },
]);

const POST_TITLE_MIN = 5;
const POST_TITLE_MAX = 100;
const POST_BODY_MIN = 10;
const POST_BODY_MAX = 2000;
const COMMENT_MIN = 1;
const COMMENT_MAX = 600;

function result(ok, reason = null, extra = {}) {
  return { ok, reason, ...extra };
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isActiveCommunity(community) {
  return Boolean(community) && (!community.status || community.status === 'active');
}

function getCommunityStats(communityId) {
  const posts = storage.query('posts', (post) => post.communityId === communityId);
  const postIds = new Set(posts.map((post) => post.id));
  const comments = storage.query('comments', (comment) => postIds.has(comment.postId));
  const reactions = storage.query('reactions', (reaction) => postIds.has(reaction.postId));
  const contributorIds = new Set(posts.map((post) => post.authorId));
  comments.forEach((comment) => contributorIds.add(comment.authorId));
  return {
    postCount: posts.length,
    commentCount: comments.length,
    reactionCount: reactions.length,
    contributorCount: contributorIds.size,
  };
}

function getCommunities() {
  return storage
    .get('communities')
    .filter(isActiveCommunity)
    .map((community) => ({ ...community, ...getCommunityStats(community.id) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getCommunity(communityId) {
  const community = storage.getById('communities', communityId);
  if (!isActiveCommunity(community)) return null;
  return { ...community, ...getCommunityStats(communityId) };
}

function getCommunityPosts(communityId) {
  const community = getCommunity(communityId);
  if (!community) return [];
  return storage
    .query('posts', (post) => post.communityId === communityId)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .map((post) => enrichPost(post));
}

function enrichPost(post) {
  const author = storage.getById('students', post.authorId);
  const comments = storage.query('comments', (comment) => comment.postId === post.id);
  const reactions = storage.query('reactions', (reaction) => reaction.postId === post.id);
  return {
    ...post,
    authorName: author?.displayName || 'Unknown student',
    authorBranch: author?.branch || '',
    commentCount: comments.length,
    reactionCount: reactions.length,
  };
}

function getLatestPosts(limit = 5) {
  return storage
    .get('posts')
    .filter((post) => isActiveCommunity(storage.getById('communities', post.communityId)))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, Math.max(0, Number(limit) || 0))
    .map((post) => ({
      ...enrichPost(post),
      community: storage.getById('communities', post.communityId),
    }));
}

function getPostDetails(postId) {
  const post = storage.getById('posts', postId);
  if (!post) return null;
  const community = getCommunity(post.communityId);
  if (!community) return null;
  const comments = storage
    .query('comments', (comment) => comment.postId === postId)
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
    .map((comment) => {
      const author = storage.getById('students', comment.authorId);
      return {
        ...comment,
        authorName: author?.displayName || 'Unknown student',
        authorBranch: author?.branch || '',
      };
    });
  return {
    post: enrichPost(post),
    community,
    comments,
    reactions: storage.query('reactions', (reaction) => reaction.postId === postId),
  };
}

function createPost(authorId, details) {
  const author = storage.getById('students', authorId);
  if (!author)
    return result(false, 'invalid-author', {
      message: 'Select a valid demo student before posting.',
    });

  const community = getCommunity(details?.communityId);
  if (!community)
    return result(false, 'community-not-found', { message: 'This community is unavailable.' });

  const type = cleanString(details?.type);
  if (!COMMUNITY_POST_TYPES.some((item) => item.value === type)) {
    return result(false, 'invalid-type', { message: 'Choose a valid post type.' });
  }

  const title = cleanString(details?.title);
  const body = cleanString(details?.body);
  if (title.length < POST_TITLE_MIN || title.length > POST_TITLE_MAX) {
    return result(false, 'invalid-title', {
      message: `Title must be between ${POST_TITLE_MIN} and ${POST_TITLE_MAX} characters.`,
    });
  }
  if (body.length < POST_BODY_MIN || body.length > POST_BODY_MAX) {
    return result(false, 'invalid-body', {
      message: `Post content must be between ${POST_BODY_MIN} and ${POST_BODY_MAX} characters.`,
    });
  }

  const post = storage.insert('posts', {
    communityId: community.id,
    authorId,
    type,
    title,
    body,
  });
  return result(true, null, { post, message: 'Your post has been published.' });
}

function addComment({ postId, authorId, body }) {
  const author = storage.getById('students', authorId);
  if (!author)
    return result(false, 'invalid-author', {
      message: 'Select a valid demo student before commenting.',
    });

  const post = storage.getById('posts', postId);
  if (!post || !getCommunity(post.communityId)) {
    return result(false, 'post-not-found', { message: 'This discussion is no longer available.' });
  }

  const content = cleanString(body);
  if (content.length < COMMENT_MIN || content.length > COMMENT_MAX) {
    return result(false, 'invalid-body', {
      message: `Comment must contain ${COMMENT_MIN}–${COMMENT_MAX} characters.`,
    });
  }

  const comment = storage.insert('comments', { postId, authorId, body: content });
  return result(true, null, { comment, message: 'Your comment has been added.' });
}

function toggleLike({ postId, studentId }) {
  const student = storage.getById('students', studentId);
  if (!student)
    return result(false, 'invalid-student', {
      message: 'Select a valid demo student before reacting.',
    });

  const post = storage.getById('posts', postId);
  if (!post || !getCommunity(post.communityId)) {
    return result(false, 'post-not-found', { message: 'This post is no longer available.' });
  }

  // Provisional Q9 default: a post author cannot like their own post.
  if (post.authorId === studentId) {
    return result(false, 'self-reaction', { message: 'You cannot like your own post.' });
  }

  const existing = storage.query(
    'reactions',
    (reaction) => reaction.postId === postId && reaction.studentId === studentId,
  );

  if (existing.length) {
    existing.forEach((reaction) => storage.remove('reactions', reaction.id));
    return result(true, 'unliked', {
      liked: false,
      reactionCount: storage.query('reactions', (reaction) => reaction.postId === postId).length,
    });
  }

  storage.insert('reactions', { postId, studentId, reactionType: 'like' });
  return result(true, 'liked', {
    liked: true,
    reactionCount: storage.query('reactions', (reaction) => reaction.postId === postId).length,
  });
}

function hasLiked(postId, studentId) {
  return (
    storage.query(
      'reactions',
      (reaction) => reaction.postId === postId && reaction.studentId === studentId,
    ).length > 0
  );
}

export const communityService = Object.freeze({
  getCommunityStats,
  getCommunities,
  getCommunity,
  getCommunityPosts,
  getLatestPosts,
  getPostDetails,
  createPost,
  addComment,
  toggleLike,
  hasLiked,
});
