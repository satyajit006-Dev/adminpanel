import type { ServerResponse } from 'http';
import { handleAdminLogin } from '../../../lib/adminAuth.js';
import { readJsonBody, sendJson, type VercelNodeRequest } from '../../../lib/vercelHttp.js';

export default async function handler(req: VercelNodeRequest, res: ServerResponse) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const userAgent =
      typeof req.headers?.['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;
    const result = await handleAdminLogin(body, userAgent);
    sendJson(res, result.status, result.payload);
  } catch (err) {
    sendJson(res, 500, {
      ok: false,
      error: err instanceof Error ? err.message : 'Internal authentication error',
    });
  }
}
