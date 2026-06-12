import { Link } from '@tanstack/react-router';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
} from '@/components/ui';
import { formatCurrency, formatDate } from '@/utils/format';
import type { Invoice, InvoiceStatus } from '@/types';

interface RecentInvoicesProps {
  invoices?: Invoice[];
  isLoading?: boolean;
}

const mockInvoices: Partial<Invoice>[] = [
  {
    id: '1',
    invoiceNumber: 'INV-2024-001',
    client: { id: '1', name: 'Acme Corp', email: 'billing@acme.com', createdAt: '' },
    total: 2500,
    currency: 'USD',
    status: 'paid',
    dueDate: '2024-12-15',
  },
  {
    id: '2',
    invoiceNumber: 'INV-2024-002',
    client: { id: '2', name: 'TechStart Inc', email: 'finance@techstart.io', createdAt: '' },
    total: 4800,
    currency: 'USD',
    status: 'pending',
    dueDate: '2024-12-20',
  },
  {
    id: '3',
    invoiceNumber: 'INV-2024-003',
    client: { id: '3', name: 'Design Studio', email: 'accounts@designstudio.com', createdAt: '' },
    total: 1200,
    currency: 'USD',
    status: 'overdue',
    dueDate: '2024-12-01',
  },
  {
    id: '4',
    invoiceNumber: 'INV-2024-004',
    client: { id: '4', name: 'Marketing Pro', email: 'billing@marketingpro.net', createdAt: '' },
    total: 3500,
    currency: 'USD',
    status: 'draft',
    dueDate: '2024-12-25',
  },
];

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

export const RecentInvoices = ({ invoices, isLoading }: RecentInvoicesProps) => {
  const displayInvoices = invoices || (mockInvoices as Invoice[]);

  if (isLoading) {
    return (
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="bordered">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Invoices</CardTitle>
        <Link
          to="/invoices"
          className="text-sm font-medium text-primary-500 hover:text-primary-600"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayInvoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>
                  <Link
                    to="/invoices/$invoiceId"
                    params={{ invoiceId: invoice.id }}
                    className="font-medium text-gray-900 hover:text-primary-500"
                  >
                    {invoice.invoiceNumber}
                  </Link>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-gray-900">{invoice.client.name}</p>
                    <p className="text-sm text-gray-500">{invoice.client.email}</p>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(invoice.total, invoice.currency)}
                </TableCell>
                <TableCell className="text-gray-600">
                  {formatDate(invoice.dueDate)}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(invoice.status)}>
                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
