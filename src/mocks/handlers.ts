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
    // the verification email goes out in the background right here, so it
    // lands while onboarding runs
    return ok({ user: { ...mockUser, ...body, emailVerified: false }, token });
  }),
  http.post('*/api/auth/logout', () => new HttpResponse(null, { status: 200 })),
  http.get('*/api/auth/profile', () => ok(mockUser)),
  http.patch('*/api/auth/profile', async ({ request }) => {
    const updates = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return ok({ ...mockUser, ...updates });
  }),
  http.post('*/api/auth/forgot-password', () => new HttpResponse(null, { status: 200 })),
  http.post('*/api/auth/resend-verification', () => new HttpResponse(null, { status: 200 })),
  http.post('*/api/auth/verify-email', () => ok({ verified: true }, 'Email verified')),
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
    const now = new Date().toISOString();
    // A recipient does not have to exist in the address book. An empty id
    // marks someone who has not been saved as a client yet.
    const client =
      clients.find((c) => c.id === body.clientId) ??
      ({
        id: '',
        name: (body.recipientName as string)?.trim() || 'Unnamed recipient',
        email: (body.recipientEmail as string)?.trim() || '',
        createdAt: now,
      } as Client);
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
      vatEnabled: Boolean(body.vatEnabled),
      whtExpected: Boolean(body.whtExpected),
      paymentRoute: body.paymentRoute as Invoice['paymentRoute'],
      receivingAccountId: body.receivingAccountId as string | undefined,
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
    } else if (
      typeof body.recipientName === 'string' ||
      typeof body.recipientEmail === 'string'
    ) {
      invoice.client = {
        ...invoice.client,
        id: '',
        name: (body.recipientName as string)?.trim() || invoice.client.name,
        email: (body.recipientEmail as string)?.trim() ?? invoice.client.email,
      };
    }
    if (typeof body.currency === 'string') invoice.currency = body.currency;
    if (typeof body.dueDate === 'string') invoice.dueDate = body.dueDate;
    if (typeof body.notes === 'string') invoice.notes = body.notes;
    if (typeof body.terms === 'string') invoice.terms = body.terms;
    if (body.status) invoice.status = body.status as Invoice['status'];
    if (typeof body.taxRate === 'number') invoice.taxRate = body.taxRate;
    if (typeof body.vatEnabled === 'boolean') invoice.vatEnabled = body.vatEnabled;
    if (typeof body.whtExpected === 'boolean') invoice.whtExpected = body.whtExpected;
    if (typeof body.paymentRoute === 'string') {
      invoice.paymentRoute = body.paymentRoute as Invoice['paymentRoute'];
    }
    if (typeof body.receivingAccountId === 'string') {
      invoice.receivingAccountId = body.receivingAccountId;
    }

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
  /**
   * Put a record back exactly as it was. Undo needs the original, not a
   * fresh copy: an invoice that comes back with a new number is a new
   * invoice, and this product's whole claim is that the record holds.
   */
  http.post('*/api/invoices/:id/restore', async ({ params, request }) => {
    const previous = (await request.json()) as Invoice;
    const idx = invoices.findIndex((i) => i.id === params.id);
    if (idx >= 0) invoices[idx] = previous;
    else invoices.unshift(previous);
    saveDb();
    return HttpResponse.json({ success: true, data: previous });
  }),
  http.post('*/api/invoices/:id/send', async ({ params, request }) => {
    const invoice = invoices.find((i) => i.id === params.id);
    if (invoice) {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const channel = (body?.channel as string) ?? 'email';
      // every delivery is logged, so "we never got it" has an answer
      invoice.sends = [
        ...(invoice.sends ?? []),
        {
          channel: channel as 'email' | 'mailto' | 'link' | 'whatsapp',
          at: new Date().toISOString(),
          to: (body?.to as string) ?? invoice.client?.email,
        },
      ];
      // a resend must not walk the status backwards from viewed or paid
      if (invoice.status === 'draft' || invoice.status === 'pending') {
        invoice.status = 'sent';
      }
      invoice.updatedAt = new Date().toISOString();
      logActivity('invoice_sent', `Invoice sent to ${invoice.client?.name ?? 'client'}`, {
        invoiceId: invoice.id,
      });
      saveDb();
    }
    return ok(invoice as Invoice, 'Invoice sent');
  }),

  // the payer says they transferred the money. This is a claim, not a
  // payment: it never touches the ledger, because only the account holder
  // can see whether it actually arrived.
  http.post('*/api/invoices/:id/payment-claimed', async ({ params, request }) => {
    const invoice = invoices.find((i) => i.id === params.id);
    if (!invoice) return HttpResponse.json({ success: false }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const settled = ['paid', 'receipted', 'cancelled'];
    if (!settled.includes(invoice.status)) {
      invoice.status = 'awaiting';
      invoice.claimedAt = new Date().toISOString();
      invoice.claimReference = (body?.reference as string)?.trim() || undefined;
      invoice.declinedAt = undefined;
      invoice.declineReason = undefined;
      invoice.claimNote = (body?.note as string)?.trim() || undefined;
      if (typeof body?.payerEmail === 'string') invoice.payerEmail = body.payerEmail.trim();
      invoice.updatedAt = new Date().toISOString();
      logActivity(
        'invoice_claimed',
        `${invoice.client?.name ?? 'A client'} says they sent payment`,
        { invoiceId: invoice.id }
      );
      saveDb();
    }
    return ok(invoice as Invoice, 'Transfer reported');
  }),

  // the sender looked and could not find the money. The payer needs to know,
  // so the reason travels back to the payment page.
  http.post('*/api/invoices/:id/decline-claim', async ({ params, request }) => {
    const invoice = invoices.find((i) => i.id === params.id);
    if (!invoice) return HttpResponse.json({ success: false }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    invoice.status = invoice.viewedAt ? 'viewed' : 'sent';
    invoice.declinedAt = new Date().toISOString();
    invoice.declineReason = (body?.reason as string)?.trim() || undefined;
    invoice.claimedAt = undefined;
    invoice.claimReference = undefined;
    invoice.updatedAt = new Date().toISOString();
    saveDb();
    return ok(invoice as Invoice, 'Claim declined');
  }),

  // voiding keeps the record and the number; deleting would erase both
  http.post('*/api/invoices/:id/void', async ({ params, request }) => {
    const invoice = invoices.find((i) => i.id === params.id);
    if (!invoice) return HttpResponse.json({ success: false }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    invoice.status = 'cancelled';
    invoice.voidedAt = new Date().toISOString();
    invoice.voidReason = (body?.reason as string)?.trim() || undefined;
    invoice.updatedAt = new Date().toISOString();
    saveDb();
    return ok(invoice as Invoice, 'Invoice voided');
  }),

  // the client opened the payment link: first open wins, and it never
  // overwrites a payment that already happened
  http.post('*/api/invoices/:id/viewed', ({ params }) => {
    const invoice = invoices.find((i) => i.id === params.id);
    if (invoice) {
      const settled = ['paid', 'receipted', 'cancelled'];
      if (!invoice.viewedAt) {
        invoice.viewedAt = new Date().toISOString();
        logActivity('invoice_viewed', `${invoice.client?.name ?? 'Client'} opened an invoice`, {
          invoiceId: invoice.id,
        });
      }
      if (!settled.includes(invoice.status)) invoice.status = 'viewed';
      saveDb();
    }
    return ok(invoice as Invoice, 'View recorded');
  }),
  http.post('*/api/invoices/:id/mark-paid', async ({ params, request }) => {
    const invoice = invoices.find((i) => i.id === params.id);
    if (invoice) {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      // Cash basis: the ledger row is written at the payment event, keyed on
      // the date the money actually landed.
      invoice.dateReceived =
        typeof body?.dateReceived === 'string' ? body.dateReceived : new Date().toISOString();
      invoice.amountReceived =
        typeof body?.amountReceived === 'number' ? body.amountReceived : invoice.total;
      if (typeof body?.whtWithheld === 'number' && body.whtWithheld > 0) {
        invoice.whtWithheld = body.whtWithheld;
      }
      if (typeof body?.paymentMethod === 'string') invoice.paymentMethod = body.paymentMethod;
      if (typeof body?.payerEmail === 'string') invoice.payerEmail = body.payerEmail;
      // the receipt is its own document with its own identity
      if (!invoice.receiptNumber) {
        invoice.receiptNumber = `RCT-${invoice.invoiceNumber.replace(/^IV/i, '')}`;
        invoice.receiptedAt = new Date().toISOString();
      }
      invoice.status = 'receipted';
      invoice.updatedAt = new Date().toISOString();
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
