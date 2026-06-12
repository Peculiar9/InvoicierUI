import { createFileRoute, redirect } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';
import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, Badge, Button } from '@/components/ui';
import { useInvoice } from '@/hooks/useInvoices';
import { formatCurrency, formatDate } from '@/utils/format';
import type { InvoiceStatus } from '@/types';

const getStatusVariant = (status: InvoiceStatus) => {
  const variants: Record<InvoiceStatus, 'success' | 'warning' | 'danger' | 'default' | 'info'> = {
    paid: 'success',
    pending: 'warning',
    sent: 'info',
    overdue: 'danger',
    draft: 'default',
    cancelled: 'default',
  };
  return variants[status];
};

const InvoiceDetail = () => {
  const { invoiceId } = Route.useParams();
  const { data: invoice, isLoading } = useInvoice(invoiceId);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  const mockInvoice = {
    id: invoiceId,
    invoiceNumber: `INV-${invoiceId.toUpperCase()}`,
    client: { name: 'Acme Corp', email: 'billing@acme.com' },
    items: [
      { id: '1', description: 'Web Design Services', quantity: 1, unitPrice: 2500, total: 2500 },
      { id: '2', description: 'Development Hours', quantity: 20, unitPrice: 75, total: 1500 },
    ],
    subtotal: 4000,
    tax: 400,
    taxRate: 10,
    total: 4400,
    currency: 'USD',
    status: 'pending' as InvoiceStatus,
    issueDate: '2024-12-01',
    dueDate: '2024-12-31',
    notes: 'Thank you for your business!',
    terms: 'Payment due within 30 days',
  };

  const displayInvoice = invoice || mockInvoice;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Invoice {displayInvoice.invoiceNumber}
            </h1>
            <p className="text-gray-500 mt-1">
              Created on {formatDate(displayInvoice.issueDate)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={getStatusVariant(displayInvoice.status)} size="md">
              {displayInvoice.status.charAt(0).toUpperCase() + displayInvoice.status.slice(1)}
            </Badge>
            <Button variant="outline">Edit</Button>
            <Button>Send Invoice</Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card variant="bordered">
              <CardContent className="p-6">
                <div className="flex justify-between mb-8">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-xl">I</span>
                      </div>
                      <span className="text-2xl font-bold text-gray-900">Invoicier</span>
                    </div>
                    <p className="text-gray-600">Your Company Name</p>
                    <p className="text-gray-500 text-sm">123 Business Street</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h2>
                    <p className="text-gray-600">{displayInvoice.invoiceNumber}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-8">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Bill To</h3>
                    <p className="text-gray-900 font-medium">{displayInvoice.client.name}</p>
                    <p className="text-gray-600 text-sm">{displayInvoice.client.email}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Issue Date</p>
                        <p className="text-gray-900 font-medium">{formatDate(displayInvoice.issueDate)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Due Date</p>
                        <p className="text-gray-900 font-medium">{formatDate(displayInvoice.dueDate)}</p>
                      </div>
                    </div>
                  </div>
                </div>

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
                    {displayInvoice.items.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td className="py-4 text-gray-900">{item.description}</td>
                        <td className="py-4 text-center text-gray-600">{item.quantity}</td>
                        <td className="py-4 text-right text-gray-600">
                          {formatCurrency(item.unitPrice, displayInvoice.currency)}
                        </td>
                        <td className="py-4 text-right font-medium text-gray-900">
                          {formatCurrency(item.total, displayInvoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>{formatCurrency(displayInvoice.subtotal, displayInvoice.currency)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Tax ({displayInvoice.taxRate}%)</span>
                      <span>{formatCurrency(displayInvoice.tax, displayInvoice.currency)}</span>
                    </div>
                    <div className="h-px bg-gray-200" />
                    <div className="flex justify-between text-lg font-bold text-gray-900">
                      <span>Total</span>
                      <span className="text-primary-500">
                        {formatCurrency(displayInvoice.total, displayInvoice.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {(displayInvoice.terms || displayInvoice.notes) && (
                  <div className="border-t border-gray-100 pt-6 mt-6 space-y-4">
                    {displayInvoice.terms && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-600 mb-1">Terms & Conditions</h4>
                        <p className="text-sm text-gray-500">{displayInvoice.terms}</p>
                      </div>
                    )}
                    {displayInvoice.notes && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-600 mb-1">Notes</h4>
                        <p className="text-sm text-gray-500">{displayInvoice.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
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
                  <Button variant="outline" className="w-full justify-start gap-3 text-green-600 hover:bg-green-50">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Mark as Paid
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export const Route = createFileRoute('/invoices/$invoiceId')({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: InvoiceDetail,
});
