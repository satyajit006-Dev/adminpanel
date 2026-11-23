import { Check, Moon, Plus, Sun } from 'lucide-react';
import { useState } from 'react';
import type {
  ApparelCategory,
  ApparelProduct,
  BusinessSettings,
  ShippingZone,
  StaffMember,
  ThemePreset,
} from '../../types/apparel';
import { formatInr } from '../../utils/apparelFormatters';
import { THEME_PRESETS } from '../../utils/themes';

export function ApparelProductsView({
  products,
  categories,
  onToggleAvailability,
  onAddProduct,
}: {
  products: ApparelProduct[];
  categories: ApparelCategory[];
  onToggleAvailability: (id: string) => void;
  onAddProduct: (item: ApparelProduct) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? 'cat-1');
  const [price, setPrice] = useState('');
  const [fabric, setFabric] = useState('100% Organic Cotton');
  const [sizesAvailable, setSizesAvailable] = useState('XS–XL');
  const [stock, setStock] = useState('24');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = categories.find((c) => c.id === categoryId);
    onAddProduct({
      id: `prod-${Date.now()}`,
      sku: sku.trim() || `KV-NEW-${Math.floor(100 + Math.random() * 899)}`,
      name: name.trim(),
      categoryId,
      categoryName: cat?.name ?? 'Apparel',
      price: Number(price) || 4500,
      fabric: fabric.trim(),
      sizesAvailable: sizesAvailable.trim() || 'XS–XL',
      stockQuantity: Number(stock) || 20,
      lowStockThreshold: 6,
      isAvailable: true,
      isBestseller: false,
    });
    setSku('');
    setName('');
    setPrice('');
    setAdding(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-muted">
          {products.length} garments &amp; accessories · {products.filter((p) => p.isAvailable).length} active
        </p>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink hover:bg-accent-hover transition-colors"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Add Garment SKU</span>
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
            placeholder="Garment name *"
            className="sm:col-span-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
          />
          <input
            type="text"
            required
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="SKU (e.g. KV-SHT-202) *"
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
            min={100}
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
            placeholder="Fabric / Composition"
            className="sm:col-span-3 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
          />
          <input
            type="text"
            value={sizesAvailable}
            onChange={(e) => setSizesAvailable(e.target.value)}
            placeholder="Size run (e.g. XS–XL)"
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
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-line bg-subtle text-ink-muted">
                <th className="py-3 pl-5 pr-3">SKU</th>
                <th className="py-3 px-3">Garment &amp; Fabric</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Sizes</th>
                <th className="py-3 px-3 text-right">Price</th>
                <th className="py-3 px-3 text-right">Units</th>
                <th className="py-3 pl-3 pr-5 text-right">Availability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {products.map((item) => (
                <tr key={item.id} className="hover:bg-hover transition-colors">
                  <td className="py-3 pl-5 pr-3 font-mono font-semibold text-ink-secondary whitespace-nowrap">
                    {item.sku}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-ink">
                      {item.name}
                    </span>
                    {item.isBestseller && (
                      <span className="ml-2 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                        · Core Bestseller
                      </span>
                    )}
                    <span className="block text-[11px] text-ink-muted">
                      {item.fabric}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-ink-secondary">
                    {item.categoryName}
                  </td>
                  <td className="py-3 px-3 font-mono text-ink-secondary">
                    {item.sizesAvailable}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-ink tabular-nums">
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
                  <td className="py-3 pl-3 pr-5 text-right">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function ApparelCategoriesView({
  categories,
  products,
  onToggleCategory,
}: {
  categories: ApparelCategory[];
  products: ApparelProduct[];
  onToggleCategory: (id: string) => void;
}) {
  return (
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
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-line bg-subtle text-ink-muted">
              <th className="py-3 pl-5 pr-3">Garment SKU</th>
              <th className="py-3 px-3">Size Run</th>
              <th className="py-3 px-3 text-right">Current Units</th>
              <th className="py-3 px-3 text-right">Reorder Threshold</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 pl-3 pr-5 text-right">Warehouse Adjustment</th>
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
    </div>
  );
}

export function ApparelDeliveryView({
  zones,
  onToggleZone,
}: {
  zones: ShippingZone[];
  onToggleZone: (id: string) => void;
}) {
  return (
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
                Pincodes: {z.pincodes}
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
  );
}

export function ApparelStaffView({
  staff,
  onToggleStaffStatus,
}: {
  staff: StaffMember[];
  onToggleStaffStatus: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-line bg-subtle text-ink-muted">
              <th className="py-3 pl-5 pr-3">Staff Member</th>
              <th className="py-3 px-3">Role</th>
              <th className="py-3 px-3">Last Login</th>
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
}: {
  settings: BusinessSettings;
  themePreset: ThemePreset;
  isDark: boolean;
  onChangeThemePreset: (preset: ThemePreset) => void;
  onToggleDark: () => void;
  onSaveSettings: (next: BusinessSettings) => void;
}) {
  const [draft, setDraft] = useState(settings);

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
              Choose a curated color palette and surface luminance for Kova Studio Admin.
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
          Apparel Storefront &amp; GST Configuration
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-medium text-ink-muted">Brand Name</label>
            <input
              type="text"
              value={draft.brandName}
              onChange={(e) => setDraft({ ...draft, brandName: e.target.value })}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-medium text-ink-muted">Phone</label>
            <input
              type="text"
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-medium text-ink-muted">Email</label>
            <input
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-medium text-ink-muted">Apparel GST Rate (%)</label>
            <input
              type="number"
              min={0}
              max={28}
              value={draft.gstRatePct}
              onChange={(e) => setDraft({ ...draft, gstRatePct: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm text-ink focus:border-accent focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block font-medium text-ink-muted">Flagship &amp; Warehouse Address</label>
            <input
              type="text"
              value={draft.address}
              onChange={(e) => setDraft({ ...draft, address: e.target.value })}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block font-medium text-ink-muted">Flagship Hours</label>
            <input
              type="text"
              value={draft.openingHours}
              onChange={(e) => setDraft({ ...draft, openingHours: e.target.value })}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
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
    </div>
  );
}
