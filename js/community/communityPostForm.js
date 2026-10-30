import { router } from '../router.js';
import { auth } from '../shared/auth.js';
import { ui } from '../shared/ui.js';
import { validation, validators } from '../shared/validation.js';
import { communityService, COMMUNITY_POST_TYPES } from './communityService.js';

export function renderCommunityPostForm(communityId) {
  const appContent = document.querySelector('#app-content');
  const community = communityService.getCommunity(communityId);
  if (!community) {
    const page = ui.createElement('div', { className: 'page-stack' });
    ui.showEmpty(page, 'This community could not be found.', 'Back to communities', '#/community');
    appContent.replaceChildren(page);
    return;
  }

  const page = ui.createElement('div', { className: 'page-stack form-page community-post-page' });
  page.append(
    ui.createElement('a', {
      className: 'back-link',
      text: `← Back to ${community.name}`,
      attrs: { href: `#/community/${community.id}` },
    }),
  );
  const heading = ui.createElement('section', { className: 'page-heading' });
  const copy = ui.createElement('div', { className: 'page-heading-copy' });
  copy.append(
    ui.createElement('div', {
      className: 'eyebrow',
      text: `${community.name.toUpperCase()} · NEW POST`,
    }),
  );
  copy.append(ui.createElement('h1', { text: 'Start a conversation' }));
  copy.append(
    ui.createElement('p', {
      text: 'Share something useful with your campus community. Your name is taken from the active demo user.',
    }),
  );
  heading.append(copy);
  page.append(heading);

  const form = ui.createElement('form', {
    className: 'card form-card community-post-form',
    attrs: { novalidate: true },
  });
  const context = ui.createElement('div', { className: 'community-post-context' });
  const contextMark = ui.createElement('span', {
    className: 'community-post-context-mark',
    text: community.name.slice(0, 2).toUpperCase(),
    attrs: { 'aria-hidden': 'true' },
  });
  const contextCopy = ui.createElement('div', { className: 'community-post-context-copy' });
  contextCopy.append(ui.createElement('strong', { text: `Posting in ${community.name}` }));
  contextCopy.append(
    ui.createElement('span', {
      text: 'This is an ongoing campus space. Your post will appear in this community feed.',
    }),
  );
  context.append(contextMark, contextCopy);
  form.append(context);
  const typeGroup = ui.createElement('div', { className: 'form-group community-post-type-group' });
  typeGroup.append(
    ui.createElement('label', { text: 'Post type', attrs: { for: 'community-post-type' } }),
  );
  const typeSelect = ui.createElement('select', {
    id: 'community-post-type',
    attrs: { name: 'type', required: true },
  });
  COMMUNITY_POST_TYPES.forEach((item) => {
    const option = ui.createElement('option', { text: item.label, attrs: { value: item.value } });
    typeSelect.append(option);
  });
  typeGroup.append(typeSelect);
  typeGroup.append(
    ui.createElement('span', {
      className: 'form-hint',
      text: 'Choose Discussion, Question or Resource. Resource posts can describe or cite useful material in the post body; file uploads are not part of this MVP.',
    }),
  );
  form.append(typeGroup);

  const titleGroup = ui.createFormGroup({
    label: 'Title',
    name: 'title',
    placeholder: 'Give your post a clear, specific title',
    required: true,
    hint: '5–100 characters.',
  });
  const titleInput = titleGroup.querySelector('input');
  titleInput.maxLength = 100;
  form.append(titleGroup);

  const bodyGroup = ui.createFormGroup({
    label: 'Post content',
    type: 'textarea',
    name: 'body',
    placeholder: 'Share the details, context or resource you want other students to respond to…',
    required: true,
    hint: '10–2,000 characters. Whitespace-only content is not accepted.',
  });
  const bodyInput = bodyGroup.querySelector('textarea');
  bodyInput.maxLength = 2000;
  bodyInput.rows = 6;
  form.append(bodyGroup);

  const actions = ui.createElement('div', {
    className: 'form-actions community-post-form-actions',
  });
  actions.append(
    ui.createButton({
      text: 'Cancel',
      variant: 'secondary',
      onClick: () => router.navigate(`/community/${community.id}`),
    }),
  );
  actions.append(
    ui.createButton({
      text: 'Publish post',
      variant: 'primary',
      type: 'submit',
      className: 'community-publish-button',
    }),
  );
  form.append(actions);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = {
      type: typeSelect.value,
      title: titleInput.value.trim(),
      body: bodyInput.value.trim(),
    };
    const validationResult = validation.validateForm(values, {
      type: [
        (value) =>
          validators.isEnum(
            value,
            COMMUNITY_POST_TYPES.map((item) => item.value),
            'Post type',
          ),
      ],
      title: [
        (value) => validators.required(value, 'Title'),
        (value) => validators.minLength(value, 5, 'Title'),
        (value) => validators.maxLength(value, 100, 'Title'),
      ],
      body: [
        (value) => validators.required(value, 'Post content'),
        (value) => validators.minLength(value, 10, 'Post content'),
        (value) => validators.maxLength(value, 2000, 'Post content'),
      ],
    });
    validation.showFormErrors(form, validationResult.errors);
    if (!validationResult.valid) return;

    try {
      const created = communityService.createPost(auth.getCurrentUserId(), {
        ...values,
        communityId,
      });
      if (!created.ok) {
        ui.showToast(created.message || 'The post could not be published.', 'error');
        return;
      }
      ui.showToast(created.message, 'success');
      router.navigate(`/community/posts/${created.post.id}`);
    } catch (error) {
      ui.showToast(
        error.message || 'The post could not be saved. Your text is still on the form.',
        'error',
      );
    }
  });

  page.append(form);
  appContent.replaceChildren(page);
  titleInput.focus();
}
