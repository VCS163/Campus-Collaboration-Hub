import { router } from '../router.js';
import { renderProfileEdit } from './profileEdit.js';

export function registerProfileRoutes() {
  router.register('/profile/edit', () => renderProfileEdit());
}
