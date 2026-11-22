import { request } from './client';

export type TicketCategory =
  'ORDER' | 'PAYMENT' | 'ACCOUNT' | 'KYC' | 'EARNINGS' | 'DRIVER_BEHAVIOUR' | 'OTHER';

export interface SupportTicket {
  id: string;
  number: string;
  category: string;
  status: string;
  subject: string;
  orderId: string | null;
  resolutionNote: string | null;
  createdAt: string;
}

export interface TicketMessage {
  id: string;
  /** True when the driver wrote it. */
  mine: boolean;
  text: string;
  createdAt: string;
}

function mapTicket(raw: any): SupportTicket {
  return {
    id: raw.id,
    number: raw.ticket_number,
    category: raw.category,
    status: raw.status,
    subject: raw.subject,
    orderId: raw.order_id ?? null,
    resolutionNote: raw.resolution_note ?? null,
    createdAt: raw.created_at,
  };
}

export const supportApi = {
  listTickets: async (signal?: AbortSignal): Promise<SupportTicket[]> => {
    const res = await request<any>({ url: '/support/tickets', signal });
    return (Array.isArray(res) ? res : (res?.items ?? [])).map(mapTicket);
  },

  createTicket: async (input: {
    category: TicketCategory;
    subject: string;
    description: string;
    orderId?: string | null;
  }): Promise<SupportTicket> =>
    mapTicket(
      await request<any>({
        method: 'POST',
        url: '/support/tickets',
        data: {
          category: input.category,
          subject: input.subject.trim(),
          description: input.description.trim(),
          ...(input.orderId ? { order_id: input.orderId } : {}),
        },
      }),
    ),

  getMessages: async (ticketId: string, signal?: AbortSignal): Promise<TicketMessage[]> => {
    const res = await request<any>({ url: `/support/tickets/${ticketId}/messages`, signal });
    return (Array.isArray(res) ? res : [])
      .filter((m: any) => !m.is_internal)
      .map((m: any) => ({
        id: m.id,
        mine: m.sender_type !== 'ADMIN' && m.sender_type !== 'AGENT' && m.sender_type !== 'SYSTEM',
        text: m.message,
        createdAt: m.created_at,
      }));
  },

  sendMessage: async (ticketId: string, message: string): Promise<void> => {
    await request<any>({
      method: 'POST',
      url: `/support/tickets/${ticketId}/messages`,
      data: { message: message.trim() },
    });
  },
};
