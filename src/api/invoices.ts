import apiClient from './client';
import type {
  Invoice,
  CreateInvoiceDto,
  UpdateInvoiceDto,
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

  send: async (id: string): Promise<Invoice> => {
    const response = await apiClient.post<ApiResponse<Invoice>>(
      `/invoices/${id}/send`
    );
    return response.data.data;
  },

  markAsPaid: async (id: string): Promise<Invoice> => {
    const response = await apiClient.post<ApiResponse<Invoice>>(
      `/invoices/${id}/mark-paid`
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
