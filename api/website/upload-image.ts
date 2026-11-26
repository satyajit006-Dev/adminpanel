import type { ServerResponse } from 'http';
import { handleUploadProductImage } from '../../lib/supabaseAdminData';
import { readJsonBody, sendJson, type VercelNodeRequest } from '../../lib/vercelHttp';

export default async function handler(req: VercelNodeRequest, res: ServerResponse) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
    return;
  }

  const authHeader =
    typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;
  const body = await readJsonBody(req);
  const result = await handleUploadProductImage(body, authHeader);
  sendJson(res, result.status, result.payload);
}
