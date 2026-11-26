import type { ServerResponse } from 'http';
import {
  handleGetAdminCredentials,
  handleSaveAdminCredential,
} from '../../../lib/adminAuth.js';
import { readJsonBody, sendJson, type VercelNodeRequest } from '../../../lib/vercelHttp.js';

export default async function handler(req: VercelNodeRequest, res: ServerResponse) {
  const authHeader =
    typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;

  try {
    if (req.method === 'GET') {
      const result = await handleGetAdminCredentials(authHeader);
      sendJson(res, result.status, result.payload);
      return;
    }

    if (req.method === 'POST' || req.method === 'PATCH') {
      const body = await readJsonBody(req);
      const result = await handleSaveAdminCredential(body, authHeader);
      sendJson(res, result.status, result.payload);
      return;
    }

    sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
  } catch (err) {
    sendJson(res, 500, {
      ok: false,
      error: err instanceof Error ? err.message : 'Credentials API error',
    });
  }
}
