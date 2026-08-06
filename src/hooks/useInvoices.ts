import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '@/api/invoices';
import type { CreateInvoiceDto, MarkPaidDto, UpdateInvoiceDto } from '@/types';

interface UseInvoicesParams {
  status?: string;
  clientId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const useInvoices = (params?: UseInvoicesParams) => {
  return useQuery({
    queryKey: ['invoices', params],
    queryFn: () => invoicesApi.getAll(params),
    staleTime: 30 * 1000,
  });
};

export const useInvoice = (id: string) => {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: () => invoicesApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvoiceDto) => invoicesApi.create(data),
    meta: { doing: 'Saving the invoice' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInvoiceDto }) =>
      invoicesApi.update(id, data),
    meta: { doing: 'Saving your changes' },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invoicesApi.delete(id),
    meta: { doing: 'Deleting the invoice' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useSendInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: string | { id: string; channel?: string; to?: string }) =>
      typeof vars === 'string'
        ? invoicesApi.send(vars)
        : invoicesApi.send(vars.id, { channel: vars.channel ?? 'email', to: vars.to }),
    meta: { doing: 'Sending the invoice' },
    onSuccess: (_, vars) => {
      const id = typeof vars === 'string' ? vars : vars.id;
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', id] });
    },
  });
};

export const useMarkInvoicePaid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: MarkPaidDto }) =>
      invoicesApi.markAsPaid(id, data),
    meta: { doing: 'Recording the payment' },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDuplicateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invoicesApi.duplicate(id),
    meta: { doing: 'Duplicating the invoice' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

export const useDownloadInvoicePdf = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const blob = await invoicesApi.downloadPdf(id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
};

export const useInvoiceShareLink = () => {
  return useMutation({
    mutationFn: (id: string) => invoicesApi.getShareLink(id),
  });
};
