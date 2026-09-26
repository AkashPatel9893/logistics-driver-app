import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppImage,
  AppKeyboardAvoidingView,
  AppPressable,
  AppScrollView,
  AppText,
  AppView,
  FocusAwareStatusBar,
  Icon,
  LiquidGlassBackButton,
} from '@/components/ui';
import { useDriverStore } from '@/stores/driver-store';

const QUICK_REPLIES = ["I'm here", '2 mins away', 'Share location'];

export function CustomerChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const activeJob = useDriverStore((s) => s.activeJob);
  const addChatMessage = useDriverStore((s) => s.addChatMessage);

  const customerName = activeJob?.customerName || 'Priya Sharma';
  const customerPhone = activeJob?.customerPhone || '+91 98765 43210';
  const orderRef = activeJob ? `MV-${activeJob.id.slice(-4).toUpperCase()}` : 'MV-2048';
  const pickupAddress = activeJob?.pickupAddress || 'Hans Bhawan Wing-1, IP Estate';

  const defaultMessages = [
    {
      id: 'm1',
      sender: 'customer' as const,
      text: "Hi, I'm near Hans Bhawan but the main gate is busy.",
      time: '9:34 AM',
    },
    {
      id: 'm2',
      sender: 'driver' as const,
      text: "I'm on Deen Dayal Marg now. Which entrance should I use?",
      time: '9:35 AM',
      status: 'Delivered' as const,
    },
    {
      id: 'm3',
      sender: 'customer' as const,
      text: "Please come to Wing-1, beside the tea stall. I'm wearing a blue kurta.",
      time: '9:36 AM',
    },
    {
      id: 'm4',
      sender: 'driver' as const,
      text: 'Got it — I can see the Wing-1 sign. Reaching in about 2 minutes.',
      time: '9:37 AM',
      status: 'Read' as const,
    },
  ];

  const chatMessages =
    activeJob?.chatMessages && activeJob.chatMessages.length > 0
      ? activeJob.chatMessages
      : defaultMessages;

  const [inputText, setInputText] = useState('');

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;
    addChatMessage(text);
    setInputText('');
  };

  const handleCall = () => {
    Linking.openURL(`tel:${customerPhone}`);
  };

  return (
    <AppView className="flex-1 bg-[#FBFBFC] dark:bg-background">
      <FocusAwareStatusBar />

      {/* Header */}
      <AppView
        style={{ paddingTop: Math.max(insets.top, 12) + 4 }}
        className="border-b border-border/70 bg-card px-5 pb-3 shadow-xs"
      >
        <AppView row className="items-center justify-between">
          <AppView row className="items-center gap-3">
            <LiquidGlassBackButton onPress={() => router.back()} />
            <AppView className="h-11 w-11 overflow-hidden rounded-full border border-border/80 bg-neutral-200">
              <AppImage
                source={{
                  uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
                }}
                contentFit="cover"
                className="h-full w-full"
              />
            </AppView>
            <AppView>
              <AppText className="text-[17px] font-black text-foreground">{customerName}</AppText>
              <AppText className="text-[12px] font-medium text-muted">Pickup · 6 min away</AppText>
            </AppView>
          </AppView>

          <AppPressable
            onPress={handleCall}
            pressScale={0.94}
            className="rounded-full border border-border/90 bg-card px-4 py-1.5 shadow-xs active:bg-neutral-100 dark:active:bg-neutral-800"
          >
            <AppText className="text-[13px] font-black text-foreground">Call</AppText>
          </AppPressable>
        </AppView>
      </AppView>

      {/* Booking banner */}
      <AppView className="border-b border-border/60 bg-[#FBFBFC] dark:bg-card/40 px-5 py-3">
        <AppView row className="items-center justify-between mb-2">
          <AppText className="text-[11px] font-bold uppercase tracking-wider text-muted">
            BOOKING #{orderRef}
          </AppText>
          <AppView className="rounded-full bg-[#FFEFE9] dark:bg-brand/20 px-3 py-1">
            <AppText className="text-[11px] font-black text-brand">En route</AppText>
          </AppView>
        </AppView>
        <AppView className="rounded-2xl border border-border/70 bg-card p-3 shadow-xs">
          <AppView row className="items-center gap-2.5">
            <AppView className="h-4 w-4 rounded-full border-2 border-brand items-center justify-center">
              <AppView className="h-1.5 w-1.5 rounded-full bg-brand" />
            </AppView>
            <AppView className="flex-1">
              <AppText className="text-[10px] font-bold uppercase tracking-wider text-muted">
                PICKUP POINT
              </AppText>
              <AppText className="text-[14px] font-bold text-foreground" numberOfLines={1}>
                {pickupAddress}
              </AppText>
            </AppView>
          </AppView>
        </AppView>
      </AppView>

      <AppKeyboardAvoidingView>
        <AppScrollView
          contentContainerClassName="px-4 py-4 gap-3 flex-grow justify-end"
          showsVerticalScrollIndicator={false}
        >
          <AppView row className="items-center justify-center my-1 gap-3">
            <AppView className="flex-1 h-[1px] bg-border/60" />
            <AppText className="text-[11px] font-bold uppercase text-muted tracking-wider">
              TODAY
            </AppText>
            <AppView className="flex-1 h-[1px] bg-border/60" />
          </AppView>

          {chatMessages.map((msg) => {
            const isDriver = msg.sender === 'driver';
            return (
              <AppView
                key={msg.id}
                className={`max-w-[82%] rounded-[20px] p-3.5 shadow-xs ${
                  isDriver ? 'self-end bg-brand' : 'self-start border border-border/80 bg-card'
                }`}
              >
                <AppText
                  className={`text-[15px] leading-5 ${
                    isDriver ? 'font-medium text-white' : 'font-medium text-foreground'
                  }`}
                >
                  {msg.text}
                </AppText>
                <AppView
                  row
                  className={`mt-1.5 items-center gap-1.5 ${
                    isDriver ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <AppText className={`text-[11px] ${isDriver ? 'text-white/80' : 'text-muted'}`}>
                    {msg.time}
                  </AppText>
                  {isDriver ? (
                    <AppText className="text-[11px] font-semibold text-white/90">
                      ✓✓ {msg.status || 'Delivered'}
                    </AppText>
                  ) : null}
                </AppView>
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
                onPress={() => handleSend(reply)}
                pressScale={0.96}
                className="rounded-full bg-[#F3ECE6] dark:bg-card px-4 py-2 border border-border/60"
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
            <AppPressable
              pressScale={0.92}
              className="h-12 w-12 items-center justify-center rounded-full border border-border/80 bg-[#F9F9FB] dark:bg-card shadow-xs active:bg-neutral-100"
            >
              <Icon name="plus" size={20} tone="icon-strong" />
            </AppPressable>

            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder={`Message ${customerName.split(' ')[0]}...`}
              placeholderTextColor="#9ca3af"
              className="flex-1 rounded-full border border-border/80 bg-[#F4F5F7] dark:bg-card/90 px-5 py-3 text-[15px] text-foreground"
              onSubmitEditing={() => handleSend()}
              returnKeyType="send"
            />

            <AppPressable
              onPress={() => handleSend()}
              pressScale={0.94}
              className="rounded-full bg-brand px-6 py-3.5 shadow-md shadow-brand/25 active:bg-brand/90"
            >
              <AppText className="text-[14px] font-black text-white">Send</AppText>
            </AppPressable>
          </AppView>
        </AppView>
      </AppKeyboardAvoidingView>
    </AppView>
  );
}
