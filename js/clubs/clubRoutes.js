import { router } from '../router.js';
import { renderClubDetail } from './clubDetail.js';
import { renderClubForm } from './clubForm.js';
import { renderClubList } from './clubList.js';

export function registerClubRoutes() {
  router.register('/clubs', () => renderClubList());
  router.register('/clubs/new', () => renderClubForm());
  router.register('/clubs/:id', ({ id }) => renderClubDetail(id));
}
