import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, type ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppKeyboardAvoidingView,
  AppPressable,
  AppScrollView,
  AppSpinner,
  AppText,
  AppView,
  Button,
  FocusAwareStatusBar,
  LiquidGlassBackButton,
} from '@/components/ui';
import { useActiveJob, useMarkMessagesRead, useMessages, useSendMessage } from '@/hooks/use-jobs';
import { getErrorMessage } from '@/lib/api/api-error';
import type { DriverJob } from '@/lib/api/models';
import { formatTime } from '@/lib/format';
import { useLocationStore } from '@/stores/location-store';

import { currentStop, JOB_STAGE_LABEL } from '../job-stage';

const QUICK_REPLIES = ["I've reached", '5 mins away', 'Stuck in traffic', 'Share my location'];

function Chat({ job }: { job: DriverJob }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const messagesQuery = useMessages(job.id);
  const messages = messagesQuery.data ?? [];
  const send = useSendMessage(job.id);
  const markRead = useMarkMessagesRead(job.id);
  const location = useLocationStore((s) => s.current);
  const [inputText, setInputText] = useState('');

  const unread = messages.filter((m) => m.sender === 'customer' && !m.readAt).length;
  useEffect(() => {
    if (unread > 0 && !markRead.isPending) markRead.mutate();
    // Only react to new unread messages.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unread]);

  const sendText = (raw: string) => {
    let text = raw.trim();
    if (text === 'Share my location') {
      if (!location) {
        Alert.alert('Location unavailable', 'Turn on location to share where you are.');
        return;
      }
      text = `My live location: https://maps.google.com/?q=${location.latitude.toFixed(5)},${location.longitude.toFixed(5)}`;
    }
    if (!text) return;
    send.mutate(text, {
      onSuccess: () => setInputText(''),
      onError: (error) => Alert.alert('Message not sent', getErrorMessage(error)),
    });
  };

  const stop = currentStop(job.status);
  const stopLabel = stop === 'pickup' ? job.pickup : job.drop;

  return (
    <AppView className="flex-1 bg-[#FBFBFC] dark:bg-background">
      <FocusAwareStatusBar />

      <AppView
        style={{ paddingTop: Math.max(insets.top, 12) + 4 }}
        className="border-b border-border/70 bg-card px-5 pb-3 shadow-xs"
      >
        <AppView row className="items-center justify-between">
          <AppView row className="flex-1 items-center gap-3">
            <LiquidGlassBackButton onPress={() => router.back()} />
            <AppView className="h-11 w-11 items-center justify-center rounded-full bg-brand/10">
              <AppText className="text-[17px] font-black text-brand">
                {job.sender.name.slice(0, 1)}
              </AppText>
            </AppView>
            <AppView className="flex-1">
              <AppText className="text-[17px] font-black text-foreground" numberOfLines={1}>
                {job.sender.name}
              </AppText>
              <AppText className="text-[12px] font-medium text-muted">
                Sender · {JOB_STAGE_LABEL[job.status]}
              </AppText>
            </AppView>
          </AppView>

          <AppPressable
            onPress={() => Linking.openURL(`tel:${job.sender.phone}`)}
            pressScale={0.94}
            className="rounded-full border border-border/90 bg-card px-4 py-1.5 shadow-xs active:bg-neutral-100 dark:active:bg-neutral-800"
          >
            <AppText className="text-[13px] font-black text-foreground">Call</AppText>
          </AppPressable>
        </AppView>
      </AppView>

      <AppView className="border-b border-border/60 bg-[#FBFBFC] px-5 py-3 dark:bg-card/40">
        <AppText className="text-[11px] font-bold uppercase tracking-wider text-muted">
          ORDER #{job.number} · {stop === 'pickup' ? 'PICKUP POINT' : 'DROP POINT'}
        </AppText>
        <AppText className="mt-1 text-[14px] font-bold text-foreground" numberOfLines={1}>
          {stopLabel.houseNumber}, {stopLabel.label}
        </AppText>
      </AppView>

      <AppKeyboardAvoidingView>
        <AppScrollView
          ref={scrollRef}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          contentContainerClassName="flex-grow justify-end gap-3 px-4 py-4"
          showsVerticalScrollIndicator={false}
        >
          {messagesQuery.isLoading ? <AppSpinner /> : null}
          {!messagesQuery.isLoading && messages.length === 0 ? (
            <AppText className="text-center text-[13px] text-muted">
              Messages with {job.sender.name.split(' ')[0]} appear here. Numbers stay private.
            </AppText>
          ) : null}

          {messages.map((msg) => {
            const isDriver = msg.sender === 'driver';
            return (
              <AppView
                key={msg.id}
                className={`max-w-[82%] rounded-[20px] p-3.5 shadow-xs ${
                  isDriver ? 'self-end bg-brand' : 'self-start border border-border/80 bg-card'
                }`}
              >
                <AppText
                  className={`text-[15px] font-medium leading-5 ${isDriver ? 'text-white' : 'text-foreground'}`}
                >
                  {msg.text}
                </AppText>
                <AppText
                  className={`mt-1.5 text-[11px] ${isDriver ? 'self-end text-white/80' : 'text-muted'}`}
                >
                  {formatTime(msg.createdAt)}
                </AppText>
              </AppView>
            );
          })}
        </AppScrollView>

        <AppView className="border-t border-border/40 bg-card/70 px-4 py-2">
          <AppScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
          >
            {QUICK_REPLIES.map((reply) => (
              <AppPressable
                key={reply}
                onPress={() => sendText(reply)}
                disabled={send.isPending}
                pressScale={0.96}
                className="rounded-full border border-border/60 bg-[#F3ECE6] px-4 py-2 dark:bg-card"
              >
                <AppText className="text-[12px] font-semibold text-foreground-secondary">
                  {reply}
                </AppText>
              </AppPressable>
            ))}
          </AppScrollView>
        </AppView>

        <AppView
          style={{ paddingBottom: Math.max(insets.bottom, 12) + 4 }}
          className="border-t border-border/80 bg-card px-4 pt-3"
        >
          <AppView row className="items-center gap-2.5">
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder={`Message ${job.sender.name.split(' ')[0]}…`}
              placeholderTextColor="#9ca3af"
              accessibilityLabel="Message"
              maxLength={500}
              className="flex-1 rounded-full border border-border/80 bg-[#F4F5F7] px-5 py-3 text-[15px] text-foreground dark:bg-card/90"
              onSubmitEditing={() => sendText(inputText)}
              returnKeyType="send"
            />
            <AppPressable
              onPress={() => sendText(inputText)}
              disabled={send.isPending || !inputText.trim()}
              pressScale={0.94}
              className={`rounded-full px-6 py-3.5 shadow-md shadow-brand/25 ${
                inputText.trim() ? 'bg-brand' : 'bg-brand/50'
              }`}
            >
              <AppText className="text-[14px] font-black text-white">Send</AppText>
            </AppPressable>
          </AppView>
        </AppView>
      </AppKeyboardAvoidingView>
    </AppView>
  );
}

export function CustomerChatScreen() {
  const router = useRouter();
  const { data: job, isLoading } = useActiveJob();

  if (!job) {
    return (
      <AppView className="flex-1 items-center justify-center bg-background p-6">
        {isLoading ? (
          <AppSpinner size="large" />
        ) : (
          <>
            <AppText className="text-[16px] font-bold text-foreground">
              Chat is available during a trip.
            </AppText>
            <Button label="Back" className="mt-5" onPress={() => router.back()} />
          </>
        )}
      </AppView>
    );
  }
  return <Chat job={job} />;
}
