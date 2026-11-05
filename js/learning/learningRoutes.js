import { router } from '../router.js';
import { renderLearningRequestForm } from './learningRequestForm.js';
import { renderMentorDetail } from './mentorDetail.js';
import { renderMentorForm } from './mentorForm.js';
import { renderMentorList } from './mentorList.js';
import { renderMentorshipRequestForm } from './mentorshipRequestForm.js';
import { renderLearningGroup } from './learningGroup.js';

export function registerLearningRoutes() {
  router.register('/learning', () => renderMentorList());
  router.register('/learning/offers/new', () => renderMentorForm());
  router.register('/learning/requests/new', () => renderLearningRequestForm());
  router.register('/learning/offers/:id/request', ({ id }) => renderMentorshipRequestForm(id));
  router.register('/learning/offers/:id', ({ id }) => renderMentorDetail(id));
  router.register('/learning/groups/:id', ({ id }) => renderLearningGroup(id));
}
