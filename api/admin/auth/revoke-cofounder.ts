import type { ServerResponse } from 'http';
import { handleRevokeCofounderSession } from '../../../lib/adminAuth.js';
import { sendJson, type VercelNodeRequest } from '../../../lib/vercelHttp.js';

export default async function handler(req: VercelNodeRequest, res: ServerResponse) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
    return;
  }

  try {
    const authHeader =
      typeof req.headers?.authorization === 'string' ? req.headers.authorization : undefined;
    const result = await handleRevokeCofounderSession(authHeader);
    sendJson(res, result.status, result.payload);
  } catch (err) {
    sendJson(res, 500, {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to log out Co-Founder session',
    });
  }
}
