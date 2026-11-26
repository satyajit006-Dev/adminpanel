import { sendJson, type VercelNodeRequest } from '../../lib/vercelHttp';
import { getWebsiteConfig } from '../../lib/websiteProductsHandler';

export default async function handler(req: VercelNodeRequest, res: import('http').ServerResponse) {
  if (req.method && req.method !== 'GET') {
    sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
    return;
  }

  const config = await getWebsiteConfig();
  sendJson(res, 200, config);
}
