import type { ServerResponse } from 'http';
import { readJsonBody, sendJson, type VercelNodeRequest } from '../../lib/vercelHttp.js';
import {
  handleDeleteWebsiteProduct,
  handleListWebsiteProducts,
  handleUpsertWebsiteProduct,
} from '../../lib/websiteProductsHandler.js';

export default async function handler(req: VercelNodeRequest, res: ServerResponse) {
  const authHeader =
    typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined;

  try {
    if (req.method === 'GET') {
      const result = await handleListWebsiteProducts(authHeader);
      sendJson(res, result.status, result.payload);
      return;
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const result = await handleUpsertWebsiteProduct(body, authHeader);
      sendJson(res, result.status, result.payload);
      return;
    }

    if (req.method === 'DELETE') {
      const parsedUrl = new URL(req.url || '/', 'http://localhost');
      const id = parsedUrl.searchParams.get('id') ?? undefined;
      const sku = parsedUrl.searchParams.get('sku') ?? undefined;
      const result = await handleDeleteWebsiteProduct({ id, sku }, authHeader);
      sendJson(res, result.status, result.payload);
      return;
    }

    sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
  } catch (err) {
    sendJson(res, 500, {
      ok: false,
      error: err instanceof Error ? err.message : 'Products API error',
    });
  }
}
