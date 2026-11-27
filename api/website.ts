import type { ServerResponse } from 'http';
import { handleUploadProductImage } from '../lib/supabaseAdminData.js';
import { readJsonBody, sendJson, type VercelNodeRequest } from '../lib/vercelHttp.js';
import {
  getWebsiteConfig,
  handleDeleteWebsiteProduct,
  handleListWebsiteProducts,
  handleUpsertWebsiteProduct,
} from '../lib/websiteProductsHandler.js';

function resolveSubPath(req: VercelNodeRequest): { subPath: string; searchParams: URLSearchParams } {
  const parsedUrl = new URL(req.url || '/', 'http://localhost');
  const queryPath = req.query?.path;
  const fromQuery =
    parsedUrl.searchParams.get('path') ??
    (Array.isArray(queryPath) ? queryPath.join('/') : typeof queryPath === 'string' ? queryPath : '');
  const fromPathname = parsedUrl.pathname.replace(/^\/api\/website\/?/, '');
  const subPath = (fromQuery || fromPathname).replace(/^\/+|\/+$/g, '');
  return { subPath, searchParams: parsedUrl.searchParams };
}

export default async function handler(req: VercelNodeRequest, res: ServerResponse) {
  const { subPath, searchParams } = resolveSubPath(req);
  const method = (req.method || 'GET').toUpperCase();
  const authHeader =
    typeof req.headers?.authorization === 'string' ? req.headers.authorization : undefined;

  try {
    if (subPath === 'config') {
      if (method !== 'GET') {
        sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
        return;
      }
      const config = await getWebsiteConfig();
      sendJson(res, 200, config);
      return;
    }

    if (subPath === 'products') {
      if (method === 'GET') {
        const result = await handleListWebsiteProducts(authHeader);
        sendJson(res, result.status, result.payload);
        return;
      }
      if (method === 'POST') {
        const body = await readJsonBody(req);
        const result = await handleUpsertWebsiteProduct(body, authHeader);
        sendJson(res, result.status, result.payload);
        return;
      }
      if (method === 'DELETE') {
        const id =
          searchParams.get('id') ??
          (typeof req.query?.id === 'string' ? req.query.id : undefined);
        const sku =
          searchParams.get('sku') ??
          (typeof req.query?.sku === 'string' ? req.query.sku : undefined);
        const result = await handleDeleteWebsiteProduct({ id, sku }, authHeader);
        sendJson(res, result.status, result.payload);
        return;
      }
      sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
      return;
    }

    if (subPath === 'upload-image') {
      if (method !== 'POST') {
        sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
        return;
      }
      const body = await readJsonBody(req);
      const result = await handleUploadProductImage(body, authHeader);
      sendJson(res, result.status, result.payload);
      return;
    }

    sendJson(res, 404, { ok: false, error: `Unknown website API endpoint: ${subPath || '/'}` });
  } catch (err) {
    sendJson(res, 500, {
      ok: false,
      error: err instanceof Error ? err.message : 'Website API error',
    });
  }
}
