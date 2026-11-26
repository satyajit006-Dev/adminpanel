import type { ServerResponse } from 'http';
import { handleListTransactions, handleUpdateTransaction } from '../../lib/supabaseAdminData.js';
import { readJsonBody, sendJson, type VercelNodeRequest } from '../../lib/vercelHttp.js';

export default async function handler(req: VercelNodeRequest, res: ServerResponse) {
  const authHeader =
    typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;

  try {
    if (req.method === 'GET') {
      const result = await handleListTransactions(authHeader);
      sendJson(res, result.status, result.payload);
      return;
    }

    if (req.method === 'PATCH' || req.method === 'POST') {
      const body = await readJsonBody(req);
      const result = await handleUpdateTransaction(body, authHeader);
      sendJson(res, result.status, result.payload);
      return;
    }

    sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
  } catch (err) {
    sendJson(res, 500, {
      ok: false,
      error: err instanceof Error ? err.message : 'Transactions API error',
    });
  }
}
