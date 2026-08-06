import { isPaid } from '@/utils/invoiceStatus';
import type {
  Activity,
  ChartData,
  Client,
  DashboardStats,
  Invoice,
  InvoiceStatus,
  User,
} from '@/types';

export const mockUser: User = {
  id: 'usr_1',
  email: 'demo@invoicier.app',
  username: 'demo',
  email_verified: true,
  first_name: 'Demo',
  last_name: 'User',
  created_at: '2026-01-01T09:00:00.000Z',
};

const seedClients: Client[] = [
  {
    id: 'cli_1',
    name: 'Shoes Company Resolve',
    email: 'accounts@resolve.co',
    phone: '08120822334',
    address: {
      street: 'No 1 This is the actual address',
      city: 'Lagos',
      state: 'LA',
      zip_code: '100001',
      country: 'Nigeria',
    },
    created_at: '2026-01-04T09:00:00.000Z',
  },
  { id: 'cli_2', name: 'Otto Holdings', email: 'mark@otto.com', phone: '08030001122', created_at: '2026-02-12T09:00:00.000Z' },
  { id: 'cli_3', name: 'Thornton & Co', email: 'jacob@thornton.io', phone: '07060009988', created_at: '2026-03-02T09:00:00.000Z' },
  { id: 'cli_4', name: 'Bird Studios', email: 'larry@bird.studio', created_at: '2026-04-18T09:00:00.000Z' },
];

const makeInvoice = (
  id: number,
  clientIndex: number,
  status: InvoiceStatus,
  amount: number,
  issue_date: string,
  due_date: string
): Invoice => {
  const client = seedClients[clientIndex];
  const tax_rate = 0.075;
  const subtotal = Math.round(amount / (1 + tax_rate));
  const tax = amount - subtotal;
  return {
    id: `inv_${id}`,
    invoice_number: `IV12N3${id}`,
    client,
    items: [
      { id: `item_${id}_1`, description: 'Design & build services', quantity: 1, unit_price: subtotal, total: subtotal },
    ],
    subtotal,
    tax,
    tax_rate,
    total: amount,
    currency: 'USD',
    status,
    issue_date,
    due_date,
    created_at: issue_date,
    updated_at: issue_date,
  };
};

const seedInvoices: Invoice[] = [
  makeInvoice(1, 1, 'paid', 13009, '2026-05-02T09:00:00.000Z', '2026-05-16T09:00:00.000Z'),
  makeInvoice(2, 2, 'paid', 8420, '2026-05-08T09:00:00.000Z', '2026-05-22T09:00:00.000Z'),
  makeInvoice(3, 3, 'pending', 3093, '2026-05-20T09:00:00.000Z', '2026-06-03T09:00:00.000Z'),
  makeInvoice(4, 0, 'sent', 5400, '2026-05-28T09:00:00.000Z', '2026-06-11T09:00:00.000Z'),
  makeInvoice(5, 1, 'overdue', 2100, '2026-04-10T09:00:00.000Z', '2026-04-24T09:00:00.000Z'),
  makeInvoice(6, 3, 'draft', 980, '2026-06-05T09:00:00.000Z', '2026-06-19T09:00:00.000Z'),
];

const seedActivities: Activity[] = [
  { id: 'act_1', type: 'invoice_paid', description: 'Otto Holdings paid an invoice', timestamp: '2026-06-11T10:24:00.000Z', invoice_id: 'inv_2' },
  { id: 'act_2', type: 'invoice_created', description: 'Demo User added an invoice', timestamp: '2026-06-10T16:00:00.000Z', invoice_id: 'inv_6' },
  { id: 'act_3', type: 'invoice_sent', description: 'Invoice sent to Shoes Company Resolve', timestamp: '2026-06-09T12:10:00.000Z', invoice_id: 'inv_4' },
  { id: 'act_4', type: 'client_added', description: 'Bird Studios was added as a client', timestamp: '2026-06-08T08:30:00.000Z', client_id: 'cli_4' },
];

/* ---- localStorage-backed persistence (client-side "database") ---- */
const DB_KEY = 'invoicier-db';

interface Db {
  invoices: Invoice[];
  clients: Client[];
  activities: Activity[];
}

function loadDb(): Db | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Db>;
    if (!Array.isArray(parsed.invoices) || !Array.isArray(parsed.clients)) return null;
    return {
      invoices: parsed.invoices,
      clients: parsed.clients,
      activities: Array.isArray(parsed.activities) ? parsed.activities : [],
    };
  } catch {
    return null;
  }
}

const initial = loadDb();

export const clients: Client[] = initial?.clients ?? seedClients;
export const invoices: Invoice[] = initial?.invoices ?? seedInvoices;
export const activities: Activity[] = initial?.activities ?? seedActivities;

export function saveDb() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DB_KEY, JSON.stringify({ invoices, clients, activities }));
    }
  } catch {
    /* storage full / unavailable — ignore */
  }
}

export function logActivity(
  type: Activity['type'],
  description: string,
  extra: { invoice_id?: string; client_id?: string } = {}
) {
  activities.unshift({
    id: `act_${activities.length + 1}_${Math.floor(Math.random() * 1e6)}`,
    type,
    description,
    timestamp: new Date().toISOString(),
    ...extra,
  });
}

/* ---- live-computed dashboard figures ---- */
export function computeStats(): DashboardStats {
  const paid = invoices.filter((i) => isPaid(i.status));
  const total_received = paid.reduce((s, i) => s + (i.amount_received ?? i.total), 0);
  return {
    total_received,
    total_invoices: invoices.length,
    total_clients: clients.length,
    pending_invoices: invoices.filter((i) => i.status === 'pending').length,
    overdue_invoices: invoices.filter((i) => i.status === 'overdue').length,
    paid_this_month: total_received,
    tax_ready_paid: paid.filter((i) => i.date_received).length,
    paid_count: paid.length,
  };
}

export function computeStatusChart(): ChartData {
  const count = (st: InvoiceStatus) => invoices.filter((i) => i.status === st).length;
  // every live status needs a bucket, or the chart quietly under-reports
  return {
    labels: ['Paid', 'Viewed', 'Sent', 'Pending', 'Overdue', 'Draft'],
    datasets: [
      {
        label: 'Invoices by status',
        data: [
          invoices.filter((i) => isPaid(i.status)).length,
          count('viewed'),
          count('sent'),
          count('pending'),
          count('overdue'),
          count('draft'),
        ],
        backgroundColor: ['#0c8d6f', '#ff5a5f', '#357fff', '#e0a008', '#ef5d54', '#9b99ab'],
        borderColor: '#924ee9',
        borderWidth: 1,
      },
    ],
  };
}

export const revenue_chart: ChartData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      label: 'Revenue',
      data: [4200, 6100, 5400, 7300, 9800, 11200],
      backgroundColor: '#914ee973',
      borderColor: '#924ee9',
      borderWidth: 1,
    },
  ],
};
