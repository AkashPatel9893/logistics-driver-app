import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppImage,
  AppPressable,
  AppSpinner,
  AppText,
  AppView,
  Button,
  Icon,
} from '@/components/ui';
import { SetupScreenLayout } from '@/features/driver/components/setup-screen-layout';
import { goBack } from '@/lib/go-back';

import { saveDraftPhoto } from '../drafts';
import { useSelfieStore } from '../use-selfie-store';

type Stage = 'intro' | 'camera' | 'review';

const TITLE = 'Take a selfie';
const SUBTITLE = 'Remove any helmet, sunglasses or mask. Your face should be clearly visible.';

/** Largest available "WxH" size whose long side is at most 1600 px, if any. */
function pickPictureSize(sizes: string[]): string | undefined {
  const parsed = sizes
    .map((size) => {
      const [w, h] = size.split('x').map(Number);
      return { size, long: Math.max(w, h), area: w * h };
    })
    .filter((s) => Number.isFinite(s.area) && s.long <= 1600)
    .sort((a, b) => b.area - a.area);
  return parsed[0]?.size;
}

/** Drawn illustration: a phone showing a face inside the oval guide. */
function SelfieIllustration() {
  return (
    <AppView className="items-center">
      <AppView className="h-[230px] w-[130px] items-center rounded-[26px] border-[5px] border-neutral-800 bg-neutral-100 pt-2 dark:bg-neutral-800">
        <AppView className="h-[6px] w-10 rounded-full bg-neutral-800" />
        <AppView className="mt-6 h-[120px] w-[90px] items-center justify-center rounded-[45px] border-2 border-dashed border-brand bg-brand-soft">
          <Icon name="person.fill" size={60} tone="brand" />
        </AppView>
        <AppView className="mt-5 h-8 w-8 rounded-full border-[3px] border-neutral-800 bg-white" />
      </AppView>
      <AppView row className="mt-6 gap-4">
        {['No helmet', 'No sunglasses', 'Good light'].map((tip) => (
          <AppView key={tip} row className="items-center gap-1">
            <Icon name="checkmark.circle.fill" size={14} tone="success" />
            <AppText className="text-[12px] font-semibold text-foreground-secondary">{tip}</AppText>
          </AppView>
        ))}
      </AppView>
    </AppView>
  );
}

/**
 * Selfie for "Photo and name": a short intro, then the front camera inside a round frame,
 * then a review. The photo goes back through useSelfieStore.
 */
export function SelfieScreen() {
  const router = useRouter();
  // From Documents: continue to Profile information. From that screen (retake): just go back.
  const { next } = useLocalSearchParams<{ next?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const circle = Math.min(width - 64, 320);
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [stage, setStage] = useState<Stage>('intro');
  const [photo, setPhoto] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [pictureSize, setPictureSize] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const start = async () => {
    const granted = permission?.granted || (await requestPermission()).granted;
    if (granted) setStage('camera');
  };

  const capture = async () => {
    if (!camera.current || busy) return;
    setBusy(true);
    try {
      const shot = await camera.current.takePictureAsync({ quality: 0.6, skipProcessing: false });
      if (shot?.uri) {
        setPhoto(shot.uri);
        setStage('review');
      }
    } finally {
      setBusy(false);
    }
  };

  const usePhoto = async () => {
    if (!photo) return;
    // Kept on the phone until Profile information is submitted, in case the app closes.
    useSelfieStore.getState().setUri(await saveDraftPhoto('profile.photo', photo));
    if (next === 'info') router.replace('/register-photo');
    else goBack(router);
  };

  const blocked = permission && !permission.granted && !permission.canAskAgain;
  const footerPad = { paddingBottom: Math.max(insets.bottom, 12) + 4 };

  return (
    <SetupScreenLayout title="Profile photo" subtitle="Step 1 of 2 · A clear photo of your face">
      <AppView className="flex-1 items-center px-6 pt-8">
        <AppText className="text-[22px] font-extrabold text-foreground">{TITLE}</AppText>
        <AppText className="mt-2 text-center text-[14px] leading-5 text-muted">{SUBTITLE}</AppText>

        <AppView className="flex-1 items-center justify-center">
          {stage === 'intro' ? (
            <SelfieIllustration />
          ) : (
            <AppView
              style={{ width: circle, height: circle, borderRadius: circle / 2 }}
              className="items-center justify-center overflow-hidden border-4 border-brand bg-neutral-900"
            >
              {stage === 'camera' ? (
                <>
                  {/* The camera feed is 3:4 portrait. Sized at that shape and centred, it covers
                      the whole circle (the extra top and bottom are clipped) instead of being
                      squeezed into a square with black bars. */}
                  <CameraView
                    ref={camera}
                    facing="front"
                    mirror
                    ratio="4:3"
                    style={{
                      position: 'absolute',
                      width: circle,
                      height: (circle * 4) / 3,
                      top: -circle / 6,
                    }}
                    pictureSize={pictureSize}
                    onCameraReady={async () => {
                      setReady(true);
                      // The default is the camera's largest size (often 12 MP+): far more than a selfie needs
                      // and a slow upload. Use the largest one up to 1600 px.
                      const sizes = await camera.current
                        ?.getAvailablePictureSizesAsync()
                        .catch(() => []);
                      const chosen = pickPictureSize(sizes ?? []);
                      if (chosen) setPictureSize(chosen);
                    }}
                  />
                  {!ready ? (
                    <AppView className="absolute">
                      <AppSpinner />
                    </AppView>
                  ) : null}
                </>
              ) : photo ? (
                <AppImage source={{ uri: photo }} contentFit="cover" className="h-full w-full" />
              ) : null}
            </AppView>
          )}
          {stage === 'camera' ? (
            <AppText className="mt-4 text-[13px] font-semibold text-foreground-secondary">
              Keep your face inside the circle
            </AppText>
          ) : null}
        </AppView>
      </AppView>

      <AppView style={footerPad} className="px-5 pt-3">
        {stage === 'intro' ? (
          <>
            {blocked ? (
              <AppText className="mb-2 text-center text-[13px] text-muted">
                Camera access is off. Allow it in Settings to take your photo.
              </AppText>
            ) : null}
            <Button
              variant="brand"
              label={blocked ? 'Open settings' : 'I am ready'}
              onPress={blocked ? () => Linking.openSettings() : start}
              size="lg"
              textClassName="font-extrabold text-base"
            />
          </>
        ) : stage === 'camera' ? (
          <AppView className="items-center pb-2">
            <AppPressable
              onPress={capture}
              disabled={!ready || busy}
              pressScale={0.92}
              accessibilityRole="button"
              accessibilityLabel="Take photo"
              className="h-[72px] w-[72px] items-center justify-center rounded-full bg-neutral-900 border-4 border-white shadow-md"
            >
              {busy ? <AppSpinner /> : <Icon name="camera.fill" size={28} color="#ffffff" />}
            </AppPressable>
          </AppView>
        ) : (
          <AppView row className="gap-3">
            <Button
              variant="outline"
              label="Retake"
              className="flex-1"
              onPress={() => {
                setPhoto(null);
                setReady(false);
                setStage('camera');
              }}
              size="lg"
              textClassName="font-bold text-base"
            />
            <Button
              variant="brand"
              label="Use this photo"
              className="flex-1"
              onPress={usePhoto}
              size="lg"
              textClassName="font-extrabold text-base"
            />
          </AppView>
        )}
      </AppView>
    </SetupScreenLayout>
  );
}
