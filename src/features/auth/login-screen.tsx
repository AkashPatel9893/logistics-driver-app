import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppKeyboardAvoidingView,
  AppPressable,
  AppScrollView,
  AppText,
  AppView,
  FocusAwareStatusBar,
  TextField,
} from '@/components/ui';

import { HeroBanner } from './components/hero-banner';
import { LanguagePickerSheet } from './components/language-picker-sheet';
import { LanguagePill } from './components/language-pill';
import { useLoginForm } from './hooks/use-login-form';

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const form = useLoginForm();

  return (
    <AppView className="flex-1 bg-canvas">
      <FocusAwareStatusBar />
      <AppKeyboardAvoidingView>
        <AppScrollView style={{ paddingTop: insets.top }} contentContainerClassName="pb-6">
          <HeroBanner />

          <AppView className="px-6 pt-20">
            <AppText className="text-2xl font-bold text-foreground">Lets get started</AppText>
            <AppText className="mt-1 text-sm font-normal text-muted">
              Login/ Signup with Mobile
            </AppText>

            <TextField
              variant="outlined"
              value={form.phone}
              onChangeText={form.handlePhoneChange}
              placeholder="00000 00000"
              accessibilityLabel="Mobile number"
              keyboardType="number-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              maxLength={10}
              leading={
                <AppView row className="items-center gap-1.5 mr-2">
                  <AppText className="text-[18px]">🇮🇳</AppText>
                  <AppText className="text-[15px] font-bold text-foreground">+91</AppText>
                </AppView>
              }
              returnKeyType="done"
              onSubmitEditing={form.handleContinue}
              error={form.validationError ?? undefined}
              className="mt-4"
              inputClassName="text-[16px]"
            />

            <AppView className="mt-4">
              <AppPressable
                onPress={form.handleContinue}
                disabled={!form.isPhoneValid || form.isLoading}
                pressScale={0.97}
                className={`w-full items-center justify-center rounded-2xl py-4 shadow-sm ${
                  !form.isPhoneValid || form.isLoading
                    ? 'bg-neutral-300 dark:bg-neutral-700 opacity-60'
                    : 'bg-[#1A1A1A] dark:bg-white active:bg-neutral-800'
                }`}
              >
                <AppText className="text-[16px] font-bold text-white dark:text-[#1A1A1A]">
                  {form.isLoading ? 'Sending code...' : 'Continue'}
                </AppText>
              </AppPressable>
            </AppView>

            <AppView className="mt-6">
              <LanguagePill
                language={form.language}
                onPress={() => form.setShowLanguageSheet(true)}
              />
            </AppView>
          </AppView>
        </AppScrollView>
      </AppKeyboardAvoidingView>

      <LanguagePickerSheet
        languages={form.languages}
        isPresented={form.showLanguageSheet}
        selectedLanguage={form.language}
        onSelect={form.handleLanguageSelect}
        onDismiss={() => form.setShowLanguageSheet(false)}
      />
    </AppView>
  );
}
