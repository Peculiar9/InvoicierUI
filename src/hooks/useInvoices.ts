import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '@/api/invoices';
import { analytics } from '@/lib/analytics';
import { devMockInvoice, isDevMockInvoiceId } from '@/lib/devMockInvoice';
import type { CreateInvoiceDto, Invoice, MarkPaidDto, UpdateInvoiceDto } from '@/types';
import { isPaid } from '@/utils/invoiceStatus';

interface UseInvoicesParams {
  status?: string;
  client_id?: string;
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

/**
 * The payer's read: no token, and the server decides what a stranger with
 * the link may see. Same cache key as useInvoice so claims invalidate both.
 */
export const usePublicInvoice = (id: string, asOwner: boolean) => {
  return useQuery({
    queryKey: ['invoices', id],
    // The payer often sits on this page waiting for the sender to say the
    // money landed. Poll while the invoice is unsettled so the page turns
    // itself into the receipt the moment it is confirmed, with no refresh.
    // It stops the instant the invoice is paid, and never runs in a
    // background tab.
    refetchInterval: (query) => {
      const inv = query.state.data as Invoice | undefined;
      if (!inv || isDevMockInvoiceId(id)) return false;
      return isPaid(inv.status) ? false : 12000;
    },
    refetchIntervalInBackground: false,
    queryFn: () => {
      // Dev only: an inv_* id renders a realistic sample so we can refine the
      // pay flow. In prod/staging this branch never runs, so those ids fall
      // through to the real fetch and its "nothing behind this link" empty state.
      if (isDevMockInvoiceId(id)) return Promise.resolve(devMockInvoice(id));
      return asOwner ? invoicesApi.getById(id) : invoicesApi.getPublic(id);
    },
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
      const channel = typeof vars === 'string' ? 'email' : vars.channel ?? 'email';
      analytics.capture('invoice_sent', { channel });
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
      analytics.capture('invoice_collected');
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

export const useInvoiceShareLink = () => {
  return useMutation({
    mutationFn: (id: string) => invoicesApi.getShareLink(id),
  });
};
