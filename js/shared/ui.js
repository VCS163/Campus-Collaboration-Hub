function createElement(tagName, options = {}) {
  const element = document.createElement(tagName);
  const {
    className,
    class: classValue,
    id,
    text,
    attrs = {},
    children = [],
    events = {},
  } = options;

  if (className || classValue) element.className = className || classValue;
  if (id) element.id = id;
  if (text !== undefined && text !== null) element.textContent = String(text);

  for (const [name, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (value === true) element.setAttribute(name, '');
    else element.setAttribute(name, String(value));
  }

  for (const child of Array.isArray(children) ? children : [children]) {
    if (child instanceof Node) element.append(child);
    else if (child !== null && child !== undefined)
      element.append(document.createTextNode(String(child)));
  }

  for (const [eventName, handler] of Object.entries(events)) {
    if (typeof handler === 'function') element.addEventListener(eventName, handler);
  }

  return element;
}

function clearContent(container) {
  if (container) container.replaceChildren();
}

function createBadge(text, variant = 'neutral') {
  return createElement('span', { className: `badge badge-${variant}`, text });
}

function createButton({
  text,
  type = 'button',
  variant = 'secondary',
  onClick,
  disabled = false,
  className = '',
}) {
  return createElement('button', {
    className: `btn btn-${variant}${className ? ` ${className}` : ''}`,
    text,
    attrs: { type, disabled: disabled ? true : null },
    events: onClick ? { click: onClick } : {},
  });
}

function createCard({
  title,
  subtitle = '',
  badges = [],
  body = null,
  actions = [],
  className = '',
}) {
  const card = createElement('article', { className: `card${className ? ` ${className}` : ''}` });
  const header = createElement('div', { className: 'card-header' });
  header.append(createElement('h3', { className: 'card-title', text: title }));
  if (subtitle) header.append(createElement('p', { className: 'card-subtitle', text: subtitle }));

  if (badges.length) {
    const badgeRow = createElement('div', { className: 'tag-list' });
    badges.forEach((badge) =>
      badgeRow.append(createBadge(badge.text ?? badge, badge.variant ?? 'neutral')),
    );
    header.append(badgeRow);
  }
  card.append(header);

  if (body) {
    const bodyElement = createElement('div', { className: 'card-body' });
    if (body instanceof Node) bodyElement.append(body);
    else bodyElement.textContent = String(body);
    card.append(bodyElement);
  }

  if (actions.length) {
    const actionRow = createElement('div', { className: 'card-actions' });
    actions.forEach((action) => actionRow.append(action));
    card.append(actionRow);
  }
  return card;
}

function createFormGroup({
  label,
  type = 'text',
  name,
  value = '',
  placeholder = '',
  required = false,
  hint = '',
}) {
  const wrapper = createElement('div', { className: 'form-group' });
  const inputId = `field-${name}`;
  wrapper.append(createElement('label', { text: label, attrs: { for: inputId } }));

  const input =
    type === 'textarea'
      ? createElement('textarea', {
          id: inputId,
          attrs: { name, placeholder, required: required ? true : null },
        })
      : createElement(type === 'select' ? 'select' : 'input', {
          id: inputId,
          attrs: {
            name,
            type: type === 'select' ? null : type,
            placeholder,
            required: required ? true : null,
          },
        });

  if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement)
    input.value = value;
  wrapper.append(input);
  if (hint) wrapper.append(createElement('span', { className: 'form-hint', text: hint }));
  return wrapper;
}

function showEmpty(container, message, actionLabel = '', actionHash = '') {
  if (!container) return;
  const empty = createElement('div', { className: 'empty-state' });
  empty.append(createElement('h3', { text: 'Nothing here yet' }));
  empty.append(createElement('p', { text: message }));
  if (actionLabel && actionHash) {
    const link = createElement('a', {
      className: 'btn btn-primary',
      text: actionLabel,
      attrs: { href: actionHash },
    });
    empty.append(link);
  }
  container.append(empty);
}

function renderList(container, items, renderItem, emptyMessage = 'There are no items to display.') {
  if (!container) return;
  clearContent(container);
  if (!Array.isArray(items) || items.length === 0) {
    showEmpty(container, emptyMessage);
    return;
  }
  const fragment = document.createDocumentFragment();
  items.forEach((item, index) => fragment.append(renderItem(item, index)));
  container.append(fragment);
}

function showToast(message, type = 'info', duration = 3200) {
  const container = document.querySelector('#toast-container');
  if (!container) return null;
  const toast = createElement('div', {
    className: `toast toast-${type}`,
    text: message,
    attrs: { role: type === 'error' ? 'alert' : 'status' },
  });
  container.append(toast);
  window.setTimeout(() => toast.remove(), duration);
  return toast;
}

function createModal({ title, body, actions = [], onClose }) {
  const overlay = createElement('div', {
    className: 'modal-overlay',
    attrs: { role: 'presentation' },
  });
  const dialog = createElement('section', {
    className: 'modal',
    attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
  });
  const heading = createElement('div', { className: 'modal-header' });
  heading.append(createElement('h2', { text: title }));
  heading.append(
    createButton({
      text: 'Close',
      variant: 'quiet',
      onClick: () => {
        overlay.remove();
        onClose?.();
      },
    }),
  );
  dialog.append(heading);
  const content = createElement('div', { className: 'modal-body' });
  if (body instanceof Node) content.append(body);
  else content.textContent = String(body ?? '');
  dialog.append(content);
  if (actions.length) {
    const footer = createElement('div', { className: 'modal-actions' });
    actions.forEach((action) => footer.append(action));
    dialog.append(footer);
  }
  overlay.append(dialog);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      overlay.remove();
      onClose?.();
    }
  });
  document.body.append(overlay);
  return overlay;
}

export const ui = Object.freeze({
  createElement,
  clearContent,
  renderList,
  showToast,
  showEmpty,
  createCard,
  createFormGroup,
  createButton,
  createBadge,
  createModal,
});
