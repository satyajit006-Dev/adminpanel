import {
  Check,
  Code2,
  Copy,
  Globe,
  ImagePlus,
  Link2,
  Pencil,
  RefreshCw,
  Send,
  Shirt,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ApparelCategory, ApparelProduct } from '../../types/apparel';
import { formatDateTime, formatInr } from '../../utils/apparelFormatters';

interface ApparelWebsiteUploadViewProps {
  products: ApparelProduct[];
  categories: ApparelCategory[];
  editingProductId: string | null;
  onSelectEditProduct: (id: string | null) => void;
  onSaveProduct: (product: ApparelProduct) => void;
  onDeleteProduct: (id: string) => void;
  onNotify: (message: string) => void;
}

const SIZE_CHIPS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28–36', 'One Size'];

function isSafeImageSrc(src: string): boolean {
  const trimmed = src.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/src/') || trimmed.startsWith('/assets/')) return true;
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isSafeExternalEndpoint(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read selected image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Unsupported or corrupted image file.'));
      img.onload = () => {
        const maxSide = 1080;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function ProductImageFallback({ title }: { title: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-subtle px-4 text-center">
      <Shirt className="h-8 w-8 text-ink-muted" aria-hidden="true" />
      <span className="text-xs font-medium text-ink-muted line-clamp-1">
        {title || 'Garment photo preview'}
      </span>
    </div>
  );
}

export function ApparelWebsiteUploadView({
  products,
  categories,
  editingProductId,
  onSelectEditProduct,
  onSaveProduct,
  onDeleteProduct,
  onNotify,
}: ApparelWebsiteUploadViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editingProduct = useMemo(
    () => products.find((p) => p.id === editingProductId) ?? null,
    [products, editingProductId]
  );

  // Form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? 'cat-1');
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [fabric, setFabric] = useState('');
  const [careInstructions, setCareInstructions] = useState('');
  const [sizesAvailable, setSizesAvailable] = useState('');
  const [colorsInput, setColorsInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [publishedToWebsite, setPublishedToWebsite] = useState(true);
  const [isBestseller, setIsBestseller] = useState(false);
  const [previewSize, setPreviewSize] = useState('M');
  const [isDragging, setIsDragging] = useState(false);
  const [failedPreviewImages, setFailedPreviewImages] = useState<Record<string, boolean>>({});

  // Backend integration state
  const [syncMode, setSyncMode] = useState<'proxy' | 'direct'>(() => {
    try {
      const saved = localStorage.getItem('apparel_website_sync_mode');
      return saved === 'direct' ? 'direct' : 'proxy';
    } catch {
      return 'proxy';
    }
  });
  const [directEndpointUrl, setDirectEndpointUrl] = useState(() => {
    try {
      return localStorage.getItem('apparel_website_direct_endpoint') ?? '';
    } catch {
      return '';
    }
  });
  const [serverConfig, setServerConfig] = useState<{
    checked: boolean;
    serverConfigured: boolean;
    targetOrigin: string | null;
    authConfigured: boolean;
  }>({
    checked: false,
    serverConfigured: false,
    targetOrigin: null,
    authConfigured: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [showCodeGuide, setShowCodeGuide] = useState(false);
  const [copiedKey, setCopiedKey] = useState<'json' | 'express' | 'react' | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('apparel_website_sync_mode', syncMode);
      localStorage.setItem('apparel_website_direct_endpoint', directEndpointUrl);
    } catch {
      // ignore storage errors
    }
  }, [syncMode, directEndpointUrl]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/website/config')
      .then(async (res) => {
        if (!res.ok) throw new Error('Config endpoint unavailable');
        const contentType = res.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) {
          throw new Error('Static hosting mode');
        }
        return res.json() as Promise<{
          serverConfigured: boolean;
          targetOrigin: string | null;
          authConfigured: boolean;
        }>;
      })
      .then((data) => {
        if (!cancelled) {
          setServerConfig({
            checked: true,
            serverConfigured: Boolean(data.serverConfigured),
            targetOrigin: data.targetOrigin ?? null,
            authConfigured: Boolean(data.authConfigured),
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setServerConfig({
            checked: true,
            serverConfigured: false,
            targetOrigin: null,
            authConfigured: false,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load selected product for editing or reset to blank
  useEffect(() => {
    setFailedPreviewImages({});
    if (!editingProduct) {
      setName('');
      setSku('');
      setSlug('');
      setSlugManuallyEdited(false);
      setCategoryId(categories[0]?.id ?? 'cat-1');
      setPrice('');
      setCompareAtPrice('');
      setStockQuantity('');
      setLowStockThreshold('5');
      setFabric('');
      setCareInstructions('');
      setSizesAvailable('');
      setColorsInput('');
      setTagsInput('');
      setDescription('');
      setImages([]);
      setPublishedToWebsite(true);
      setIsBestseller(false);
      return;
    }

    setName(editingProduct.name);
    setSku(editingProduct.sku);
    setSlug(editingProduct.slug ?? slugify(editingProduct.name));
    setSlugManuallyEdited(Boolean(editingProduct.slug));
    setCategoryId(editingProduct.categoryId);
    setPrice(String(editingProduct.price));
    setCompareAtPrice(
      editingProduct.compareAtPrice ? String(editingProduct.compareAtPrice) : ''
    );
    setStockQuantity(String(editingProduct.stockQuantity));
    setLowStockThreshold(String(editingProduct.lowStockThreshold));
    setFabric(editingProduct.fabric);
    setCareInstructions(editingProduct.careInstructions ?? '');
    setSizesAvailable(editingProduct.sizesAvailable);
    setColorsInput((editingProduct.colors ?? []).join(', '));
    setTagsInput((editingProduct.tags ?? []).join(', '));
    setDescription(editingProduct.description ?? '');
    setImages(editingProduct.images ?? []);
    setPublishedToWebsite(editingProduct.publishedToWebsite ?? editingProduct.isAvailable);
    setIsBestseller(editingProduct.isBestseller);
  }, [editingProduct, categories]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugManuallyEdited) {
      setSlug(slugify(value));
    }
  };

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) {
      onNotify('Please select valid JPG, PNG, or WebP garment images.');
      return;
    }

    const remainingSlots = Math.max(0, 6 - images.length);
    const toProcess = files.slice(0, remainingSlots);
    if (toProcess.length === 0) {
      onNotify('Maximum 6 product images reached per SKU.');
      return;
    }

    try {
      const dataUrls = await Promise.all(toProcess.map((f) => compressImageFile(f)));
      setImages((prev) => [...prev, ...dataUrls]);
      onNotify(`Added ${dataUrls.length} product photo${dataUrls.length > 1 ? 's' : ''}`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Failed to process selected image.');
    }
  };

  const handleAddImageUrl = () => {
    const cleaned = imageUrlInput.trim();
    if (!cleaned) return;
    if (!isSafeImageSrc(cleaned)) {
      onNotify('Please enter a valid http(s):// or /src/assets/ image URL.');
      return;
    }
    if (images.length >= 6) {
      onNotify('Maximum 6 product images allowed.');
      return;
    }
    setImages((prev) => [...prev, cleaned]);
    setImageUrlInput('');
  };

  const toggleSizeChip = (chip: string) => {
    const current = sizesAvailable
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (current.includes(chip)) {
      const next = current.filter((s) => s !== chip);
      setSizesAvailable(next.join(', '));
    } else {
      setSizesAvailable([...current, chip].join(', '));
    }
  };

  const selectedCategory =
    categories.find((c) => c.id === categoryId) ?? categories[0];

  const parsedColors = useMemo(
    () =>
      colorsInput
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
    [colorsInput]
  );

  const parsedTags = useMemo(
    () =>
      tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    [tagsInput]
  );

  const numericPrice = Number(price) || 0;
  const numericCompareAt = Number(compareAtPrice) || 0;
  const discountPct =
    numericCompareAt > numericPrice && numericPrice > 0
      ? Math.round(((numericCompareAt - numericPrice) / numericCompareAt) * 100)
      : 0;

  const draftProduct: ApparelProduct = useMemo(
    () => ({
      id: editingProduct?.id ?? `prod-${Date.now()}`,
      sku: sku.trim() || 'SKU-NEW',
      name: name.trim() || 'Untitled Product',
      slug: slug.trim() || slugify(name || 'untitled-product'),
      categoryId,
      categoryName: selectedCategory?.name ?? 'Apparel',
      price: numericPrice,
      compareAtPrice: numericCompareAt > 0 ? numericCompareAt : undefined,
      fabric: fabric.trim() || '—',
      careInstructions: careInstructions.trim() || undefined,
      sizesAvailable: sizesAvailable.trim() || 'One Size',
      colors: parsedColors,
      stockQuantity: Math.max(0, Math.floor(Number(stockQuantity) || 0)),
      lowStockThreshold: Math.max(0, Math.floor(Number(lowStockThreshold) || 5)),
      isAvailable: publishedToWebsite,
      isBestseller,
      description: description.trim() || undefined,
      images: images.filter(isSafeImageSrc),
      tags: parsedTags,
      publishedToWebsite,
    }),
    [
      editingProduct?.id,
      sku,
      name,
      slug,
      categoryId,
      selectedCategory?.name,
      numericPrice,
      numericCompareAt,
      fabric,
      careInstructions,
      sizesAvailable,
      parsedColors,
      stockQuantity,
      lowStockThreshold,
      publishedToWebsite,
      isBestseller,
      description,
      images,
      parsedTags,
    ]
  );

  const pushProductToBackend = async (product: ApparelProduct): Promise<ApparelProduct> => {
    const nowIso = new Date().toISOString();

    if (syncMode === 'direct') {
      const target = directEndpointUrl.trim();
      if (!target) {
        return {
          ...product,
          websiteSyncStatus: 'local_only',
          lastSyncedAt: nowIso,
          syncError: undefined,
        };
      }
      if (!isSafeExternalEndpoint(target)) {
        return {
          ...product,
          websiteSyncStatus: 'failed',
          lastSyncedAt: nowIso,
          syncError: 'Endpoint URL must start with http:// or https://',
        };
      }

      try {
        const res = await fetch(target, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(product),
        });
        if (!res.ok) {
          throw new Error(`Backend responded with HTTP ${res.status}`);
        }
        return {
          ...product,
          websiteSyncStatus: 'synced',
          lastSyncedAt: nowIso,
          syncError: undefined,
        };
      } catch (err) {
        return {
          ...product,
          websiteSyncStatus: 'failed',
          lastSyncedAt: nowIso,
          syncError:
            err instanceof Error
              ? err.message
              : 'Network or CORS error calling direct endpoint.',
        };
      }
    }

    // Server proxy mode (/api/website/products)
    try {
      const res = await fetch('/api/website/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        return {
          ...product,
          websiteSyncStatus: 'local_only',
          lastSyncedAt: nowIso,
          syncError: undefined,
        };
      }
      const data = (await res.json()) as {
        ok?: boolean;
        mode?: 'proxied' | 'local';
        error?: string;
      };
      if (!res.ok || !data.ok) {
        return {
          ...product,
          websiteSyncStatus: 'failed',
          lastSyncedAt: nowIso,
          syncError: data.error ?? `Server proxy returned HTTP ${res.status}`,
        };
      }
      return {
        ...product,
        websiteSyncStatus: data.mode === 'proxied' ? 'synced' : 'local_only',
        lastSyncedAt: nowIso,
        syncError: undefined,
      };
    } catch {
      return {
        ...product,
        websiteSyncStatus: 'local_only',
        lastSyncedAt: nowIso,
        syncError: undefined,
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim() || numericPrice <= 0) {
      onNotify('Enter product name, SKU, and selling price before uploading.');
      return;
    }

    setIsSubmitting(true);
    try {
      const synced = await pushProductToBackend(draftProduct);
      onSaveProduct(synced);

      if (synced.websiteSyncStatus === 'synced') {
        onNotify(`Published ${synced.name} (${synced.sku}) to your website backend.`);
      } else if (synced.websiteSyncStatus === 'failed') {
        onNotify(`Saved locally, but backend sync failed: ${synced.syncError}`);
      } else {
        onNotify(
          `Saved ${synced.name} (${synced.sku}) to catalog. Connect your backend endpoint to push live.`
        );
      }

      if (!editingProductId) {
        onSelectEditProduct(synced.id);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResyncRow = async (prod: ApparelProduct) => {
    setSyncingId(prod.id);
    try {
      const updated = await pushProductToBackend(prod);
      onSaveProduct(updated);
      if (updated.websiteSyncStatus === 'synced') {
        onNotify(`Synced ${updated.sku} with your website backend.`);
      } else if (updated.websiteSyncStatus === 'failed') {
        onNotify(`Sync failed for ${updated.sku}: ${updated.syncError}`);
      } else {
        onNotify(`Updated ${updated.sku} locally (no remote API URL configured yet).`);
      }
    } finally {
      setSyncingId(null);
    }
  };

  const handleCopy = async (kind: 'json' | 'express' | 'react', text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(kind);
      onNotify('Copied snippet to clipboard');
      window.setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      onNotify('Could not access clipboard');
    }
  };

  const previewCover = images.find((img) => isSafeImageSrc(img) && !failedPreviewImages[img]);
  const previewSizes = sizesAvailable
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const expressSnippet = `// Example Express route in your website backend
app.post('/api/products', async (req, res) => {
  const { sku, name, slug, categoryName, price, compareAtPrice, fabric, sizesAvailable, colors, stockQuantity, description, images, publishedToWebsite } = req.body;
  const saved = await db.products.upsert({
    where: { sku },
    update: { name, slug, categoryName, price, compareAtPrice, fabric, sizesAvailable, colors, stockQuantity, description, images, publishedToWebsite },
    create: { sku, name, slug, categoryName, price, compareAtPrice, fabric, sizesAvailable, colors, stockQuantity, description, images, publishedToWebsite },
  });
  res.status(201).json({ ok: true, product: saved });
});`;

  const reactSnippet = `// Fetch published products in your React website
const res = await fetch('/api/products?published=true');
const products = await res.json();`;

  const publishedCount = products.filter((p) => p.publishedToWebsite ?? p.isAvailable).length;
  const syncedCount = products.filter((p) => p.websiteSyncStatus === 'synced').length;

  return (
    <div className="space-y-6">
      {/* Top Action & Editing Switcher Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-xl border border-line bg-surface px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <span className="font-semibold text-ink">Website Product Publisher</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{publishedCount} active on website</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{syncedCount} synced to backend</span>
          </div>
          <p className="mt-1 text-xs text-ink-secondary">
            Upload garment photography, specs, pricing, and sync directly to your React storefront database.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <select
            aria-label="Load existing product to edit"
            value={editingProductId ?? ''}
            onChange={(e) => onSelectEditProduct(e.target.value || null)}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none max-w-[240px]"
          >
            <option value="">+ Upload New Product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                Edit: {p.sku} — {p.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowCodeGuide((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-2 text-xs font-medium text-ink-secondary hover:bg-hover transition-colors whitespace-nowrap"
          >
            <Code2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{showCodeGuide ? 'Hide API Spec' : 'Backend API Spec'}</span>
          </button>

          {editingProductId && (
            <button
              type="button"
              onClick={() => onSelectEditProduct(null)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-2 text-xs font-medium text-ink-secondary hover:bg-hover transition-colors whitespace-nowrap"
            >
              <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>New SKU</span>
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Backend Integration Spec */}
      {showCodeGuide && (
        <div className="rounded-xl border border-line bg-surface p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-line-subtle pb-3">
            <div>
              <h2 className="font-display text-sm font-semibold text-ink">
                Connect Your React Website &amp; Backend Database
              </h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                Set <code className="font-mono text-ink">WEBSITE_API_URL</code> and{' '}
                <code className="font-mono text-ink">WEBSITE_API_KEY</code> in your server environment variables, or test with a direct backend URL below.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopy('json', JSON.stringify(draftProduct, null, 2))}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-secondary hover:bg-hover self-start sm:self-auto whitespace-nowrap"
            >
              {copiedKey === 'json' ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>Copy Current JSON</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink-secondary">
                  1. Backend Endpoint Example (Node / Express)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('express', expressSnippet)}
                  className="text-xs font-medium text-accent-text hover:underline"
                >
                  {copiedKey === 'express' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="overflow-x-auto rounded-lg border border-line bg-subtle p-3 font-mono text-[11px] leading-relaxed text-ink-secondary">
                {expressSnippet}
              </pre>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink-secondary">
                  2. React Website Fetch + Live Payload Preview
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('react', reactSnippet)}
                  className="text-xs font-medium text-accent-text hover:underline"
                >
                  {copiedKey === 'react' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="overflow-x-auto rounded-lg border border-line bg-subtle p-3 font-mono text-[11px] leading-relaxed text-ink-secondary">
                {reactSnippet}
              </pre>
              <pre className="max-h-36 overflow-auto rounded-lg border border-line bg-subtle p-3 font-mono text-[11px] leading-relaxed text-ink-muted">
                {JSON.stringify(
                  {
                    ...draftProduct,
                    images: (draftProduct.images ?? []).map((img) =>
                      img.startsWith('data:') ? `[base64 image ${Math.round(img.length / 1024)}KB]` : img
                    ),
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Main 2-Column Upload Studio */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Product Upload Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Garment Media Upload */}
          <section className="rounded-xl border border-line bg-surface p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-sm font-semibold text-ink">
                  Product Photography
                </h2>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Upload up to 6 photos (JPG, PNG, WebP) or paste hosted image URLs. First image is the storefront cover.
                </p>
              </div>
              <span className="font-mono text-xs text-ink-muted tabular-nums">
                {images.length}/6
              </span>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                void handleFilesSelected(e.dataTransfer.files);
              }}
              className={`rounded-xl border border-dashed px-6 py-7 text-center transition-colors ${
                isDragging
                  ? 'border-accent bg-accent-soft'
                  : 'border-line bg-subtle/40 hover:bg-hover'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={(e) => {
                  void handleFilesSelected(e.target.files);
                  e.target.value = '';
                }}
                className="hidden"
              />
              <UploadCloud className="mx-auto h-7 w-7 text-ink-muted" aria-hidden="true" />
              <p className="mt-2 text-xs font-medium text-ink">
                Drag and drop garment photos here, or{' '}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="font-semibold text-accent-text hover:underline"
                >
                  browse from computer
                </button>
              </p>
              <p className="mt-1 text-[11px] text-ink-muted">
                Images are automatically optimized to 1080px JPEG for fast storefront delivery.
              </p>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddImageUrl();
                    }
                  }}
                  placeholder="Or paste image URL (https://cdn.yourstore.com/coat.jpg)"
                  aria-label="Paste image URL"
                  className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-xs text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-2 text-xs font-medium text-ink-secondary hover:bg-hover transition-colors whitespace-nowrap"
              >
                <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Add URL</span>
              </button>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                {images.map((src, idx) => (
                  <div
                    key={`${src.slice(0, 40)}-${idx}`}
                    className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-line bg-subtle"
                  >
                    {isSafeImageSrc(src) && !failedPreviewImages[src] ? (
                      <img
                        src={src}
                        alt={`${name || 'Product'} photo ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedPreviewImages((prev) => ({ ...prev, [src]: true }))
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ProductImageFallback title={`Photo ${idx + 1}`} />
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2.5 py-2 text-[11px] text-white">
                      {idx === 0 ? (
                        <span className="font-semibold">Cover Photo</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const reordered = [
                              src,
                              ...images.filter((_, i) => i !== idx),
                            ];
                            setImages(reordered);
                          }}
                          className="font-medium hover:underline"
                        >
                          Set Cover
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setImages(images.filter((_, i) => i !== idx))}
                        aria-label={`Remove photo ${idx + 1}`}
                        className="rounded p-1 hover:bg-white/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section 2: Details & Pricing */}
          <section className="rounded-xl border border-line bg-surface p-6 space-y-4">
            <h2 className="font-display text-sm font-semibold text-ink">
              Garment Details &amp; Pricing
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-ink-secondary">
                  Product Title *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Tailored Camel Virgin Wool Coat"
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-secondary">
                  SKU Code *
                </label>
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. SKU-101"
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-secondary">
                  Website URL Slug
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlugManuallyEdited(true);
                    setSlug(slugify(e.target.value));
                  }}
                  placeholder="product-url-slug"
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs text-ink-secondary placeholder:text-ink-muted focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-secondary">
                  Category *
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-secondary">
                  Fabric / Material *
                </label>
                <input
                  type="text"
                  required
                  value={fabric}
                  onChange={(e) => setFabric(e.target.value)}
                  placeholder="e.g. 100% Cotton"
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-secondary">
                  Selling Price (INR) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-secondary">
                  Compare-at / MRP (Optional)
                </label>
                <input
                  type="number"
                  min={0}
                  value={compareAtPrice}
                  onChange={(e) => setCompareAtPrice(e.target.value)}
                  placeholder="Optional"
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-secondary">
                  Available Stock Units *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  placeholder="0"
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-secondary">
                  Low Stock Alert Threshold
                </label>
                <input
                  type="number"
                  min={0}
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm text-ink focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* Section 3: Sizing, Variants & Storefront Copy */}
          <section className="rounded-xl border border-line bg-surface p-6 space-y-4">
            <h2 className="font-display text-sm font-semibold text-ink">
              Variants &amp; Storefront Description
            </h2>

            <div>
              <span className="block text-xs font-medium text-ink-secondary mb-2">
                Quick Size Selection
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SIZE_CHIPS.map((chip) => {
                  const active = sizesAvailable
                    .split(',')
                    .map((s) => s.trim())
                    .includes(chip);
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => toggleSizeChip(chip)}
                      className={`rounded-md border px-2.5 py-1 font-mono text-xs font-medium transition-colors whitespace-nowrap ${
                        active
                          ? 'border-accent bg-accent text-accent-ink'
                          : 'border-line bg-surface text-ink-secondary hover:bg-hover'
                      }`}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={sizesAvailable}
                onChange={(e) => setSizesAvailable(e.target.value)}
                placeholder="XS, S, M, L, XL"
                aria-label="Sizes available"
                className="mt-2.5 w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs text-ink focus:border-accent focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink-secondary">
                  Colorways (comma-separated)
                </label>
                <input
                  type="text"
                  value={colorsInput}
                  onChange={(e) => setColorsInput(e.target.value)}
                  placeholder="Camel, Charcoal, Ecru"
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-secondary">
                  Care Instructions
                </label>
                <input
                  type="text"
                  value={careInstructions}
                  onChange={(e) => setCareInstructions(e.target.value)}
                  placeholder="Specialist dry clean only"
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-secondary">
                Product Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe fit, fabric weight, sizing notes, and product details for your storefront..."
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs leading-relaxed text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-secondary">
                Collection &amp; Search Tags
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Comma-separated tags (e.g. new-arrival, summer)"
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-6 border-t border-line-subtle pt-4">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={publishedToWebsite}
                  onChange={(e) => setPublishedToWebsite(e.target.checked)}
                  className="h-4 w-4 rounded border-line accent-accent"
                />
                <span>Publish live on website immediately</span>
              </label>

              <label className="inline-flex items-center gap-2 text-xs font-medium text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBestseller}
                  onChange={(e) => setIsBestseller(e.target.checked)}
                  className="h-4 w-4 rounded border-line accent-accent"
                />
                <span>Feature as Core Bestseller</span>
              </label>
            </div>
          </section>
        </div>

        {/* Right Column: Sticky Live Storefront Preview + Backend Sync Target */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          {/* Live React Website Card Preview */}
          <section className="rounded-xl border border-line bg-surface p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-line-subtle pb-3">
              <span className="text-xs font-semibold text-ink">
                Live Website Card Preview
              </span>
              <span className="font-mono text-[11px] text-ink-muted">
                /{draftProduct.slug || 'product-slug'}
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-line bg-canvas">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-subtle">
                {previewCover ? (
                  <img
                    src={previewCover}
                    alt={draftProduct.name}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setFailedPreviewImages((prev) => ({
                        ...prev,
                        [previewCover]: true,
                      }))
                    }
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ProductImageFallback title={draftProduct.name} />
                )}
              </div>

              <div className="p-4 space-y-3 bg-surface">
                <div className="flex items-center justify-between gap-2 text-[11px] text-ink-muted">
                  <span>
                    {draftProduct.categoryName}
                    {draftProduct.isBestseller ? ' · Core Bestseller' : ''}
                  </span>
                  <span className="font-mono">{draftProduct.sku}</span>
                </div>

                <div>
                  <h3 className="font-display text-base font-semibold text-ink">
                    {draftProduct.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-ink-secondary">
                    {draftProduct.fabric}
                    {parsedColors.length > 0 ? ` · ${parsedColors.join(' / ')}` : ''}
                  </p>
                </div>

                {draftProduct.description && (
                  <p className="text-xs leading-relaxed text-ink-muted line-clamp-2">
                    {draftProduct.description}
                  </p>
                )}

                <div className="flex items-baseline gap-2.5">
                  <span className="font-mono text-base font-bold text-ink tabular-nums">
                    {numericPrice > 0 ? formatInr(numericPrice) : '₹—'}
                  </span>
                  {numericCompareAt > numericPrice && (
                    <>
                      <span className="font-mono text-xs text-ink-muted line-through tabular-nums">
                        {formatInr(numericCompareAt)}
                      </span>
                      <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        {discountPct}% off
                      </span>
                    </>
                  )}
                </div>

                {previewSizes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {previewSizes.slice(0, 6).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setPreviewSize(sz)}
                        className={`rounded border px-2 py-0.5 font-mono text-[11px] transition-colors ${
                          previewSize === sz
                            ? 'border-accent bg-accent-soft text-accent-text font-semibold'
                            : 'border-line text-ink-secondary hover:bg-hover'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-line-subtle text-xs">
                  <span
                    className={
                      draftProduct.stockQuantity === 0
                        ? 'font-medium text-red-700 dark:text-red-400'
                        : 'text-ink-muted font-mono tabular-nums'
                    }
                  >
                    {draftProduct.stockQuantity === 0
                      ? 'Out of stock'
                      : `${draftProduct.stockQuantity} in stock`}
                  </span>
                  <span className="font-medium text-ink-secondary">
                    {publishedToWebsite ? 'Published' : 'Hidden Draft'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Backend Target & Publish Action */}
          <section className="rounded-xl border border-line bg-surface p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-accent-text" aria-hidden="true" />
                <h2 className="font-display text-sm font-semibold text-ink">
                  Website Backend Sync
                </h2>
              </div>
              <span className="font-mono text-[11px] text-ink-muted">
                {syncMode === 'proxy'
                  ? serverConfig.serverConfigured
                    ? 'Server Proxy Ready'
                    : 'Local Catalog Mode'
                  : directEndpointUrl
                    ? 'Direct REST Endpoint'
                    : 'No Endpoint Set'}
              </span>
            </div>

            <div
              role="tablist"
              aria-label="Backend sync mode"
              className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-subtle p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={syncMode === 'proxy'}
                onClick={() => setSyncMode('proxy')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  syncMode === 'proxy'
                    ? 'bg-surface text-ink shadow-xs'
                    : 'text-ink-secondary hover:text-ink'
                }`}
              >
                Server Proxy (/api)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={syncMode === 'direct'}
                onClick={() => setSyncMode('direct')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  syncMode === 'direct'
                    ? 'bg-surface text-ink shadow-xs'
                    : 'text-ink-secondary hover:text-ink'
                }`}
              >
                Direct Backend URL
              </button>
            </div>

            {syncMode === 'proxy' ? (
              <div className="rounded-lg border border-line-subtle bg-subtle/50 p-3 text-xs space-y-1">
                {serverConfig.serverConfigured ? (
                  <>
                    <p className="font-medium text-emerald-700 dark:text-emerald-400">
                      Connected via server proxy to {serverConfig.targetOrigin}
                    </p>
                    <p className="text-ink-muted">
                      {serverConfig.authConfigured
                        ? 'Server authorization header is active via WEBSITE_API_KEY.'
                        : 'Set WEBSITE_API_KEY in server environment variables if your backend requires auth.'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-ink">
                      Ready to connect via <code className="font-mono">WEBSITE_API_URL</code>
                    </p>
                    <p className="text-ink-muted">
                      Products save to the admin catalog immediately. Set{' '}
                      <code className="font-mono text-ink">WEBSITE_API_URL</code> (and{' '}
                      <code className="font-mono text-ink">WEBSITE_API_KEY</code> if needed) in your
                      environment variables to forward uploads automatically to your database.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-ink-secondary">
                  Public Website Product Endpoint (CORS-enabled POST URL)
                </label>
                <input
                  type="url"
                  value={directEndpointUrl}
                  onChange={(e) => setDirectEndpointUrl(e.target.value)}
                  placeholder="https://api.yourwebsite.com/api/products"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
                />
                <p className="text-[11px] text-ink-muted">
                  For endpoints requiring secret API keys, use Server Proxy mode and store credentials in{' '}
                  <code className="font-mono">WEBSITE_API_KEY</code> on the server.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-accent-ink hover:bg-accent-hover disabled:opacity-60 transition-colors whitespace-nowrap"
              >
                <Send className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {isSubmitting
                    ? 'Uploading...'
                    : editingProductId
                      ? 'Update & Sync Product'
                      : 'Upload to Website'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onSelectEditProduct(null)}
                className="rounded-lg border border-line bg-surface px-4 py-2.5 text-xs font-medium text-ink-secondary hover:bg-hover transition-colors whitespace-nowrap"
              >
                Reset Form
              </button>
            </div>
          </section>
        </div>
      </form>

      {/* Website Product Sync Queue Table */}
      <section className="rounded-xl border border-line bg-surface overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-sm font-semibold text-ink">
              Website Catalog &amp; Sync Status
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Click Edit to update photos or details, or Re-sync to push an item to your backend API.
            </p>
          </div>
          <span className="font-mono text-xs text-ink-muted tabular-nums">
            {products.length} total SKUs
          </span>
        </div>

        {products.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="font-display text-sm font-semibold text-ink">
              No products uploaded yet
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              Fill out the form above and click &ldquo;Upload to Website&rdquo; to publish your first product.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-subtle text-ink-muted">
                  <th className="py-3 pl-5 pr-3">Product</th>
                  <th className="py-3 px-3">SKU</th>
                  <th className="py-3 px-3 text-right">Price</th>
                  <th className="py-3 px-3 text-right">Stock</th>
                  <th className="py-3 px-3">Website Visibility</th>
                  <th className="py-3 px-3">Backend Sync</th>
                  <th className="py-3 pl-3 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {products.map((prod) => {
                  const thumb = prod.images?.find((img) => isSafeImageSrc(img));
                  const isLive = prod.publishedToWebsite ?? prod.isAvailable;
                  const isEditingRow = prod.id === editingProductId;
                  return (
                    <tr
                      key={prod.id}
                      className={`transition-colors ${
                        isEditingRow ? 'bg-accent-soft/60' : 'hover:bg-hover'
                      }`}
                    >
                      <td className="py-3 pl-5 pr-3">
                        <div className="flex items-center gap-3 min-w-[220px]">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-line bg-subtle flex items-center justify-center">
                            {thumb && !failedPreviewImages[thumb] ? (
                              <img
                                src={thumb}
                                alt={prod.name}
                                referrerPolicy="no-referrer"
                                onError={() =>
                                  setFailedPreviewImages((prev) => ({
                                    ...prev,
                                    [thumb]: true,
                                  }))
                                }
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Shirt className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-ink truncate">{prod.name}</p>
                            <p className="text-[11px] text-ink-muted truncate">
                              {prod.categoryName} · {prod.sizesAvailable}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-ink-secondary whitespace-nowrap">
                        {prod.sku}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-ink tabular-nums whitespace-nowrap">
                        {formatInr(prod.price)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-ink-secondary tabular-nums">
                        {prod.stockQuantity}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`font-medium ${
                            isLive
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-ink-muted'
                          }`}
                        >
                          {isLive ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {prod.websiteSyncStatus === 'synced' ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                            Synced {prod.lastSyncedAt ? `· ${formatDateTime(prod.lastSyncedAt)}` : ''}
                          </span>
                        ) : prod.websiteSyncStatus === 'failed' ? (
                          <span
                            title={prod.syncError}
                            className="text-red-700 dark:text-red-400 font-medium"
                          >
                            Sync Failed
                          </span>
                        ) : (
                          <span className="text-ink-muted">Catalog Ready</span>
                        )}
                      </td>
                      <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectEditProduct(prod.id);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-secondary hover:bg-hover transition-colors"
                          >
                            <Pencil className="h-3 w-3" aria-hidden="true" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            disabled={syncingId === prod.id}
                            onClick={() => void handleResyncRow(prod)}
                            className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-secondary hover:bg-hover disabled:opacity-50 transition-colors"
                          >
                            <RefreshCw
                              className={`h-3 w-3 ${syncingId === prod.id ? 'animate-spin' : ''}`}
                              aria-hidden="true"
                            />
                            <span>Sync</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteProduct(prod.id)}
                            aria-label={`Delete ${prod.name}`}
                            className="inline-flex items-center rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
