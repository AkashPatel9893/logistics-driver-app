import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';

import { safetyApi, type IncidentType } from '@/lib/api/safety';
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

/** Support answers in minutes, not seconds: a slow check is enough. */
const TICKET_MESSAGES_POLL_MS = 30_000;

export function useTicketMessages(ticketId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.ticketMessages(ticketId),
    queryFn: ({ signal }) => supportApi.getMessages(ticketId, signal),
    enabled,
    // Picks up the support team's reply while the thread is open and its screen is in front.
    subscribed: useIsFocused(),
    refetchInterval: enabled ? TICKET_MESSAGES_POLL_MS : false,
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

export function useReportIncident() {
  return useMutation({
    mutationFn: (input: { orderId: string; type: IncidentType; description: string }) =>
      safetyApi.reportIncident(input),
  });
}
