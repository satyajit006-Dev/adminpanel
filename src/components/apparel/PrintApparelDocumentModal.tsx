import { Printer, X } from 'lucide-react';
import type { ApparelOrder, BusinessSettings } from '../../types/apparel';
import { formatDateTime, formatInr } from '../../utils/apparelFormatters';

interface PrintApparelDocumentModalProps {
  order: ApparelOrder | null;
  docType: 'packing_slip' | 'invoice' | null;
  settings: BusinessSettings;
  onClose: () => void;
}

export function PrintApparelDocumentModal({
  order,
  docType,
  settings,
  onClose,
}: PrintApparelDocumentModalProps) {
  if (!order || !docType) return null;

  const isPackingSlip = docType === 'packing_slip';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-950/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isPackingSlip ? 'Warehouse Packing Slip' : 'Customer Tax Invoice'}
        className="relative z-10 w-full max-w-md rounded-xl border border-line bg-surface shadow-2xl overflow-hidden text-ink"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3 bg-subtle">
          <span className="text-xs font-semibold text-ink">
            {isPackingSlip ? 'Warehouse Pick & Packing Slip' : 'Customer Tax Invoice'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink hover:bg-accent-hover transition-colors"
            >
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close print preview"
              className="rounded-md p-1 text-ink-muted hover:bg-surface hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div id="printable-document" className="p-6 font-mono text-xs space-y-4 bg-white text-black">
          <div className="text-center border-b border-dashed border-neutral-300 pb-3">
            <p className="text-sm font-bold uppercase tracking-wider">{settings.brandName}</p>
            {!isPackingSlip && <p className="text-[11px] text-neutral-600 mt-0.5">{settings.address}</p>}
            {!isPackingSlip && <p className="text-[11px] text-neutral-600">Tel: {settings.phone}</p>}
            <p className="mt-2 font-bold">
              {isPackingSlip ? '*** WAREHOUSE PACKING SLIP ***' : 'RETAIL TAX INVOICE'}
            </p>
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>Order: {order.orderNumber}</span>
              <span>Type: {order.orderType.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span>Customer: {order.customerName}</span>
              <span>{formatDateTime(order.createdAt)}</span>
            </div>
            {order.deliveryAddress && (
              <p className="text-[11px] text-neutral-700 pt-1">Ship To: {order.deliveryAddress}</p>
            )}
            {!isPackingSlip && (
              <div className="flex justify-between pt-1">
                <span>Payment: {order.paymentMethod}</span>
                <span>Status: {order.paymentStatus}</span>
              </div>
            )}
          </div>

          <div className="border-t border-b border-dashed border-neutral-300 py-3 space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-2">
                <div>
                  <span className="font-bold">{item.quantity}x</span> {item.name}
                  <span className="block text-[10px] text-neutral-600">
                    SKU: {item.sku} · {item.variant}
                  </span>
                </div>
                {!isPackingSlip && (
                  <span className="tabular-nums shrink-0">
                    {formatInr(item.quantity * item.unitPrice)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {isPackingSlip ? (
            <div className="space-y-1 text-[11px]">
              {order.customerInstructions && (
                <p className="font-bold">CUSTOMER NOTE: {order.customerInstructions}</p>
              )}
              {order.staffNotes && <p>QC / PACKING: {order.staffNotes}</p>}
            </div>
          ) : (
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatInr(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST ({settings.gstRatePct}%)</span>
                <span>{formatInr(order.tax)}</span>
              </div>
              {order.shippingFee > 0 && (
                <div className="flex justify-between">
                  <span>Shipping Fee</span>
                  <span>{formatInr(order.shippingFee)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-neutral-300 text-sm font-bold">
                <span>TOTAL</span>
                <span>{formatInr(order.totalAmount)}</span>
              </div>
            </div>
          )}

          <p className="text-center text-[10px] text-neutral-500 pt-2">
            {isPackingSlip
              ? 'Verify garment tags & size labels prior to seal · Kova Studio'
              : 'Thank you for shopping with Kova Studio'}
          </p>
        </div>
      </div>
    </div>
  );
}
