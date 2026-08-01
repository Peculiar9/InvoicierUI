import apiClient from './client';
import type {
  Invoice,
  CreateInvoiceDto,
  UpdateInvoiceDto,
  MarkPaidDto,
  ApiResponse,
  PaginatedResponse,
} from '@/types';

interface InvoiceFilters {
  status?: string;
  clientId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const invoicesApi = {
  getAll: async (filters?: InvoiceFilters): Promise<PaginatedResponse<Invoice>> => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Invoice>>>(
      '/invoices',
      { params: filters }
    );
    return response.data.data;
  },

  getById: async (id: string): Promise<Invoice> => {
    const response = await apiClient.get<ApiResponse<Invoice>>(`/invoices/${id}`);
    return response.data.data;
  },

  create: async (data: CreateInvoiceDto): Promise<Invoice> => {
    const response = await apiClient.post<ApiResponse<Invoice>>('/invoices', data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateInvoiceDto): Promise<Invoice> => {
    const response = await apiClient.patch<ApiResponse<Invoice>>(
      `/invoices/${id}`,
      data
    );
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/invoices/${id}`);
  },

  send: async (
    id: string,
    delivery?: { channel: string; to?: string }
  ): Promise<Invoice> => {
    const response = await apiClient.post<ApiResponse<Invoice>>(
      `/invoices/${id}/send`,
      delivery
    );
    return response.data.data;
  },

  /** Public: the payer says they made a transfer. A claim, not a payment. */
  claimPayment: async (
    id: string,
    data: { reference?: string; note?: string; payerEmail?: string }
  ): Promise<Invoice> => {
    const response = await apiClient.post<ApiResponse<Invoice>>(
      `/invoices/${id}/payment-claimed`,
      data
    );
    return response.data.data;
  },

  /** The sender could not find the money. */
  declineClaim: async (id: string, reason?: string): Promise<Invoice> => {
    const response = await apiClient.post<ApiResponse<Invoice>>(
      `/invoices/${id}/decline-claim`,
      { reason }
    );
    return response.data.data;
  },

  /** Void keeps the record and its number; delete would erase both. */
  voidInvoice: async (id: string, reason?: string): Promise<Invoice> => {
    const response = await apiClient.post<ApiResponse<Invoice>>(`/invoices/${id}/void`, {
      reason,
    });
    return response.data.data;
  },

  /** Public: the payer opened the link. Fire-and-forget, never blocks the page. */
  registerView: async (id: string): Promise<void> => {
    await apiClient.post(`/invoices/${id}/viewed`);
  },

  markAsPaid: async (id: string, data?: MarkPaidDto): Promise<Invoice> => {
    const response = await apiClient.post<ApiResponse<Invoice>>(
      `/invoices/${id}/mark-paid`,
      data
    );
    return response.data.data;
  },

  duplicate: async (id: string): Promise<Invoice> => {
    const response = await apiClient.post<ApiResponse<Invoice>>(
      `/invoices/${id}/duplicate`
    );
    return response.data.data;
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
