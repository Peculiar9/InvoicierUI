import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '@/api/clients';

interface CreateClientData {
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

interface UseClientsParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const useClients = (params?: UseClientsParams) => {
  return useQuery({
    queryKey: ['clients', params],
    queryFn: () => clientsApi.getAll(params),
    staleTime: 60 * 1000,
  });
};

export const useClient = (id: string) => {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: () => clientsApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClientData) => clientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateClientData> }) =>
      clientsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', id] });
    },
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => clientsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useClientInvoices = (clientId: string, params?: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['clients', clientId, 'invoices', params],
    queryFn: () => clientsApi.getInvoices(clientId, params),
    enabled: !!clientId,
  });
};
