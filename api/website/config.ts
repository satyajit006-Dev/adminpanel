import type { ServerResponse } from 'http';
import { sendJson, type VercelNodeRequest } from '../../lib/vercelHttp.js';
import { getWebsiteConfig } from '../../lib/websiteProductsHandler.js';

export default async function handler(req: VercelNodeRequest, res: ServerResponse) {
  if (req.method && req.method !== 'GET') {
    sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
    return;
  }

  try {
    const config = await getWebsiteConfig();
    sendJson(res, 200, config);
  } catch (err) {
    sendJson(res, 500, {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to load backend config',
    });
  }
}
