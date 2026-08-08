import apiClient from './client';
import type {
  Invoice, Client, ApiResponse, PaginatedResponse } from '@/types';

interface CreateClientDto {
  name: string;
  email: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
  };
}

export const clientsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    q?: string;
    sort?: string;
    dir?: string;
  }): Promise<PaginatedResponse<Client>> => {
    // the real wire: { success, data: rows[], meta }, the search param is q
    const response = await apiClient.get<{
      data: Client[] | PaginatedResponse<Client>;
      meta?: { total: number; page: number; limit: number; total_pages: number };
    }>('/clients', {
      params: params?.search ? { ...params, q: params.search, search: undefined } : params,
    });
    const body = response.data;
    if (Array.isArray(body.data)) {
      return {
        data: body.data,
        total: body.meta?.total ?? body.data.length,
        page: body.meta?.page ?? 1,
        limit: body.meta?.limit ?? body.data.length,
        total_pages: body.meta?.total_pages ?? 1,
      };
    }
    return body.data as PaginatedResponse<Client>;
  },

  getById: async (id: string): Promise<Client> => {
    const response = await apiClient.get<ApiResponse<Client>>(`/clients/${id}`);
    return response.data.data;
  },

  create: async (data: CreateClientDto): Promise<Client> => {
    const response = await apiClient.post<ApiResponse<Client>>('/clients', data);
    return response.data.data;
  },

  update: async (id: string, data: Partial<CreateClientDto>): Promise<Client> => {
    const response = await apiClient.patch<ApiResponse<Client>>(
      `/clients/${id}`,
      data
    );
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/clients/${id}`);
  },

  getInvoices: async (
    id: string,
    params?: { page?: number; limit?: number }
  ): Promise<PaginatedResponse<Invoice>> => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Invoice>>>(
      `/clients/${id}/invoices`,
      { params }
    );
    return response.data.data;
  },
};
