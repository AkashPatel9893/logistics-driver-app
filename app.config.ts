import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Ryno Driver',
  slug: 'ryno-driver',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'ryno-driver',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.ryno.driver.app',
    config: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    },
    infoPlist: {
      // Lets the app check which navigation apps are installed (src/lib/navigation-apps.ts).
      LSApplicationQueriesSchemes: ['comgooglemaps', 'waze'],
    },
  },
  android: {
    package: 'com.ryno.driver.app',
    adaptiveIcon: {
      backgroundColor: '#000000',
      foregroundImage: './assets/images/android-icon-foreground.png',
    },
    predictiveBackGestureEnabled: false,
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },
    // expo-task-manager persists the background location job across reboots;
    // SYSTEM_ALERT_WINDOW powers the floating bubble overlay while driving.
    permissions: [
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ],
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Ryno Driver uses your location to show nearby delivery requests and share your live position with the customer during a trip.',
        // Keeps location running while you're online and in another app (e.g. Google Maps).
        // iOS: background mode with the blue location pill. Android: a foreground
        // service with a persistent notification, which needs no "all the time" permission.
        isIosBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
    [
      'expo-image-picker',
      {
        cameraPermission:
          'Ryno Driver uses the camera to photograph parcels at pickup and drop, your vehicle and your documents.',
        photosPermission:
          'Ryno Driver lets you choose document photos from your library during onboarding.',
        microphonePermission: false,
      },
    ],
    [
      'react-native-maps',
      {
        iosGoogleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        androidGoogleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          // Room instantiates WorkManager's generated database through reflection.
          extraProguardRules: `-keep class androidx.work.impl.WorkDatabase_Impl {
    public <init>();
}`,
        },
        ios: {
          deploymentTarget: '17.0',
        },
      },
    ],
    [
      'expo-font',
      {
        ios: {
          fonts: [
            'node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf',
            'node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf',
            'node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf',
            'node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf',
          ],
        },
        android: {
          fonts: [
            {
              fontFamily: 'Inter',
              fontDefinitions: [
                {
                  path: 'node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf',
                  weight: 400,
                },
                {
                  path: 'node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf',
                  weight: 500,
                },
                {
                  path: 'node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf',
                  weight: 600,
                },
                {
                  path: 'node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf',
                  weight: 700,
                },
              ],
            },
          ],
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: false,
  },
});
