import type { ServerResponse } from 'http';
import { handleClaimAdminPasscode } from '../../../lib/adminAuth';
import { readJsonBody, sendJson, type VercelNodeRequest } from '../../../lib/vercelHttp';

export default async function handler(req: VercelNodeRequest, res: ServerResponse) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
    return;
  }

  const body = await readJsonBody(req);
  const result = await handleClaimAdminPasscode(body);
  sendJson(res, result.status, result.payload);
}
