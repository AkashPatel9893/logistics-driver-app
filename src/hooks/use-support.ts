import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { safetyApi } from '@/lib/api/safety';
import { supportApi, type TicketCategory } from '@/lib/api/support';
import { queryKeys } from '@/lib/queries/keys';

export function useTickets() {
  return useQuery({
    queryKey: queryKeys.tickets,
    queryFn: ({ signal }) => supportApi.listTickets(signal),
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      category: TicketCategory;
      subject: string;
      description: string;
      orderId?: string | null;
    }) => supportApi.createTicket(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tickets }),
  });
}

export function useTicketMessages(ticketId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.ticketMessages(ticketId),
    queryFn: ({ signal }) => supportApi.getMessages(ticketId, signal),
    enabled,
    // Picks up the support team's reply while the thread is open.
    refetchInterval: enabled ? 15_000 : false,
  });
}

export function useSendTicketMessage(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => supportApi.sendMessage(ticketId, message),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.ticketMessages(ticketId) }),
  });
}

export function useSos() {
  return useMutation({ mutationFn: () => safetyApi.sos() });
}
