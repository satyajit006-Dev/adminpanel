import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

function parseSafeExternalApiUrl(rawUrl: string | undefined): URL | null {
  if (!rawUrl || !rawUrl.trim()) return null;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === '169.254.169.254' ||
      host === 'metadata.google.internal' ||
      host.startsWith('169.254.')
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function isSafeImageRef(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2_500_000) return false;
  if (trimmed.startsWith('/src/') || trimmed.startsWith('/assets/')) return true;
  if (
    /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)
  ) {
    return true;
  }
  try {
    const u = new URL(trimmed);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  app.get('/api/website/config', (_req, res) => {
    const targetUrl = parseSafeExternalApiUrl(process.env.WEBSITE_API_URL);
    res.json({
      serverConfigured: Boolean(targetUrl),
      targetOrigin: targetUrl ? targetUrl.origin : null,
      authConfigured: Boolean(process.env.WEBSITE_API_KEY?.trim()),
    });
  });

  app.post('/api/website/products', async (req, res) => {
    const body = req.body as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      res.status(400).json({ ok: false, error: 'Invalid JSON payload' });
      return;
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const sku = typeof body.sku === 'string' ? body.sku.trim() : '';
    const price = Number(body.price);
    const stockQuantity = Number(body.stockQuantity);

    if (!name || name.length > 160) {
      res.status(400).json({ ok: false, error: 'Product name is required (max 160 chars).' });
      return;
    }
    if (!sku || sku.length > 64) {
      res.status(400).json({ ok: false, error: 'SKU is required (max 64 chars).' });
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      res.status(400).json({ ok: false, error: 'Price must be a valid non-negative number.' });
      return;
    }
    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
      res.status(400).json({ ok: false, error: 'Stock quantity must be a valid non-negative number.' });
      return;
    }

    const rawImages = Array.isArray(body.images) ? body.images : [];
    const safeImages = rawImages.filter(isSafeImageRef).slice(0, 8);

    const sanitizedPayload = {
      id: typeof body.id === 'string' ? body.id.slice(0, 80) : `prod-${Date.now()}`,
      sku,
      name,
      slug: typeof body.slug === 'string' ? body.slug.trim().slice(0, 180) : undefined,
      categoryId: typeof body.categoryId === 'string' ? body.categoryId.slice(0, 80) : 'cat-1',
      categoryName: typeof body.categoryName === 'string' ? body.categoryName.slice(0, 120) : 'Apparel',
      price,
      compareAtPrice:
        body.compareAtPrice !== undefined && Number.isFinite(Number(body.compareAtPrice))
          ? Number(body.compareAtPrice)
          : undefined,
      fabric: typeof body.fabric === 'string' ? body.fabric.trim().slice(0, 160) : '',
      careInstructions:
        typeof body.careInstructions === 'string'
          ? body.careInstructions.trim().slice(0, 240)
          : undefined,
      sizesAvailable:
        typeof body.sizesAvailable === 'string' ? body.sizesAvailable.trim().slice(0, 120) : 'XS–XL',
      colors: Array.isArray(body.colors)
        ? body.colors
            .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
            .map((c) => c.trim().slice(0, 48))
            .slice(0, 12)
        : [],
      stockQuantity: Math.floor(stockQuantity),
      lowStockThreshold:
        Number.isFinite(Number(body.lowStockThreshold)) && Number(body.lowStockThreshold) >= 0
          ? Math.floor(Number(body.lowStockThreshold))
          : 6,
      isAvailable: Boolean(body.isAvailable),
      isBestseller: Boolean(body.isBestseller),
      publishedToWebsite: Boolean(body.publishedToWebsite),
      description:
        typeof body.description === 'string' ? body.description.trim().slice(0, 2000) : '',
      images: safeImages,
      tags: Array.isArray(body.tags)
        ? body.tags
            .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
            .map((t) => t.trim().slice(0, 48))
            .slice(0, 16)
        : [],
      syncedAt: new Date().toISOString(),
    };

    const targetUrl = parseSafeExternalApiUrl(process.env.WEBSITE_API_URL);
    if (!targetUrl) {
      res.status(200).json({
        ok: true,
        mode: 'local',
        product: sanitizedPayload,
        message:
          'Saved to admin catalog. Configure WEBSITE_API_URL in your server environment to forward products to your backend database.',
      });
      return;
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const apiKey = process.env.WEBSITE_API_KEY?.trim();
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const upstreamRes = await fetch(targetUrl.toString(), {
        method: 'POST',
        headers,
        body: JSON.stringify(sanitizedPayload),
        signal: AbortSignal.timeout(12_000),
      });

      const responseText = await upstreamRes.text();
      let parsedBody: unknown = responseText;
      try {
        parsedBody = responseText ? JSON.parse(responseText) : null;
      } catch {
        // upstream returned non-JSON body
      }

      if (!upstreamRes.ok) {
        res.status(502).json({
          ok: false,
          mode: 'proxied',
          remoteStatus: upstreamRes.status,
          error: `Website backend responded with HTTP ${upstreamRes.status}`,
          remoteData: parsedBody,
        });
        return;
      }

      res.status(200).json({
        ok: true,
        mode: 'proxied',
        remoteStatus: upstreamRes.status,
        product: sanitizedPayload,
        remoteData: parsedBody,
      });
    } catch (err) {
      res.status(502).json({
        ok: false,
        mode: 'proxied',
        error: err instanceof Error ? err.message : 'Failed to reach configured website backend.',
      });
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('/{*splat}', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Apparel Admin server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
