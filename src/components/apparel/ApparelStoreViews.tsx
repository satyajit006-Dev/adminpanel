import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Moon,
  Pencil,
  Plus,
  ShieldCheck,
  Shirt,
  Sun,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type {
  ApparelCategory,
  ApparelProduct,
  BusinessSettings,
  ShippingZone,
  StaffMember,
  ThemePreset,
} from '../../types/apparel';
import { formatInr, getNowTimestamp } from '../../utils/apparelFormatters';
import { THEME_PRESETS } from '../../utils/themes';

export function ApparelProductsView({
  products,
  categories,
  supabaseConfigured,
  backendUnlocked,
  onToggleAvailability,
  onAddProduct,
  onDeleteProduct,
  onOpenWebsiteUpload,
}: {
  products: ApparelProduct[];
  categories: ApparelCategory[];
  supabaseConfigured?: boolean;
  backendUnlocked?: boolean;
  onToggleAvailability: (id: string) => void;
  onAddProduct: (item: ApparelProduct) => void;
  onDeleteProduct: (id: string) => void;
  onOpenWebsiteUpload: (productId?: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? 'cat-1');
  const [price, setPrice] = useState('');
  const [fabric, setFabric] = useState('');
  const [sizesAvailable, setSizesAvailable] = useState('XS–XL');
  const [stock, setStock] = useState('0');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = categories.find((c) => c.id === categoryId);
    onAddProduct({
      id: `prod-${Date.now()}`,
      sku: sku.trim() || `SKU-${Math.floor(100 + Math.random() * 899)}`,
      name: name.trim(),
      categoryId,
      categoryName: cat?.name ?? 'Apparel',
      price: Number(price) || 0,
      fabric: fabric.trim() || '—',
      sizesAvailable: sizesAvailable.trim() || 'XS–XL',
      stockQuantity: Math.max(0, Number(stock) || 0),
      lowStockThreshold: 6,
      isAvailable: true,
      isBestseller: false,
      publishedToWebsite: true,
    });
    setSku('');
    setName('');
    setPrice('');
    setFabric('');
    setStock('0');
    setAdding(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <span>
            {products.length} products · {products.filter((p) => p.isAvailable).length} active
          </span>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => onOpenWebsiteUpload()}
            className={`font-medium hover:underline ${
              supabaseConfigured && backendUnlocked
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-ink-secondary'
            }`}
          >
            {supabaseConfigured
              ? backendUnlocked
                ? 'Supabase Connected'
                : 'Supabase Locked (Unlock in Upload View)'
              : 'Local Catalog Mode'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenWebsiteUpload()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-2 text-xs font-medium text-ink-secondary hover:bg-hover transition-colors whitespace-nowrap"
          >
            <UploadCloud className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Upload to Website</span>
          </button>
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink hover:bg-accent-hover transition-colors whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Quick Add SKU</span>
          </button>
        </div>
      </div>

      {adding && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-line bg-surface p-5 grid grid-cols-1 sm:grid-cols-6 gap-3"
        >
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Product name *"
            className="sm:col-span-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
          />
          <input
            type="text"
            required
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="SKU code *"
            className="rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs text-ink focus:border-accent focus:outline-none"
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            required
            min={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price (INR) *"
            className="rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs text-ink focus:border-accent focus:outline-none"
          />
          <input
            type="number"
            min={0}
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="Stock"
            className="rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs text-ink focus:border-accent focus:outline-none"
          />
          <input
            type="text"
            value={fabric}
            onChange={(e) => setFabric(e.target.value)}
            placeholder="Fabric / Material"
            className="sm:col-span-3 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
          />
          <input
            type="text"
            value={sizesAvailable}
            onChange={(e) => setSizesAvailable(e.target.value)}
            placeholder="Sizes (e.g. XS–XL)"
            className="sm:col-span-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-ink hover:bg-accent-hover transition-colors"
          >
            Save SKU
          </button>
        </form>
      )}

      <div className="rounded-xl border border-line bg-surface overflow-hidden">
        {products.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-display text-base font-semibold text-ink">
              No products in your catalog yet
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              Upload a product with photos, sizes, and pricing to publish it to your website.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => onOpenWebsiteUpload()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-ink hover:bg-accent-hover transition-colors"
              >
                <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Upload First Product</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-subtle text-ink-muted">
                  <th className="py-3 pl-5 pr-3">SKU</th>
                  <th className="py-3 px-3">Product &amp; Fabric</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Sizes</th>
                  <th className="py-3 px-3 text-right">Price</th>
                  <th className="py-3 px-3 text-right">Units</th>
                  <th className="py-3 px-3 text-right">Availability</th>
                  <th className="py-3 pl-3 pr-5 text-right">Website</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {products.map((item) => {
                  const thumb = item.images?.[0];
                  return (
                    <tr key={item.id} className="hover:bg-hover transition-colors">
                      <td className="py-3 pl-5 pr-3 font-mono font-semibold text-ink-secondary whitespace-nowrap">
                        {item.sku}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-line bg-subtle flex items-center justify-center">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt={item.name}
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Shirt className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-ink">
                              {item.name}
                            </span>
                            {item.isBestseller && (
                              <span className="ml-2 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                                · Featured
                              </span>
                            )}
                            <span className="block text-[11px] text-ink-muted truncate">
                              {item.fabric}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-ink-secondary whitespace-nowrap">
                        {item.categoryName}
                      </td>
                      <td className="py-3 px-3 font-mono text-ink-secondary whitespace-nowrap">
                        {item.sizesAvailable}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-ink tabular-nums whitespace-nowrap">
                        {formatInr(item.price)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        <span
                          className={
                            item.stockQuantity <= item.lowStockThreshold
                              ? 'font-bold text-red-700 dark:text-red-400'
                              : 'text-ink-secondary'
                          }
                        >
                          {item.stockQuantity}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onToggleAvailability(item.id)}
                          className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                            item.isAvailable
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                              : 'bg-subtle text-ink-muted'
                          }`}
                        >
                          {item.isAvailable ? 'In Catalog' : 'Archived'}
                        </button>
                      </td>
                      <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenWebsiteUpload(item.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-secondary hover:bg-hover transition-colors"
                          >
                            <Pencil className="h-3 w-3" aria-hidden="true" />
                            <span>Edit / Upload</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteProduct(item.id)}
                            aria-label={`Delete ${item.name}`}
                            className="inline-flex items-center rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" aria-hidden="true" />
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
      </div>
    </div>
  );
}

export function ApparelCategoriesView({
  categories,
  products,
  onToggleCategory,
  onAddCategory,
}: {
  categories: ApparelCategory[];
  products: ApparelProduct[];
  onToggleCategory: (id: string) => void;
  onAddCategory: (cat: ApparelCategory) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddCategory({
      id: `cat-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || 'Apparel collection',
      sortOrder: categories.length + 1,
      enabled: true,
    });
    setName('');
    setDescription('');
    setAdding(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">
          {categories.length} {categories.length === 1 ? 'category' : 'categories'} ·{' '}
          {categories.filter((c) => c.enabled).length} visible on storefront
        </p>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink hover:bg-accent-hover transition-colors whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Add Category</span>
        </button>
      </div>

      {adding && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-line bg-surface p-5 grid grid-cols-1 sm:grid-cols-6 gap-3"
        >
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Category name *"
            className="sm:col-span-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description"
            className="sm:col-span-3 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-ink hover:bg-accent-hover transition-colors"
          >
            Save Category
          </button>
        </form>
      )}

      {categories.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface px-6 py-14 text-center">
          <p className="font-display text-base font-semibold text-ink">No categories yet</p>
          <p className="mt-1 text-xs text-ink-muted">
            Add apparel categories to organize products on your storefront.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const count = products.filter((p) => p.categoryId === cat.id).length;
            return (
              <div
                key={cat.id}
                className="rounded-xl border border-line bg-surface p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-display text-base font-semibold text-ink">
                      {cat.name}
                    </h3>
                    <span className="font-mono text-xs text-ink-muted">{count} SKUs</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">{cat.description}</p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-line-subtle pt-3">
                  <span className="font-mono text-[11px] text-ink-muted">Sort #{cat.sortOrder}</span>
                  <button
                    type="button"
                    onClick={() => onToggleCategory(cat.id)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                      cat.enabled
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : 'bg-subtle text-ink-muted'
                    }`}
                  >
                    {cat.enabled ? 'Visible' : 'Hidden'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ApparelInventoryView({
  products,
  onAdjustStock,
}: {
  products: ApparelProduct[];
  onAdjustStock: (id: string, delta: number) => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface overflow-hidden">
      {products.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="font-display text-base font-semibold text-ink">
            No inventory items yet
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Add products to manage warehouse stock levels and reorder alerts.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-line bg-subtle text-ink-muted">
                <th className="py-3 pl-5 pr-3">Product SKU</th>
                <th className="py-3 px-3">Size Run</th>
                <th className="py-3 px-3 text-right">Current Units</th>
                <th className="py-3 px-3 text-right">Reorder Threshold</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 pl-3 pr-5 text-right">Stock Adjustment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {products.map((item) => {
                const low = item.stockQuantity <= item.lowStockThreshold;
                return (
                  <tr key={item.id} className="hover:bg-hover transition-colors">
                    <td className="py-3 pl-5 pr-3">
                      <span className="font-semibold text-ink">
                        {item.name}
                      </span>
                      <span className="block font-mono text-[11px] text-ink-muted">{item.sku}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-ink-secondary">
                      {item.sizesAvailable}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-ink tabular-nums">
                      {item.stockQuantity}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-ink-muted tabular-nums">
                      {item.lowStockThreshold}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-semibold ${
                          low
                            ? 'text-red-700 dark:text-red-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {low ? 'Low Stock — Reorder' : 'Healthy Stock'}
                      </span>
                    </td>
                    <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap space-x-1.5">
                      <button
                        type="button"
                        onClick={() => onAdjustStock(item.id, -1)}
                        className="rounded border border-line bg-surface px-2 py-1 font-mono text-ink-secondary hover:bg-hover hover:text-ink"
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        onClick={() => onAdjustStock(item.id, 10)}
                        className="rounded bg-accent px-2.5 py-1 font-mono font-semibold text-accent-ink hover:bg-accent-hover transition-colors"
                      >
                        +10 Restock
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ApparelDeliveryView({
  zones,
  onToggleZone,
  onAddZone,
}: {
  zones: ShippingZone[];
  onToggleZone: (id: string) => void;
  onAddZone: (zone: ShippingZone) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [pincodes, setPincodes] = useState('');
  const [fee, setFee] = useState('0');
  const [minOrder, setMinOrder] = useState('0');
  const [etaWindow, setEtaWindow] = useState('2–4 Business Days');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddZone({
      id: `dz-${Date.now()}`,
      name: name.trim(),
      pincodes: pincodes.trim() || 'All serviceable pincodes',
      fee: Math.max(0, Number(fee) || 0),
      minOrder: Math.max(0, Number(minOrder) || 0),
      etaWindow: etaWindow.trim() || '3–5 Business Days',
      active: true,
    });
    setName('');
    setPincodes('');
    setFee('0');
    setMinOrder('0');
    setAdding(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">
          {zones.length} shipping {zones.length === 1 ? 'zone' : 'zones'} configured
        </p>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink hover:bg-accent-hover transition-colors whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Add Shipping Zone</span>
        </button>
      </div>

      {adding && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-line bg-surface p-5 grid grid-cols-1 sm:grid-cols-6 gap-3"
        >
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Zone name *"
            className="sm:col-span-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
          />
          <input
            type="text"
            value={pincodes}
            onChange={(e) => setPincodes(e.target.value)}
            placeholder="Pincodes / Regions"
            className="sm:col-span-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
          />
          <input
            type="number"
            min={0}
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            placeholder="Fee (INR)"
            className="rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs text-ink focus:border-accent focus:outline-none"
          />
          <input
            type="number"
            min={0}
            value={minOrder}
            onChange={(e) => setMinOrder(e.target.value)}
            placeholder="Free above (INR)"
            className="rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs text-ink focus:border-accent focus:outline-none"
          />
          <input
            type="text"
            value={etaWindow}
            onChange={(e) => setEtaWindow(e.target.value)}
            placeholder="Delivery ETA"
            className="sm:col-span-5 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-ink hover:bg-accent-hover transition-colors"
          >
            Save Zone
          </button>
        </form>
      )}

      {zones.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface px-6 py-14 text-center">
          <p className="font-display text-base font-semibold text-ink">
            No shipping zones configured
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Add delivery zones to define shipping rates, free-shipping thresholds, and delivery windows.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {zones.map((z) => (
            <div
              key={z.id}
              className="rounded-xl border border-line bg-surface p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-base font-semibold text-ink">
                    {z.name}
                  </h3>
                  <p className="font-mono text-[11px] text-ink-muted">
                    Regions: {z.pincodes}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleZone(z.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                    z.active
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                      : 'bg-subtle text-ink-muted'
                  }`}
                >
                  {z.active ? 'Active' : 'Paused'}
                </button>
              </div>
              <div className="border-t border-line-subtle pt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="block text-ink-muted">Fee</span>
                  <span className="font-mono font-semibold text-ink">
                    {formatInr(z.fee)}
                  </span>
                </div>
                <div>
                  <span className="block text-ink-muted">Free Above</span>
                  <span className="font-mono font-semibold text-ink">
                    {formatInr(z.minOrder)}
                  </span>
                </div>
                <div>
                  <span className="block text-ink-muted">Transit ETA</span>
                  <span className="font-mono font-semibold text-ink">
                    {z.etaWindow}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface RoleCredentialStatus {
  configured: boolean;
  source: 'env' | 'database' | 'memory' | 'unset';
  username: string;
}

export function ApparelStaffView({
  staff,
  adminToken,
  onToggleStaffStatus,
  onAddStaff,
  onRefreshConfig,
  onNotify,
}: {
  staff: StaffMember[];
  adminToken?: string | null;
  onToggleStaffStatus: (id: string) => void;
  onAddStaff: (member: StaffMember) => void;
  onRefreshConfig?: () => Promise<void>;
  onNotify?: (message: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffMember['role']>('Merchandiser');

  // Dual Owner & Co-Founder Credentials State
  const [credStatus, setCredStatus] = useState<{
    owner: RoleCredentialStatus;
    cofounder: RoleCredentialStatus;
  } | null>(null);
  const [editingRole, setEditingRole] = useState<'owner' | 'co_founder'>('co_founder');
  const [credUsername, setCredUsername] = useState('');
  const [credPasscode, setCredPasscode] = useState('');
  const [credConfirm, setCredConfirm] = useState('');
  const [showCredPasscode, setShowCredPasscode] = useState(false);
  const [showCredConfirm, setShowCredConfirm] = useState(false);
  const [savingCred, setSavingCred] = useState(false);
  const [credError, setCredError] = useState<string | null>(null);

  const loadCredentialStatus = useCallback(async () => {
    if (!adminToken) return;
    try {
      const res = await fetch('/api/admin/auth/credentials', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        ok?: boolean;
        owner?: RoleCredentialStatus;
        cofounder?: RoleCredentialStatus;
      };
      if (data.ok && data.owner && data.cofounder) {
        setCredStatus({ owner: data.owner, cofounder: data.cofounder });
      }
    } catch {
      // Ignore background fetch error
    }
  }, [adminToken]);

  useEffect(() => {
    void loadCredentialStatus();
  }, [loadCredentialStatus]);

  useEffect(() => {
    if (!credStatus) return;
    const current = editingRole === 'owner' ? credStatus.owner : credStatus.cofounder;
    setCredUsername(current.username || '');
    setCredPasscode('');
    setCredConfirm('');
    setCredError(null);
  }, [editingRole, credStatus]);

  const handleSaveCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    setCredError(null);

    const cleanedUser = credUsername.trim().toLowerCase();
    const cleanedPass = credPasscode.trim();
    if (!/^[a-z0-9._@-]{3,64}$/.test(cleanedUser)) {
      setCredError('Username must be 3–64 characters (letters, numbers, ., _, -, @).');
      return;
    }
    if (cleanedPass.length < 8) {
      setCredError('Passcode must be at least 8 characters.');
      return;
    }
    if (cleanedPass !== credConfirm.trim()) {
      setCredError('Passcodes do not match. Click the eye icon to verify.');
      return;
    }

    setSavingCred(true);
    try {
      const res = await fetch('/api/admin/auth/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          role: editingRole,
          username: cleanedUser,
          passcode: cleanedPass,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; role?: string };
      if (!res.ok || !data.ok) {
        setCredError(data.error ?? `Failed to save credentials (HTTP ${res.status}).`);
        return;
      }

      setCredPasscode('');
      setCredConfirm('');
      setShowCredPasscode(false);
      setShowCredConfirm(false);
      await loadCredentialStatus();
      if (onRefreshConfig) await onRefreshConfig();
      onNotify?.(
        `Saved ${editingRole === 'owner' ? 'Owner' : 'Co-Founder'} login credentials (${cleanedUser}).`
      );
    } catch {
      setCredError('Network error saving credentials.');
    } finally {
      setSavingCred(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    onAddStaff({
      id: `stf-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      role,
      status: 'Active',
      lastLogin: getNowTimestamp(),
    });
    setName('');
    setEmail('');
    setAdding(false);
  };

  const selectedCredInfo =
    credStatus ? (editingRole === 'owner' ? credStatus.owner : credStatus.cofounder) : null;
  const lockedByEnv = selectedCredInfo?.source === 'env';

  return (
    <div className="space-y-6">
      {/* Owner & Co-Founder Login Passcodes */}
      <section className="rounded-xl border border-line bg-surface p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line-subtle pb-4">
          <div>
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-accent-text" aria-hidden="true" />
              <h2 className="font-display text-sm font-semibold text-ink">
                Owner &amp; Co-Founder Login Passcodes
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-ink-muted">
              Maintain two distinct admin logins — one for the Owner and one for the Co-Founder — with separate usernames and passcodes.
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-line bg-subtle p-1 self-start">
            <button
              type="button"
              onClick={() => setEditingRole('owner')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                editingRole === 'owner'
                  ? 'bg-surface text-ink shadow-xs'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              Owner
            </button>
            <button
              type="button"
              onClick={() => setEditingRole('co_founder')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                editingRole === 'co_founder'
                  ? 'bg-surface text-ink shadow-xs'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              Co-Founder
            </button>
          </div>
        </div>

        {credStatus && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-line-subtle bg-subtle/40 px-4 py-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-ink">Owner Account</p>
                <p className="font-mono text-[11px] text-ink-muted truncate">
                  {credStatus.owner.configured
                    ? `Username: ${credStatus.owner.username}`
                    : 'Not configured yet'}
                </p>
              </div>
              <span
                className={`font-medium shrink-0 ${
                  credStatus.owner.configured
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {credStatus.owner.source === 'env'
                  ? 'Env Secret'
                  : credStatus.owner.configured
                    ? 'Active'
                    : 'Unset'}
              </span>
            </div>

            <div className="rounded-lg border border-line-subtle bg-subtle/40 px-4 py-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-ink">Co-Founder Account</p>
                <p className="font-mono text-[11px] text-ink-muted truncate">
                  {credStatus.cofounder.configured
                    ? `Username: ${credStatus.cofounder.username}`
                    : 'Not configured yet'}
                </p>
              </div>
              <span
                className={`font-medium shrink-0 ${
                  credStatus.cofounder.configured
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {credStatus.cofounder.source === 'env'
                  ? 'Env Secret'
                  : credStatus.cofounder.configured
                    ? 'Active'
                    : 'Unset'}
              </span>
            </div>
          </div>
        )}

        {lockedByEnv ? (
          <p className="text-xs text-ink-muted">
            {editingRole === 'owner'
              ? 'Owner credentials are managed by ADMIN_OWNER_PASSCODE / ADMIN_PASSCODE in your server environment variables.'
              : 'Co-Founder credentials are managed by ADMIN_COFOUNDER_PASSCODE in your server environment variables.'}
          </p>
        ) : (
          <form onSubmit={handleSaveCredential} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-start">
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1">
                {editingRole === 'owner' ? 'Owner Username *' : 'Co-Founder Username *'}
              </label>
              <input
                type="text"
                required
                autoCapitalize="none"
                spellCheck={false}
                value={credUsername}
                onChange={(e) => setCredUsername(e.target.value)}
                placeholder={editingRole === 'owner' ? 'owner' : 'cofounder'}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1">
                {editingRole === 'owner' ? 'Owner Passcode *' : 'Co-Founder Passcode *'}
              </label>
              <div className="relative">
                <input
                  type={showCredPasscode ? 'text' : 'password'}
                  required
                  value={credPasscode}
                  onChange={(e) => setCredPasscode(e.target.value)}
                  placeholder="Min 8 chars"
                  className="w-full rounded-lg border border-line bg-surface py-2 pl-3 pr-8 text-xs text-ink focus:border-accent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowCredPasscode((p) => !p)}
                  aria-label={showCredPasscode ? 'Hide passcode' : 'Show passcode'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-muted hover:text-ink"
                >
                  {showCredPasscode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1">
                Confirm Passcode *
              </label>
              <div className="relative">
                <input
                  type={showCredConfirm ? 'text' : 'password'}
                  required
                  value={credConfirm}
                  onChange={(e) => setCredConfirm(e.target.value)}
                  placeholder="Re-enter passcode"
                  className="w-full rounded-lg border border-line bg-surface py-2 pl-3 pr-8 text-xs text-ink focus:border-accent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowCredConfirm((p) => !p)}
                  aria-label={showCredConfirm ? 'Hide confirm passcode' : 'Show confirm passcode'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-muted hover:text-ink"
                >
                  {showCredConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="sm:pt-5">
              <button
                type="submit"
                disabled={savingCred}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-ink hover:bg-accent-hover disabled:opacity-60 transition-colors whitespace-nowrap"
              >
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {savingCred
                    ? 'Saving...'
                    : `Save ${editingRole === 'owner' ? 'Owner' : 'Co-Founder'}`}
                </span>
              </button>
            </div>

            {credError && (
              <p className="sm:col-span-4 text-xs font-medium text-red-700 dark:text-red-400">
                {credError}
              </p>
            )}
          </form>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">
          {staff.length} team {staff.length === 1 ? 'member' : 'members'}
        </p>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink hover:bg-accent-hover transition-colors whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {adding && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-line bg-surface p-5 grid grid-cols-1 sm:grid-cols-6 gap-3"
        >
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name *"
            className="sm:col-span-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address *"
            className="sm:col-span-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as StaffMember['role'])}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
          >
            <option value="Super Admin">Super Admin</option>
            <option value="Owner">Owner</option>
            <option value="Merchandiser">Merchandiser</option>
            <option value="Fulfillment Lead">Fulfillment Lead</option>
            <option value="Support Agent">Support Agent</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-ink hover:bg-accent-hover transition-colors"
          >
            Add Member
          </button>
        </form>
      )}

      <div className="rounded-xl border border-line bg-surface overflow-hidden">
        {staff.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-display text-base font-semibold text-ink">
              No staff accounts added
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              Add store operators, merchandisers, or fulfillment staff to manage permissions.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-subtle text-ink-muted">
                  <th className="py-3 pl-5 pr-3">Staff Member</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Added / Last Login</th>
                  <th className="py-3 pl-3 pr-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {staff.map((m) => (
                  <tr key={m.id} className="hover:bg-hover transition-colors">
                    <td className="py-3 pl-5 pr-3">
                      <p className="font-semibold text-ink">{m.name}</p>
                      <p className="text-ink-muted">{m.email}</p>
                    </td>
                    <td className="py-3 px-3 font-medium text-ink-secondary">
                      {m.role}
                    </td>
                    <td className="py-3 px-3 font-mono text-ink-muted">
                      {m.lastLogin}
                    </td>
                    <td className="py-3 pl-3 pr-5 text-right">
                      <button
                        type="button"
                        onClick={() => onToggleStaffStatus(m.id)}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                          m.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                            : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                        }`}
                      >
                        {m.status}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function ApparelSettingsView({
  settings,
  themePreset,
  isDark,
  onChangeThemePreset,
  onToggleDark,
  onSaveSettings,
  onClearAllData,
}: {
  settings: BusinessSettings;
  themePreset: ThemePreset;
  isDark: boolean;
  onChangeThemePreset: (preset: ThemePreset) => void;
  onToggleDark: () => void;
  onSaveSettings: (next: BusinessSettings) => void;
  onClearAllData: () => void;
}) {
  const [draft, setDraft] = useState(settings);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(draft);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Admin Panel Theme & Appearance */}
      <section className="rounded-xl border border-line bg-surface p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">
              Admin Panel Theme &amp; Appearance
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Choose a color palette and surface luminance for your admin workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleDark}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-subtle px-3 py-1.5 text-xs font-semibold text-ink hover:bg-hover self-start transition-colors"
          >
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            <span>{isDark ? 'Dark Mode Active' : 'Light Mode Active'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {THEME_PRESETS.map((preset) => {
            const active = themePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChangeThemePreset(preset.id)}
                className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors ${
                  active
                    ? 'border-accent bg-accent-soft'
                    : 'border-line bg-surface hover:border-accent/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex shrink-0 overflow-hidden rounded-lg border border-line">
                    <span
                      className="h-9 w-4"
                      style={{ backgroundColor: preset.sidebarHex }}
                      aria-hidden="true"
                    />
                    <span
                      className="h-9 w-4"
                      style={{
                        backgroundColor: isDark ? preset.darkCanvasHex : preset.canvasHex,
                      }}
                      aria-hidden="true"
                    />
                    <span
                      className="h-9 w-4"
                      style={{
                        backgroundColor: isDark ? preset.darkAccentHex : preset.accentHex,
                      }}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink truncate">{preset.name}</p>
                    <p className="text-[11px] text-ink-muted truncate">{preset.subtitle}</p>
                  </div>
                </div>
                {active && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink">
                    <Check className="h-3 w-3" aria-hidden="true" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-line bg-surface p-6 space-y-4"
      >
        <h2 className="font-display text-base font-semibold text-ink">
          Storefront, Operator &amp; Tax Configuration
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-medium text-ink-muted">Brand / Store Name</label>
            <input
              type="text"
              value={draft.brandName}
              onChange={(e) => setDraft({ ...draft, brandName: e.target.value })}
              placeholder="Your brand name"
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-medium text-ink-muted">Operator / Admin Name</label>
            <input
              type="text"
              value={draft.adminName ?? ''}
              onChange={(e) => setDraft({ ...draft, adminName: e.target.value })}
              placeholder="Store Admin"
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-medium text-ink-muted">Phone</label>
            <input
              type="text"
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              placeholder="+91 00000 00000"
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-medium text-ink-muted">Support Email</label>
            <input
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              placeholder="support@yourdomain.com"
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-medium text-ink-muted">Tax / GST Rate (%)</label>
            <input
              type="number"
              min={0}
              max={28}
              value={draft.gstRatePct}
              onChange={(e) => setDraft({ ...draft, gstRatePct: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm text-ink focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-medium text-ink-muted">Store Hours</label>
            <input
              type="text"
              value={draft.openingHours}
              onChange={(e) => setDraft({ ...draft, openingHours: e.target.value })}
              placeholder="e.g. 10:00 AM – 08:00 PM"
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block font-medium text-ink-muted">Store &amp; Warehouse Address</label>
            <input
              type="text"
              value={draft.address}
              onChange={(e) => setDraft({ ...draft, address: e.target.value })}
              placeholder="Street address, city, postal code"
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
            />
          </div>
        </div>
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-ink hover:bg-accent-hover transition-colors"
          >
            Save Settings
          </button>
        </div>
      </form>

      {/* Local Data Reset */}
      <section className="rounded-xl border border-line bg-surface p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-sm font-semibold text-ink">
            Reset Local Admin Data
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Clear locally stored orders, transactions, accounts, and catalog drafts in this browser.
          </p>
        </div>
        {!confirmClear ? (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40 self-start sm:self-auto whitespace-nowrap transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Clear Local Data</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClearAllData();
                setConfirmClear(false);
              }}
              className="rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700 whitespace-nowrap"
            >
              Confirm Clear All
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="rounded-lg border border-line px-3 py-2 text-xs text-ink-secondary hover:bg-hover whitespace-nowrap"
            >
              Cancel
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
