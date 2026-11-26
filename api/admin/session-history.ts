import type { ServerResponse } from 'http';
import { handleListSessionHistory } from '../../lib/adminAuth.js';
import { sendJson, type VercelNodeRequest } from '../../lib/vercelHttp.js';

export default async function handler(req: VercelNodeRequest, res: ServerResponse) {
  if (req.method !== 'GET') {
    sendJson(res, 405, {
      ok: false,
      error: 'Login & logout history is permanent and cannot be modified or deleted.',
    });
    return;
  }

  try {
    const authHeader =
      typeof req.headers?.authorization === 'string' ? req.headers.authorization : undefined;
    const result = await handleListSessionHistory(authHeader);
    sendJson(res, result.status, result.payload);
  } catch (err) {
    sendJson(res, 500, {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to load login history',
    });
  }
}
