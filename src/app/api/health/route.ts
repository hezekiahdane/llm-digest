import { successResponse } from '@/lib/core/api/response';
import { withApi } from '@/lib/core/api/with-api';

export const GET = withApi({ csrf: false, rateLimit: 'api' }, async () => {
  return successResponse({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});
