import { router } from '../router.js';
import { renderApplicationForm } from './applicationForm.js';
import { renderProjectDetail } from './projectDetail.js';
import { renderProjectForm } from './projectForm.js';
import { renderProjectList } from './projectList.js';

export function registerProjectRoutes() {
  router.register('/projects', () => renderProjectList());
  router.register('/projects/new', () => renderProjectForm());
  router.register('/projects/:id/apply/:roleId', ({ id, roleId }) =>
    renderApplicationForm(id, roleId),
  );
  router.register('/projects/:id', ({ id }) => renderProjectDetail(id));
}
