import apiClient from './client';
import type { Client, ApiResponse, PaginatedResponse } from '@/types';

interface CreateClientDto {
  name: string;
  email: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export const clientsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<Client>> => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Client>>>(
      '/clients',
      { params }
    );
    return response.data.data;
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
  ): Promise<PaginatedResponse<Client>> => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Client>>>(
      `/clients/${id}/invoices`,
      { params }
    );
    return response.data.data;
  },
};
