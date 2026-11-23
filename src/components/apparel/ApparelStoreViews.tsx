import { Plus } from 'lucide-react';
import { useState } from 'react';
import type {
  ApparelCategory,
  ApparelProduct,
  BusinessSettings,
  ShippingZone,
  StaffMember,
} from '../../types/apparel';
import { formatInr } from '../../utils/apparelFormatters';

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
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {products.length} garments &amp; accessories · {products.filter((p) => p.isAvailable).length} active
        </p>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Add Garment SKU</span>
        </button>
      </div>

      {adding && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-5 grid grid-cols-1 sm:grid-cols-6 gap-3 dark:border-slate-800 dark:bg-[#111827]"
        >
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Garment name *"
            className="sm:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <input
            type="text"
            required
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="SKU (e.g. KV-SHT-202) *"
            className="rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
            className="rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <input
            type="number"
            min={0}
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="Stock"
            className="rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <input
            type="text"
            value={fabric}
            onChange={(e) => setFabric(e.target.value)}
            placeholder="Fabric / Composition"
            className="sm:col-span-3 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <input
            type="text"
            value={sizesAvailable}
            onChange={(e) => setSizesAvailable(e.target.value)}
            placeholder="Size run (e.g. XS–XL)"
            className="sm:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
          >
            Save SKU
          </button>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                <th className="py-3 pl-5 pr-3">SKU</th>
                <th className="py-3 px-3">Garment &amp; Fabric</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Sizes</th>
                <th className="py-3 px-3 text-right">Price</th>
                <th className="py-3 px-3 text-right">Units</th>
                <th className="py-3 pl-3 pr-5 text-right">Availability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {products.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 pl-5 pr-3 font-mono font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {item.sku}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {item.name}
                    </span>
                    {item.isBestseller && (
                      <span className="ml-2 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                        · Core Bestseller
                      </span>
                    )}
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                      {item.fabric}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                    {item.categoryName}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                    {item.sizesAvailable}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {formatInr(item.price)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">
                    <span
                      className={
                        item.stockQuantity <= item.lowStockThreshold
                          ? 'font-bold text-red-700 dark:text-red-400'
                          : 'text-slate-700 dark:text-slate-300'
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
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
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
            className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between dark:border-slate-800 dark:bg-[#111827]"
          >
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  {cat.name}
                </h3>
                <span className="font-mono text-xs text-slate-400">{count} SKUs</span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{cat.description}</p>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
              <span className="font-mono text-[11px] text-slate-400">Sort #{cat.sortOrder}</span>
              <button
                type="button"
                onClick={() => onToggleCategory(cat.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                  cat.enabled
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
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
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
              <th className="py-3 pl-5 pr-3">Garment SKU</th>
              <th className="py-3 px-3">Size Run</th>
              <th className="py-3 px-3 text-right">Current Units</th>
              <th className="py-3 px-3 text-right">Reorder Threshold</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 pl-3 pr-5 text-right">Warehouse Adjustment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {products.map((item) => {
              const low = item.stockQuantity <= item.lowStockThreshold;
              return (
                <tr key={item.id}>
                  <td className="py-3 pl-5 pr-3">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {item.name}
                    </span>
                    <span className="block font-mono text-[11px] text-slate-400">{item.sku}</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                    {item.sizesAvailable}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {item.stockQuantity}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-500 tabular-nums">
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
                      className="rounded border border-slate-200 px-2 py-1 font-mono hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdjustStock(item.id, 10)}
                      className="rounded bg-slate-900 px-2.5 py-1 font-mono font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
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
          className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 dark:border-slate-800 dark:bg-[#111827]"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                {z.name}
              </h3>
              <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                Pincodes: {z.pincodes}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onToggleZone(z.id)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                z.active
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {z.active ? 'Active' : 'Paused'}
            </button>
          </div>
          <div className="border-t border-slate-100 pt-3 grid grid-cols-3 gap-2 text-xs dark:border-slate-800">
            <div>
              <span className="block text-slate-400">Fee</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                {formatInr(z.fee)}
              </span>
            </div>
            <div>
              <span className="block text-slate-400">Free Above</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                {formatInr(z.minOrder)}
              </span>
            </div>
            <div>
              <span className="block text-slate-400">Transit ETA</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
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
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
              <th className="py-3 pl-5 pr-3">Staff Member</th>
              <th className="py-3 px-3">Role</th>
              <th className="py-3 px-3">Last Login</th>
              <th className="py-3 pl-3 pr-5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {staff.map((m) => (
              <tr key={m.id}>
                <td className="py-3 pl-5 pr-3">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{m.name}</p>
                  <p className="text-slate-500 dark:text-slate-400">{m.email}</p>
                </td>
                <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                  {m.role}
                </td>
                <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400">
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
  onSaveSettings,
}: {
  settings: BusinessSettings;
  onSaveSettings: (next: BusinessSettings) => void;
}) {
  const [draft, setDraft] = useState(settings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(draft);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6 space-y-4 dark:border-slate-800 dark:bg-[#111827]"
    >
      <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
        Apparel Storefront &amp; GST Configuration
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block font-medium text-slate-500">Brand Name</label>
          <input
            type="text"
            value={draft.brandName}
            onChange={(e) => setDraft({ ...draft, brandName: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="block font-medium text-slate-500">Phone</label>
          <input
            type="text"
            value={draft.phone}
            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="block font-medium text-slate-500">Email</label>
          <input
            type="email"
            value={draft.email}
            onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="block font-medium text-slate-500">Apparel GST Rate (%)</label>
          <input
            type="number"
            min={0}
            max={28}
            value={draft.gstRatePct}
            onChange={(e) => setDraft({ ...draft, gstRatePct: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block font-medium text-slate-500">Flagship &amp; Warehouse Address</label>
          <input
            type="text"
            value={draft.address}
            onChange={(e) => setDraft({ ...draft, address: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block font-medium text-slate-500">Flagship Hours</label>
          <input
            type="text"
            value={draft.openingHours}
            onChange={(e) => setDraft({ ...draft, openingHours: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
      </div>
      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
        >
          Save Settings
        </button>
      </div>
    </form>
  );
}
