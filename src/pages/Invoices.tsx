import { DashboardLayout } from '@/components/layout';
import { InvoiceList } from '@/components/invoice';

export const Invoices = () => {
  return (
    <DashboardLayout>
      <InvoiceList />
    </DashboardLayout>
  );
};
