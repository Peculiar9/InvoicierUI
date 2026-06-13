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
  firstName: 'Demo',
  lastName: 'User',
  createdAt: '2026-01-01T09:00:00.000Z',
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
      zipCode: '100001',
      country: 'Nigeria',
    },
    createdAt: '2026-01-04T09:00:00.000Z',
  },
  { id: 'cli_2', name: 'Otto Holdings', email: 'mark@otto.com', phone: '08030001122', createdAt: '2026-02-12T09:00:00.000Z' },
  { id: 'cli_3', name: 'Thornton & Co', email: 'jacob@thornton.io', phone: '07060009988', createdAt: '2026-03-02T09:00:00.000Z' },
  { id: 'cli_4', name: 'Bird Studios', email: 'larry@bird.studio', createdAt: '2026-04-18T09:00:00.000Z' },
];

const makeInvoice = (
  id: number,
  clientIndex: number,
  status: InvoiceStatus,
  amount: number,
  issueDate: string,
  dueDate: string
): Invoice => {
  const client = seedClients[clientIndex];
  const taxRate = 0.075;
  const subtotal = Math.round(amount / (1 + taxRate));
  const tax = amount - subtotal;
  return {
    id: `inv_${id}`,
    invoiceNumber: `IV12N3${id}`,
    client,
    items: [
      { id: `item_${id}_1`, description: 'Design & build services', quantity: 1, unitPrice: subtotal, total: subtotal },
    ],
    subtotal,
    tax,
    taxRate,
    total: amount,
    currency: 'USD',
    status,
    issueDate,
    dueDate,
    createdAt: issueDate,
    updatedAt: issueDate,
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
  { id: 'act_1', type: 'invoice_paid', description: 'Otto Holdings paid an invoice', timestamp: '2026-06-11T10:24:00.000Z', invoiceId: 'inv_2' },
  { id: 'act_2', type: 'invoice_created', description: 'Demo User added an invoice', timestamp: '2026-06-10T16:00:00.000Z', invoiceId: 'inv_6' },
  { id: 'act_3', type: 'invoice_sent', description: 'Invoice sent to Shoes Company Resolve', timestamp: '2026-06-09T12:10:00.000Z', invoiceId: 'inv_4' },
  { id: 'act_4', type: 'client_added', description: 'Bird Studios was added as a client', timestamp: '2026-06-08T08:30:00.000Z', clientId: 'cli_4' },
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
  extra: { invoiceId?: string; clientId?: string } = {}
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
  const paid = invoices.filter((i) => i.status === 'paid');
  const totalReceived = paid.reduce((s, i) => s + i.total, 0);
  return {
    totalReceived,
    totalInvoices: invoices.length,
    totalClients: clients.length,
    pendingInvoices: invoices.filter((i) => i.status === 'pending').length,
    overdueInvoices: invoices.filter((i) => i.status === 'overdue').length,
    paidThisMonth: totalReceived,
  };
}

export function computeStatusChart(): ChartData {
  const count = (st: InvoiceStatus) => invoices.filter((i) => i.status === st).length;
  return {
    labels: ['Paid', 'Pending', 'Sent', 'Overdue', 'Draft'],
    datasets: [
      {
        label: 'Invoices by status',
        data: [count('paid'), count('pending'), count('sent'), count('overdue'), count('draft')],
        backgroundColor: ['#0c8d6f', '#c50b68', '#357fff', '#fd5900', '#9e3a8f'],
        borderColor: '#924ee9',
        borderWidth: 1,
      },
    ],
  };
}

export const revenueChart: ChartData = {
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
