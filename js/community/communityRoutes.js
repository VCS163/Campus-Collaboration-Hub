import { router } from '../router.js';
import { renderCommunityList } from './communityList.js';
import { renderCommunityFeed } from './communityFeed.js';
import { renderCommunityPostForm } from './communityPostForm.js';
import { renderCommunityPostDetail } from './communityPostDetail.js';

export function registerCommunityRoutes() {
  router.register('/community', () => renderCommunityList());
  router.register('/community/:communityId/new', ({ communityId }) => renderCommunityPostForm(communityId));
  router.register('/community/posts/:id', ({ id }) => renderCommunityPostDetail(id));
  router.register('/community/:id', ({ id }) => renderCommunityFeed(id));
}
