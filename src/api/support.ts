import apiClient from './client';
import type { ApiResponse } from '@/types';

export type TicketCategory = 'feedback' | 'help' | 'dispute';
export type TicketStatus = 'open' | 'awaiting_user' | 'resolved';

export interface SupportTicket {
  _id: string;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  last_author: 'user' | 'admin';
  name?: string | null;
  email?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  _id: string;
  ticket_id: string;
  author: 'user' | 'admin';
  author_name?: string | null;
  body: string;
  created_at: string;
}

export interface SupportThread {
  ticket: SupportTicket;
  messages: SupportMessage[];
}

export const supportApi = {
  myTickets: async (): Promise<SupportTicket[]> => {
    const r = await apiClient.get<ApiResponse<SupportTicket[]>>('/support/tickets');
    return r.data.data;
  },
  open: async (input: {
    category: TicketCategory;
    subject: string;
    message: string;
  }): Promise<SupportThread> => {
    const r = await apiClient.post<ApiResponse<SupportThread>>('/support/tickets', input);
    return r.data.data;
  },
  thread: async (id: string): Promise<SupportThread> => {
    const r = await apiClient.get<ApiResponse<SupportThread>>(`/support/tickets/${id}`);
    return r.data.data;
  },
  reply: async (id: string, body: string): Promise<SupportThread> => {
    const r = await apiClient.post<ApiResponse<SupportThread>>(`/support/tickets/${id}/messages`, {
      body,
    });
    return r.data.data;
  },
};
