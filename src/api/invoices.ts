import apiClient from './client';
import type {
  PaymentWindow,
  Invoice,
  CreateInvoiceDto,
  UpdateInvoiceDto,
  MarkPaidDto,
  ApiResponse,
  PaginatedResponse,
} from '@/types';

interface InvoiceFilters {
  status?: string;
  client_id?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/** the real backend answers {invoice, items}; older shapes answer flat */
const mergeInvoice = (data: unknown): Invoice => {
  const record = data as { invoice?: Invoice; items?: Invoice['items'] } & Invoice;
  if (record && typeof record === 'object' && 'invoice' in record && record.invoice) {
    return { ...record.invoice, items: record.items ?? record.invoice.items ?? [] };
  }
  return record as Invoice;
};

export const invoicesApi = {
  getAll: async (filters?: InvoiceFilters): Promise<PaginatedResponse<Invoice> & { facets?: Record<string, number> }> => {
    // real wire: { success, data: rows[], meta: {total, page, limit, total_pages, facets} }
    const response = await apiClient.get<{
      data: Invoice[] | PaginatedResponse<Invoice>;
      meta?: { total: number; page: number; limit: number; total_pages: number; facets?: Record<string, number> };
    }>('/invoices', { params: filters });
    const body = response.data;
    if (Array.isArray(body.data)) {
      return {
        data: body.data,
        total: body.meta?.total ?? body.data.length,
        page: body.meta?.page ?? 1,
        limit: body.meta?.limit ?? body.data.length,
        total_pages: body.meta?.total_pages ?? 1,
        facets: body.meta?.facets,
      };
    }
    return body.data as PaginatedResponse<Invoice>;
  },

  /** ---- the payment window: a generated account and a strict clock ---- */

  openPaymentSession: async (id: string): Promise<PaymentWindow> => {
    const response = await apiClient.post<ApiResponse<PaymentWindow>>(
      `/public/invoices/${id}/payment-session`,
      { method: 'custom' }
    );
    return response.data.data;
  },

  getPaymentSession: async (id: string): Promise<PaymentWindow | null> => {
    const response = await apiClient.get<ApiResponse<PaymentWindow | null>>(
      `/public/invoices/${id}/payment-session`
    );
    return response.data.data;
  },

  paymentSent: async (
    id: string,
    input: { window_id: string; payer_email?: string; note?: string }
  ): Promise<PaymentWindow> => {
    const response = await apiClient.post<ApiResponse<PaymentWindow>>(
      `/public/invoices/${id}/payment-sent`,
      input
    );
    return response.data.data;
  },

  /** What a payer's browser fetches. No token, and a narrower shape. */
  getPublic: async (id: string): Promise<Invoice> => {
    const response = await apiClient.get<
      ApiResponse<
        | ({ invoice: Invoice; items?: Invoice['items'] } & {
            business?: Invoice['sender_business'];
            payment_account?: Invoice['payment_account'];
          })
        | Invoice
      >
    >(`/public/invoices/${id}`);
    const data = response.data.data;
    // the real backend sends { invoice, items, business, payment_account };
    // the mock sends the invoice whole, both end as one Invoice carrying
    // everything a stranger's browser needs (their localStorage knows nothing)
    if ('invoice' in (data as Record<string, unknown>)) {
      const wrapped = data as {
        invoice: Invoice;
        items?: Invoice['items'];
        business?: Invoice['sender_business'];
        payment_account?: Invoice['payment_account'];
      };
      return {
        ...wrapped.invoice,
        items: wrapped.items ?? wrapped.invoice.items ?? [],
        sender_business: wrapped.business ?? null,
        payment_account: wrapped.payment_account ?? null,
      };
    }
    return data as Invoice;
  },

  getById: async (id: string): Promise<Invoice> => {
    const response = await apiClient.get<ApiResponse<unknown>>(`/invoices/${id}`);
    return mergeInvoice(response.data.data);
  },

  create: async (data: CreateInvoiceDto): Promise<Invoice> => {
    const response = await apiClient.post<ApiResponse<unknown>>('/invoices', data);
    return mergeInvoice(response.data.data);
  },

  update: async (id: string, data: UpdateInvoiceDto): Promise<Invoice> => {
    const response = await apiClient.patch<ApiResponse<unknown>>(
      `/invoices/${id}`,
      data
    );
    return mergeInvoice(response.data.data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/invoices/${id}`);
  },

  send: async (
    id: string,
    delivery?: { channel: string; to?: string }
  ): Promise<Invoice> => {
    const response = await apiClient.post<ApiResponse<unknown>>(
      `/invoices/${id}/send`,
      delivery
    );
    return mergeInvoice(response.data.data);
  },

  /** Public: the payer says they made a transfer. A claim, not a payment. */
  claimPayment: async (
    id: string,
    data: { reference?: string; note?: string; payer_email?: string }
  ): Promise<Invoice> => {
    const response = await apiClient.post<ApiResponse<unknown>>(
      `/public/invoices/${id}/payment-claimed`,
      data
    );
    return mergeInvoice(response.data.data);
  },

  /** The sender could not find the money. */
  declineClaim: async (id: string, reason?: string): Promise<Invoice> => {
    const response = await apiClient.post<ApiResponse<unknown>>(
      `/invoices/${id}/decline-claim`,
      { reason }
    );
    return mergeInvoice(response.data.data);
  },

  /** Void keeps the record and its number; delete would erase both. */
  voidInvoice: async (id: string, reason?: string): Promise<Invoice> => {
    const response = await apiClient.post<ApiResponse<unknown>>(`/invoices/${id}/void`, {
      reason,
    });
    return mergeInvoice(response.data.data);
  },

  /** Undo: put the record back byte for byte, same id and same number. */
  restore: async (id: string, previous: Invoice): Promise<Invoice> => {
    const response = await apiClient.post<ApiResponse<unknown>>(
      `/invoices/${id}/restore`,
      { previous }
    );
    return mergeInvoice(response.data.data);
  },

  /** Public: the payer opened the link. Fire-and-forget, never blocks the page. */
  registerView: async (id: string): Promise<void> => {
    await apiClient.post(`/public/invoices/${id}/viewed`);
  },

  markAsPaid: async (id: string, data?: MarkPaidDto): Promise<Invoice> => {
    const response = await apiClient.post<ApiResponse<unknown>>(
      `/invoices/${id}/mark-paid`,
      data
    );
    return mergeInvoice(response.data.data);
  },

  duplicate: async (id: string): Promise<Invoice> => {
    const response = await apiClient.post<ApiResponse<unknown>>(
      `/invoices/${id}/duplicate`
    );
    return mergeInvoice(response.data.data);
  },

  downloadPdf: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/invoices/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  getShareLink: async (id: string): Promise<string> => {
    const response = await apiClient.get<ApiResponse<{ link: string }>>(
      `/invoices/${id}/share-link`
    );
    return response.data.data.link;
  },
};
