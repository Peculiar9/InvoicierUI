import { http, HttpResponse } from 'msw';
import type { Client, Invoice } from '@/types';
import {
  activities,
  clients,
  computeStats,
  computeStatusChart,
  invoices,
  logActivity,
  mockUser,
  revenueChart,
  saveDb,
} from './data';

/** Wrap a payload in the app's ApiResponse envelope. */
const ok = <T>(data: T, message = 'OK') =>
  HttpResponse.json({ data, message, success: true });

const paginate = <T>(items: T[], page = 1, limit = 20) => ({
  data: items.slice((page - 1) * limit, page * limit),
  total: items.length,
  page,
  limit,
  totalPages: Math.max(1, Math.ceil(items.length / limit)),
});

const token = 'mock-jwt-token';

export const handlers = [
  // ---- auth ----
  http.post('*/api/auth/login', () => ok({ user: mockUser, token })),
  http.post('*/api/auth/signup', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Partial<typeof mockUser>;
    return ok({ user: { ...mockUser, ...body }, token });
  }),
  http.post('*/api/auth/logout', () => new HttpResponse(null, { status: 200 })),
  http.get('*/api/auth/profile', () => ok(mockUser)),
  http.patch('*/api/auth/profile', async ({ request }) => {
    const updates = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return ok({ ...mockUser, ...updates });
  }),
  http.post('*/api/auth/forgot-password', () => new HttpResponse(null, { status: 200 })),
  http.post('*/api/auth/reset-password', () => new HttpResponse(null, { status: 200 })),

  // ---- dashboard (computed live from the local DB) ----
  http.get('*/api/dashboard/stats', () => ok(computeStats())),
  http.get('*/api/dashboard/charts/:type', ({ params }) =>
    ok(params.type === 'status' ? computeStatusChart() : revenueChart)
  ),
  http.get('*/api/dashboard/recent-invoices', ({ request }) => {
    const limit = Number(new URL(request.url).searchParams.get('limit')) || 5;
    return ok(invoices.slice(0, limit));
  }),
  http.get('*/api/dashboard/activities', ({ request }) => {
    const limit = Number(new URL(request.url).searchParams.get('limit')) || 5;
    return ok(activities.slice(0, limit));
  }),
  http.get('*/api/dashboard', () =>
    ok({
      stats: computeStats(),
      revenueChart,
      invoiceStatusChart: computeStatusChart(),
      recentInvoices: invoices.slice(0, 5),
      recentActivities: activities.slice(0, 5),
    })
  ),

  // ---- invoices ----
  http.get('*/api/invoices', ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const page = Number(url.searchParams.get('page')) || 1;
    const limit = Number(url.searchParams.get('limit')) || 100;
    const filtered = status ? invoices.filter((i) => i.status === status) : invoices;
    return ok(paginate(filtered, page, limit));
  }),
  http.get('*/api/invoices/:id', ({ params }) => {
    const invoice = invoices.find((i) => i.id === params.id);
    return invoice
      ? ok(invoice)
      : HttpResponse.json({ message: 'Not found', success: false }, { status: 404 });
  }),
  http.post('*/api/invoices', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const client = clients.find((c) => c.id === body.clientId) ?? clients[0];
    const now = new Date().toISOString();
    const taxRate = (body.taxRate as number) ?? 0;
    const rawItems = (body.items as Array<Record<string, unknown>>) ?? [];
    const seq = invoices.length + 1;
    const items = rawItems.map((it, idx) => {
      const quantity = Number(it.quantity) || 0;
      const unitPrice = Number(it.unitPrice) || 0;
      return {
        id: `item_${seq}_${idx}`,
        description: String(it.description ?? ''),
        quantity,
        unitPrice,
        total: quantity * unitPrice,
      };
    });
    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const tax = subtotal * taxRate;
    const invoice: Invoice = {
      id: `inv_${seq}_${Math.floor(Math.random() * 1e4)}`,
      invoiceNumber: `IV${1000 + seq}`,
      client,
      items,
      subtotal,
      tax,
      taxRate,
      total: subtotal + tax,
      currency: (body.currency as string) ?? 'USD',
      status: 'draft',
      issueDate: now,
      dueDate: (body.dueDate as string) ?? now,
      notes: body.notes as string | undefined,
      terms: body.terms as string | undefined,
      createdAt: now,
      updatedAt: now,
    };
    invoices.unshift(invoice);
    logActivity('invoice_created', `Invoice for ${client?.name ?? 'client'} created`, {
      invoiceId: invoice.id,
    });
    saveDb();
    return ok(invoice, 'Invoice created');
  }),
  http.patch('*/api/invoices/:id', async ({ params, request }) => {
    const invoice = invoices.find((i) => i.id === params.id);
    if (!invoice) return HttpResponse.json({ success: false }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    if (body.clientId) {
      invoice.client = clients.find((c) => c.id === body.clientId) ?? invoice.client;
    }
    if (typeof body.currency === 'string') invoice.currency = body.currency;
    if (typeof body.dueDate === 'string') invoice.dueDate = body.dueDate;
    if (typeof body.notes === 'string') invoice.notes = body.notes;
    if (typeof body.terms === 'string') invoice.terms = body.terms;
    if (body.status) invoice.status = body.status as Invoice['status'];
    if (typeof body.taxRate === 'number') invoice.taxRate = body.taxRate;

    if (Array.isArray(body.items)) {
      invoice.items = (body.items as Array<Record<string, unknown>>).map((it, idx) => {
        const quantity = Number(it.quantity) || 0;
        const unitPrice = Number(it.unitPrice) || 0;
        return {
          id: `item_${invoice.id}_${idx}`,
          description: String(it.description ?? ''),
          quantity,
          unitPrice,
          total: quantity * unitPrice,
        };
      });
    }
    invoice.subtotal = invoice.items.reduce((s, i) => s + i.total, 0);
    invoice.tax = invoice.subtotal * invoice.taxRate;
    invoice.total = invoice.subtotal + invoice.tax;
    invoice.updatedAt = new Date().toISOString();
    saveDb();

    return ok(invoice, 'Invoice updated');
  }),
  http.delete('*/api/invoices/:id', ({ params }) => {
    const idx = invoices.findIndex((i) => i.id === params.id);
    if (idx >= 0) invoices.splice(idx, 1);
    saveDb();
    return new HttpResponse(null, { status: 200 });
  }),
  http.post('*/api/invoices/:id/send', ({ params }) => {
    const invoice = invoices.find((i) => i.id === params.id);
    if (invoice) {
      invoice.status = 'sent';
      logActivity('invoice_sent', `Invoice sent to ${invoice.client?.name ?? 'client'}`, {
        invoiceId: invoice.id,
      });
      saveDb();
    }
    return ok(invoice as Invoice, 'Invoice sent');
  }),
  http.post('*/api/invoices/:id/mark-paid', ({ params }) => {
    const invoice = invoices.find((i) => i.id === params.id);
    if (invoice) {
      invoice.status = 'paid';
      logActivity('invoice_paid', `${invoice.client?.name ?? 'Client'} paid an invoice`, {
        invoiceId: invoice.id,
      });
      saveDb();
    }
    return ok(invoice as Invoice, 'Invoice marked paid');
  }),
  http.post('*/api/invoices/:id/duplicate', ({ params }) => {
    const source = invoices.find((i) => i.id === params.id);
    if (!source) return HttpResponse.json({ success: false }, { status: 404 });
    const seq = invoices.length + 1;
    const copy: Invoice = {
      ...source,
      id: `inv_${seq}_${Math.floor(Math.random() * 1e4)}`,
      invoiceNumber: `IV${1000 + seq}`,
      status: 'draft',
    };
    invoices.unshift(copy);
    saveDb();
    return ok(copy, 'Invoice duplicated');
  }),
  http.get('*/api/invoices/:id/share-link', ({ params }) =>
    ok({ link: `https://pay.invoicier.app/i/${params.id}` })
  ),

  // ---- clients ----
  http.get('*/api/clients', ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase();
    const page = Number(url.searchParams.get('page')) || 1;
    const limit = Number(url.searchParams.get('limit')) || 100;
    const filtered = search
      ? clients.filter((c) => c.name.toLowerCase().includes(search))
      : clients;
    return ok(paginate(filtered, page, limit));
  }),
  http.get('*/api/clients/:id', ({ params }) => {
    const client = clients.find((c) => c.id === params.id);
    return client
      ? ok(client)
      : HttpResponse.json({ message: 'Not found', success: false }, { status: 404 });
  }),
  http.post('*/api/clients', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Partial<Client>;
    const client: Client = {
      id: `cli_${clients.length + 1}_${Math.floor(Math.random() * 1e4)}`,
      name: body.name ?? 'New Client',
      email: body.email ?? '',
      phone: body.phone,
      address: body.address,
      createdAt: new Date().toISOString(),
    };
    clients.push(client);
    logActivity('client_added', `${client.name} was added as a client`, { clientId: client.id });
    saveDb();
    return ok(client, 'Client created');
  }),
];
