import { DashboardLayout } from '@/components/layout';
import { InvoiceForm } from '@/components/invoice';

export const CreateInvoice = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Invoice</h1>
          <p className="text-gray-500 mt-1">Fill in the details to create a new invoice</p>
        </div>
        <InvoiceForm />
      </div>
    </DashboardLayout>
  );
};
