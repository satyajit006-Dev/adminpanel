import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  handleAdminLogin,
  handleClaimAdminPasscode,
  handleGetAdminCredentials,
  handleSaveAdminCredential,
} from './lib/adminAuth.js';
import {
  handleDeleteCustomer,
  handleListCustomers,
  handleListOrders,
  handleListTransactions,
  handleUpdateOrder,
  handleUpdateTransaction,
  handleUploadProductImage,
  handleUpsertCustomer,
} from './lib/supabaseAdminData.js';
import {
  getWebsiteConfig,
  handleDeleteWebsiteProduct,
  handleListWebsiteProducts,
  handleUpsertWebsiteProduct,
} from './lib/websiteProductsHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  app.get('/api/website/config', async (_req, res) => {
    const config = await getWebsiteConfig();
    res.setHeader('Cache-Control', 'no-store');
    res.json(config);
  });

  app.post('/api/admin/auth/claim', async (req, res) => {
    const result = await handleClaimAdminPasscode(
      (req.body as Record<string, unknown> | null) ?? null
    );
    res.setHeader('Cache-Control', 'no-store');
    res.status(result.status).json(result.payload);
  });

  app.post('/api/admin/auth/login', async (req, res) => {
    const result = await handleAdminLogin(
      (req.body as Record<string, unknown> | null) ?? null
    );
    res.setHeader('Cache-Control', 'no-store');
    res.status(result.status).json(result.payload);
  });

  app.get('/api/admin/auth/credentials', async (req, res) => {
    const result = await handleGetAdminCredentials(req.headers.authorization);
    res.setHeader('Cache-Control', 'no-store');
    res.status(result.status).json(result.payload);
  });

  app.post('/api/admin/auth/credentials', async (req, res) => {
    const result = await handleSaveAdminCredential(
      (req.body as Record<string, unknown> | null) ?? null,
      req.headers.authorization
    );
    res.setHeader('Cache-Control', 'no-store');
    res.status(result.status).json(result.payload);
  });

  app.get('/api/website/products', async (req, res) => {
    const result = await handleListWebsiteProducts(req.headers.authorization);
    res.setHeader('Cache-Control', 'no-store');
    res.status(result.status).json(result.payload);
  });

  app.post('/api/website/products', async (req, res) => {
    const result = await handleUpsertWebsiteProduct(
      (req.body as Record<string, unknown> | null) ?? null,
      req.headers.authorization
    );
    res.setHeader('Cache-Control', 'no-store');
    res.status(result.status).json(result.payload);
  });

  app.delete('/api/website/products', async (req, res) => {
    const id = typeof req.query.id === 'string' ? req.query.id : undefined;
    const sku = typeof req.query.sku === 'string' ? req.query.sku : undefined;
    const result = await handleDeleteWebsiteProduct({ id, sku }, req.headers.authorization);
    res.setHeader('Cache-Control', 'no-store');
    res.status(result.status).json(result.payload);
  });

  app.post('/api/website/upload-image', async (req, res) => {
    const result = await handleUploadProductImage(
      (req.body as Record<string, unknown> | null) ?? null,
      req.headers.authorization
    );
    res.setHeader('Cache-Control', 'no-store');
    res.status(result.status).json(result.payload);
  });

  app.get('/api/admin/orders', async (req, res) => {
    const result = await handleListOrders(req.headers.authorization);
    res.setHeader('Cache-Control', 'no-store');
    res.status(result.status).json(result.payload);
  });

  app.patch('/api/admin/orders', async (req, res) => {
    const result = await handleUpdateOrder(
      (req.body as Record<string, unknown> | null) ?? null,
      req.headers.authorization
    );
    res.setHeader('Cache-Control', 'no-store');
    res.status(result.status).json(result.payload);
  });

  app.get('/api/admin/customers', async (req, res) => {
    const result = await handleListCustomers(req.headers.authorization);
    res.setHeader('Cache-Control', 'no-store');
    res.status(result.status).json(result.payload);
  });

  app.post('/api/admin/customers', async (req, res) => {
    const result = await handleUpsertCustomer(
      (req.body as Record<string, unknown> | null) ?? null,
      req.headers.authorization
    );
    res.setHeader('Cache-Control', 'no-store');
    res.status(result.status).json(result.payload);
  });

  app.patch('/api/admin/customers', async (req, res) => {
    const result = await handleUpsertCustomer(
      (req.body as Record<string, unknown> | null) ?? null,
      req.headers.authorization
    );
    res.setHeader('Cache-Control', 'no-store');
    res.status(result.status).json(result.payload);
  });

  app.delete('/api/admin/customers', async (req, res) => {
    const id = typeof req.query.id === 'string' ? req.query.id : undefined;
    const result = await handleDeleteCustomer(id, req.headers.authorization);
    res.setHeader('Cache-Control', 'no-store');
    res.status(result.status).json(result.payload);
  });

  app.get('/api/admin/transactions', async (req, res) => {
    const result = await handleListTransactions(req.headers.authorization);
    res.setHeader('Cache-Control', 'no-store');
    res.status(result.status).json(result.payload);
  });

  app.patch('/api/admin/transactions', async (req, res) => {
    const result = await handleUpdateTransaction(
      (req.body as Record<string, unknown> | null) ?? null,
      req.headers.authorization
    );
    res.setHeader('Cache-Control', 'no-store');
    res.status(result.status).json(result.payload);
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
