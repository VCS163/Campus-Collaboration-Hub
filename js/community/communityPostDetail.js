import { router } from '../router.js';
import { auth } from '../shared/auth.js';
import { ui } from '../shared/ui.js';
import { validation, validators } from '../shared/validation.js';
import { communityService } from './communityService.js';
import { formatCount } from './communityFormatters.js';

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

export function renderCommunityPostDetail(postId) {
  const appContent = document.querySelector('#app-content');
  const details = communityService.getPostDetails(postId);
  const page = ui.createElement('div', { className: 'page-stack community-page' });
  if (!details) {
    ui.showEmpty(page, 'This post could not be found. It may have been removed or the community may be unavailable.', 'Back to communities', '#/community');
    appContent.replaceChildren(page);
    return;
  }

  const { post, community, comments, reactions } = details;
  page.append(ui.createElement('a', { className: 'back-link', text: `← Back to ${community.name}`, attrs: { href: `#/community/${community.id}` } }));

  const article = ui.createElement('article', { className: 'card community-post-detail-card' });
  const meta = ui.createElement('div', { className: 'community-post-meta' });
  meta.append(ui.createBadge(post.type, post.type === 'question' ? 'warning' : post.type === 'resource' ? 'success' : 'primary'));
  meta.append(ui.createElement('span', { text: `${community.name} · ${post.authorName} · ${post.authorBranch || 'Student'}` }));
  article.append(meta);
  article.append(ui.createElement('h1', { text: post.title }));
  article.append(ui.createElement('span', { className: 'post-timestamp', text: formatDate(post.createdAt) }));
  article.append(ui.createElement('p', { className: 'community-post-body', text: post.body }));

  const actionRow = ui.createElement('div', { className: 'community-post-actions' });
  const currentUserId = auth.getCurrentUserId();
  const liked = communityService.hasLiked(post.id, currentUserId);
  const isAuthor = post.authorId === currentUserId;
  const likeButton = ui.createButton({
    text: `${liked ? '♥ Liked' : '♡ Like'} · ${reactions.length}`,
    variant: liked ? 'primary' : 'secondary',
    disabled: isAuthor,
    onClick: () => {
      const outcome = communityService.toggleLike({ postId: post.id, studentId: auth.getCurrentUserId() });
      if (!outcome.ok) ui.showToast(outcome.message || 'Could not update reaction.', 'error');
      else ui.showToast(outcome.liked ? 'You liked this post.' : 'Like removed.', 'success');
      router.dispatch();
    },
  });
  likeButton.setAttribute('aria-pressed', String(liked));
  actionRow.append(likeButton);
  actionRow.append(ui.createElement('span', { className: 'community-action-count', text: formatCount(comments.length, 'comment') }));
  if (isAuthor) actionRow.append(ui.createElement('span', { className: 'form-hint', text: 'You cannot like your own post.' }));
  article.append(actionRow);
  page.append(article);

  const commentsSection = ui.createElement('section', { className: 'page-stack comments-section' });
  const commentsHeading = ui.createElement('div', { className: 'section-heading' });
  const headingCopy = ui.createElement('div');
  headingCopy.append(ui.createElement('h2', { text: `Discussion (${comments.length})` }));
  headingCopy.append(ui.createElement('p', { text: 'Add a helpful, respectful comment to keep the conversation moving.' }));
  commentsHeading.append(headingCopy);
  commentsSection.append(commentsHeading);

  const commentForm = ui.createElement('form', { className: 'card comment-form', attrs: { novalidate: true } });
  const bodyGroup = ui.createFormGroup({ label: 'Write a comment', type: 'textarea', name: 'body', placeholder: 'Share your thoughts…', required: true, hint: '1–600 characters.' });
  const bodyInput = bodyGroup.querySelector('textarea');
  bodyInput.maxLength = 600;
  bodyInput.rows = 3;
  commentForm.append(bodyGroup);
  commentForm.append(ui.createButton({ text: 'Add comment', variant: 'primary', type: 'submit' }));
  commentForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const body = bodyInput.value.trim();
    const validationResult = validation.validateForm({ body }, {
      body: [(value) => validators.required(value, 'Comment'), (value) => validators.minLength(value, 1, 'Comment'), (value) => validators.maxLength(value, 600, 'Comment')],
    });
    validation.showFormErrors(commentForm, validationResult.errors);
    if (!validationResult.valid) return;

    try {
      const created = communityService.addComment({ postId: post.id, authorId: auth.getCurrentUserId(), body });
      if (!created.ok) {
        ui.showToast(created.message || 'The comment could not be added.', 'error');
        return;
      }
      ui.showToast(created.message, 'success');
      router.dispatch();
    } catch (error) {
      ui.showToast(error.message || 'The comment could not be saved. Your text is still on the form.', 'error');
    }
  });
  commentsSection.append(commentForm);

  const commentList = ui.createElement('div', { className: 'community-comment-list' });
  if (!comments.length) {
    ui.showEmpty(commentList, 'There are no comments yet. Be the first to respond.');
  } else {
    comments.forEach((comment) => {
      const item = ui.createElement('article', { className: 'community-comment' });
      const top = ui.createElement('div', { className: 'community-comment-meta' });
      top.append(ui.createElement('strong', { text: comment.authorName }));
      top.append(ui.createElement('span', { text: `${comment.authorBranch || 'Student'} · ${formatDate(comment.createdAt)}` }));
      item.append(top);
      item.append(ui.createElement('p', { className: 'community-comment-body', text: comment.body }));
      commentList.append(item);
    });
  }
  commentsSection.append(commentList);
  page.append(commentsSection);
  appContent.replaceChildren(page);
}
