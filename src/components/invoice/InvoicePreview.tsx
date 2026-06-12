import { Modal } from '@/components/ui';
import { useInvoiceStore } from '@/stores/invoiceStore';
import { formatCurrency, formatDate, generateInvoiceNumber } from '@/utils/format';

interface InvoicePreviewProps {
  onClose: () => void;
}

export const InvoicePreview = ({ onClose }: InvoicePreviewProps) => {
  const { draft, calculateTotals } = useInvoiceStore();
  const { subtotal, tax, total } = calculateTotals();
  const invoiceNumber = generateInvoiceNumber();

  return (
    <Modal isOpen={true} onClose={onClose} title="Invoice Preview" size="full">
      <div className="bg-white rounded-lg max-w-2xl mx-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">I</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">Invoicier</span>
              </div>
              <p className="text-gray-600">Your Company Name</p>
              <p className="text-gray-500 text-sm">123 Business Street</p>
              <p className="text-gray-500 text-sm">City, State 12345</p>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h2>
              <p className="text-gray-600">{invoiceNumber}</p>
              <p className="text-gray-500 text-sm mt-4">
                Date: {formatDate(new Date().toISOString())}
              </p>
              {draft.dueDate && (
                <p className="text-gray-500 text-sm">
                  Due: {formatDate(draft.dueDate)}
                </p>
              )}
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Bill To</h3>
            <p className="text-gray-900 font-medium">Client Name</p>
            <p className="text-gray-600 text-sm">client@email.com</p>
          </div>

          {/* Items Table */}
          <table className="w-full mb-8">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="py-3 text-left text-sm font-semibold text-gray-600">Description</th>
                <th className="py-3 text-center text-sm font-semibold text-gray-600">Qty</th>
                <th className="py-3 text-right text-sm font-semibold text-gray-600">Price</th>
                <th className="py-3 text-right text-sm font-semibold text-gray-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {draft.items.length > 0 ? (
                draft.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-4 text-gray-900">{item.description}</td>
                    <td className="py-4 text-center text-gray-600">{item.quantity}</td>
                    <td className="py-4 text-right text-gray-600">
                      {formatCurrency(item.unitPrice, draft.currency)}
                    </td>
                    <td className="py-4 text-right font-medium text-gray-900">
                      {formatCurrency(item.total, draft.currency)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    No items added
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal, draft.currency)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax ({draft.taxRate}%)</span>
                <span>{formatCurrency(tax, draft.currency)}</span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex justify-between text-lg font-bold text-gray-900">
                <span>Total</span>
                <span className="text-primary-500">
                  {formatCurrency(total, draft.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Terms & Notes */}
          {(draft.terms || draft.notes) && (
            <div className="border-t border-gray-100 pt-6 space-y-4">
              {draft.terms && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-1">
                    Terms & Conditions
                  </h4>
                  <p className="text-sm text-gray-500">{draft.terms}</p>
                </div>
              )}
              {draft.notes && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-1">Notes</h4>
                  <p className="text-sm text-gray-500">{draft.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Thank you for your business!
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
