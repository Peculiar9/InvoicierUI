import { useState } from 'react';
import { Button, Input } from '@/components/ui';
import { useInvoiceStore } from '@/stores/invoiceStore';
import { formatCurrency } from '@/utils/format';

interface InvoiceItemsTableProps {
  currency: string;
}

export const InvoiceItemsTable = ({ currency }: InvoiceItemsTableProps) => {
  const { draft, addItem, updateItem, removeItem } = useInvoiceStore();
  const [newItem, setNewItem] = useState({
    description: '',
    quantity: 1,
    unitPrice: 0,
  });

  const handleAddItem = () => {
    if (newItem.description && newItem.unitPrice > 0) {
      addItem(newItem);
      setNewItem({ description: '', quantity: 1, unitPrice: 0 });
    }
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Invoice Items</h3>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Description
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                Qty
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">
                Price
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">
                Total
              </th>
              <th className="px-4 py-3 w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {draft.items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(item.id, { description: e.target.value })
                    }
                    className="w-full bg-transparent border-0 focus:ring-0 text-sm text-gray-900"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })
                    }
                    className="w-full text-center bg-transparent border-0 focus:ring-0 text-sm text-gray-900"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full text-right bg-transparent border-0 focus:ring-0 text-sm text-gray-900"
                  />
                </td>
                <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                  {formatCurrency(item.total, currency)}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50/50">
              <td className="px-4 py-3">
                <Input
                  placeholder="Item description"
                  value={newItem.description}
                  onChange={(e) =>
                    setNewItem({ ...newItem, description: e.target.value })
                  }
                  className="text-sm"
                />
              </td>
              <td className="px-4 py-3">
                <Input
                  type="number"
                  min="1"
                  value={newItem.quantity}
                  onChange={(e) =>
                    setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })
                  }
                  className="text-sm text-center"
                />
              </td>
              <td className="px-4 py-3">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={newItem.unitPrice || ''}
                  onChange={(e) =>
                    setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })
                  }
                  className="text-sm text-right"
                />
              </td>
              <td className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                {formatCurrency(newItem.quantity * newItem.unitPrice, currency)}
              </td>
              <td className="px-4 py-3">
                <Button
                  size="sm"
                  onClick={handleAddItem}
                  disabled={!newItem.description || newItem.unitPrice <= 0}
                >
                  Add
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {draft.items.length === 0 && (
        <p className="text-center text-gray-500 text-sm mt-4">
          No items added yet. Add your first item above.
        </p>
      )}
    </div>
  );
};
