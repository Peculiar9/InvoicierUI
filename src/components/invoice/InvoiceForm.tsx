import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Select, Card, CardContent } from '@/components/ui';
import { useInvoiceStore } from '@/stores/invoiceStore';
import { useClients } from '@/hooks/useClients';
import { useCreateInvoice } from '@/hooks/useInvoices';
import { InvoiceItemsTable } from './InvoiceItemsTable';
import { InvoicePreview } from './InvoicePreview';
import { formatCurrency } from '@/utils/format';

const invoiceSchema = z.object({
  clientId: z.string().min(1, 'Please select a client'),
  currency: z.string().min(1, 'Please select a currency'),
  dueDate: z.string().min(1, 'Please select a due date'),
  terms: z.string().optional(),
  notes: z.string().optional(),
  taxRate: z.number().min(0).max(100),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

const currencies = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'NGN', label: 'NGN - Nigerian Naira' },
];

export const InvoiceForm = () => {
  const { draft, calculateTotals, setPreviewOpen, isPreviewOpen } = useInvoiceStore();
  const { data: clientsData, isLoading: clientsLoading } = useClients();
  const { mutate: createInvoice, isPending } = useCreateInvoice();
  const [showPreview, setShowPreview] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      currency: 'USD',
      taxRate: 0,
      terms: 'Payment due within 30 days',
    },
  });

  const { subtotal, tax, total } = calculateTotals();
  const currency = watch('currency');

  const onSubmit = (data: InvoiceFormData) => {
    createInvoice({
      clientId: data.clientId,
      items: draft.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      currency: data.currency,
      dueDate: data.dueDate,
      notes: data.notes,
      terms: data.terms,
      taxRate: data.taxRate,
    });
  };

  const clientOptions =
    clientsData?.data.map((client) => ({
      value: client.id,
      label: client.name,
    })) || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card variant="bordered">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Invoice Details</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Client"
                  options={clientOptions}
                  placeholder={clientsLoading ? 'Loading...' : 'Select a client'}
                  error={errors.clientId?.message}
                  {...register('clientId')}
                />

                <Select
                  label="Currency"
                  options={currencies}
                  error={errors.currency?.message}
                  {...register('currency')}
                />

                <Input
                  label="Due Date"
                  type="date"
                  error={errors.dueDate?.message}
                  {...register('dueDate')}
                />

                <Input
                  label="Tax Rate (%)"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  error={errors.taxRate?.message}
                  {...register('taxRate', { valueAsNumber: true })}
                />
              </div>

              <InvoiceItemsTable currency={currency} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Terms & Conditions
                  </label>
                  <textarea
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    rows={3}
                    placeholder="Payment terms..."
                    {...register('terms')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Notes
                  </label>
                  <textarea
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    rows={3}
                    placeholder="Additional notes..."
                    {...register('notes')}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPreview(true)}
                >
                  Preview
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                >
                  Save Draft
                </Button>
                <Button type="submit" isLoading={isPending}>
                  Create Invoice
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card variant="bordered">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span className="font-medium">{formatCurrency(tax, currency)}</span>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-xl font-bold text-primary-500">
                  {formatCurrency(total, currency)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send Invoice
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Link
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {showPreview && (
        <InvoicePreview onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
};
