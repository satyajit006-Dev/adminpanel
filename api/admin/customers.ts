import type { ServerResponse } from 'http';
import {
  handleDeleteCustomer,
  handleListCustomers,
  handleUpsertCustomer,
} from '../../lib/supabaseAdminData.js';
import { readJsonBody, sendJson, type VercelNodeRequest } from '../../lib/vercelHttp.js';

export default async function handler(req: VercelNodeRequest, res: ServerResponse) {
  const authHeader =
    typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;

  try {
    if (req.method === 'GET') {
      const result = await handleListCustomers(authHeader);
      sendJson(res, result.status, result.payload);
      return;
    }

    if (req.method === 'POST' || req.method === 'PATCH') {
      const body = await readJsonBody(req);
      const result = await handleUpsertCustomer(body, authHeader);
      sendJson(res, result.status, result.payload);
      return;
    }

    if (req.method === 'DELETE') {
      const parsedUrl = new URL(req.url || '/', 'http://localhost');
      const id = parsedUrl.searchParams.get('id') ?? undefined;
      const result = await handleDeleteCustomer(id, authHeader);
      sendJson(res, result.status, result.payload);
      return;
    }

    sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
  } catch (err) {
    sendJson(res, 500, {
      ok: false,
      error: err instanceof Error ? err.message : 'Customers API error',
    });
  }
}
