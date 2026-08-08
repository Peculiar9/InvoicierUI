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
  demoBusinessProfile,
  revenue_chart,
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
  total_pages: Math.max(1, Math.ceil(items.length / limit)),
});

const token = 'mock-jwt-token';

export const handlers = [
  // ---- auth ----
  http.post('*/api/auth/login', () => ok({ user: mockUser, token })),

  /* ---- the business profile, which is also the onboarding record ---- */
  http.get('*/api/business-profile', () => ok(demoBusinessProfile)),
  http.patch('*/api/business-profile', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    Object.assign(demoBusinessProfile, body, { updated_at: new Date().toISOString() });
    saveDb();
    return ok(demoBusinessProfile);
  }),
  http.post('*/api/auth/register', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Partial<typeof mockUser>;
    // the verification email goes out in the background right here, so it
    // lands while onboarding runs
    return ok({ user: { ...mockUser, ...body, email_verified: false }, token });
  }),
  http.post('*/api/auth/logout', () => new HttpResponse(null, { status: 200 })),
  http.get('*/api/auth/me', () => ok(mockUser)),
  http.patch('*/api/auth/me', async ({ request }) => {
    const updates = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return ok({ ...mockUser, ...updates });
  }),
  http.post('*/api/auth/forgot-password', () => new HttpResponse(null, { status: 200 })),
  http.post('*/api/auth/resend-email-verification', () => new HttpResponse(null, { status: 200 })),
  http.post('*/api/auth/verify-email', () => ok({ verified: true }, 'Email verified')),
  http.post('*/api/auth/reset-password', () => new HttpResponse(null, { status: 200 })),

  // ---- dashboard (computed live from the local DB) ----
  http.get('*/api/dashboard/stats', () => ok(computeStats())),
  http.get('*/api/dashboard/charts/:type', ({ params }) =>
    ok(params.type === 'status' ? computeStatusChart() : revenue_chart)
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
      revenue_chart,
      invoice_status_chart: computeStatusChart(),
      recent_invoices: invoices.slice(0, 5),
      recent_activities: activities.slice(0, 5),
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
      clients.find((c) => c.id === body.client_id) ??
      ({
        id: '',
        name: (body.recipient_name as string)?.trim() || 'Unnamed recipient',
        email: (body.recipient_email as string)?.trim() || '',
        created_at: now,
      } as Client);
    const tax_rate = (body.tax_rate as number) ?? 0;
    const rawItems = (body.items as Array<Record<string, unknown>>) ?? [];
    const seq = invoices.length + 1;
    const items = rawItems.map((it, idx) => {
      const quantity = Number(it.quantity) || 0;
      const unit_price = Number(it.unit_price) || 0;
      return {
        id: `item_${seq}_${idx}`,
        description: String(it.description ?? ''),
        quantity,
        unit_price,
        total: quantity * unit_price,
      };
    });
    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const tax = subtotal * tax_rate;
    const invoice: Invoice = {
      id: `inv_${seq}_${Math.floor(Math.random() * 1e4)}`,
      invoice_number: `IV${1000 + seq}`,
      client,
      items,
      subtotal,
      tax,
      tax_rate,
      total: subtotal + tax,
      currency: (body.currency as string) ?? 'USD',
      status: 'draft',
      issue_date: now,
      due_date: (body.due_date as string) ?? now,
      notes: body.notes as string | undefined,
      terms: body.terms as string | undefined,
      vat_enabled: Boolean(body.vat_enabled),
      wht_expected: Boolean(body.wht_expected),
      payment_route: body.payment_route as Invoice['payment_route'],
      receiving_account_id: body.receiving_account_id as string | undefined,
      created_at: now,
      updated_at: now,
    };
    invoices.unshift(invoice);
    logActivity('invoice_created', `Invoice for ${client?.name ?? 'client'} created`, {
      invoice_id: invoice.id,
    });
    saveDb();
    return ok(invoice, 'Invoice created');
  }),
  http.patch('*/api/invoices/:id', async ({ params, request }) => {
    const invoice = invoices.find((i) => i.id === params.id);
    if (!invoice) return HttpResponse.json({ success: false }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    if (body.client_id) {
      invoice.client = clients.find((c) => c.id === body.client_id) ?? invoice.client;
    } else if (
      typeof body.recipient_name === 'string' ||
      typeof body.recipient_email === 'string'
    ) {
      invoice.client = {
        ...invoice.client,
        id: '',
        name: (body.recipient_name as string)?.trim() || invoice.client.name,
        email: (body.recipient_email as string)?.trim() ?? invoice.client.email,
      };
    }
    if (typeof body.currency === 'string') invoice.currency = body.currency;
    if (typeof body.due_date === 'string') invoice.due_date = body.due_date;
    if (typeof body.notes === 'string') invoice.notes = body.notes;
    if (typeof body.terms === 'string') invoice.terms = body.terms;
    if (body.status) invoice.status = body.status as Invoice['status'];
    if (typeof body.tax_rate === 'number') invoice.tax_rate = body.tax_rate;
    if (typeof body.vat_enabled === 'boolean') invoice.vat_enabled = body.vat_enabled;
    if (typeof body.wht_expected === 'boolean') invoice.wht_expected = body.wht_expected;
    if (typeof body.payment_route === 'string') {
      invoice.payment_route = body.payment_route as Invoice['payment_route'];
    }
    if (typeof body.receiving_account_id === 'string') {
      invoice.receiving_account_id = body.receiving_account_id;
    }

    if (Array.isArray(body.items)) {
      invoice.items = (body.items as Array<Record<string, unknown>>).map((it, idx) => {
        const quantity = Number(it.quantity) || 0;
        const unit_price = Number(it.unit_price) || 0;
        return {
          id: `item_${invoice.id}_${idx}`,
          description: String(it.description ?? ''),
          quantity,
          unit_price,
          total: quantity * unit_price,
        };
      });
    }
    invoice.subtotal = invoice.items.reduce((s, i) => s + i.total, 0);
    invoice.tax = invoice.subtotal * invoice.tax_rate;
    invoice.total = invoice.subtotal + invoice.tax;
    invoice.updated_at = new Date().toISOString();
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
      invoice.updated_at = new Date().toISOString();
      logActivity('invoice_sent', `Invoice sent to ${invoice.client?.name ?? 'client'}`, {
        invoice_id: invoice.id,
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
      invoice.claimed_at = new Date().toISOString();
      invoice.claim_reference = (body?.reference as string)?.trim() || undefined;
      invoice.declined_at = undefined;
      invoice.decline_reason = undefined;
      invoice.claim_note = (body?.note as string)?.trim() || undefined;
      if (typeof body?.payer_email === 'string') invoice.payer_email = body.payer_email.trim();
      invoice.updated_at = new Date().toISOString();
      logActivity(
        'invoice_claimed',
        `${invoice.client?.name ?? 'A client'} says they sent payment`,
        { invoice_id: invoice.id }
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
    invoice.status = invoice.viewed_at ? 'viewed' : 'sent';
    invoice.declined_at = new Date().toISOString();
    invoice.decline_reason = (body?.reason as string)?.trim() || undefined;
    invoice.claimed_at = undefined;
    invoice.claim_reference = undefined;
    invoice.updated_at = new Date().toISOString();
    saveDb();
    return ok(invoice as Invoice, 'Claim declined');
  }),

  // voiding keeps the record and the number; deleting would erase both
  http.post('*/api/invoices/:id/void', async ({ params, request }) => {
    const invoice = invoices.find((i) => i.id === params.id);
    if (!invoice) return HttpResponse.json({ success: false }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    invoice.status = 'cancelled';
    invoice.voided_at = new Date().toISOString();
    invoice.void_reason = (body?.reason as string)?.trim() || undefined;
    invoice.updated_at = new Date().toISOString();
    saveDb();
    return ok(invoice as Invoice, 'Invoice voided');
  }),

  // the client opened the payment link: first open wins, and it never
  // overwrites a payment that already happened
  http.post('*/api/invoices/:id/viewed', ({ params }) => {
    const invoice = invoices.find((i) => i.id === params.id);
    if (invoice) {
      const settled = ['paid', 'receipted', 'cancelled'];
      if (!invoice.viewed_at) {
        invoice.viewed_at = new Date().toISOString();
        logActivity('invoice_viewed', `${invoice.client?.name ?? 'Client'} opened an invoice`, {
          invoice_id: invoice.id,
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
      invoice.date_received =
        typeof body?.date_received === 'string' ? body.date_received : new Date().toISOString();
      invoice.amount_received =
        typeof body?.amount_received === 'number' ? body.amount_received : invoice.total;
      if (typeof body?.wht_withheld === 'number' && body.wht_withheld > 0) {
        invoice.wht_withheld = body.wht_withheld;
      }
      if (typeof body?.payment_method === 'string') invoice.payment_method = body.payment_method;
      if (typeof body?.payer_email === 'string') invoice.payer_email = body.payer_email;
      // the receipt is its own document with its own identity
      if (!invoice.receipt_number) {
        invoice.receipt_number = `RCT-${invoice.invoice_number.replace(/^IV/i, '')}`;
        invoice.receipted_at = new Date().toISOString();
      }
      invoice.status = 'receipted';
      invoice.updated_at = new Date().toISOString();
      logActivity('invoice_paid', `${invoice.client?.name ?? 'Client'} paid an invoice`, {
        invoice_id: invoice.id,
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
      invoice_number: `IV${1000 + seq}`,
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
  http.patch('*/api/clients/:id', async ({ params, request }) => {
    const client = clients.find((c) => c.id === params.id);
    if (!client) {
      return HttpResponse.json({ message: 'Not found', success: false }, { status: 404 });
    }
    const body = (await request.json().catch(() => ({}))) as Partial<Client>;
    // the id and the clock are ours; everything else is theirs to change
    delete (body as Record<string, unknown>).id;
    delete (body as Record<string, unknown>).created_at;
    Object.assign(client, body);
    saveDb();
    return ok(client);
  }),
  http.delete('*/api/clients/:id', ({ params }) => {
    const at = clients.findIndex((c) => c.id === params.id);
    if (at < 0) {
      return HttpResponse.json({ message: 'Not found', success: false }, { status: 404 });
    }
    clients.splice(at, 1);
    saveDb();
    return new HttpResponse(null, { status: 200 });
  }),
  http.post('*/api/clients', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Partial<Client>;
    const client: Client = {
      id: `cli_${clients.length + 1}_${Math.floor(Math.random() * 1e4)}`,
      name: body.name ?? 'New Client',
      email: body.email ?? '',
      phone: body.phone,
      address: body.address,
      logo_url: body.logo_url ?? null,
      created_at: new Date().toISOString(),
    };
    clients.push(client);
    logActivity('client_added', `${client.name} was added as a client`, { client_id: client.id });
    saveDb();
    return ok(client, 'Client created');
  }),
];
