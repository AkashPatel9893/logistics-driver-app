import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, RefreshControl } from 'react-native';

import {
  AppPressable,
  AppScrollView,
  AppSpinner,
  AppText,
  AppView,
  Button,
  Icon,
  TextField,
} from '@/components/ui';
import {
  useCreateTicket,
  useSendTicketMessage,
  useTicketMessages,
  useTickets,
} from '@/hooks/use-support';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { getErrorMessage } from '@/lib/api/api-error';
import { queryKeys } from '@/lib/queries/keys';
import type { SupportTicket, TicketCategory } from '@/lib/api/support';
import { formatDayTime } from '@/lib/format';

import { SetupScreenLayout } from '../components/setup-screen-layout';

const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: 'ORDER', label: 'A trip' },
  { value: 'EARNINGS', label: 'Earnings' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'KYC', label: 'Documents' },
  { value: 'ACCOUNT', label: 'Account' },
  { value: 'OTHER', label: 'Other' },
];

const CLOSED_STATUSES = ['RESOLVED', 'CLOSED'];

function statusLabel(status: string): string {
  const text = status.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function NewRequestForm({ onDone }: { onDone: () => void }) {
  const create = useCreateTicket();
  const [category, setCategory] = useState<TicketCategory>('OTHER');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const submit = () => {
    if (subject.trim().length < 3 || description.trim().length < 10) {
      Alert.alert(
        'Add a few more details',
        'Give the request a short title and describe the problem in at least 10 characters.',
      );
      return;
    }
    create.mutate(
      { category, subject, description },
      {
        onSuccess: (ticket) => {
          Alert.alert('Request sent', `Your reference is ${ticket.number}. We will reply here.`);
          onDone();
        },
        onError: (error) => Alert.alert('Could not send request', getErrorMessage(error)),
      },
    );
  };

  return (
    <AppView className="gap-3 rounded-3xl border border-brand/20 bg-card p-5">
      <AppText className="text-[16px] font-extrabold text-foreground">
        What do you need help with?
      </AppText>
      <AppView row className="flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const selected = category === c.value;
          return (
            <AppPressable
              key={c.value}
              onPress={() => setCategory(c.value)}
              accessibilityState={{ selected }}
              className={`rounded-full border px-3.5 py-2 ${selected ? 'border-brand bg-brand/10' : 'border-border bg-surface-muted'}`}
            >
              <AppText
                className={`text-[13px] font-bold ${selected ? 'text-brand' : 'text-foreground'}`}
              >
                {c.label}
              </AppText>
            </AppPressable>
          );
        })}
      </AppView>
      <TextField label="Title" value={subject} onChangeText={setSubject} maxLength={120} />
      <TextField
        label="Describe the problem"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={2000}
        inputClassName="min-h-24 text-top"
      />
      <Button label="Send request" variant="brand" onPress={submit} loading={create.isPending} />
    </AppView>
  );
}

function TicketThread({ ticket }: { ticket: SupportTicket }) {
  const messages = useTicketMessages(ticket.id, true);
  const send = useSendTicketMessage(ticket.id);
  const [text, setText] = useState('');
  const closed = CLOSED_STATUSES.includes(ticket.status);

  const reply = () => {
    if (!text.trim()) return;
    send.mutate(text, {
      onSuccess: () => setText(''),
      onError: (error) => Alert.alert('Could not send', getErrorMessage(error)),
    });
  };

  return (
    <AppView className="mt-3 gap-2 border-t border-border/60 pt-3">
      {messages.isLoading ? <AppSpinner /> : null}
      {messages.data?.map((m) => (
        <AppView
          key={m.id}
          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${m.mine ? 'self-end bg-brand' : 'self-start bg-surface-muted'}`}
        >
          <AppText className={`text-[13px] ${m.mine ? 'text-white' : 'text-foreground'}`}>
            {m.text}
          </AppText>
        </AppView>
      ))}
      {ticket.resolutionNote ? (
        <AppText className="text-[12px] text-muted">Resolution: {ticket.resolutionNote}</AppText>
      ) : null}
      {closed ? (
        <AppText className="text-[12px] text-muted">This request is closed.</AppText>
      ) : (
        <AppView row className="items-end gap-2">
          <TextField
            className="flex-1"
            value={text}
            onChangeText={setText}
            placeholder="Write a reply"
            multiline
            maxLength={2000}
          />
          <Button label="Send" variant="brand" size="sm" onPress={reply} loading={send.isPending} />
        </AppView>
      )}
    </AppView>
  );
}

export function SupportTicketsScreen() {
  const tickets = useTickets();
  const [showForm, setShowForm] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { refreshing, refresh } = usePullToRefresh();

  // Pull to refresh: the request list and the open thread's replies, now.
  const onRefresh = () =>
    void refresh(() =>
      Promise.all([
        tickets.refetch({ throwOnError: true }),
        ...(openId
          ? [
              queryClient.refetchQueries(
                { queryKey: queryKeys.ticketMessages(openId) },
                { throwOnError: true },
              ),
            ]
          : []),
      ]),
    );

  return (
    <SetupScreenLayout title="My requests" subtitle="Questions you sent to partner care">
      <AppScrollView
        contentContainerClassName="gap-4 px-5 pb-16 pt-4"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {showForm ? (
          <NewRequestForm onDone={() => setShowForm(false)} />
        ) : (
          <Button label="New request" variant="brand" onPress={() => setShowForm(true)} />
        )}

        {tickets.isLoading ? <AppSpinner /> : null}
        {tickets.isError ? (
          <AppText className="text-muted">Could not load your requests. Try again later.</AppText>
        ) : null}
        {tickets.data?.length === 0 && !showForm ? (
          <AppText className="px-1 text-[13px] text-muted">
            You have not sent any requests yet.
          </AppText>
        ) : null}
        {tickets.data?.map((ticket) => {
          const isOpen = openId === ticket.id;
          return (
            <AppView key={ticket.id} className="rounded-2xl border border-border bg-card p-4">
              <AppPressable
                onPress={() => setOpenId(isOpen ? null : ticket.id)}
                accessibilityState={{ expanded: isOpen }}
              >
                <AppView row className="items-center justify-between gap-3">
                  <AppView className="flex-1">
                    <AppText numberOfLines={2} className="text-[14px] font-bold text-foreground">
                      {ticket.subject}
                    </AppText>
                    <AppText className="mt-0.5 text-[12px] text-muted">
                      {ticket.number} · {formatDayTime(ticket.createdAt)}
                    </AppText>
                  </AppView>
                  <AppView className="rounded-full bg-surface-muted px-2.5 py-1">
                    <AppText className="text-[11px] font-bold text-foreground">
                      {statusLabel(ticket.status)}
                    </AppText>
                  </AppView>
                  <Icon
                    name={isOpen ? 'chevron.up' : 'chevron.down'}
                    size={16}
                    tone="icon-subtle"
                  />
                </AppView>
              </AppPressable>
              {isOpen ? <TicketThread ticket={ticket} /> : null}
            </AppView>
          );
        })}
      </AppScrollView>
    </SetupScreenLayout>
  );
}
