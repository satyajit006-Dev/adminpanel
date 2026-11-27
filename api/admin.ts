import type { ServerResponse } from 'http';
import {
  handleAdminLogin,
  handleAdminLogout,
  handleCheckSession,
  handleClaimAdminPasscode,
  handleGetAdminCredentials,
  handleListSessionHistory,
  handleRevokeCofounderSession,
  handleSaveAdminCredential,
} from '../lib/adminAuth.js';
import {
  handleDeleteCustomer,
  handleListCustomers,
  handleListOrders,
  handleListTransactions,
  handleUpdateOrder,
  handleUpdateTransaction,
  handleUpsertCustomer,
} from '../lib/supabaseAdminData.js';
import { readJsonBody, sendJson, type VercelNodeRequest } from '../lib/vercelHttp.js';

function resolveSubPath(req: VercelNodeRequest): { subPath: string; searchParams: URLSearchParams } {
  const parsedUrl = new URL(req.url || '/', 'http://localhost');
  const queryPath = req.query?.path;
  const fromQuery =
    parsedUrl.searchParams.get('path') ??
    (Array.isArray(queryPath) ? queryPath.join('/') : typeof queryPath === 'string' ? queryPath : '');
  const fromPathname = parsedUrl.pathname.replace(/^\/api\/admin\/?/, '');
  const subPath = (fromQuery || fromPathname).replace(/^\/+|\/+$/g, '');
  return { subPath, searchParams: parsedUrl.searchParams };
}

export default async function handler(req: VercelNodeRequest, res: ServerResponse) {
  const { subPath, searchParams } = resolveSubPath(req);
  const method = (req.method || 'GET').toUpperCase();
  const authHeader =
    typeof req.headers?.authorization === 'string' ? req.headers.authorization : undefined;
  const userAgent =
    typeof req.headers?.['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;

  try {
    if (subPath === 'auth/claim') {
      if (method !== 'POST') {
        sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
        return;
      }
      const body = await readJsonBody(req);
      const result = await handleClaimAdminPasscode(body);
      sendJson(res, result.status, result.payload);
      return;
    }

    if (subPath === 'auth/login') {
      if (method !== 'POST') {
        sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
        return;
      }
      const body = await readJsonBody(req);
      const result = await handleAdminLogin(body, userAgent);
      sendJson(res, result.status, result.payload);
      return;
    }

    if (subPath === 'auth/logout') {
      if (method !== 'POST') {
        sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
        return;
      }
      const result = await handleAdminLogout(authHeader, userAgent);
      sendJson(res, result.status, result.payload);
      return;
    }

    if (subPath === 'auth/session') {
      if (method !== 'GET') {
        sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
        return;
      }
      const result = await handleCheckSession(authHeader);
      sendJson(res, result.status, result.payload);
      return;
    }

    if (subPath === 'auth/revoke-cofounder') {
      if (method !== 'POST') {
        sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
        return;
      }
      const result = await handleRevokeCofounderSession(authHeader);
      sendJson(res, result.status, result.payload);
      return;
    }

    if (subPath === 'auth/credentials') {
      if (method === 'GET') {
        const result = await handleGetAdminCredentials(authHeader);
        sendJson(res, result.status, result.payload);
        return;
      }
      if (method === 'POST' || method === 'PATCH') {
        const body = await readJsonBody(req);
        const result = await handleSaveAdminCredential(body, authHeader);
        sendJson(res, result.status, result.payload);
        return;
      }
      sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
      return;
    }

    if (subPath === 'session-history') {
      if (method !== 'GET') {
        sendJson(res, 405, {
          ok: false,
          error: 'Login & logout history is permanent and cannot be modified or deleted.',
        });
        return;
      }
      const result = await handleListSessionHistory(authHeader);
      sendJson(res, result.status, result.payload);
      return;
    }

    if (subPath === 'orders') {
      if (method === 'GET') {
        const result = await handleListOrders(authHeader);
        sendJson(res, result.status, result.payload);
        return;
      }
      if (method === 'PATCH' || method === 'POST') {
        const body = await readJsonBody(req);
        const result = await handleUpdateOrder(body, authHeader);
        sendJson(res, result.status, result.payload);
        return;
      }
      sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
      return;
    }

    if (subPath === 'customers') {
      if (method === 'GET') {
        const result = await handleListCustomers(authHeader);
        sendJson(res, result.status, result.payload);
        return;
      }
      if (method === 'POST' || method === 'PATCH') {
        const body = await readJsonBody(req);
        const result = await handleUpsertCustomer(body, authHeader);
        sendJson(res, result.status, result.payload);
        return;
      }
      if (method === 'DELETE') {
        const id =
          searchParams.get('id') ??
          (typeof req.query?.id === 'string' ? req.query.id : undefined);
        const result = await handleDeleteCustomer(id, authHeader);
        sendJson(res, result.status, result.payload);
        return;
      }
      sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
      return;
    }

    if (subPath === 'transactions') {
      if (method === 'GET') {
        const result = await handleListTransactions(authHeader);
        sendJson(res, result.status, result.payload);
        return;
      }
      if (method === 'PATCH' || method === 'POST') {
        const body = await readJsonBody(req);
        const result = await handleUpdateTransaction(body, authHeader);
        sendJson(res, result.status, result.payload);
        return;
      }
      sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
      return;
    }

    sendJson(res, 404, { ok: false, error: `Unknown admin API endpoint: ${subPath || '/'}` });
  } catch (err) {
    sendJson(res, 500, {
      ok: false,
      error: err instanceof Error ? err.message : 'Admin API error',
    });
  }
}
